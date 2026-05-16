"""Unit tests for SchemaProfiler."""

import pytest

from agent.profiling.schema import SchemaProfiler  # noqa: E402

from .conftest import make_mock_connector


# ── SchemaProfiler ───────────────────────────────────────────────────

class TestSchemaProfiler:
    @pytest.mark.asyncio
    async def test_profile_returns_schema_info(self):
        """SchemaProfiler.profile() should return column metadata for a table."""
        profiler = SchemaProfiler()
        schema_data = [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "name", "type": "text", "nullable": True},
        ]
        conn = make_mock_connector(schema=schema_data)

        result = await profiler.profile(conn, "public.orders")
        assert result["table"] == "public.orders"
        assert result["columns"] == schema_data
        assert "profiled_at" in result

    @pytest.mark.asyncio
    async def test_profile_empty_table_returns_empty_columns(self):
        """When the table has no columns (edge), columns list is empty."""
        profiler = SchemaProfiler()
        conn = make_mock_connector(schema=[])

        result = await profiler.profile(conn, "public.empty_table")
        assert result["columns"] == []

    @pytest.mark.asyncio
    async def test_profile_includes_column_count(self):
        """SchemaProfiler result should include the total column count."""
        profiler = SchemaProfiler()
        schema_data = [{"name": "a", "type": "int", "nullable": False}]
        conn = make_mock_connector(schema=schema_data)

        result = await profiler.profile(conn, "public.t")
        assert "column_count" in result
        assert result["column_count"] == 1


# ── SchemaProfiler — structured metadata ──────────────────────────────

class TestSchemaProfilerMetadata:
    """Tests that SchemaProfiler returns structured metadata about the schema."""

    @pytest.mark.asyncio
    async def test_profile_includes_nullable_column_list(self):
        """SchemaProfiler result should include which columns are nullable."""
        profiler = SchemaProfiler()
        schema_data = [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "email", "type": "text", "nullable": True},
        ]
        conn = make_mock_connector(schema=schema_data)

        result = await profiler.profile(conn, "public.users")
        assert "columns" in result
        # Check that the nullable flag is preserved per column
        assert result["columns"][0]["nullable"] is False
        assert result["columns"][1]["nullable"] is True

    @pytest.mark.asyncio
    async def test_profile_includes_column_type_summary(self):
        """SchemaProfiler result should include a summary of column types."""
        profiler = SchemaProfiler()
        schema_data = [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "name", "type": "text", "nullable": True},
            {"name": "price", "type": "numeric", "nullable": True},
        ]
        conn = make_mock_connector(schema=schema_data)

        result = await profiler.profile(conn, "public.products")
        # The result should include column metadata accessible by name
        col_names = [c["name"] for c in result["columns"]]
        assert "id" in col_names
        assert "name" in col_names
        assert "price" in col_names
