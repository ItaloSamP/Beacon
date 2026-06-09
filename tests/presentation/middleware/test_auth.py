from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestAgentTokenLastUsedAt:
    """M-1: Agent token last_used_at is updated in auth middleware on every request."""

    @pytest.mark.asyncio
    async def test_agent_token_auth_calls_update_last_used(self):
        """When agent token authenticates, repo.update_last_used is called."""
        from app.presentation.api.middleware.auth import require_auth

        mock_request = MagicMock()
        mock_request.headers.get.side_effect = lambda key, default=None: {
            "X-API-Key": None,
            "Authorization": "Bearer beacon_agent_fake_token_for_testing_42chars_here_end",
        }.get(key, default)

        mock_db = AsyncMock()

        mock_agent = MagicMock()
        mock_agent.user_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_token_obj = MagicMock()
        mock_token_obj.agent = mock_agent
        mock_token_obj.agent_id = "agent-uuid-0001"
        mock_token_obj.id = "token-uuid-0001"

        with patch(
            "app.presentation.api.middleware.auth.decode_token",
            side_effect=Exception("not a jwt"),
        ):
            with patch(
                "app.infrastructure.repositories.agent_token_repo.AgentTokenRepository"
            ) as MockRepo:
                mock_repo_instance = MagicMock()
                mock_repo_instance.get_by_token_hash = AsyncMock(
                    return_value=mock_token_obj
                )
                mock_repo_instance.update_last_used = AsyncMock()
                MockRepo.return_value = mock_repo_instance

                result = await require_auth(mock_request, mock_db)

        assert result["auth_method"] == "agent_token"
        assert result["user_id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert result["agent_id"] == "agent-uuid-0001"
        mock_repo_instance.update_last_used.assert_called_once_with("token-uuid-0001")

    @pytest.mark.asyncio
    async def test_agent_token_without_agent_raises_unauthorized(self):
        """Agent token without linked agent should raise UnauthorizedException."""
        from app.presentation.api.middleware.auth import require_auth
        from app.shared.exceptions import UnauthorizedException

        mock_request = MagicMock()
        mock_request.headers.get.side_effect = lambda key, default=None: {
            "X-API-Key": None,
            "Authorization": "Bearer beacon_agent_orphaned_token_xyz_12345_abcde_67890",
        }.get(key, default)

        mock_db = AsyncMock()

        mock_token_obj = MagicMock()
        mock_token_obj.agent = None  # no linked agent

        with patch(
            "app.presentation.api.middleware.auth.decode_token",
            side_effect=Exception("not a jwt"),
        ):
            with patch(
                "app.infrastructure.repositories.agent_token_repo.AgentTokenRepository"
            ) as MockRepo:
                mock_repo_instance = MagicMock()
                mock_repo_instance.get_by_token_hash = AsyncMock(
                    return_value=mock_token_obj
                )
                MockRepo.return_value = mock_repo_instance

                with pytest.raises(UnauthorizedException):
                    await require_auth(mock_request, mock_db)
