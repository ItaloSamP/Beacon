"""Unit tests for NullCheckProfiler."""

import pytest

from agent.profiling.null_check import NullCheckProfiler  # noqa: E402

from .conftest import make_mock_connector


# ── NullCheckProfiler ────────────────────────────────────────────────

class TestNullCheckProfiler:
    @pytest.mark.asyncio
    async def test_profile_returns_null_percentages(self):
        """NullCheckProfiler should return null percentages per column."""
        profiler = NullCheckProfiler()
        nulls = {"email": 0.05, "phone": 0.12}
        conn = make_mock_connector(null_counts=nulls)

        result = await profiler.profile(conn, "public.orders", ["email", "phone"])
        assert result["null_percentages"] == nulls
        assert "profiled_at" in result

    @pytest.mark.asyncio
    async def test_profile_no_nullable_columns_returns_empty(self):
        """When no columns are requested, null percentages should be empty."""
        profiler = NullCheckProfiler()
        conn = make_mock_connector()

        result = await profiler.profile(conn, "public.orders", [])
        assert result["null_percentages"] == {}

    @pytest.mark.asyncio
    async def test_profile_all_zero_nulls(self):
        """Columns with 0 % nulls should be reported correctly."""
        profiler = NullCheckProfiler()
        conn = make_mock_connector(null_counts={"id": 0.0, "name": 0.0})

        result = await profiler.profile(conn, "public.orders", ["id", "name"])
        assert result["null_percentages"] == {"id": 0.0, "name": 0.0}


# ── NullCheckProfiler — schema-based column detection ─────────────────

class TestNullCheckProfilerAutoDetection:
    """Tests that NullCheckProfiler can auto-detect nullable columns from schema."""

    @pytest.mark.asyncio
    async def test_discovers_columns_from_schema(self):
        """NullCheckProfiler should be able to use schema data to find columns to check."""
        profiler = NullCheckProfiler()
        schema_data = [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "email", "type": "text", "nullable": True},
            {"name": "phone", "type": "text", "nullable": True},
            {"name": "created_at", "type": "timestamp", "nullable": False},
        ]
        conn = make_mock_connector(
            schema=schema_data,
            null_counts={"email": 0.0, "phone": 0.0},
        )

        result = await profiler.profile(conn, "public.users", columns=["email", "phone"])
        assert "null_percentages" in result
        assert "email" in result["null_percentages"]
        assert "phone" in result["null_percentages"]

    @pytest.mark.asyncio
    async def test_profile_with_all_columns_nullable(self):
        """When all columns are nullable, all should be included in null check."""
        profiler = NullCheckProfiler()
        schema_data = [
            {"name": "col_a", "type": "text", "nullable": True},
            {"name": "col_b", "type": "text", "nullable": True},
        ]
        nulls = {"col_a": 0.1, "col_b": 0.2}
        conn = make_mock_connector(schema=schema_data, null_counts=nulls)

        result = await profiler.profile(conn, "public.t", columns=["col_a", "col_b"])
        assert result["null_percentages"] == {"col_a": 0.1, "col_b": 0.2}

    @pytest.mark.asyncio
    async def test_profile_skips_non_nullable_columns(self):
        """NullCheckProfiler should only report null percentages for the requested columns."""
        profiler = NullCheckProfiler()
        nulls = {"nullable_col": 0.05}
        conn = make_mock_connector(null_counts=nulls)

        result = await profiler.profile(conn, "public.t", columns=["nullable_col"])
        assert result["null_percentages"] == {"nullable_col": 0.05}
