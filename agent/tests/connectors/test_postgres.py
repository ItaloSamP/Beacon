"""Unit tests for PostgresConnector — RED PHASE: module does not exist yet."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# RED PHASE — these imports will fail until the modules are created
from agent.connectors.postgres import (  # noqa: E402
    PostgresConnector,
    PostgresConnectionError,
    PostgresTimeoutError,
)


class TestPostgresConnector:
    """PostgresConnector unit tests using mocked asyncpg."""

    # ── helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _make_config(**overrides):
        return {
            "host": "localhost",
            "port": 5432,
            "database": "testdb",
            "username": "tester",
            "password": "secret",
            **overrides,
        }

    # ── Connect ──────────────────────────────────────────────────────

    class TestConnect:
        @pytest.mark.asyncio
        async def test_connect_establishes_connection(self):
            """connect() should call asyncpg.connect with a valid DSN derived from config."""
            # RED PHASE — test will fail at import / missing implementation
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
                await connector.connect(config)
                mock_connect.assert_awaited_once()

        @pytest.mark.asyncio
        async def test_connect_stores_conn_attribute(self):
            """After a successful connect, _conn should be set to the asyncpg connection."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            with patch("asyncpg.connect", return_value=fake_conn):
                await connector.connect(TestPostgresConnector._make_config())
            assert connector._conn is fake_conn

        @pytest.mark.asyncio
        async def test_connect_with_non_default_port(self):
            """connect() must honour a non-default port from connection_config."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config(port=5433)
            with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
                await connector.connect(config)
                dsn = mock_connect.call_args[0][0]
                assert ":5433" in dsn or "port=5433" in str(mock_connect.call_args)

    # ── Disconnect ───────────────────────────────────────────────────

    class TestDisconnect:
        @pytest.mark.asyncio
        async def test_disconnect_closes_connection(self):
            """disconnect() should call close() on the underlying asyncpg connection."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.close = AsyncMock()
            connector._conn = fake_conn
            await connector.disconnect()
            fake_conn.close.assert_awaited_once()

        @pytest.mark.asyncio
        async def test_disconnect_is_noop_when_not_connected(self):
            """disconnect() should not raise when _conn is None."""
            connector = PostgresConnector()
            try:
                await connector.disconnect()
            except Exception as exc:
                pytest.fail(f"disconnect() raised {exc!r} when _conn was None")

    # ── get_tables ───────────────────────────────────────────────────

    class TestGetTables:
        @pytest.mark.asyncio
        async def test_returns_full_table_names(self):
            """get_tables() should return a list of 'schema.table_name' strings."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(
                return_value=[
                    MagicMock(table_name="orders", table_schema="public"),
                    MagicMock(table_name="users", table_schema="public"),
                ]
            )
            connector._conn = fake_conn

            tables = await connector.get_tables()
            assert tables == ["public.orders", "public.users"]

        @pytest.mark.asyncio
        async def test_empty_database_returns_empty_list(self):
            """When there are no tables, get_tables() returns an empty list."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(return_value=[])
            connector._conn = fake_conn

            tables = await connector.get_tables()
            assert tables == []

        @pytest.mark.asyncio
        async def test_filters_system_schemas(self):
            """get_tables() should exclude pg_catalog / information_schema tables."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(
                return_value=[
                    MagicMock(table_name="orders", table_schema="public"),
                    MagicMock(table_name="pg_stat", table_schema="pg_catalog"),
                    MagicMock(table_name="columns", table_schema="information_schema"),
                ]
            )
            connector._conn = fake_conn

            tables = await connector.get_tables()
            assert all(not t.startswith("pg_catalog.") for t in tables)
            assert all(not t.startswith("information_schema.") for t in tables)

    # ── get_schema ───────────────────────────────────────────────────

    class TestGetSchema:
        @pytest.mark.asyncio
        async def test_returns_column_definitions(self):
            """get_schema() should return a list of dicts with name, type, and nullable."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(
                return_value=[
                    MagicMock(column_name="id", data_type="integer", is_nullable=False),
                    MagicMock(column_name="email", data_type="character varying", is_nullable=True),
                ]
            )
            connector._conn = fake_conn

            schema = await connector.get_schema("public.orders")
            assert schema == [
                {"name": "id", "type": "integer", "nullable": False},
                {"name": "email", "type": "character varying", "nullable": True},
            ]

        @pytest.mark.asyncio
        async def test_handles_table_not_found(self):
            """get_schema() should return an empty list for a non-existent table."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(return_value=[])
            connector._conn = fake_conn

            schema = await connector.get_schema("public.non_existent")
            assert schema == []

    # ── get_row_count ────────────────────────────────────────────────

    class TestGetRowCount:
        @pytest.mark.asyncio
        async def test_returns_count(self):
            """get_row_count() should return the COUNT(*) result as an int."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetchval = AsyncMock(return_value=42)
            connector._conn = fake_conn

            count = await connector.get_row_count("public.orders")
            assert count == 42

        @pytest.mark.asyncio
        async def test_empty_table_returns_zero(self):
            """get_row_count() should return 0 for an empty table."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetchval = AsyncMock(return_value=0)
            connector._conn = fake_conn

            count = await connector.get_row_count("public.events")
            assert count == 0

    # ── get_null_counts ──────────────────────────────────────────────

    class TestGetNullCounts:
        @pytest.mark.asyncio
        async def test_returns_null_percentages(self):
            """get_null_counts() should compute null % for each requested column."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            # fetch returns one row: each column's null count
            fake_row = MagicMock()
            fake_row.__getitem__ = lambda self, key: {"email_nulls": 10, "phone_nulls": 120}.get(key, 0)
            fake_conn.fetchrow = AsyncMock(return_value=fake_row)
            fake_conn.fetchval = AsyncMock(return_value=1000)
            connector._conn = fake_conn

            nulls = await connector.get_null_counts("public.orders", ["email", "phone"])
            assert "email" in nulls
            assert "phone" in nulls
            assert nulls["email"] == pytest.approx(0.01, rel=1e-3)
            assert nulls["phone"] == pytest.approx(0.12, rel=1e-3)

        @pytest.mark.asyncio
        async def test_all_non_null_columns_return_zero(self):
            """get_null_counts() should return 0.0 for columns with no nulls."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_row = MagicMock()
            fake_row.__getitem__ = lambda self, key: 0
            fake_conn.fetchrow = AsyncMock(return_value=fake_row)
            fake_conn.fetchval = AsyncMock(return_value=500)
            connector._conn = fake_conn

            nulls = await connector.get_null_counts("public.orders", ["id"])
            assert nulls["id"] == 0.0

        @pytest.mark.asyncio
        async def test_all_null_columns_return_one(self):
            """get_null_counts() should return 1.0 (100 %) when every row is null."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_row = MagicMock()
            fake_row.__getitem__ = lambda self, key: 200
            fake_conn.fetchrow = AsyncMock(return_value=fake_row)
            fake_conn.fetchval = AsyncMock(return_value=200)
            connector._conn = fake_conn

            nulls = await connector.get_null_counts("public.orders", ["legacy_col"])
            assert nulls["legacy_col"] == pytest.approx(1.0)

        @pytest.mark.asyncio
        async def test_empty_columns_list_returns_empty_dict(self):
            """get_null_counts() with no columns should return an empty dict."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetchval = AsyncMock(return_value=1000)
            connector._conn = fake_conn

            nulls = await connector.get_null_counts("public.orders", [])
            assert nulls == {}

    # ── get_basic_stats ──────────────────────────────────────────────

    class TestGetBasicStats:
        @pytest.mark.asyncio
        async def test_returns_min_max_avg(self):
            """get_basic_stats() should return min/max/avg per numeric column."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_row = MagicMock()
            fake_row.__getitem__ = lambda self, key: {
                "price_min": 1.0,
                "price_max": 999.99,
                "price_avg": 150.5,
            }.get(key)
            fake_conn.fetchrow = AsyncMock(return_value=fake_row)
            connector._conn = fake_conn

            stats = await connector.get_basic_stats("public.orders", ["price"])
            assert "price" in stats
            assert stats["price"]["min"] == 1.0
            assert stats["price"]["max"] == 999.99
            assert stats["price"]["avg"] == 150.5

        @pytest.mark.asyncio
        async def test_empty_numeric_columns_returns_empty_dict(self):
            """get_basic_stats() should return {} when no numeric columns are requested."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            connector._conn = fake_conn

            stats = await connector.get_basic_stats("public.orders", [])
            assert stats == {}

    # ── Error handling ───────────────────────────────────────────────

    class TestErrorHandling:
        @pytest.mark.asyncio
        async def test_connect_connection_refused(self):
            """connect() should raise a connection error when the DB is unreachable."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            with patch(
                "asyncpg.connect",
                new_callable=AsyncMock,
                side_effect=OSError("Connection refused"),
            ):
                with pytest.raises(Exception) as exc_info:
                    await connector.connect(config)
                assert "Connection refused" in str(exc_info.value) or isinstance(exc_info.value, OSError)

        @pytest.mark.asyncio
        async def test_connect_timeout(self):
            """connect() raising an asyncio.TimeoutError should surface."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            import asyncio
            with patch(
                "asyncpg.connect",
                new_callable=AsyncMock,
                side_effect=asyncio.TimeoutError("timed out"),
            ):
                with pytest.raises((asyncio.TimeoutError, Exception)):
                    await connector.connect(config)

        @pytest.mark.asyncio
        async def test_get_tables_without_connect_raises(self):
            """Calling get_tables() without prior connect() should raise."""
            connector = PostgresConnector()
            with pytest.raises((AttributeError, RuntimeError, ConnectionError)):
                await connector.get_tables()

        @pytest.mark.asyncio
        async def test_methods_do_not_mutate_state(self):
            """Read-only methods should not alter _conn or other internal state."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(return_value=[])
            connector._conn = fake_conn

            before = id(connector._conn)
            await connector.get_tables()
            assert id(connector._conn) == before

    # ── Specific exception types ──────────────────────────────────────

    class TestConnectionExceptions:
        @pytest.mark.asyncio
        async def test_connect_refused_raises_specific_error(self):
            """Connection refused must raise PostgresConnectionError, NOT generic Exception."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            with patch(
                "asyncpg.connect",
                new_callable=AsyncMock,
                side_effect=OSError("Connection refused"),
            ):
                with pytest.raises(PostgresConnectionError):
                    await connector.connect(config)

        @pytest.mark.asyncio
        async def test_connect_timeout_raises_specific_error(self):
            """Connection timeout must raise PostgresTimeoutError, not a raw asyncio.TimeoutError."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            with patch(
                "asyncpg.connect",
                new_callable=AsyncMock,
                side_effect=asyncio.TimeoutError("timed out"),
            ):
                with pytest.raises(PostgresTimeoutError):
                    await connector.connect(config)

        @pytest.mark.asyncio
        async def test_connect_invalid_credentials_raises_specific_error(self):
            """Invalid credentials (invalid password) must raise PostgresConnectionError."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config()

            with patch(
                "asyncpg.connect",
                new_callable=AsyncMock,
                side_effect=OSError("password authentication failed"),
            ):
                with pytest.raises(PostgresConnectionError):
                    await connector.connect(config)

    # ── Config validation ─────────────────────────────────────────────

    class TestConfigValidation:
        @pytest.mark.asyncio
        async def test_connect_missing_host_raises_value_error(self):
            """connect() should validate config and raise ValueError if 'host' is missing."""
            connector = PostgresConnector()
            config = {"port": 5432, "database": "db", "username": "u", "password": "p"}

            with pytest.raises(ValueError):
                await connector.connect(config)

        @pytest.mark.asyncio
        async def test_connect_missing_database_raises_value_error(self):
            """connect() should validate config and raise ValueError if 'database' is missing."""
            connector = PostgresConnector()
            config = {"host": "localhost", "port": 5432, "username": "u", "password": "p"}

            with pytest.raises(ValueError):
                await connector.connect(config)

        @pytest.mark.asyncio
        async def test_connect_missing_username_raises_value_error(self):
            """connect() should validate config and raise ValueError if 'username' is missing."""
            connector = PostgresConnector()
            config = {"host": "localhost", "port": 5432, "database": "db", "password": "p"}

            with pytest.raises(ValueError):
                await connector.connect(config)

        @pytest.mark.asyncio
        async def test_connect_empty_host_raises_value_error(self):
            """connect() should reject empty-string host."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config(host="")

            with pytest.raises(ValueError):
                await connector.connect(config)

    # ── Reconnection ──────────────────────────────────────────────────

    class TestReconnection:
        @pytest.mark.asyncio
        async def test_connect_disconnects_before_reconnecting(self):
            """Calling connect() while already connected should close the old connection first."""
            connector = PostgresConnector()
            old_conn = AsyncMock()
            old_conn.close = AsyncMock()
            connector._conn = old_conn

            new_conn = AsyncMock()
            with patch("asyncpg.connect", return_value=new_conn):
                await connector.connect(TestPostgresConnector._make_config())

            old_conn.close.assert_awaited_once()
            assert connector._conn is new_conn

    # ── Edge cases ────────────────────────────────────────────────────

    class TestEdgeCases:
        @pytest.mark.asyncio
        async def test_table_with_special_characters(self):
            """get_schema / get_row_count should handle table names with special characters."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetch = AsyncMock(return_value=[])
            fake_conn.fetchval = AsyncMock(return_value=0)
            connector._conn = fake_conn

            # Table names with dots, hyphens, spaces (quoted identifiers)
            special_tables = [
                "public.my-table",
                "public.\"Weird Name\"",
                "schema_1.table_2",
            ]
            for table_name in special_tables:
                schema = await connector.get_schema(table_name)
                assert isinstance(schema, list)
                count = await connector.get_row_count(table_name)
                assert isinstance(count, int)

        @pytest.mark.asyncio
        async def test_get_null_counts_empty_table(self):
            """get_null_counts() on a table with 0 rows should return 0.0 for all columns."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetchval = AsyncMock(return_value=0)
            fake_conn.fetchrow = AsyncMock(return_value=None)
            connector._conn = fake_conn

            nulls = await connector.get_null_counts("public.empty_table", ["col_a", "col_b"])
            assert nulls == {"col_a": 0.0, "col_b": 0.0}

        @pytest.mark.asyncio
        async def test_get_basic_stats_skips_non_numeric(self):
            """get_basic_stats() should skip non-numeric columns gracefully."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.fetchrow = AsyncMock(return_value=None)
            connector._conn = fake_conn

            stats = await connector.get_basic_stats("public.orders", ["name"])
            assert stats == {}

        @pytest.mark.asyncio
        async def test_connect_with_password_special_characters(self):
            """DSN construction must handle passwords with special characters (@, :, /, %, etc.)."""
            connector = PostgresConnector()
            config = TestPostgresConnector._make_config(password="p@ss:wo/rd%")

            with patch("asyncpg.connect", new_callable=AsyncMock) as mock_connect:
                await connector.connect(config)
                dsn = mock_connect.call_args[0][0]
                # DSN must contain the password (URL-encoded if needed)
                assert "p@ss:wo/rd%" in dsn or "p%40ss%3Awo%2Frd%25" in dsn

        @pytest.mark.asyncio
        async def test_disconnect_idempotent(self):
            """Calling disconnect() multiple times should not raise."""
            connector = PostgresConnector()
            fake_conn = AsyncMock()
            fake_conn.close = AsyncMock()
            connector._conn = fake_conn

            await connector.disconnect()
            await connector.disconnect()  # second call should be safe
            # close should only be called once (on the actual connection)
            fake_conn.close.assert_awaited_once()
