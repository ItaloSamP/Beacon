"""
Unit tests for CloudProfiler — connection_config handling and error returns.

Tests verify:
- Encrypted connection_config decryption
- Plaintext config passthrough (dev/test mode)
- Connection error → error-marked dict (not raised exception)
- Invalid config → error-marked dict
- Successful profiling flow (mocked asyncpg)
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.application.profiling import CloudProfiler

# -----------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------

@pytest.fixture
def profiler():
    return CloudProfiler()


@pytest.fixture
def plain_config():
    """Unencrypted connection config (dev/test mode)."""
    return {
        "host": "localhost",
        "port": 5432,
        "database": "testdb",
        "username": "testuser",
        "password": "testpass",
    }


@pytest.fixture
def sample_profile_result():
    """A realistic ProfileResult.to_dict() return value."""
    return {
        "profiled_at": "2026-01-01T00:00:00Z",
        "tables": {
            "public.orders": {
                "schema": {"table": "public.orders", "columns": [], "column_count": 2, "profiled_at": "..."},
                "volume": {"table": "public.orders", "row_count": 1000, "profiled_at": "..."},
                "nulls": {"table": "public.orders", "null_percentages": {"col": 0.0}, "profiled_at": "..."},
            }
        },
        "errors": [],
        "timing": {"schema_ms": 5.0, "volume_ms": 3.0, "nulls_ms": 10.0},
    }


# -----------------------------------------------------------------
# Config preparation
# -----------------------------------------------------------------

class TestConfigPreparation:
    """Tests for _prepare_config — decrypt vs passthrough."""

    def test_plain_config_passthrough(self, profiler, plain_config):
        """Plaintext config should be returned unchanged."""
        result = profiler._prepare_config(plain_config)
        assert result == plain_config
        assert result["host"] == "localhost"

    def test_empty_dict_passthrough(self, profiler):
        """Empty dict should pass through (handled by PostgresConnector)."""
        result = profiler._prepare_config({})
        assert result == {}

    @patch("app.application.profiling.decrypt_config")
    def test_encrypted_config_decrypted(self, mock_decrypt, profiler):
        """Config with _encrypted key should be passed to decrypt_config."""
        mock_decrypt.return_value = {
            "host": "prod-db.example.com",
            "port": 5432,
            "database": "proddb",
            "username": "produser",
            "password": "s3cret",
        }
        encrypted_config = {"_encrypted": "base64encodedstuff==="}

        result = profiler._prepare_config(encrypted_config)

        mock_decrypt.assert_called_once_with("base64encodedstuff===")
        assert result["host"] == "prod-db.example.com"
        assert result["password"] == "s3cret"


# -----------------------------------------------------------------
# Error handling
# -----------------------------------------------------------------

class TestErrorHandling:
    """Tests for graceful error handling in CloudProfiler.profile()."""

    @pytest.mark.asyncio
    async def test_invalid_config_returns_error_dict(self, profiler):
        """Missing required fields → error dict, not exception."""
        bad_config = {"host": "localhost"}  # missing database, username

        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock(
                side_effect=ValueError("connection_config missing or empty: 'database'")
            )
            conn_instance.disconnect = AsyncMock()

            result = await profiler.profile(
                connection_config=bad_config,
                pipeline_type="volume",
                target_tables=["public.orders"],
            )

        assert result["error"] == "invalid_config"
        assert "database" in result["message"].lower()
        assert result["tables"] == {}
        assert len(result["errors"]) == 1

    @pytest.mark.asyncio
    async def test_connection_timeout_returns_error_dict(self, profiler, plain_config):
        """Connection timeout → error dict with 'connection_timeout'."""
        from agent.connectors.postgres import PostgresTimeoutError

        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock(
                side_effect=PostgresTimeoutError("Connection timed out")
            )
            conn_instance.disconnect = AsyncMock()

            result = await profiler.profile(
                connection_config=plain_config,
                pipeline_type="volume",
            )

        assert result["error"] == "connection_timeout"
        assert "timed out" in result["message"].lower()
        # disconnect should still be called
        conn_instance.disconnect.assert_called_once()

    @pytest.mark.asyncio
    async def test_connection_refused_returns_error_dict(self, profiler, plain_config):
        """OSError on connect → error dict with 'connection_failed'."""
        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock(
                side_effect=OSError("Connection refused")
            )
            conn_instance.disconnect = AsyncMock()

            result = await profiler.profile(
                connection_config=plain_config,
                pipeline_type="volume",
            )

        assert result["error"] == "connection_failed"
        assert "refused" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_decryption_failure_returns_error_dict(self, profiler):
        """Corrupted encrypted config → error dict."""
        from cryptography.fernet import InvalidToken

        with patch("app.application.profiling.decrypt_config",
                   side_effect=InvalidToken("Invalid token")):
            result = await profiler.profile(
                connection_config={"_encrypted": "corrupted_base64"},
                pipeline_type="volume",
            )

        assert result["error"] == "invalid_config"

    @pytest.mark.asyncio
    async def test_fernet_key_not_set_returns_error_dict(self, profiler):
        """Missing FERNET_KEY → error dict."""
        with patch("app.application.profiling.decrypt_config",
                   side_effect=ValueError("FERNET_KEY is not set")):
            result = await profiler.profile(
                connection_config={"_encrypted": "encrypted_value"},
                pipeline_type="volume",
            )

        assert result["error"] == "invalid_config"
        assert "FERNET_KEY" in result["message"]


# -----------------------------------------------------------------
# Successful profiling
# -----------------------------------------------------------------

class TestSuccessfulProfiling:
    """Tests for the successful profiling flow."""

    @pytest.mark.asyncio
    async def test_profile_returns_metrics_with_tables(self, profiler, plain_config, sample_profile_result):
        """Successful profiling should return metrics with tables and timing."""
        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock()
            conn_instance.disconnect = AsyncMock()

            with patch("app.application.profiling.ProfileRunner") as mock_runner:
                runner_instance = mock_runner.return_value
                runner_instance.run = AsyncMock(return_value=MagicMock(
                    to_dict=MagicMock(return_value=sample_profile_result)
                ))

                result = await profiler.profile(
                    connection_config=plain_config,
                    pipeline_type="volume",
                    target_tables=["public.orders"],
                )

        assert "profiling_type" in result
        assert result["profiling_type"] == "volume"
        assert "public.orders" in result["tables"]
        assert result["tables"]["public.orders"]["volume"]["row_count"] == 1000
        assert result["tables"]["public.orders"]["nulls"]["null_percentages"] == {"col": 0.0}

    @pytest.mark.asyncio
    async def test_profile_passes_target_tables(self, profiler, plain_config):
        """Target tables should be forwarded to ProfileRunner."""
        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock()
            conn_instance.disconnect = AsyncMock()

            with patch("app.application.profiling.ProfileRunner") as mock_runner:
                runner_instance = mock_runner.return_value
                runner_instance.run = AsyncMock(return_value=MagicMock(
                    to_dict=MagicMock(return_value={"tables": {}, "errors": [], "timing": {}})
                ))

                await profiler.profile(
                    connection_config=plain_config,
                    pipeline_type="null_check",
                    target_tables=["public.users", "public.orders"],
                )

            runner_instance.run.assert_called_once_with(
                target_tables=["public.users", "public.orders"]
            )

    @pytest.mark.asyncio
    async def test_disconnect_called_after_success(self, profiler, plain_config):
        """Disconnect should always be called, even on success."""
        with patch("app.application.profiling.PostgresConnector") as mock_cls:
            conn_instance = mock_cls.return_value
            conn_instance.connect = AsyncMock()
            conn_instance.disconnect = AsyncMock()

            with patch("app.application.profiling.ProfileRunner") as mock_runner:
                runner_instance = mock_runner.return_value
                runner_instance.run = AsyncMock(return_value=MagicMock(
                    to_dict=MagicMock(return_value={"tables": {}, "errors": [], "timing": {}})
                ))

                await profiler.profile(
                    connection_config=plain_config,
                    pipeline_type="volume",
                )

            conn_instance.disconnect.assert_called_once()


# -----------------------------------------------------------------
# Error result shape
# -----------------------------------------------------------------

class TestErrorResultShape:
    """Tests for the _error_result helper."""

    def test_error_result_structure(self, profiler):
        """_error_result should produce a well-formed error dict."""
        result = profiler._error_result(
            pipeline_type="volume",
            error_code="connection_failed",
            message="Host unreachable",
            error_step="connect",
        )

        assert result["error"] == "connection_failed"
        assert result["message"] == "Host unreachable"
        assert result["profiling_type"] == "volume"
        assert result["tables"] == {}
        assert len(result["errors"]) == 1
        assert result["errors"][0]["table"] == "*"
        assert result["errors"][0]["step"] == "connect"
        assert "timing" in result
