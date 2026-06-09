from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from cryptography.fernet import InvalidToken

from app.application.datasource_service import DataSourceService
from app.shared.exceptions import NotFoundException


class TestDecryptConfigFields:
    """M-2: _decrypt_config_fields catches specific exception types."""

    @pytest.fixture
    def service(self):
        """Create DataSourceService with a mock repo (not used by _decrypt_config_fields)."""
        mock_repo = AsyncMock()
        return DataSourceService(mock_repo)

    def test_plain_config_returns_unchanged(self, service):
        """Plain dict without _encrypted key returns as-is."""
        config = {"host": "localhost", "port": 5432}
        result = service._decrypt_config_fields(config)
        assert result == config

    def test_not_a_dict_returns_unchanged(self, service):
        """Non-dict config returns as-is."""
        result = service._decrypt_config_fields(None)
        assert result is None

    def test_encrypted_config_delegates_to_decrypt(self, service):
        """Dict with _encrypted key calls decrypt_config."""
        with patch(
            "app.infrastructure.crypto.decrypt_config",
            return_value={"host": "db.example.com", "password": "secret"},
        ):
            config = {"_encrypted": "base64fake=="}
            result = service._decrypt_config_fields(config)
            assert result == {"host": "db.example.com", "password": "secret"}

    def test_invalid_token_returns_original_config(self, service):
        """When decrypt_config raises InvalidToken, return original config."""
        with patch(
            "app.infrastructure.crypto.decrypt_config",
            side_effect=InvalidToken,
        ):
            config = {"_encrypted": "corrupt_data"}
            result = service._decrypt_config_fields(config)
            assert result == config

    def test_value_error_returns_original_config(self, service):
        """When decrypt_config raises ValueError, return original config."""
        with patch(
            "app.infrastructure.crypto.decrypt_config",
            side_effect=ValueError("FERNET_KEY is not set"),
        ):
            config = {"_encrypted": "bad_data"}
            result = service._decrypt_config_fields(config)
            assert result == config

    def test_json_decode_error_returns_original_config(self, service):
        """When decrypt_config raises json.JSONDecodeError, return original config."""
        with patch(
            "app.infrastructure.crypto.decrypt_config",
            side_effect=json.JSONDecodeError("msg", "doc", 0),
        ):
            config = {"_encrypted": "invalid_json"}
            result = service._decrypt_config_fields(config)
            assert result == config

    def test_runtime_error_propagates(self, service):
        """Other exceptions (e.g. RuntimeError) should NOT be caught."""
        with patch(
            "app.infrastructure.crypto.decrypt_config",
            side_effect=RuntimeError("Unexpected failure"),
        ):
            config = {"_encrypted": "some_data"}
            with pytest.raises(RuntimeError, match="Unexpected failure"):
                service._decrypt_config_fields(config)

    def test_dict_with_extra_keys_not_treated_as_encrypted(self, service):
        """Dict with _encrypted key but additional keys is not treated as encrypted wrapper."""
        config = {"_encrypted": "data", "other": "value"}
        result = service._decrypt_config_fields(config)
        assert result == config


class TestDataSourceOwnership:
    """M-3: DataSource detail cross-user protection."""

    @pytest.fixture
    def mock_repo(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_repo):
        return DataSourceService(mock_repo)

    @pytest.mark.asyncio
    async def test_get_by_id_matching_user_returns_decrypted(self, service, mock_repo):
        """DataSource with matching user_id returns DataSource with decrypted config."""
        import uuid

        user_id = uuid.uuid4()
        agent_id = uuid.uuid4()

        mock_agent = MagicMock()
        mock_agent.user_id = user_id

        mock_ds = MagicMock()
        mock_ds.agent_id = agent_id
        mock_ds.agent = mock_agent
        mock_ds.connection_config = {"host": "db.local"}

        mock_repo.get_by_id = AsyncMock(return_value=mock_ds)
        mock_repo.db = AsyncMock()

        with patch.object(
            service, "_decrypt_config_fields", return_value={"host": "db.local"}
        ) as mock_decrypt:
            result = await service.get_by_id(agent_id, user_id=user_id)
            assert result == mock_ds
            mock_decrypt.assert_called_once_with({"host": "db.local"})

    @pytest.mark.asyncio
    async def test_get_by_id_non_matching_user_raises_not_found(
        self, service, mock_repo
    ):
        """DataSource owned by user B → user A gets NotFoundException."""
        import uuid

        owner_id = uuid.uuid4()
        requester_id = uuid.uuid4()
        ds_id = uuid.uuid4()

        mock_agent = MagicMock()
        mock_agent.user_id = owner_id

        mock_ds = MagicMock()
        mock_ds.agent_id = uuid.uuid4()
        mock_ds.agent = mock_agent

        mock_repo.get_by_id = AsyncMock(return_value=mock_ds)
        mock_repo.db = AsyncMock()

        with pytest.raises(NotFoundException, match="Data source not found"):
            await service.get_by_id(ds_id, user_id=requester_id)

    @pytest.mark.asyncio
    async def test_get_by_id_no_agent_raises_not_found(self, service, mock_repo):
        """DataSource with agent_id=None and user_id provided → NotFoundException."""
        import uuid

        ds_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_ds = MagicMock()
        mock_ds.agent_id = None
        mock_ds.agent = None

        mock_repo.get_by_id = AsyncMock(return_value=mock_ds)
        mock_repo.db = AsyncMock()

        with pytest.raises(NotFoundException, match="Data source not found"):
            await service.get_by_id(ds_id, user_id=user_id)

    @pytest.mark.asyncio
    async def test_get_by_id_no_user_id_returns_any_datasource(
        self, service, mock_repo
    ):
        """Without user_id check, any DataSource should be returned (existing behavior)."""
        import uuid

        ds_id = uuid.uuid4()

        mock_ds = MagicMock()
        mock_ds.agent_id = None
        mock_ds.agent = None
        mock_ds.connection_config = {"host": "db.any"}

        mock_repo.get_by_id = AsyncMock(return_value=mock_ds)
        mock_repo.db = AsyncMock()

        # user_id=None means no ownership check
        result = await service.get_by_id(ds_id, user_id=None)
        assert result == mock_ds
