"""Shared fixtures for profiling tests."""

from unittest.mock import AsyncMock


def make_mock_connector(*, tables=None, schema=None, row_count=0, null_counts=None, basic_stats=None):
    """Build a mock connector that returns the supplied fixtures."""
    conn = AsyncMock()
    conn.get_tables = AsyncMock(return_value=tables or ["public.orders"])
    conn.get_schema = AsyncMock(return_value=schema or [])
    conn.get_row_count = AsyncMock(return_value=row_count)
    conn.get_null_counts = AsyncMock(return_value=null_counts or {})
    conn.get_basic_stats = AsyncMock(return_value=basic_stats or {})
    return conn
