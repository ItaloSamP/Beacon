"""Unit tests for AgentConfig — RED PHASE: agent/config.py does not exist yet."""

import os
from unittest.mock import patch

import pytest
from pydantic import ValidationError

# RED PHASE — this import will fail until the module is created
from agent.config import AgentConfig  # noqa: E402


# ── Defaults ──────────────────────────────────────────────────────────

class TestAgentConfigDefaults:
    """Test all default values when no environment variables are set."""

    def test_default_cloud_url(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_CLOUD_URL == "http://localhost:8000/api/v1"

    def test_default_agent_token_is_empty(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_AGENT_TOKEN == ""

    def test_default_db_path(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_AGENT_DB_PATH == "./beacon_agent.db"

    def test_default_heartbeat_interval(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_HEARTBEAT_INTERVAL == 30

    def test_default_profile_interval(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_PROFILE_INTERVAL == 300

    def test_default_zscore_threshold(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_ZSCORE_THRESHOLD == 3.0

    def test_default_baseline_window(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_BASELINE_WINDOW == 30


# ── Environment variable overrides ────────────────────────────────────

class TestAgentConfigEnvOverrides:
    """Test that each field can be overridden via environment variable."""

    def test_env_override_cloud_url(self, monkeypatch):
        monkeypatch.setenv("BEACON_CLOUD_URL", "https://beacon.example.com/api/v2")
        config = AgentConfig()
        assert config.BEACON_CLOUD_URL == "https://beacon.example.com/api/v2"

    def test_env_override_agent_token(self, monkeypatch):
        monkeypatch.setenv("BEACON_AGENT_TOKEN", "tok_abc123")
        config = AgentConfig()
        assert config.BEACON_AGENT_TOKEN == "tok_abc123"

    def test_env_override_db_path(self, monkeypatch):
        monkeypatch.setenv("BEACON_AGENT_DB_PATH", "/data/beacon.db")
        config = AgentConfig()
        assert config.BEACON_AGENT_DB_PATH == "/data/beacon.db"

    def test_env_override_heartbeat_interval(self, monkeypatch):
        monkeypatch.setenv("BEACON_HEARTBEAT_INTERVAL", "60")
        config = AgentConfig()
        assert config.BEACON_HEARTBEAT_INTERVAL == 60

    def test_env_override_profile_interval(self, monkeypatch):
        monkeypatch.setenv("BEACON_PROFILE_INTERVAL", "600")
        config = AgentConfig()
        assert config.BEACON_PROFILE_INTERVAL == 600

    def test_env_override_zscore_threshold(self, monkeypatch):
        monkeypatch.setenv("BEACON_ZSCORE_THRESHOLD", "2.5")
        config = AgentConfig()
        assert config.BEACON_ZSCORE_THRESHOLD == 2.5

    def test_env_override_baseline_window(self, monkeypatch):
        monkeypatch.setenv("BEACON_BASELINE_WINDOW", "60")
        config = AgentConfig()
        assert config.BEACON_BASELINE_WINDOW == 60

    def test_all_env_vars_set_simultaneously(self, monkeypatch):
        monkeypatch.setenv("BEACON_CLOUD_URL", "https://all.example.com")
        monkeypatch.setenv("BEACON_AGENT_TOKEN", "all-token")
        monkeypatch.setenv("BEACON_AGENT_DB_PATH", "/tmp/all.db")
        monkeypatch.setenv("BEACON_HEARTBEAT_INTERVAL", "10")
        monkeypatch.setenv("BEACON_PROFILE_INTERVAL", "120")
        monkeypatch.setenv("BEACON_ZSCORE_THRESHOLD", "4.5")
        monkeypatch.setenv("BEACON_BASELINE_WINDOW", "90")
        config = AgentConfig()
        assert config.BEACON_CLOUD_URL == "https://all.example.com"
        assert config.BEACON_AGENT_TOKEN == "all-token"
        assert config.BEACON_AGENT_DB_PATH == "/tmp/all.db"
        assert config.BEACON_HEARTBEAT_INTERVAL == 10
        assert config.BEACON_PROFILE_INTERVAL == 120
        assert config.BEACON_ZSCORE_THRESHOLD == 4.5
        assert config.BEACON_BASELINE_WINDOW == 90


# ── Type validation ───────────────────────────────────────────────────

class TestAgentConfigTypeValidation:
    """Test that fields enforce correct types and reject invalid values."""

    def test_heartbeat_interval_rejects_non_int_string(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_HEARTBEAT_INTERVAL="not_a_number")

    def test_profile_interval_rejects_invalid_value(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_PROFILE_INTERVAL="abc")

    def test_zscore_threshold_rejects_non_numeric_string(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_ZSCORE_THRESHOLD="high")

    def test_baseline_window_rejects_non_int_string(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_BASELINE_WINDOW="twelve")

    def test_heartbeat_interval_accepts_int(self):
        config = AgentConfig(BEACON_HEARTBEAT_INTERVAL=42)
        assert isinstance(config.BEACON_HEARTBEAT_INTERVAL, int)
        assert config.BEACON_HEARTBEAT_INTERVAL == 42

    def test_zscore_threshold_accepts_float(self):
        config = AgentConfig(BEACON_ZSCORE_THRESHOLD=2.5)
        assert isinstance(config.BEACON_ZSCORE_THRESHOLD, float)
        assert config.BEACON_ZSCORE_THRESHOLD == 2.5

    def test_baseline_window_accepts_int(self):
        config = AgentConfig(BEACON_BASELINE_WINDOW=60)
        assert isinstance(config.BEACON_BASELINE_WINDOW, int)
        assert config.BEACON_BASELINE_WINDOW == 60

    def test_cloud_url_accepts_string(self):
        config = AgentConfig(BEACON_CLOUD_URL="https://example.com")
        assert isinstance(config.BEACON_CLOUD_URL, str)

    def test_db_path_accepts_string(self):
        config = AgentConfig(BEACON_AGENT_DB_PATH="/custom/path.db")
        assert isinstance(config.BEACON_AGENT_DB_PATH, str)

    def test_token_accepts_string(self):
        config = AgentConfig(BEACON_AGENT_TOKEN="s3cret!")
        assert isinstance(config.BEACON_AGENT_TOKEN, str)


# ── Constructor values ────────────────────────────────────────────────

class TestAgentConfigConstructorValues:
    """Test passing values directly to the constructor."""

    def test_constructor_overrides_default_cloud_url(self):
        config = AgentConfig(BEACON_CLOUD_URL="https://custom.example.com/api")
        assert config.BEACON_CLOUD_URL == "https://custom.example.com/api"

    def test_constructor_sets_token(self):
        config = AgentConfig(BEACON_AGENT_TOKEN="my-token-123")
        assert config.BEACON_AGENT_TOKEN == "my-token-123"

    def test_constructor_sets_db_path(self):
        config = AgentConfig(BEACON_AGENT_DB_PATH="/opt/beacon/data.db")
        assert config.BEACON_AGENT_DB_PATH == "/opt/beacon/data.db"

    def test_constructor_sets_all_intervals(self):
        config = AgentConfig(
            BEACON_HEARTBEAT_INTERVAL=15,
            BEACON_PROFILE_INTERVAL=150,
            BEACON_BASELINE_WINDOW=60,
        )
        assert config.BEACON_HEARTBEAT_INTERVAL == 15
        assert config.BEACON_PROFILE_INTERVAL == 150
        assert config.BEACON_BASELINE_WINDOW == 60

    def test_constructor_takes_precedence_over_env(self, monkeypatch):
        monkeypatch.setenv("BEACON_CLOUD_URL", "https://env.example.com")
        config = AgentConfig(BEACON_CLOUD_URL="https://constructor.example.com")
        assert config.BEACON_CLOUD_URL == "https://constructor.example.com"

    def test_partial_constructor_preserves_other_defaults(self):
        config = AgentConfig(BEACON_CLOUD_URL="https://custom.example.com")
        assert config.BEACON_CLOUD_URL == "https://custom.example.com"
        assert config.BEACON_AGENT_DB_PATH == "./beacon_agent.db"
        assert config.BEACON_HEARTBEAT_INTERVAL == 30
        assert config.BEACON_BASELINE_WINDOW == 30

    def test_constructor_sets_zscore_threshold(self):
        config = AgentConfig(BEACON_ZSCORE_THRESHOLD=5.0)
        assert config.BEACON_ZSCORE_THRESHOLD == 5.0


# ── Case sensitivity ──────────────────────────────────────────────────

class TestAgentConfigCaseSensitivity:
    """Test that model_config preserves case sensitivity for env var lookup."""

    def test_exact_case_env_var_overrides_default(self, monkeypatch):
        monkeypatch.setenv("BEACON_CLOUD_URL", "https://exact.example.com")
        config = AgentConfig()
        assert config.BEACON_CLOUD_URL == "https://exact.example.com"

    def test_lowercase_env_var_does_not_override(self, monkeypatch):
        """Lowercase env var name should NOT match when case_sensitive=True."""
        monkeypatch.setenv("beacon_cloud_url", "https://lowercase.example.com")
        config = AgentConfig()
        assert config.BEACON_CLOUD_URL == "http://localhost:8000/api/v1"

    def test_mixed_case_env_var_does_not_override(self, monkeypatch):
        """Mixed-case env var should NOT match exact BEACON_ field names."""
        monkeypatch.setenv("Beacon_Cloud_Url", "https://mixed.example.com")
        config = AgentConfig()
        assert config.BEACON_CLOUD_URL == "http://localhost:8000/api/v1"

    def test_case_sensitive_token_env_var(self, monkeypatch):
        monkeypatch.setenv("beacon_agent_token", "lowercase-token")
        config = AgentConfig()
        assert config.BEACON_AGENT_TOKEN == ""


# ── Edge cases ────────────────────────────────────────────────────────

class TestAgentConfigEdgeCases:
    """Test edge cases: negative, zero, very large values, empty values."""

    def test_negative_heartbeat_interval_rejected(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_HEARTBEAT_INTERVAL=-1)

    def test_negative_profile_interval_rejected(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_PROFILE_INTERVAL=-5)

    def test_negative_baseline_window_rejected(self):
        with pytest.raises(ValidationError):
            AgentConfig(BEACON_BASELINE_WINDOW=-10)

    def test_zero_heartbeat_interval_accepted(self):
        config = AgentConfig(BEACON_HEARTBEAT_INTERVAL=0)
        assert config.BEACON_HEARTBEAT_INTERVAL == 0

    def test_zero_profile_interval_accepted(self):
        config = AgentConfig(BEACON_PROFILE_INTERVAL=0)
        assert config.BEACON_PROFILE_INTERVAL == 0

    def test_zero_baseline_window_accepted(self):
        config = AgentConfig(BEACON_BASELINE_WINDOW=0)
        assert config.BEACON_BASELINE_WINDOW == 0

    def test_very_large_heartbeat_interval(self):
        config = AgentConfig(BEACON_HEARTBEAT_INTERVAL=86_400)
        assert config.BEACON_HEARTBEAT_INTERVAL == 86_400

    def test_very_large_profile_interval(self):
        config = AgentConfig(BEACON_PROFILE_INTERVAL=1_000_000)
        assert config.BEACON_PROFILE_INTERVAL == 1_000_000

    def test_very_large_zscore_threshold(self):
        config = AgentConfig(BEACON_ZSCORE_THRESHOLD=100.0)
        assert config.BEACON_ZSCORE_THRESHOLD == 100.0

    def test_zero_zscore_threshold(self):
        config = AgentConfig(BEACON_ZSCORE_THRESHOLD=0.0)
        assert config.BEACON_ZSCORE_THRESHOLD == 0.0

    def test_negative_zscore_threshold_accepted(self):
        config = AgentConfig(BEACON_ZSCORE_THRESHOLD=-3.0)
        assert config.BEACON_ZSCORE_THRESHOLD == -3.0

    def test_empty_cloud_url(self):
        config = AgentConfig(BEACON_CLOUD_URL="")
        assert config.BEACON_CLOUD_URL == ""

    def test_empty_token_is_valid(self):
        config = AgentConfig(BEACON_AGENT_TOKEN="")
        assert config.BEACON_AGENT_TOKEN == ""

    def test_very_large_baseline_window(self):
        config = AgentConfig(BEACON_BASELINE_WINDOW=10_000)
        assert config.BEACON_BASELINE_WINDOW == 10_000


# ── Token field ───────────────────────────────────────────────────────

class TestAgentConfigTokenField:
    """Specific tests for the BEACON_AGENT_TOKEN field."""

    def test_token_defaults_to_empty_string(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            assert config.BEACON_AGENT_TOKEN == ""

    def test_token_can_be_set_via_env(self, monkeypatch):
        monkeypatch.setenv("BEACON_AGENT_TOKEN", "secret-token-xyz")
        config = AgentConfig()
        assert config.BEACON_AGENT_TOKEN == "secret-token-xyz"

    def test_token_can_be_set_via_constructor(self):
        config = AgentConfig(BEACON_AGENT_TOKEN="constructor-token")
        assert config.BEACON_AGENT_TOKEN == "constructor-token"

    def test_token_constructor_overrides_env(self, monkeypatch):
        monkeypatch.setenv("BEACON_AGENT_TOKEN", "env-token")
        config = AgentConfig(BEACON_AGENT_TOKEN="constructor-token")
        assert config.BEACON_AGENT_TOKEN == "constructor-token"


# ── model_dump / serialisation ────────────────────────────────────────

class TestAgentConfigSerialisation:
    """Test that AgentConfig can be exported as a plain dict."""

    def test_model_dump_returns_all_fields(self):
        with patch.dict(os.environ, {}, clear=True):
            config = AgentConfig()
            data = config.model_dump()
            assert data["BEACON_CLOUD_URL"] == "http://localhost:8000/api/v1"
            assert data["BEACON_AGENT_TOKEN"] == ""
            assert data["BEACON_AGENT_DB_PATH"] == "./beacon_agent.db"
            assert data["BEACON_HEARTBEAT_INTERVAL"] == 30
            assert data["BEACON_PROFILE_INTERVAL"] == 300
            assert data["BEACON_ZSCORE_THRESHOLD"] == 3.0
            assert data["BEACON_BASELINE_WINDOW"] == 30

    def test_model_dump_reflects_overrides(self, monkeypatch):
        monkeypatch.setenv("BEACON_CLOUD_URL", "https://override.example.com")
        monkeypatch.setenv("BEACON_HEARTBEAT_INTERVAL", "45")
        config = AgentConfig()
        data = config.model_dump()
        assert data["BEACON_CLOUD_URL"] == "https://override.example.com"
        assert data["BEACON_HEARTBEAT_INTERVAL"] == 45


# ── Immutability / re-creation ────────────────────────────────────────

class TestAgentConfigImmutability:
    """Test that AgentConfig instances are independent and re-usable."""

    def test_two_instances_are_independent(self):
        config_a = AgentConfig(BEACON_HEARTBEAT_INTERVAL=10)
        config_b = AgentConfig(BEACON_HEARTBEAT_INTERVAL=20)
        assert config_a.BEACON_HEARTBEAT_INTERVAL == 10
        assert config_b.BEACON_HEARTBEAT_INTERVAL == 20

    def test_env_does_not_leak_between_instances(self, monkeypatch):
        monkeypatch.setenv("BEACON_HEARTBEAT_INTERVAL", "5")
        config_a = AgentConfig()
        assert config_a.BEACON_HEARTBEAT_INTERVAL == 5

        monkeypatch.setenv("BEACON_HEARTBEAT_INTERVAL", "99")
        config_b = AgentConfig()
        assert config_b.BEACON_HEARTBEAT_INTERVAL == 99
        assert config_a.BEACON_HEARTBEAT_INTERVAL == 5
