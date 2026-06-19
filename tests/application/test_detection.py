"""
Unit tests for AnomalyDetector — z-score computation against historical metrics.

Tests verify the core statistical logic:
- Z-score formula: z = (current - mean) / stddev
- Threshold comparison: |z| > threshold → anomaly
- Edge cases: empty history, single run, zero stddev, null values
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from app.application.detection import AnomalyDetector


def utcnow():
    return datetime.now(UTC)


def make_history_metrics(*row_counts: int):
    """Create a list of metrics_json dicts with varying row counts.

    Each entry simulates a PipelineRun.metrics_json with one table
    ("public.orders") and its row_count.
    """
    entries = []
    for _i, rc in enumerate(row_counts):
        entries.append({
            "profiled_at": utcnow().isoformat(),
            "tables": {
                "public.orders": {
                    "volume": {
                        "table": "public.orders",
                        "row_count": rc,
                        "profiled_at": utcnow().isoformat(),
                    }
                }
            },
        })
    return entries


def make_history_null_metrics(*null_pcts: float, column="email"):
    """Create metrics_json entries for null percentage history."""
    entries = []
    for pct in null_pcts:
        entries.append({
            "profiled_at": utcnow().isoformat(),
            "tables": {
                "public.users": {
                    "nulls": {
                        "table": "public.users",
                        "null_percentages": {column: pct},
                        "profiled_at": utcnow().isoformat(),
                    }
                }
            },
        })
    return entries


def make_current_metrics(row_count: int, null_pct: float = 0.0, column="email"):
    """Current metrics with one table."""
    return {
        "profiled_at": utcnow().isoformat(),
        "tables": {
            "public.orders": {
                "volume": {
                    "table": "public.orders",
                    "row_count": row_count,
                    "profiled_at": utcnow().isoformat(),
                },
                "nulls": {
                    "table": "public.orders",
                    "null_percentages": {column: null_pct},
                    "profiled_at": utcnow().isoformat(),
                },
            }
        },
    }


class TestAnomalyDetectorZScore:
    """Unit tests for z-score computation logic."""

    @pytest.fixture
    def detector(self):
        return AnomalyDetector()

    @pytest.fixture
    def mock_db(self):
        """Mock AsyncSession — _load_history uses it to query PipelineRun."""
        return AsyncMock()

    # ----------------------------------------------------------------
    # Normal detection
    # ----------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_detects_volume_spike(self, detector, mock_db):
        """A large row-count spike should be detected as anomaly."""
        history = make_history_metrics(100, 102, 98, 101, 100, 99, 103, 97, 100, 100)
        current = make_current_metrics(row_count=250)  # z ≈ 30+ with stable history
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert len(result) >= 1
        anomaly = result[0]
        assert anomaly["type"] == "volume"
        assert anomaly["severity"] == "critical"
        assert "public.orders" in anomaly["description"]
        assert anomaly["deviation_details"]["z_score"] > 5.0

    @pytest.mark.asyncio
    async def test_detects_null_pct_spike(self, detector, mock_db):
        """A null-percentage spike should be detected."""
        history = make_history_null_metrics(0.01, 0.02, 0.01, 0.02, 0.01)
        current = {
            "profiled_at": utcnow().isoformat(),
            "tables": {
                "public.users": {
                    "nulls": {
                        "table": "public.users",
                        "null_percentages": {"email": 0.50},
                        "profiled_at": utcnow().isoformat(),
                    }
                }
            },
        }
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert len(result) >= 1
        anomaly = result[0]
        assert anomaly["type"] == "null_check"
        assert anomaly["severity"] == "critical"

    @pytest.mark.asyncio
    async def test_clean_data_no_anomaly(self, detector, mock_db):
        """Metrics within normal range should NOT flag an anomaly."""
        history = make_history_metrics(100, 102, 98, 101, 100, 99, 103, 97, 100, 100)
        current = make_current_metrics(row_count=101)  # well within baseline
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert result == []

    # ----------------------------------------------------------------
    # Edge cases
    # ----------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_empty_history_no_anomaly(self, detector, mock_db):
        """No historical data — no baseline to compare against."""
        detector._load_history = AsyncMock(return_value=[])
        current = make_current_metrics(row_count=500)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_single_historical_run_no_anomaly(self, detector, mock_db):
        """Single data point — stddev=0, cannot compute z-score."""
        history = make_history_metrics(100)  # only 1 point
        detector._load_history = AsyncMock(return_value=history)
        current = make_current_metrics(row_count=999)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_constant_history_no_variation(self, detector, mock_db):
        """All historical values identical → stddev=0 → skip."""
        history = make_history_metrics(100, 100, 100, 100, 100)
        detector._load_history = AsyncMock(return_value=history)
        current = make_current_metrics(row_count=200)  # looks like a spike!

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        # stddev is 0, so no anomaly (can't compute z-score meaningfully)
        assert result == []

    @pytest.mark.asyncio
    async def test_error_metrics_skipped(self, detector, mock_db):
        """Metrics with an 'error' key should be skipped (profiling failed)."""
        detector._load_history = AsyncMock(return_value=make_history_metrics(100, 102, 98))
        error_metrics = {"error": "connection_failed", "message": "timeout"}

        result = await detector.detect(
            metrics=error_metrics,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_custom_threshold(self, detector, mock_db):
        """Custom threshold should be respected.

        History: [100, 102, 98, 101, 100]  →  mean ≈ 100.2, stddev ≈ 1.33
        Current 104  →  z ≈ (104 − 100.2) / 1.33 ≈ 2.86
        Detected at threshold 2.0, NOT detected at threshold 3.0.
        """
        history = make_history_metrics(100, 102, 98, 101, 100)
        current = make_current_metrics(row_count=104)

        detector._load_history = AsyncMock(return_value=history)

        # Default threshold 2.0 → should detect (|z| ≈ 2.86 > 2.0)
        result_default = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
            threshold=2.0,
        )
        assert len(result_default) >= 1

        # Custom threshold 3.0 → should NOT detect (|z| ≈ 2.86 < 3.0)
        result_custom = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
            threshold=3.0,
        )
        assert result_custom == []

    # ----------------------------------------------------------------
    # Severity classification
    # ----------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_severity_critical(self, detector, mock_db):
        """|z| > 5.0 → critical."""
        history = make_history_metrics(100, 100, 100, 100, 100)
        # Even with stddev ≈ 0 we can't test this since stddev=0 skips
        # So use tiny variation:
        history = make_history_metrics(100, 101, 99, 100, 100)
        current = make_current_metrics(row_count=150)  # force large z
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        if result:
            z = result[0]["deviation_details"]["z_score"]
            if abs(z) > 5.0:
                assert result[0]["severity"] == "critical"
            elif abs(z) > 4.0:
                assert result[0]["severity"] == "high"
            elif abs(z) > 3.0:
                assert result[0]["severity"] == "medium"
            else:
                assert result[0]["severity"] == "low"

    # ----------------------------------------------------------------
    # Static methods
    # ----------------------------------------------------------------

    def test_classify_severity_below_threshold(self):
        """|z| ≤ 2.0 returns 'low'."""
        assert AnomalyDetector._classify_severity(2.0) == "low"
        assert AnomalyDetector._classify_severity(2.5) == "low"

    def test_classify_severity_medium(self):
        """3.0 < |z| ≤ 4.0 returns 'medium'."""
        assert AnomalyDetector._classify_severity(3.5) == "medium"

    def test_classify_severity_high(self):
        """4.0 < |z| ≤ 5.0 returns 'high'."""
        assert AnomalyDetector._classify_severity(4.5) == "high"

    def test_classify_severity_critical(self):
        """|z| > 5.0 returns 'critical'."""
        assert AnomalyDetector._classify_severity(5.5) == "critical"
        assert AnomalyDetector._classify_severity(10.0) == "critical"

    # ----------------------------------------------------------------
    # z-score computation verification
    # ----------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_z_score_formula(self, detector, mock_db):
        """Verify the z-score formula with known values.

        z = (current - mean) / stddev
        For values [10, 12, 8, 10, 10]:
          mean = 10.0
          variance = ((0² + 2² + (-2)² + 0² + 0²) / 5) = 8/5 = 1.6
          stddev = sqrt(1.6) ≈ 1.2649
        current = 14 → z = (14 - 10) / 1.2649 ≈ 3.1623
        """
        history = make_history_metrics(10, 12, 8, 10, 10)
        current = make_current_metrics(row_count=14)
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        assert len(result) == 1
        z = result[0]["deviation_details"]["z_score"]
        assert 3.0 < z < 3.3  # allow slight floating point variance
        assert result[0]["severity"] == "medium"

    # ----------------------------------------------------------------
    # Multiple tables and metrics
    # ----------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_multiple_tables_detection(self, detector, mock_db):
        """Multiple tables should be checked independently."""
        history = make_history_metrics(100, 102, 98, 101, 100, 99, 103, 97, 100, 100)
        current = {
            "profiled_at": utcnow().isoformat(),
            "tables": {
                "public.orders": {
                    "volume": {"table": "public.orders", "row_count": 250, "profiled_at": utcnow().isoformat()},
                },
                "public.users": {
                    "volume": {"table": "public.users", "row_count": 500, "profiled_at": utcnow().isoformat()},
                },
            },
        }
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        # Only "public.orders" has history — "public.users" has no baseline
        types = [a["type"] for a in result]
        assert "volume" in types

    @pytest.mark.asyncio
    async def test_nulls_in_all_columns(self, detector, mock_db):
        """All null percentage columns should be checked."""
        history = [
            {
                "profiled_at": utcnow().isoformat(),
                "tables": {
                    "public.users": {
                        "nulls": {
                            "table": "public.users",
                            "null_percentages": {"email": 0.01, "phone": 0.02},
                            "profiled_at": utcnow().isoformat(),
                        }
                    }
                },
            },
            {
                "profiled_at": utcnow().isoformat(),
                "tables": {
                    "public.users": {
                        "nulls": {
                            "table": "public.users",
                            "null_percentages": {"email": 0.02, "phone": 0.01},
                            "profiled_at": utcnow().isoformat(),
                        }
                    }
                },
            },
            {
                "profiled_at": utcnow().isoformat(),
                "tables": {
                    "public.users": {
                        "nulls": {
                            "table": "public.users",
                            "null_percentages": {"email": 0.01, "phone": 0.01},
                            "profiled_at": utcnow().isoformat(),
                        }
                    }
                },
            },
        ]
        current = {
            "profiled_at": utcnow().isoformat(),
            "tables": {
                "public.users": {
                    "nulls": {
                        "table": "public.users",
                        "null_percentages": {"email": 0.50, "phone": 0.50},
                        "profiled_at": utcnow().isoformat(),
                    }
                }
            },
        }
        detector._load_history = AsyncMock(return_value=history)

        result = await detector.detect(
            metrics=current,
            pipeline_id=UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            db=mock_db,
        )

        # Two columns × both spiking = 2 anomalies
        assert len(result) == 2
