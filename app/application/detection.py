"""Cloud-side anomaly detection — z-score computation against historical metrics.

Compares the current profiling ``metrics_json`` against historical
``PipelineRun.metrics_json`` records to detect statistical anomalies.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import PipelineRun


class AnomalyDetector:
    """Detects anomalies by comparing current metrics against historical baselines.

    Uses z-score::

        z = (current_value - mean) / stddev
        |z| > threshold  →  anomaly detected

    Default threshold is 2.0 (≈ 95 % confidence interval for normal distributions).
    A minimum of 2 historical data points is required to compute mean and stddev.
    """

    DEFAULT_THRESHOLD = 2.0
    DEFAULT_BASELINE_WINDOW = 30

    async def detect(
        self,
        metrics: dict,
        pipeline_id: UUID,
        db: AsyncSession,
        threshold: float | None = None,
        baseline_window: int | None = None,
    ) -> list[dict]:
        """Run anomaly detection against the most recent *metrics*.

        Args:
            metrics: Current profiling ``metrics_json`` dict.
            pipeline_id: Pipeline whose historical runs form the baseline.
            db: Active async session for querying ``PipelineRun``.
            threshold: Z-score threshold (default ``2.0``, overridable via
                pipeline config).
            baseline_window: Number of historical runs to consider (default
                ``30``, overridable via pipeline config).

        Returns:
            List of anomaly dicts, each with keys ``type``, ``severity``,
            ``description``, and ``deviation_details``.  Empty list if no
            anomalies are found or no baseline can be established.
        """
        threshold = threshold if threshold is not None else self.DEFAULT_THRESHOLD
        baseline_window = baseline_window if baseline_window is not None else self.DEFAULT_BASELINE_WINDOW

        # --- load historical metrics ------------------------------------------
        history = await self._load_history(pipeline_id, db, baseline_window)
        if len(history) < 2:
            return []  # not enough data for mean + stddev

        # --- check current metrics for errors ---------------------------------
        if "error" in metrics:
            return []

        # --- compare every tracked metric -------------------------------------
        anomalies: list[dict] = []
        tables: dict = metrics.get("tables", {})

        for table_name, table_data in tables.items():
            # ---- row count (volume) ------------------------------------------
            volume = table_data.get("volume", {})
            if "row_count" in volume:
                current = float(volume["row_count"])
                hist_values = self._extract_numeric(history, table_name, "row_count")
                result = self._check_metric(
                    table_name, "volume", "row_count",
                    current, hist_values, threshold,
                )
                if result:
                    anomalies.append(result)

            # ---- null percentages --------------------------------------------
            nulls = table_data.get("nulls", {})
            null_pcts: dict = nulls.get("null_percentages", {})
            for col_name, null_pct in null_pcts.items():
                current = float(null_pct)
                hist_values = self._extract_numeric(
                    history, table_name, "null_pct", col_name,
                )
                result = self._check_metric(
                    table_name, "null_check", f"null_pct.{col_name}",
                    current, hist_values, threshold,
                )
                if result:
                    anomalies.append(result)

        return anomalies

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    async def _load_history(
        self,
        pipeline_id: UUID,
        db: AsyncSession,
        limit: int,
    ) -> list[dict]:
        """Return the ``metrics_json`` of the last *limit* pipeline runs.

        Runs without metrics (``metrics_json IS NULL``) are skipped.
        """
        query = (
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id)
            .where(PipelineRun.metrics_json.isnot(None))
            .order_by(PipelineRun.started_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        runs = result.scalars().all()
        return [run.metrics_json for run in runs if run.metrics_json]

    @staticmethod
    def _extract_numeric(
        history: list[dict],
        table_name: str,
        metric_type: str,
        column_name: str | None = None,
    ) -> list[float]:
        """Walk *history* entries and collect an ordered list of metric values."""
        values: list[float] = []
        for entry in history:
            if not isinstance(entry, dict):
                continue
            tables: dict = entry.get("tables", {})
            table_data = tables.get(table_name)
            if not table_data:
                continue

            if metric_type == "row_count":
                volume = table_data.get("volume", {})
                v = volume.get("row_count")
                if v is not None:
                    values.append(float(v))
            elif metric_type == "null_pct":
                nulls = table_data.get("nulls", {})
                null_pcts: dict = nulls.get("null_percentages", {})
                if column_name is not None:
                    v = null_pcts.get(column_name)
                    if v is not None:
                        values.append(float(v))
        return values

    @staticmethod
    def _check_metric(
        table_name: str,
        anomaly_type: str,
        metric_name: str,
        current_value: float,
        historical_values: list[float],
        threshold: float,
    ) -> dict | None:
        """Return an anomaly dict if *current_value* deviates beyond *threshold*."""
        n = len(historical_values)
        if n < 2:
            return None  # need at least 2 points for mean + stddev

        mean = sum(historical_values) / n
        variance = sum((x - mean) ** 2 for x in historical_values) / n
        stddev = variance ** 0.5

        if stddev == 0.0:
            return None  # no variation in history → can't compute z-score

        z = (current_value - mean) / stddev

        if abs(z) <= threshold:
            return None

        severity = AnomalyDetector._classify_severity(z)

        return {
            "type": anomaly_type,
            "severity": severity,
            "description": (
                f"{anomaly_type.replace('_', ' ').title()} anomaly "
                f"in {table_name}: z={z:.2f}, current={current_value:.4f}, "
                f"baseline={mean:.4f}±{stddev:.4f}"
            ),
            "deviation_details": {
                "table": table_name,
                "metric": metric_name,
                "current_value": current_value,
                "baseline_mean": mean,
                "baseline_stddev": stddev,
                "z_score": z,
                "threshold": threshold,
                "baseline_n": n,
            },
        }

    @staticmethod
    def _classify_severity(z_score: float) -> str:
        """Map z-score magnitude to severity label."""
        abs_z = abs(z_score)
        if abs_z > 5.0:
            return "critical"
        if abs_z > 4.0:
            return "high"
        if abs_z > 3.0:
            return "medium"
        return "low"
