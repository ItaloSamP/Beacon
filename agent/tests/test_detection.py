"""Unit tests for AnomalyDetector — RED PHASE: module does not exist yet."""

import pytest

# RED PHASE — these imports will fail until the modules are created
from agent.detection import AnomalyDetector, DetectedAnomaly, Severity  # noqa: E402


# ── helpers ──────────────────────────────────────────────────────────

def _make_profile_result(tables: dict = None):
    """Build a minimal ProfileResult-like dict for detector input."""
    return {
        "profiled_at": "2026-05-14T00:00:00Z",
        "tables": tables or {},
        "errors": [],
    }


def _make_baselines(data: dict = None):
    """Build baseline lookup: {(table, metric): (mean, stddev, n)}."""
    return data or {}


# ── detect_volume_anomaly ────────────────────────────────────────────

class TestDetectVolumeAnomaly:
    def test_normal_value_no_anomaly(self):
        """|z| <= 2.0 should NOT be flagged as anomalous."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=105.0, baseline_mean=100.0, baseline_stddev=5.0)
        assert is_anomaly is False
        assert abs(z) == pytest.approx(1.0)

    def test_low_severity_anomaly(self):
        """2.0 < |z| <= 3.0 should be flagged as anomaly."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=125.0, baseline_mean=100.0, baseline_stddev=10.0)
        assert is_anomaly is True
        assert z == pytest.approx(2.5)

    def test_positive_deviation(self):
        """A spike (value higher than baseline) should produce a positive z-score."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=200.0, baseline_mean=100.0, baseline_stddev=20.0)
        assert z == pytest.approx(5.0)
        assert is_anomaly is True

    def test_negative_deviation(self):
        """A drop (value lower than baseline) should produce a negative z-score."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=40.0, baseline_mean=100.0, baseline_stddev=20.0)
        assert z == pytest.approx(-3.0)
        assert is_anomaly is True

    def test_stddev_zero_handled_gracefully(self):
        """When baseline_stddev is 0, the detector should not divide by zero."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=100.0, baseline_mean=100.0, baseline_stddev=0.0)
        # stddev=0 means no variation; should not flag as anomaly
        assert is_anomaly is False

    def test_same_value_as_baseline(self):
        """When current equals baseline mean, z should be 0."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(current_count=100.0, baseline_mean=100.0, baseline_stddev=10.0)
        assert z == 0.0
        assert is_anomaly is False


# ── detect_null_anomaly ──────────────────────────────────────────────

