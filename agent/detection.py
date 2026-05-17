"""Anomaly detection for profiled table metrics using z-score analysis."""

from __future__ import annotations

import enum
from dataclasses import dataclass


class Severity(enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    @classmethod
    def classify(cls, z_score: float) -> Severity | None:
        abs_z = abs(z_score)
        if abs_z > 5.0:
            return cls.CRITICAL
        if abs_z > 4.0:
            return cls.HIGH
        if abs_z > 3.0:
            return cls.MEDIUM
        if abs_z > 2.0:
            return cls.LOW
        return None


def _classify_custom(z_score: float, thresholds: dict) -> Severity | None:
    abs_z = abs(z_score)
    sorted_thresholds = sorted(thresholds.items(), key=lambda item: item[1], reverse=True)
    for name, bound in sorted_thresholds:
        if abs_z > bound:
            return getattr(Severity, name.upper(), None)
    return None


@dataclass
class DetectedAnomaly:
    pipeline_id: str
    table_name: str
    anomaly_type: str
    severity: Severity
    description: str
    z_score: float
    current_value: float
    baseline_mean: float
    baseline_stddev: float

    @property
    def type(self) -> str:
        return self.anomaly_type

    @property
    def deviation_details(self) -> dict:
        return {
            "table": self.table_name,
            "metric": "row_count" if self.type == "volume" else "null_percentage",
            "baseline_mean": self.baseline_mean,
            "baseline_stddev": self.baseline_stddev,
            "current_value": self.current_value,
            "z_score": self.z_score,
            "threshold": 3.0,
        }


class AnomalyDetector:
    def detect_volume_anomaly(
        self,
        current_count: float,
        baseline_mean: float,
        baseline_stddev: float,
    ) -> tuple[float, bool]:
        if baseline_stddev == 0.0:
            return (0.0, False)
        z_score = (current_count - baseline_mean) / baseline_stddev
        is_anomaly = abs(z_score) > 2.0
        return (z_score, is_anomaly)

    def detect_null_anomaly(
        self,
        current_null_pct: float,
        baseline_mean_null_pct: float,
        baseline_stddev_null_pct: float,
    ) -> tuple[float, bool]:
        if baseline_stddev_null_pct == 0.0:
            return (0.0, False)
        z_score = (current_null_pct - baseline_mean_null_pct) / baseline_stddev_null_pct
        is_anomaly = abs(z_score) > 2.0
        return (z_score, is_anomaly)

    def evaluate(
        self,
        profile_result: dict,
        baselines: dict,
        thresholds: dict | None = None,
        pipeline_id: str = "unknown",
    ) -> list[DetectedAnomaly]:
        anomalies: list[DetectedAnomaly] = []
        classify = _classify_custom if thresholds else Severity.classify
        classify_kwargs = {"thresholds": thresholds} if thresholds else {}

        for table_name, table_data in profile_result.get("tables", {}).items():
            if "volume" in table_data and "row_count" in table_data["volume"]:
                key = (table_name, "row_count")
                baseline = baselines.get(key)
                if baseline is None or baseline[2] == 1:
                    pass
                else:
                    current_count = table_data["volume"]["row_count"]
                    mean, stddev, _ = baseline
                    z_score, is_anomaly = self.detect_volume_anomaly(current_count, mean, stddev)
                    if is_anomaly:
                        severity = classify(z_score, **classify_kwargs)
                        anomalies.append(
                            DetectedAnomaly(
                                pipeline_id=pipeline_id,
                                table_name=table_name,
                                anomaly_type="volume",
                                severity=severity,
                                description=(
                                    f"Row count anomaly in {table_name}: "
                                    f"z={z_score:.2f}, current={current_count}, "
                                    f"baseline={mean:.1f}+/-{stddev:.1f}"
                                ),
                                z_score=z_score,
                                current_value=float(current_count),
                                baseline_mean=mean,
                                baseline_stddev=stddev,
                            )
                        )

            if "nulls" in table_data:
                for col_name, null_pct in table_data["nulls"].items():
                    key = (table_name, f"null_{col_name}")
                    baseline = baselines.get(key)
                    if baseline is None or baseline[2] == 1:
                        continue
                    mean, stddev, _ = baseline
                    z_score, is_anomaly = self.detect_null_anomaly(null_pct, mean, stddev)
                    if is_anomaly:
                        severity = classify(z_score, **classify_kwargs)
                        anomalies.append(
                            DetectedAnomaly(
                                pipeline_id=pipeline_id,
                                table_name=table_name,
                                anomaly_type="null_percentage",
                                severity=severity,
                                description=(
                                    f"Null percentage anomaly in {table_name}.{col_name}: "
                                    f"z={z_score:.2f}, current={null_pct:.4f}, "
                                    f"baseline={mean:.4f}+/-{stddev:.4f}"
                                ),
                                z_score=z_score,
                                current_value=float(null_pct),
                                baseline_mean=mean,
                                baseline_stddev=stddev,
                            )
                        )

        return anomalies
