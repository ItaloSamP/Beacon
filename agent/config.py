"""Agent configuration loaded from environment variables with Pydantic v2."""

import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict, PydanticBaseSettingsSource
from pydantic_settings.sources import EnvSettingsSource


class _CaseSensitiveEnviron:
    """Wraps os.environ to enforce case-sensitive key lookups.

    On Windows, os.environ key access is case-insensitive. This wrapper
    ensures that only exact-case key matches are returned, which is
    required by the agent's case-sensitive env var contract.
    """

    def __init__(self):
        self._data = dict(os.environ.items())

    def get(self, key: str, default=None):
        return self._data.get(key, default)

    def __getitem__(self, key: str) -> str:
        return self._data[key]

    def __contains__(self, key: str) -> bool:
        return key in self._data

    def items(self):
        return self._data.items()


class _CaseSensitiveEnvSource(EnvSettingsSource):
    """Custom env source that uses case-sensitive os.environ lookups."""

    def __init__(self, settings_cls, **kwargs):
        super().__init__(settings_cls, **kwargs)
        self.env_vars = _CaseSensitiveEnviron()


class AgentConfig(BaseSettings):
    """Beacon Agent configuration.

    All fields can be set via environment variables with exact-case
    BEACON_* names, or passed directly to the constructor.
    """

    model_config = SettingsConfigDict(case_sensitive=True)

    BEACON_CLOUD_URL: str = "http://localhost:8000/api/v1"
    BEACON_AGENT_TOKEN: str = ""
    BEACON_AGENT_DB_PATH: str = "./beacon_agent.db"
    BEACON_HEARTBEAT_INTERVAL: int = Field(default=30, ge=0)
    BEACON_PROFILE_INTERVAL: int = Field(default=300, ge=0)
    BEACON_ZSCORE_THRESHOLD: float = 3.0
    BEACON_BASELINE_WINDOW: int = Field(default=30, ge=0)

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ):
        return (
            init_settings,
            _CaseSensitiveEnvSource(settings_cls, case_sensitive=True),
            dotenv_settings,
            file_secret_settings,
        )