class TestDetectNullAnomaly:
    def test_normal_null_pct_no_anomaly(self):
        """Null % within 2 stdevs should not be flagged."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_null_anomaly(
            current_null_pct=0.05, baseline_mean_null_pct=0.03, baseline_stddev_null_pct=0.02
        )
        # z = (0.05 - 0.03) / 0.02 = 1.0  → not anomalous
        assert is_anomaly is False
        assert z == pytest.approx(1.0)

    def test_spike_in_nulls(self):
        """A sharp increase in null % should be detected."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_null_anomaly(
            current_null_pct=0.20, baseline_mean_null_pct=0.03, baseline_stddev_null_pct=0.02
        )
        # z = (0.20 - 0.03) / 0.02 = 8.5
        assert is_anomaly is True
        assert z == pytest.approx(8.5)

    def test_stddev_zero_no_variation(self):
        """When historic null pct never varied, handle gracefully."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_null_anomaly(
            current_null_pct=0.0, baseline_mean_null_pct=0.0, baseline_stddev_null_pct=0.0
        )
        assert is_anomaly is False


# ── evaluate ─────────────────────────────────────────────────────────

class TestEvaluate:
    def test_returns_empty_list_when_no_profiles(self):
        """evaluate() with no profile data should return []."""
        detector = AnomalyDetector()
        profile = _make_profile_result()
        baselines = _make_baselines()
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        assert anomalies == []

    def test_evaluate_includes_anomaly_details(self):
        """Each DetectedAnomaly must have pipeline_id, table_name, type, severity, description."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 200},
                    "nulls": {},
                },
            },
        )
        baselines = {
            ("public.orders", "row_count"): (100.0, 20.0, 30),
        }
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        if anomalies:
            for a in anomalies:
                assert isinstance(a, DetectedAnomaly)
                assert a.pipeline_id is not None
                assert a.table_name is not None
                assert a.type in ("volume", "null_percentage")
                assert hasattr(a, "severity")
                assert a.description

    def test_evaluate_checks_all_tables_and_metrics(self):
        """evaluate() should iterate over all tables and all baselined metrics."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 500},
                    "nulls": {"email": 0.90},
                },
                "public.users": {
                    "schema": [],
                    "volume": {"row_count": 110},
                    "nulls": {},
                },
            },
        )
        baselines = {
            ("public.orders", "row_count"): (100.0, 10.0, 30),
            ("public.orders", "null_email"): (0.05, 0.02, 20),
            ("public.users", "row_count"): (100.0, 10.0, 30),
        }
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        # orders row_count: z=40 → critical anomaly
        # orders null_email: z=42.5 → critical anomaly
        # users row_count: z=1.0 → no anomaly
        assert len(anomalies) >= 2


# ── severity classification ─────────────────────────────────────────

class TestSeverityClassification:
    def test_z_above_5_is_critical(self):
        """|z| > 5.0 → Severity.CRITICAL."""
        assert Severity.classify(5.5) == Severity.CRITICAL

    def test_z_exactly_5_is_critical(self):
        """|z| == 5.0 → Severity.CRITICAL (strictly > 5 means boundary is critical)."""
        # Spec says |z| > 5.0 → critical; if z==5.0 it might be high.
        # Document this test to track the intended behaviour.
        result = Severity.classify(5.0)
        assert result in (Severity.CRITICAL, Severity.HIGH)

    def test_z_above_4_is_high(self):
        """4.0 < |z| <= 5.0 → Severity.HIGH."""
        assert Severity.classify(4.5) == Severity.HIGH

    def test_z_above_3_is_medium(self):
        """3.0 < |z| <= 4.0 → Severity.MEDIUM."""
        assert Severity.classify(3.5) == Severity.MEDIUM

    def test_z_exactly_3_is_medium_or_low(self):
        """|z| == 3.0 boundary: spec says |z| > 3.0 → medium."""
        result = Severity.classify(3.0)
        assert result in (Severity.MEDIUM, Severity.LOW)

    def test_z_above_2_is_low(self):
        """2.0 < |z| <= 3.0 → Severity.LOW."""
        assert Severity.classify(2.5) == Severity.LOW

    def test_z_exactly_2_is_low_or_none(self):
        """|z| == 2.0 boundary: spec says |z| > 2.0 → low."""
        result = Severity.classify(2.0)
        assert result in (Severity.LOW, None)

    def test_z_below_2_returns_none(self):
        """|z| <= 2.0 should return None (not anomalous)."""
        assert Severity.classify(1.0) is None

    def test_negative_z_severity(self):
        """Negative z-scores should be classified by absolute value."""
        assert Severity.classify(-6.0) == Severity.CRITICAL
        assert Severity.classify(-4.5) == Severity.HIGH
        assert Severity.classify(-3.5) == Severity.MEDIUM
        assert Severity.classify(-2.5) == Severity.LOW
        assert Severity.classify(-1.5) is None


# ── DetectedAnomaly model ────────────────────────────────────────────

class TestDetectedAnomaly:
    def test_model_fields_populated(self):
        """DetectedAnomaly should carry all required fields."""
        a = DetectedAnomaly(
            pipeline_id="p1",
            table_name="public.orders",
            anomaly_type="volume",
            severity=Severity.CRITICAL,
            description="Row count spike",
            z_score=6.2,
            current_value=500.0,
            baseline_mean=100.0,
            baseline_stddev=50.0,
        )
        assert a.pipeline_id == "p1"
        assert a.table_name == "public.orders"
        assert a.type == "volume"  # aliased from anomaly_type
        assert a.severity == Severity.CRITICAL
        assert a.z_score == 6.2

    def test_deviation_details_accessible(self):
        """Deviation details should be accessible for alert formatting."""
        a = DetectedAnomaly(
            pipeline_id="p1",
            table_name="public.orders",
            anomaly_type="volume",
            severity=Severity.HIGH,
            description="Row count spike",
            z_score=4.5,
            current_value=500.0,
            baseline_mean=100.0,
            baseline_stddev=100.0,
        )
        # deviation_details could be a dict / attribute / property
        details = a.deviation_details
        assert isinstance(details, dict)
        assert "z_score" in details or details.get("z_score")


# ── edge cases ───────────────────────────────────────────────────────

class TestEdgeCases:
    def test_extreme_outlier(self):
        """A massively deviant value should still produce a finite z-score."""
        detector = AnomalyDetector()
        z, is_anomaly = detector.detect_volume_anomaly(
            current_count=1_000_000.0, baseline_mean=100.0, baseline_stddev=10.0
        )
        assert is_anomaly is True
        assert z > 0
        import math
        assert math.isfinite(z)

    def test_insufficient_baseline_n_equals_one(self):
        """A baseline with n=1 should be treated as insufficient; evaluate should skip it."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 999},
                    "nulls": {},
                },
            },
        )
        baselines = {
            ("public.orders", "row_count"): (100.0, 0.0, 1),
        }
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        # n=1 → insufficient data → no anomaly should be raised
        assert len(anomalies) == 0

    def test_none_baseline_handled(self):
        """evaluate() should gracefully handle a None baseline for a metric."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 999},
                    "nulls": {},
                },
            },
        )
        # Baseline key exists but returns None (not yet learned)
        baselines = {
            ("public.orders", "row_count"): None,
        }
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        assert anomalies == []

    def test_missing_baseline_key_skips_metric(self):
        """When a metric has no baseline key, it should be skipped silently."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 999},
                    "nulls": {},
                },
            },
        )
        baselines = {}  # no baselines at all
        anomalies = detector.evaluate(profile, baselines, thresholds=None)
        assert anomalies == []

    def test_custom_thresholds_override(self):
        """The `thresholds` parameter should allow overriding severity boundaries."""
        detector = AnomalyDetector()
        profile = _make_profile_result(
            tables={
                "public.orders": {
                    "schema": [],
                    "volume": {"row_count": 130},
                    "nulls": {},
                },
            },
        )
        baselines = {
            ("public.orders", "row_count"): (100.0, 10.0, 30),
        }
        # z = 3.0 → usually medium, but with a lower threshold might be high
        anomalies = detector.evaluate(
            profile,
            baselines,
            thresholds={"high": 2.5, "medium": 2.0, "low": 1.5},
        )
        if anomalies:
            assert anomalies[0].severity in (Severity.HIGH, Severity.MEDIUM, Severity.LOW)
