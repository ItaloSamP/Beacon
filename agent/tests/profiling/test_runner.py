"""Unit tests for ProfileRunner and ProfileResult."""

import datetime
from unittest.mock import AsyncMock

import pytest

from agent.profiling.runner import ProfileRunner, ProfileResult  # noqa: E402

from .conftest import make_mock_connector


# ── ProfileRunner ────────────────────────────────────────────────────

class TestProfileRunner:
    @pytest.mark.asyncio
    async def test_run_profiles_all_target_tables(self):
        """ProfileRunner.run() should invoke all profilers for each target table."""
        runner = ProfileRunner()
        schema_data = [{"name": "id", "type": "integer", "nullable": False}]
        conn = make_mock_connector(
            tables=["public.orders", "public.users"],
            schema=schema_data,
            row_count=100,
        )

        result = await runner.run(conn, target_tables=["public.orders", "public.users"])
        assert isinstance(result, ProfileResult)
        assert "public.orders" in result.tables
        assert "public.users" in result.tables

    @pytest.mark.asyncio
    async def test_run_result_contains_profiled_at(self):
        """ProfileResult must include a profiled_at timestamp."""
        runner = ProfileRunner()
        conn = make_mock_connector()

        result = await runner.run(conn, target_tables=["public.orders"])
        assert "profiled_at" in result.to_dict()
        dt = result.to_dict()["profiled_at"]
        # should be an ISO-8601-ish string or datetime
        assert isinstance(dt, (str, datetime.datetime))

    @pytest.mark.asyncio
    async def test_run_result_has_schema_volume_nulls_per_table(self):
        """Each profiled table should have schema, volume, and nulls entries."""
        runner = ProfileRunner()
        schema_data = [{"name": "id", "type": "integer", "nullable": False}]
        conn = make_mock_connector(
            tables=["public.orders"],
            schema=schema_data,
            row_count=100,
            null_counts={"id": 0.0},
        )

        result = await runner.run(conn, target_tables=["public.orders"])
        table = result.tables["public.orders"]
        assert "schema" in table
        assert "volume" in table
        assert "nulls" in table

    @pytest.mark.asyncio
    async def test_run_collects_errors(self):
        """ProfileRunner should not crash on a failing profiler — errors go to the errors list."""
        runner = ProfileRunner()
        conn = make_mock_connector()
        conn.get_schema = AsyncMock(side_effect=RuntimeError("boom"))

        result = await runner.run(conn, target_tables=["public.orders"])
        assert len(result.errors) > 0
        assert "public.orders" not in result.tables

    @pytest.mark.asyncio
    async def test_run_skips_missing_tables(self):
        """Tables not present in the connector should be skipped with a warning/error."""
        runner = ProfileRunner()
        conn = make_mock_connector(tables=[])

        result = await runner.run(conn, target_tables=["public.non_existent"])
        assert "public.non_existent" not in result.tables

    @pytest.mark.asyncio
    async def test_run_with_no_tables_returns_empty_result(self):
        """When target_tables is empty, the result should have no table entries."""
        runner = ProfileRunner()
        conn = make_mock_connector()

        result = await runner.run(conn, target_tables=[])
        assert result.tables == {}
        assert result.errors == []

    @pytest.mark.asyncio
    async def test_profile_result_dict_serialisation(self):
        """ProfileResult.to_dict() should produce a JSON-serialisable dict."""
        runner = ProfileRunner()
        conn = make_mock_connector(schema=[{"name": "id", "type": "int", "nullable": False}])

        result = await runner.run(conn, target_tables=["public.orders"])
        d = result.to_dict()

        assert "profiled_at" in d
        assert "tables" in d
        assert "errors" in d
        assert isinstance(d["tables"], dict)
        assert isinstance(d["errors"], list)


# ── ProfileRunner — constructor pattern (spec alignment) ──────────────

class TestProfileRunnerConstructor:
    """Tests that ProfileRunner accepts connector via __init__ (per spec)."""

    @pytest.mark.asyncio
    async def test_runner_accepts_connector_in_constructor(self):
        """ProfileRunner(connector) should store the connector for use in run()."""
        conn = make_mock_connector()
        runner = ProfileRunner(connector=conn)

        assert runner.connector is conn

    @pytest.mark.asyncio
    async def test_run_uses_constructor_connector(self):
        """When connector is passed to __init__, run() should use it automatically."""
        conn = make_mock_connector(
            tables=["public.orders"],
            schema=[{"name": "id", "type": "integer", "nullable": False}],
            row_count=100,
        )
        runner = ProfileRunner(connector=conn)

        result = await runner.run(target_tables=["public.orders"])
        assert isinstance(result, ProfileResult)
        assert "public.orders" in result.tables


# ── ProfileRunner — timing & execution order ──────────────────────────

