"""Unit tests for VolumeProfiler."""

import pytest

from agent.profiling.volume import VolumeProfiler  # noqa: E402

from .conftest import make_mock_connector


# ── VolumeProfiler ───────────────────────────────────────────────────

class TestVolumeProfiler:
    @pytest.mark.asyncio
    async def test_profile_returns_row_count(self):
        """VolumeProfiler.profile() should return the table row count."""
        profiler = VolumeProfiler()
        conn = make_mock_connector(row_count=5000)

        result = await profiler.profile(conn, "public.orders")
        assert result["row_count"] == 5000
        assert "profiled_at" in result

    @pytest.mark.asyncio
    async def test_profile_empty_table_returns_zero(self):
        """VolumeProfiler should return 0 for an empty table."""
        profiler = VolumeProfiler()
        conn = make_mock_connector(row_count=0)

        result = await profiler.profile(conn, "public.empty")
        assert result["row_count"] == 0

    @pytest.mark.asyncio
    async def test_profile_large_table(self):
        """VolumeProfiler should handle count values up to very large numbers."""
        profiler = VolumeProfiler()
        conn = make_mock_connector(row_count=999_999_999)

        result = await profiler.profile(conn, "public.huge")
        assert result["row_count"] == 999_999_999


# ── VolumeProfiler — additional edge cases ────────────────────────────

class TestVolumeProfilerEdgeCases:
    """Additional edge case tests for VolumeProfiler."""

    @pytest.mark.asyncio
    async def test_profile_includes_table_name_in_result(self):
        """VolumeProfiler result must include the table name."""
        profiler = VolumeProfiler()
        conn = make_mock_connector(row_count=42)

        result = await profiler.profile(conn, "public.orders")
        assert result.get("table") == "public.orders"

    @pytest.mark.asyncio
    async def test_profile_result_is_json_serialisable(self):
        """VolumeProfiler result should be JSON-serialisable."""
        import json

        profiler = VolumeProfiler()
        conn = make_mock_connector(row_count=1000)

        result = await profiler.profile(conn, "public.orders")
        try:
            json.dumps(result)
        except TypeError as exc:
            pytest.fail(f"Result is not JSON-serialisable: {exc}")
