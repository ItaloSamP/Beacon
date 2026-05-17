"""Schema profiler — extracts column-level metadata from a table."""

import datetime


class SchemaProfiler:
    """Profiles the column structure of a single table."""

    async def profile(self, connector, table_name: str) -> dict:
        """Return schema metadata for *table_name*.

        Result shape:
          {"table": str, "columns": [...], "column_count": int, "profiled_at": str}
        """
        columns = await connector.get_schema(table_name)

        return {
            "table": table_name,
            "columns": columns,
            "column_count": len(columns),
            "profiled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
