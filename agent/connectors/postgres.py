"""PostgreSQL connector using asyncpg for the Beacon local agent."""

import asyncio
import urllib.parse

import asyncpg


class PostgresConnectionError(Exception):
    """Raised when a connection to PostgreSQL fails."""


class PostgresTimeoutError(PostgresConnectionError):
    """Raised when a connection to PostgreSQL times out."""


class PostgresConnector:
    """Async PostgreSQL connector wrapping an asyncpg connection pool/connection.

    Handles DSN construction, connection lifecycle, and metadata queries
    against the customer database.  Does NOT emit phantom alerts — it raises
    exceptions on failure and lets the caller decide what to do.
    """

    def __init__(self) -> None:
        self._conn: asyncpg.Connection | None = None

    # ── connection lifecycle ─────────────────────────────────────────

    async def connect(self, connection_config: dict) -> None:
        """Establish a connection to PostgreSQL using the supplied *connection_config*.

        Required keys: ``host``, ``database``, ``username``.
        Optional keys: ``port`` (default 5432), ``password`` (default "").

        Raises *ValueError* if a required key is missing or empty.
        If already connected the old connection is closed first (idempotent).
        """
        # --- validate required fields ---------------------------------
        for key in ("host", "database", "username"):
            if key not in connection_config or not connection_config[key]:
                raise ValueError(
                    f"connection_config missing or empty: '{key}'"
                )

        # --- disconnect if already connected --------------------------
        if self._conn is not None:
            await self.disconnect()

        # --- build DSN from config ------------------------------------
        username = connection_config["username"]
        password = connection_config.get("password", "")
        host = connection_config["host"]
        port = connection_config.get("port", 5432)
        database = connection_config["database"]

        # URL-encode password so special characters (@, :, /, %) work
        encoded_password = urllib.parse.quote(password, safe="")
        dsn = (
            f"postgresql://{username}:{encoded_password}"
            f"@{host}:{port}/{database}"
        )

        # --- connect with timeout -------------------------------------
        try:
            self._conn = await asyncio.wait_for(
                asyncpg.connect(dsn), timeout=10.0
            )
        except asyncio.TimeoutError:
            raise PostgresTimeoutError("Connection timed out") from None
        except OSError as e:
            raise PostgresConnectionError(str(e)) from e
        except Exception as e:
            raise PostgresConnectionError(str(e)) from e

    async def disconnect(self) -> None:
        """Close the underlying connection if one exists — idempotent."""
        if self._conn is not None:
            conn = self._conn
            self._conn = None
            await conn.close()

    # ── internal helpers ─────────────────────────────────────────────

    async def _ensure_connected(self) -> None:
        """Raise *RuntimeError* if the connector has not been connected yet."""
        if self._conn is None:
            raise RuntimeError("Not connected to PostgreSQL")

    @staticmethod
    def _safe_table_ref(table_name: str) -> str:
        """Return a double-quoted, schema-qualified table reference."""
        if "." in table_name:
            schema, table = table_name.split(".", 1)
            return f'"{schema}"."{table}"'
        return f'"{table_name}"'

    # ── metadata queries ─────────────────────────────────────────────

    async def get_tables(self) -> list[str]:
        """Return all user tables as ``["schema.table_name", ...]``.

        Excludes ``pg_catalog`` and ``information_schema`` schemas.
        """
        await self._ensure_connected()

        rows = await self._conn.fetch(
            "SELECT table_schema, table_name "
            "FROM information_schema.tables "
            "WHERE table_schema NOT IN ('pg_catalog', 'information_schema') "
            "ORDER BY table_schema, table_name"
        )
        # Client-side safety filter — belt-and-suspenders with the SQL WHERE
        return [
            f"{r.table_schema}.{r.table_name}"
            for r in rows
            if r.table_schema not in ("pg_catalog", "information_schema")
        ]

    async def get_schema(self, table_name: str) -> list[dict]:
        """Return column definitions for *table_name*.

        Each dict contains ``name``, ``type``, and ``nullable`` keys.
        Returns an empty list when the table does not exist.
        """
        await self._ensure_connected()

        if "." in table_name:
            schema, table = table_name.split(".", 1)
        else:
            schema, table = "public", table_name

        rows = await self._conn.fetch(
            "SELECT column_name, data_type, is_nullable::boolean AS is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema = $1 AND table_name = $2 "
            "ORDER BY ordinal_position",
            schema,
            table,
        )
        return [
            {
                "name": r.column_name,
                "type": r.data_type,
                "nullable": r.is_nullable,
            }
            for r in rows
        ]

    async def get_row_count(self, table_name: str) -> int:
        """Return total row count for *table_name*."""
        await self._ensure_connected()
        safe = self._safe_table_ref(table_name)
        count = await self._conn.fetchval(f"SELECT COUNT(*) FROM {safe}")
        return count if count is not None else 0

    async def get_null_counts(
        self, table_name: str, columns: list[str]
    ) -> dict[str, float]:
        """Return the null percentage (0.0–1.0) for each column in *columns*.

        If the table has zero rows every column is reported as 0.0.
        If *columns* is empty an empty dict is returned.
        """
        await self._ensure_connected()

        if not columns:
            return {}

        safe = self._safe_table_ref(table_name)

        # --- total row count ------------------------------------------
        total = await self._conn.fetchval(f"SELECT COUNT(*) FROM {safe}")
        total = total if total is not None else 0

        if total == 0:
            return {col: 0.0 for col in columns}

        # --- build single query: COUNT(*) - COUNT(col) per column -----
        null_exprs = []
        for col in columns:
            # alias uses col name + "_nulls" to avoid collisions
            null_exprs.append(
                f'(COUNT(*) - COUNT("{col}")) AS "{col}_nulls"'
            )

        query = f"SELECT {', '.join(null_exprs)} FROM {safe}"
        row = await self._conn.fetchrow(query)

        if row is None:
            return {col: 0.0 for col in columns}

        return {
            col: row[f"{col}_nulls"] / total
            for col in columns
        }

    async def get_basic_stats(
        self, table_name: str, numeric_columns: list[str]
    ) -> dict[str, dict]:
        """Return ``{col: {min, max, avg}, ...}`` for each numeric column.

        If *numeric_columns* is empty or the query returns no rows an
        empty dict is returned.
        """
        await self._ensure_connected()

        if not numeric_columns:
            return {}

        safe = self._safe_table_ref(table_name)

        stat_exprs = []
        for col in numeric_columns:
            stat_exprs.append(f'MIN("{col}") AS "{col}_min"')
            stat_exprs.append(f'MAX("{col}") AS "{col}_max"')
            stat_exprs.append(f'AVG("{col}") AS "{col}_avg"')

        query = f"SELECT {', '.join(stat_exprs)} FROM {safe}"
        row = await self._conn.fetchrow(query)

        if row is None:
            return {}

        result: dict[str, dict] = {}
        for col in numeric_columns:
            result[col] = {
                "min": row[f"{col}_min"],
                "max": row[f"{col}_max"],
                "avg": row[f"{col}_avg"],
            }
        return result
