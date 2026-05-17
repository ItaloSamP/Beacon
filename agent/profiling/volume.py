"""Volume profiler — counts rows in a table."""

import datetime


class VolumeProfiler:
    """Profiles the row volume of a single table."""

    async def profile(self, connector, table_name: str) -> dict:
        """Return row-count metadata for *table_name*.

        Result shape:
          {"table": str, "row_count": int, "profiled_at": str}
        """
        row_count = await connector.get_row_count(table_name)

        return {
            "table": table_name,
            "row_count": row_count,
            "profiled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