class TestProfileRunnerTiming:
    """Tests that ProfileRunner collects timing per step and runs in correct sequence."""

    @pytest.mark.asyncio
    async def test_result_includes_timing_per_step(self):
        """ProfileResult should include timing information for each profiling step."""
        runner = ProfileRunner()
        conn = make_mock_connector(
            tables=["public.orders"],
            schema=[{"name": "id", "type": "int", "nullable": False}],
            row_count=100,
        )

        result = await runner.run(conn, target_tables=["public.orders"])
        d = result.to_dict()

        assert "timing" in d
        timing = d["timing"]
        assert "schema_ms" in timing or "schema" in timing
        assert "volume_ms" in timing or "volume" in timing
        assert "nulls_ms" in timing or "nulls" in timing

    @pytest.mark.asyncio
    async def test_run_executes_schema_before_volume(self):
        """ProfileRunner must execute SchemaProfiler before VolumeProfiler."""
        runner = ProfileRunner()

        call_order = []
        schema_data = [{"name": "id", "type": "int", "nullable": False}]

        conn = make_mock_connector(tables=["public.t"], schema=schema_data, row_count=10)
        # Wrap get_schema / get_row_count to record call order
        orig_schema = conn.get_schema
        orig_count = conn.get_row_count

        async def track_schema(*a, **kw):
            call_order.append("schema")
            return await orig_schema(*a, **kw)

        async def track_count(*a, **kw):
            call_order.append("volume")
            return await orig_count(*a, **kw)

        conn.get_schema = track_schema
        conn.get_row_count = track_count

        await runner.run(conn, target_tables=["public.t"])
        schema_idx = call_order.index("schema") if "schema" in call_order else -1
        volume_idx = call_order.index("volume") if "volume" in call_order else -1
        assert schema_idx < volume_idx, (
            f"Schema profiling must happen before volume. Call order: {call_order}"
        )

    @pytest.mark.asyncio
    async def test_run_executes_volume_before_nulls(self):
        """ProfileRunner must execute VolumeProfiler before NullCheckProfiler."""
        runner = ProfileRunner()

        call_order = []
        schema_data = [{"name": "id", "type": "int", "nullable": False}]

        conn = make_mock_connector(tables=["public.t"], schema=schema_data, row_count=10)
        orig_count = conn.get_row_count
        orig_nulls = conn.get_null_counts

        async def track_count(*a, **kw):
            call_order.append("volume")
            return await orig_count(*a, **kw)

        async def track_nulls(*a, **kw):
            call_order.append("nulls")
            return await orig_nulls(*a, **kw)

        conn.get_row_count = track_count
        conn.get_null_counts = track_nulls

        await runner.run(conn, target_tables=["public.t"])
        volume_idx = call_order.index("volume") if "volume" in call_order else -1
        nulls_idx = call_order.index("nulls") if "nulls" in call_order else -1
        assert volume_idx < nulls_idx, (
            f"Volume profiling must happen before null check. Call order: {call_order}"
        )


# ── ProfileRunner — structured errors ─────────────────────────────────

class TestProfileRunnerErrors:
    """Tests that errors are collected with structured metadata."""

    @pytest.mark.asyncio
    async def test_errors_include_table_and_step(self):
        """Each error entry should include table name and failing step."""
        runner = ProfileRunner()
        conn = make_mock_connector(tables=["public.orders"])
        conn.get_schema = AsyncMock(side_effect=RuntimeError("schema failed"))

        result = await runner.run(conn, target_tables=["public.orders"])
        assert len(result.errors) > 0
        err = result.errors[0]
        assert "table" in err
        assert err["table"] == "public.orders"
        assert "step" in err or "error" in err

    @pytest.mark.asyncio
    async def test_single_table_failure_does_not_block_others(self):
        """When one table fails during profiling, other tables should still be profiled."""
        runner = ProfileRunner()
        schema_data = [{"name": "id", "type": "int", "nullable": False}]
        conn = make_mock_connector(
            tables=["public.good", "public.bad"],
            schema=schema_data,
            row_count=100,
        )
        # Make get_schema fail only for "public.bad"
        original_get_schema = conn.get_schema

        async def selective_fail(table_name):
            if table_name == "public.bad":
                raise RuntimeError("bad table")
            return await original_get_schema(table_name)

        conn.get_schema = selective_fail

        result = await runner.run(conn, target_tables=["public.good", "public.bad"])
        assert "public.good" in result.tables
        assert len(result.errors) >= 1

    @pytest.mark.asyncio
    async def test_run_with_all_tables_failing_returns_empty_tables(self):
        """When all tables fail profiling, tables should be empty but errors populated."""
        runner = ProfileRunner()
        conn = make_mock_connector(tables=["public.t1", "public.t2"])
        conn.get_schema = AsyncMock(side_effect=RuntimeError("all fail"))

        result = await runner.run(conn, target_tables=["public.t1", "public.t2"])
        assert result.tables == {}
        assert len(result.errors) >= 2
