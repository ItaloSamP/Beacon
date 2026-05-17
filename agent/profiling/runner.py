"""Profile runner — orchestrates profiling across tables and profilers."""

import datetime
import time

from agent.profiling.null_check import NullCheckProfiler
from agent.profiling.schema import SchemaProfiler
from agent.profiling.volume import VolumeProfiler


class ProfileResult:
    """Aggregate result of a profiling run.

    Attributes:
        tables: ``{table_name: {"schema": {...}, "volume": {...}, "nulls": {...}}}``
        errors: List of ``{"table", "step", "error"}`` dicts for failed tables.
        profiled_at: ISO-8601 timestamp string when the run was created.
        timing: ``{"schema_ms": float, "volume_ms": float, "nulls_ms": float}``
    """

    def __init__(
        self,
        tables: dict,
        errors: list,
        profiled_at: str,
        timing: dict,
    ) -> None:
        self.tables = tables
        self.errors = errors
        self.profiled_at = profiled_at
        self.timing = timing

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation."""
        return {
            "profiled_at": self.profiled_at,
            "tables": self.tables,
            "errors": self.errors,
            "timing": self.timing,
        }


class ProfileRunner:
    """Orchestrates schema, volume, and null-check profiling across target tables.

    Usage::

        runner = ProfileRunner(connector=some_connector)
        result = await runner.run(target_tables=["public.orders"])
        print(result.to_dict())
    """

    def __init__(self, connector=None) -> None:
        self.connector = connector

    async def run(self, connector=None, target_tables=None) -> ProfileResult:
        """Execute profiling for every table in *target_tables*.

        *connector* can be supplied explicitly or via the constructor.
        Profiling order per table: schema → volume → null-check.
        Errors are collected per table and do not block subsequent tables.
        """
        # --- resolve connector ---
        conn = connector if connector is not None else self.connector
        if target_tables is None:
            target_tables = []

        tables: dict = {}
        errors: list = []
        timing: dict = {
            "schema_ms": 0.0,
            "volume_ms": 0.0,
            "nulls_ms": 0.0,
        }

        # Resolve available tables so we can skip non-existent ones
        available_tables = set(await conn.get_tables())

        schema_profiler = SchemaProfiler()
        volume_profiler = VolumeProfiler()
        null_profiler = NullCheckProfiler()

        profiled_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for tbl in target_tables:
            # Skip tables not known to the connector
            if tbl not in available_tables:
                continue
            # ── schema step ──────────────────────────────────
            try:
                t0 = time.perf_counter()
                schema_result = await schema_profiler.profile(conn, tbl)
                timing["schema_ms"] += (time.perf_counter() - t0) * 1000
            except Exception as e:
                errors.append(
                    {"table": tbl, "step": "schema", "error": str(e)}
                )
                continue  # skip this table entirely

            # ── volume step ──────────────────────────────────
            try:
                t0 = time.perf_counter()
                volume_result = await volume_profiler.profile(conn, tbl)
                timing["volume_ms"] += (time.perf_counter() - t0) * 1000
            except Exception as e:
                errors.append(
                    {"table": tbl, "step": "volume", "error": str(e)}
                )
                continue

            # ── null-check step ──────────────────────────────
            # Discover columns from the connector (reuse schema data).
            try:
                cols = await conn.get_schema(tbl)
                column_names = [c["name"] for c in cols]
            except Exception as e:
                errors.append(
                    {"table": tbl, "step": "nulls", "error": str(e)}
                )
                continue

            try:
                t0 = time.perf_counter()
                nulls_result = await null_profiler.profile(
                    conn, tbl, columns=column_names
                )
                timing["nulls_ms"] += (time.perf_counter() - t0) * 1000
            except Exception as e:
                errors.append(
                    {"table": tbl, "step": "nulls", "error": str(e)}
                )
                continue

            # ── store ────────────────────────────────────────
            tables[tbl] = {
                "schema": schema_result,
                "volume": volume_result,
                "nulls": nulls_result,
            }

        return ProfileResult(
            tables=tables,
            errors=errors,
            profiled_at=profiled_at,
            timing=timing,
        )
