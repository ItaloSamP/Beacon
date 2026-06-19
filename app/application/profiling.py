"""Cloud-side profiling module — wraps agent profiling for cloud pipeline execution.

Reuses the agent's PostgreSQL connector and profilers directly since both the
agent and cloud stacks use ``asyncpg`` under the hood.
"""

from cryptography.fernet import InvalidToken

# Reuse agent profiling code — both stacks share asyncpg
from agent.connectors.postgres import (
    PostgresConnectionError,
    PostgresConnector,
    PostgresTimeoutError,
)
from agent.profiling import ProfileRunner
from app.infrastructure.crypto import decrypt_config


class CloudProfiler:
    """Profiles a data source using the agent's PostgreSQL connector and profilers.

    Handles connection-config decryption, connection lifecycle, and graceful
    error handling — failures are returned as error-marked dicts rather than
    raised, so callers can decide how to process them.
    """

    async def profile(
        self,
        connection_config: dict,
        pipeline_type: str,
        target_tables: list | None = None,
        connect_timeout: float = 10.0,
    ) -> dict:
        """Run profiling against a data source.

        Args:
            connection_config: DataSource ``connection_config`` (may be encrypted
                as ``{"_encrypted": "..."}`` or plain in dev/test mode).
            pipeline_type: Pipeline type string (``volume`` / ``null_check`` / ``schema_change``).
            target_tables: Fully-qualified table names to profile (e.g.
                ``["public.orders"]``).  If empty or *None* nothing is profiled.
            connect_timeout: Connection timeout in seconds (default 10).

        Returns:
            A ``metrics_json``-compatible dict.  On success the dict contains
            ``tables``, ``errors``, ``timing``, and ``profiled_at``.  On failure
            it carries an ``error`` key and a human-readable ``message``.
        """
        # --- decrypt connection config -----------------------------------------
        try:
            config = self._prepare_config(connection_config)
        except (InvalidToken, ValueError) as e:
            return self._error_result(
                pipeline_type, "invalid_config", str(e),
                error_step="config",
            )

        # --- connect and profile -----------------------------------------------
        connector = PostgresConnector()
        try:
            await connector.connect(config)
            runner = ProfileRunner(connector=connector)
            result = await runner.run(target_tables=target_tables or [])
            metrics = result.to_dict()
            metrics["profiling_type"] = pipeline_type
            return metrics
        except PostgresTimeoutError as e:
            return self._error_result(
                pipeline_type, "connection_timeout", str(e),
                error_step="connect",
            )
        except PostgresConnectionError as e:
            return self._error_result(
                pipeline_type, "connection_failed", str(e),
                error_step="connect",
            )
        except OSError as e:
            return self._error_result(
                pipeline_type, "connection_failed", str(e),
                error_step="connect",
            )
        except ValueError as e:
            return self._error_result(
                pipeline_type, "invalid_config", str(e),
                error_step="config",
            )
        finally:
            await connector.disconnect()

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _prepare_config(connection_config: dict) -> dict:
        """Decrypt *connection_config* if it is wrapped, otherwise return as-is.

        The DataSource stores encrypted configs as ``{"_encrypted": "<base64>"}``.
        Plain configs (dev / test with no FERNET_KEY) are returned unchanged.
        """
        if isinstance(connection_config, dict) and "_encrypted" in connection_config:
            return decrypt_config(connection_config["_encrypted"])
        # Plaintext config (dev / test mode, or legacy data)
        return connection_config

    @staticmethod
    def _error_result(
        pipeline_type: str,
        error_code: str,
        message: str,
        error_step: str = "connect",
    ) -> dict:
        """Build a metrics_json-compatible error dict."""
        return {
            "error": error_code,
            "message": message,
            "profiling_type": pipeline_type,
            "tables": {},
            "errors": [
                {"table": "*", "step": error_step, "error": message}
            ],
            "timing": {"schema_ms": 0.0, "volume_ms": 0.0, "nulls_ms": 0.0},
        }
