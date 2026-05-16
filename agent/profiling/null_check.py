"""Null-check profiler — measures null percentages per column."""

import datetime


class NullCheckProfiler:
    """Profiles null-value prevalence across columns of a table."""

    async def profile(
        self, connector, table_name: str, columns: list[str]
    ) -> dict:
        """Return null-percentage data for *columns* in *table_name*.

        Result shape:
          {"table": str, "null_percentages": dict, "profiled_at": str}
        """
        if not columns:
            return {
                "table": table_name,
                "null_percentages": {},
                "profiled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }

        null_percentages = await connector.get_null_counts(table_name, columns)

        return {
            "table": table_name,
            "null_percentages": null_percentages,
            "profiled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
