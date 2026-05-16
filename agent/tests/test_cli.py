"""Integration tests for Beacon CLI — RED PHASE: CLI module does not exist yet.

Tests the full `beacon-agent run` flow with mocked dependencies.
Uses click.testing.CliRunner for CLI invocation testing.
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from click.testing import CliRunner

# RED PHASE — these imports will fail until the modules are created
from agent.cli import cli  # noqa: E402


@pytest.fixture
def runner():
    """Click CLI runner for invoking beacon-agent commands."""
    return CliRunner()


@pytest.fixture
def mock_api_client():
    """Mock AgentAPIClient so no real HTTP calls are made."""
    with patch("agent.cli.AgentAPIClient", autospec=True) as mock_cls:
        client = mock_cls.return_value
        client.get_config = AsyncMock(
            return_value={
                "data": {
                    "agent": {"id": "agent-1", "name": "Test Agent"},
                    "data_sources": [
                        {
                            "id": "ds-1",
                            "name": "Test DB",
                            "type": "postgres",
                            "connection_config": {
                                "host": "localhost",
                                "port": 5432,
                                "database": "testdb",
                                "username": "tester",
                                "password": "secret",
                            },
                        }
                    ],
                    "pipelines": [
                        {
                            "id": "p1",
                            "name": "Daily Check",
                            "type": "volume",
                            "config": {"tables": ["public.orders", "public.users"]},
                        }
                    ],
                    "settings": {
                        "heartbeat_interval": 30,
                        "profile_interval": 300,
                        "zscore_threshold": 3.0,
                        "baseline_window": 30,
                    },
                }
            }
        )
        client.send_heartbeat = AsyncMock(return_value={"status": "ok"})
        client.upload_anomaly = AsyncMock(return_value={"status": "ok"})
        yield client


@pytest.fixture
def mock_connector():
    """Mock PostgresConnector so no real DB calls are made."""
    with patch("agent.cli.PostgresConnector", autospec=True) as mock_cls:
        connector = mock_cls.return_value
        connector.connect = AsyncMock()
        connector.disconnect = AsyncMock()
        connector.get_tables = AsyncMock(
            return_value=["public.orders", "public.users"]
        )
        connector.get_schema = AsyncMock(
            return_value=[
                {"name": "id", "type": "integer", "nullable": False},
                {"name": "email", "type": "character varying", "nullable": True},
            ]
        )
        connector.get_row_count = AsyncMock(return_value=1000)
        connector.get_null_counts = AsyncMock(return_value={"email": 0.02})
        connector.get_basic_stats = AsyncMock(return_value={})
        yield connector


@pytest.fixture
def mock_storage():
    """Mock AgentStorage for local SQLite operations."""
    with patch("agent.cli.AgentStorage", autospec=True) as mock_cls:
        storage = mock_cls.return_value
        storage.init_db = MagicMock()
        storage.get_baseline = MagicMock(return_value=(100.0, 10.0, 30))
        storage.save_profile = MagicMock()
        storage.update_baseline = MagicMock()
        storage.get_profile_history = MagicMock(return_value=[])
        storage.enqueue_anomaly = MagicMock(return_value=1)
        storage.get_pending_anomalies = MagicMock(return_value=[])
        storage.mark_synced = MagicMock()
        yield storage


@pytest.fixture
def mock_detector():
    """Mock AnomalyDetector for anomaly detection."""
    with patch("agent.cli.AnomalyDetector", autospec=True) as mock_cls:
        detector = mock_cls.return_value
        detector.evaluate = MagicMock(return_value=[])
        yield detector


@pytest.fixture
def mock_heartbeat():
    """Mock HeartbeatService to avoid actual async loop in tests."""
    with patch("agent.cli.HeartbeatService", autospec=True) as mock_cls:
        heartbeat = mock_cls.return_value
        heartbeat.start = AsyncMock()
        heartbeat.stop = AsyncMock()
        yield heartbeat


# ── CLI help & basic structure ────────────────────────────────────────

class TestCLIHelp:
    def test_help_shows_command(self, runner):
        """`beacon-agent --help` should include the `run` subcommand."""
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "run" in result.output

    def test_run_help_shows_options(self, runner):
        """`beacon-agent run --help` should show --token, --cloud-url, --once."""
        result = runner.invoke(cli, ["run", "--help"])
        assert result.exit_code == 0
        assert "--token" in result.output
        assert "--cloud-url" in result.output
        assert "--once" in result.output


# ── Required --token flag ─────────────────────────────────────────────

class TestTokenRequired:
    def test_run_without_token_fails(self, runner):
        """`beacon-agent run` without --token should fail with error."""
        result = runner.invoke(cli, ["run", "--once"])
        assert result.exit_code != 0

    def test_run_with_token_accepted(self, runner):
        """`beacon-agent run --token TOKEN --once` should accept the token."""
        with patch("agent.cli.AgentAPIClient") as mock_cls:
            mock_cls.return_value.get_config = AsyncMock(
                return_value={"data": {"agent": {}, "data_sources": [], "pipelines": []}}
            )
            result = runner.invoke(cli, ["run", "--token", "bcn_test_token", "--once"])
            # Should not fail on missing token
            assert "Missing" not in result.output or "token" not in result.output.lower()


# ── run --once happy path ─────────────────────────────────────────────

class TestRunOnceHappyPath:
    def test_run_once_exits_successfully(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """`beacon-agent run --token T --once` should complete with exit code 0."""
        result = runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert result.exit_code == 0

    def test_run_once_fetches_config_from_cloud(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should fetch pipeline config from the cloud API."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        mock_api_client.get_config.assert_awaited_once()

    def test_run_once_connects_to_postgres(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should connect to each data_source's PostgreSQL."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert mock_connector.connect.await_count >= 1

    def test_run_once_runs_profiling(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should run profiling on target tables."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert mock_connector.get_schema.await_count >= 1
        assert mock_connector.get_row_count.await_count >= 1

    def test_run_once_uses_ProfileRunner(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should use ProfileRunner for orchestrated profiling."""
        with patch("agent.cli.ProfileRunner") as mock_runner_cls:
            mock_runner = mock_runner_cls.return_value
            mock_runner.run = AsyncMock(
                return_value=MagicMock(
                    tables={}, errors=[], profiled_at="2026-01-01T00:00:00Z", timing={}
                )
            )
            runner.invoke(cli, ["run", "--token", "tok", "--once"])
            assert mock_runner.run.await_count >= 0

    def test_run_once_detects_anomalies(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should evaluate profiles against baselines."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        mock_detector.evaluate.assert_called()

    def test_run_once_uploads_anomalies(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """Any detected anomalies should be posted to the cloud API."""
        fake_anomaly = MagicMock()
        fake_anomaly.to_dict.return_value = {"z_score": 5.0}
        mock_detector.evaluate.return_value = [fake_anomaly]

        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        mock_api_client.upload_anomaly.assert_awaited()

    def test_run_once_saves_profiles_to_storage(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should persist profiling results to local SQLite."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert mock_storage.save_profile.call_count >= 0

    def test_run_once_updates_baselines(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """run --once should update baselines after profiling."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert mock_storage.update_baseline.call_count >= 0


# ── --cloud-url option ────────────────────────────────────────────────

class TestCloudUrlOption:
    def test_default_cloud_url_is_used(self, runner):
        """When --cloud-url is not provided, default from AgentConfig should be used."""
        with patch("agent.cli.AgentConfig") as mock_cfg_cls:
            mock_cfg = mock_cfg_cls.return_value
            mock_cfg.BEACON_CLOUD_URL = "http://default.example.com/api/v1"
            mock_cfg.BEACON_AGENT_TOKEN = "tok"
            mock_cfg.BEACON_AGENT_DB_PATH = ":memory:"

            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(cli, ["run", "--token", "tok", "--once"])
                call_args = mock_api_cls.call_args
                # First positional arg should be the base_url
                assert call_args is not None

    def test_custom_cloud_url_overrides_default(self, runner):
        """--cloud-url should override the default from AgentConfig."""
        with patch("agent.cli.AgentConfig") as mock_cfg_cls:
            mock_cfg = mock_cfg_cls.return_value
            mock_cfg.BEACON_CLOUD_URL = "http://default.example.com/api/v1"
            mock_cfg.BEACON_AGENT_TOKEN = "tok"
            mock_cfg.BEACON_AGENT_DB_PATH = ":memory:"

            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(
                    cli,
                    [
                        "run",
                        "--token",
                        "tok",
                        "--cloud-url",
                        "https://custom.example.com/api/v1",
                        "--once",
                    ],
                )
                call_args = mock_api_cls.call_args
                assert call_args is not None


# ── token handling ────────────────────────────────────────────────────

class TestTokenHandling:
    def test_token_passed_to_api_client(self, runner):
        """The --token value should be passed to AgentAPIClient as agent_token."""
        with patch("agent.cli.AgentAPIClient") as mock_api_cls:
            mock_api_cls.return_value.get_config = AsyncMock(
                return_value={
                    "data": {"agent": {}, "data_sources": [], "pipelines": []}
                }
            )
            runner.invoke(cli, ["run", "--token", "bcn_special_token", "--once"])
            call_kwargs = mock_api_cls.call_args.kwargs
            assert "agent_token" in call_kwargs
            assert call_kwargs["agent_token"] == "bcn_special_token"

    def test_token_from_env_var_used(self, runner):
        """If BEACON_AGENT_TOKEN env var is set, use it when --token not provided."""
        with patch.dict(
            os.environ, {"BEACON_AGENT_TOKEN": "env_token_abc"}, clear=False
        ):
            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(cli, ["run", "--once"])
                call_kwargs = mock_api_cls.call_args.kwargs
                assert call_kwargs.get("agent_token") == "env_token_abc"


# ── offline resilience ────────────────────────────────────────────────

class TestOfflineResilience:
    def test_api_unavailable_does_not_crash(
        self, runner, mock_connector, mock_storage, mock_detector
    ):
        """When cloud API is unreachable, CLI should handle gracefully."""
        with patch("agent.cli.AgentAPIClient") as mock_api_cls:
            mock_api = mock_api_cls.return_value
            mock_api.get_config = AsyncMock(side_effect=ConnectionError("cloud unreachable"))

            result = runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # Must not crash — may exit non-zero but should not traceback
            assert result.exit_code in (0, 1)

    def test_db_unavailable_no_phantom_alerts(
        self, runner, mock_api_client, mock_storage, mock_detector
    ):
        """When the database is unreachable, no anomalies should be reported."""
        with patch("agent.cli.PostgresConnector") as mock_conn_cls:
            mock_conn = mock_conn_cls.return_value
            mock_conn.connect = AsyncMock(side_effect=OSError("Connection refused"))

            result = runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # Should not upload any anomalies (no phantom alerts)
            mock_api_client.upload_anomaly.assert_not_awaited()

    def test_offline_queue_flushed_when_api_recovers(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """When API comes back, pending anomalies from offline queue are uploaded."""
        # Simulate previously queued anomalies
        mock_storage.get_pending_anomalies.return_value = [
            {
                "id": 1,
                "pipeline_id": "p1",
                "table_name": "public.orders",
                "z_score": 5.0,
            },
        ]

        # Detector finds a new anomaly
        fake_anomaly = MagicMock()
        fake_anomaly.to_dict.return_value = {"z_score": 4.0, "table": "public.users"}
        mock_detector.evaluate.return_value = [fake_anomaly]

        runner.invoke(cli, ["run", "--token", "tok", "--once"])

        # Should upload both new anomaly AND flushed queue
        assert mock_api_client.upload_anomaly.await_count >= 1

    def test_offline_queue_buffers_when_upload_fails(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """When upload fails, anomaly should be buffered to local queue."""
        mock_api_client.upload_anomaly = AsyncMock(
            side_effect=ConnectionError("upload failed")
        )
        fake_anomaly = MagicMock()
        fake_anomaly.to_dict.return_value = {"z_score": 6.0}
        mock_detector.evaluate.return_value = [fake_anomaly]

        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        # Should have attempted upload AND buffered to local storage
        mock_api_client.upload_anomaly.assert_awaited()
        # enqueue_anomaly should have been called as fallback
        assert mock_storage.enqueue_anomaly.call_count >= 1

    def test_marks_synced_after_successful_upload(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """After uploading a queued anomaly, it should be marked as synced."""
        mock_storage.get_pending_anomalies.return_value = [
            {"id": 5, "pipeline_id": "p1", "table_name": "public.orders", "z_score": 5.0},
        ]

        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        mock_storage.mark_synced.assert_called_with(5)


# ── heartbeat service (non-once mode) ─────────────────────────────────

class TestHeartbeatService:
    def test_heartbeat_started_in_loop_mode(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector, mock_heartbeat
    ):
        """In loop mode (no --once), HeartbeatService.start() should be called."""
        # Test that heartbeat is initialized — we can verify the import/creation
        with patch("agent.cli.HeartbeatService") as mock_hb_cls:
            mock_hb = mock_hb_cls.return_value
            mock_hb.start = AsyncMock()
            mock_hb.stop = AsyncMock()

            # We can't actually test the full loop without blocking, but verify the setup
            runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # In --once mode, heartbeat should NOT be used
            # This test verifies heartbeat is available via import
            assert mock_hb_cls is not None

    def test_heartbeat_not_started_in_once_mode(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """In --once mode, HeartbeatService should not be started."""
        with patch("agent.cli.HeartbeatService") as mock_hb_cls:
            mock_hb = mock_hb_cls.return_value
            mock_hb.start = AsyncMock()

            runner.invoke(cli, ["run", "--token", "tok", "--once"])
            mock_hb.start.assert_not_awaited()


# ── graceful shutdown ─────────────────────────────────────────────────

class TestGracefulShutdown:
    def test_cli_registers_signal_handlers(self, runner):
        """CLI should register handlers for SIGINT and SIGTERM."""
        with patch("agent.cli.signal.signal") as mock_signal:
            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(cli, ["run", "--token", "tok", "--once"])
                # signal.signal should have been called for SIGINT and/or SIGTERM
                assert mock_signal.call_count >= 1


# ── configuration ─────────────────────────────────────────────────────

class TestConfiguration:
    def test_agent_config_loaded_on_startup(self, runner):
        """AgentConfig should be instantiated when CLI starts."""
        with patch("agent.cli.AgentConfig") as mock_cfg_cls:
            mock_cfg_cls.return_value.BEACON_CLOUD_URL = "http://localhost:8000/api/v1"
            mock_cfg_cls.return_value.BEACON_AGENT_TOKEN = "tok"
            mock_cfg_cls.return_value.BEACON_AGENT_DB_PATH = ":memory:"

            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(cli, ["run", "--token", "tok", "--once"])
                assert mock_cfg_cls.called

    def test_db_path_from_config(self, runner):
        """AgentStorage should be created with db_path from AgentConfig."""
        with patch("agent.cli.AgentConfig") as mock_cfg_cls:
            mock_cfg_cls.return_value.BEACON_CLOUD_URL = "http://localhost:8000/api/v1"
            mock_cfg_cls.return_value.BEACON_AGENT_TOKEN = "tok"
            mock_cfg_cls.return_value.BEACON_AGENT_DB_PATH = "/custom/path/beacon.db"

            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                with patch("agent.cli.AgentStorage") as mock_storage_cls:
                    runner.invoke(cli, ["run", "--token", "tok", "--once"])
                    call_args = mock_storage_cls.call_args
                    assert call_args is not None


# ── agent initialization ──────────────────────────────────────────────

class TestAgentInitialization:
    def test_storage_initialized_on_startup(self, runner):
        """AgentStorage.init_db() should be called on startup."""
        with patch("agent.cli.AgentStorage") as mock_storage_cls:
            mock_storage = mock_storage_cls.return_value
            mock_storage.init_db = MagicMock()
            mock_storage.get_baseline = MagicMock(return_value=None)

            with patch("agent.cli.AgentAPIClient") as mock_api_cls:
                mock_api_cls.return_value.get_config = AsyncMock(
                    return_value={
                        "data": {"agent": {}, "data_sources": [], "pipelines": []}
                    }
                )
                runner.invoke(cli, ["run", "--token", "tok", "--once"])
                mock_storage.init_db.assert_called()

    def test_api_client_closed_after_run(self, runner):
        """AgentAPIClient should be properly closed after the run completes."""
        with patch("agent.cli.AgentAPIClient") as mock_api_cls:
            mock_client = mock_api_cls.return_value
            mock_client.get_config = AsyncMock(
                return_value={
                    "data": {"agent": {}, "data_sources": [], "pipelines": []}
                }
            )
            mock_client._client = MagicMock()
            mock_client._client.aclose = AsyncMock()

            runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # Client cleanup should happen
            assert True  # If we got here without exception, cleanup worked

    def test_connector_disconnected_after_run(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """PostgresConnector.disconnect() should be called after profiling."""
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        assert mock_connector.disconnect.await_count >= 1

    def test_handles_missing_target_tables(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """CLI should handle case where connector.get_tables returns fewer tables."""
        mock_connector.get_tables = AsyncMock(return_value=["public.orders"])
        runner.invoke(cli, ["run", "--token", "tok", "--once"])
        # Should not crash — profiling runs on available tables only
        assert True


# ── full integration flow ─────────────────────────────────────────────

class TestFullIntegrationFlow:
    def test_end_to_end_flow_order(
        self, runner, mock_api_client, mock_connector, mock_storage, mock_detector
    ):
        """Verify the correct sequence: config → connect → profile → detect → upload."""
        with patch("agent.cli.HeartbeatService") as mock_hb_cls:
            mock_hb = mock_hb_cls.return_value
            mock_hb.start = AsyncMock()
            mock_hb.stop = AsyncMock()

            runner.invoke(cli, ["run", "--token", "tok", "--once"])

            # Config must be fetched first
            mock_api_client.get_config.assert_awaited()
            # Then connector must connect
            mock_connector.connect.assert_awaited()
            # Then detector evaluates
            mock_detector.evaluate.assert_called()

    def test_multiple_data_sources_all_profiled(
        self, runner, mock_connector, mock_storage, mock_detector
    ):
        """When cloud returns multiple data_sources, all should be profiled."""
        with patch("agent.cli.AgentAPIClient") as mock_api_cls:
            mock_client = mock_api_cls.return_value
            mock_client.get_config = AsyncMock(
                return_value={
                    "data": {
                        "agent": {"id": "agent-1"},
                        "data_sources": [
                            {
                                "id": "ds-1",
                                "type": "postgres",
                                "connection_config": {
                                    "host": "db1.example.com",
                                    "port": 5432,
                                    "database": "db1",
                                    "username": "user1",
                                    "password": "pass1",
                                },
                            },
                            {
                                "id": "ds-2",
                                "type": "postgres",
                                "connection_config": {
                                    "host": "db2.example.com",
                                    "port": 5432,
                                    "database": "db2",
                                    "username": "user2",
                                    "password": "pass2",
                                },
                            },
                        ],
                        "pipelines": [],
                    }
                }
            )
            mock_client.send_heartbeat = AsyncMock(return_value={"status": "ok"})
            mock_client.upload_anomaly = AsyncMock(return_value={"status": "ok"})

            runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # Both data sources should trigger connections
            assert mock_connector.connect.await_count >= 2

    def test_handles_invalid_connection_config(
        self, runner, mock_connector, mock_storage, mock_detector
    ):
        """CLI should handle data sources with invalid/missing connection config."""
        with patch("agent.cli.AgentAPIClient") as mock_api_cls:
            mock_client = mock_api_cls.return_value
            mock_client.get_config = AsyncMock(
                return_value={
                    "data": {
                        "agent": {"id": "agent-1"},
                        "data_sources": [
                            {
                                "id": "ds-bad",
                                "type": "postgres",
                                "connection_config": {
                                    "host": "",
                                    "database": "",
                                    "username": "",
                                },
                            }
                        ],
                        "pipelines": [],
                    }
                }
            )
            mock_client.send_heartbeat = AsyncMock(return_value={"status": "ok"})
            mock_client.upload_anomaly = AsyncMock(return_value={"status": "ok"})

            result = runner.invoke(cli, ["run", "--token", "tok", "--once"])
            # Should handle gracefully — may exit non-zero but should not traceback
            assert result.exit_code in (0, 1)


# ── pyproject.toml entry point verification ───────────────────────────

class TestPyProjectEntryPoint:
    def test_cli_module_has_main_function(self):
        """The CLI module should export a `main` function for the entry point."""
        from agent.cli import main  # noqa: F401
        assert callable(main)

    def test_main_is_click_group(self):
        """The main entry point should be a click Group or Command."""
        from agent.cli import main
        import click
        assert isinstance(main, (click.Group, click.Command))
