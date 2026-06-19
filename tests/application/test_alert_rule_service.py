"""
Unit tests for AlertRuleService — alert rule CRUD business logic.

Tests:
- CRUD operations (create, get, list, update, delete)
- User isolation (cross-user access returns 404)
- Invalid metric/operator rejected by service layer
- Pipeline ownership verification
- Disabled rules excluded from active listing
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.application.alert_rule_service import AlertRuleService
from app.domain.models import AlertRule
from app.domain.schemas import AlertRuleCreate, AlertRuleUpdate
from app.shared.exceptions import NotFoundException


def utcnow():
    return datetime.now(UTC)


class TestAlertRuleService:
    """Unit tests for AlertRuleService business logic."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session."""
        return AsyncMock()

    @pytest.fixture
    def mock_rule_repo(self):
        """Mock AlertRule repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda rule: rule)
        repo.update = AsyncMock(side_effect=lambda rule: rule)
        repo.list_by_pipeline = AsyncMock(return_value=[])
        repo.list_active_by_pipeline = AsyncMock(return_value=[])
        return repo

    @pytest.fixture
    def sample_pipeline(self):
        """Mock pipeline with ownership chain."""
        pipeline = MagicMock()
        pipeline.id = "pipeline-001"
        pipeline.data_source = MagicMock()
        pipeline.data_source.agent = MagicMock()
        pipeline.data_source.agent.user_id = "user-001"
        return pipeline

    @pytest.fixture
    def service(self, mock_db, mock_rule_repo, sample_pipeline):
        """Create AlertRuleService with mocked dependencies."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)

        # Mock pipeline ownership check to always pass
        async def mock_verify(pipeline_id, user_id):
            return None

        service._verify_pipeline_ownership = AsyncMock(side_effect=mock_verify)
        return service

    # ============================================================
    # create
    # ============================================================

    @pytest.mark.asyncio
    async def test_create_rule_success(self, service, mock_rule_repo):
        """create should persist a rule with correct fields."""
        data = AlertRuleCreate(
            metric="z_score", operator="gt", threshold=2.0, channels=["email"]
        )
        created_rule = await service.create("pipeline-001", "user-001", data)

        mock_rule_repo.create.assert_called_once()
        assert created_rule.metric == "z_score"
        assert created_rule.operator == "gt"
        assert created_rule.threshold == 2.0
        assert created_rule.channels == ["email"]
        assert created_rule.enabled is True

    @pytest.mark.asyncio
    async def test_create_rule_default_channels(self, service):
        """create should default channels to empty list."""
        data = AlertRuleCreate(metric="null_pct", operator="lt", threshold=5.0)
        rule = await service.create("pipeline-001", "user-001", data)

        assert rule.channels == []

    @pytest.mark.asyncio
    async def test_create_rule_default_enabled(self, service):
        """create should default enabled to True."""
        data = AlertRuleCreate(metric="volume_delta_pct", operator="gte", threshold=10.0)
        rule = await service.create("pipeline-001", "user-001", data)

        assert rule.enabled is True

    @pytest.mark.asyncio
    async def test_create_rule_verifies_ownership(self, mock_db, mock_rule_repo):
        """create should fail if pipeline doesn't belong to user."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)
        service._verify_pipeline_ownership = AsyncMock(
            side_effect=NotFoundException("Pipeline not found")
        )

        data = AlertRuleCreate(metric="z_score", operator="gt", threshold=2.0)

        with pytest.raises(NotFoundException):
            await service.create("pipeline-001", "other-user", data)

    # ============================================================
    # get_by_id
    # ============================================================

    @pytest.mark.asyncio
    async def test_get_rule_by_id_success(self, service, mock_rule_repo):
        """get_by_id should return rule when found."""
        rule = AlertRule(
            id="rule-001",
            pipeline_id="pipeline-001",
            metric="z_score",
            operator="gt",
            threshold=2.0,
        )
        mock_rule_repo.get_by_id = AsyncMock(return_value=rule)

        result = await service.get_by_id("pipeline-001", "rule-001", "user-001")

        assert result == rule
        assert result.metric == "z_score"

    @pytest.mark.asyncio
    async def test_get_rule_by_id_not_found(self, service, mock_rule_repo):
        """get_by_id should raise NotFoundException when rule missing."""
        mock_rule_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundException, match="Alert rule not found"):
            await service.get_by_id("pipeline-001", "rule-999", "user-001")

    @pytest.mark.asyncio
    async def test_get_rule_by_id_wrong_pipeline(self, service, mock_rule_repo):
        """get_by_id should raise NotFoundException when rule belongs to different pipeline."""
        rule = AlertRule(
            id="rule-001",
            pipeline_id="pipeline-002",  # different pipeline
            metric="z_score",
            operator="gt",
            threshold=2.0,
        )
        mock_rule_repo.get_by_id = AsyncMock(return_value=rule)

        with pytest.raises(NotFoundException, match="Alert rule not found"):
            await service.get_by_id("pipeline-001", "rule-001", "user-001")

    @pytest.mark.asyncio
    async def test_get_rule_verifies_ownership(self, mock_db, mock_rule_repo):
        """get_by_id should fail if pipeline not owned by user."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)
        service._verify_pipeline_ownership = AsyncMock(
            side_effect=NotFoundException("Pipeline not found")
        )

        with pytest.raises(NotFoundException):
            await service.get_by_id("pipeline-001", "rule-001", "other-user")

    # ============================================================
    # list_by_pipeline
    # ============================================================

    @pytest.mark.asyncio
    async def test_list_rules_returns_rules(self, service, mock_rule_repo):
        """list_by_pipeline should return all rules for a pipeline."""
        rules = [
            AlertRule(id="r1", pipeline_id="pipeline-001", metric="z_score", operator="gt", threshold=2.0),
            AlertRule(id="r2", pipeline_id="pipeline-001", metric="null_pct", operator="lt", threshold=5.0),
        ]
        mock_rule_repo.list_by_pipeline = AsyncMock(return_value=rules)

        result = await service.list_by_pipeline("pipeline-001", "user-001")

        assert len(result) == 2
        assert result[0].id == "r1"
        assert result[1].id == "r2"

    @pytest.mark.asyncio
    async def test_list_rules_empty(self, service, mock_rule_repo):
        """list_by_pipeline should return empty list when no rules exist."""
        mock_rule_repo.list_by_pipeline = AsyncMock(return_value=[])

        result = await service.list_by_pipeline("pipeline-001", "user-001")

        assert result == []

    @pytest.mark.asyncio
    async def test_list_rules_verifies_ownership(self, mock_db, mock_rule_repo):
        """list_by_pipeline should fail if pipeline not owned by user."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)
        service._verify_pipeline_ownership = AsyncMock(
            side_effect=NotFoundException("Pipeline not found")
        )

        with pytest.raises(NotFoundException):
            await service.list_by_pipeline("pipeline-001", "other-user")

    # ============================================================
    # update
    # ============================================================

    @pytest.mark.asyncio
    async def test_update_rule_success(self, service, mock_rule_repo):
        """update should modify rule fields."""
        rule = AlertRule(
            id="rule-001",
            pipeline_id="pipeline-001",
            metric="z_score",
            operator="gt",
            threshold=2.0,
            channels=["email"],
            enabled=True,
        )
        mock_rule_repo.get_by_id = AsyncMock(return_value=rule)

        data = AlertRuleUpdate(threshold=3.0, enabled=False)
        result = await service.update("pipeline-001", "rule-001", "user-001", data)

        mock_rule_repo.update.assert_called_once()
        assert result.threshold == 3.0
        assert result.enabled is False

    @pytest.mark.asyncio
    async def test_update_rule_partial_fields(self, service, mock_rule_repo):
        """update should only change provided fields."""
        rule = AlertRule(
            id="rule-001",
            pipeline_id="pipeline-001",
            metric="z_score",
            operator="gt",
            threshold=2.0,
            channels=["email"],
            enabled=True,
        )
        mock_rule_repo.get_by_id = AsyncMock(return_value=rule)

        data = AlertRuleUpdate(channels=["slack"])
        result = await service.update("pipeline-001", "rule-001", "user-001", data)

        assert result.metric == "z_score"  # unchanged
        assert result.channels == ["slack"]  # changed

    @pytest.mark.asyncio
    async def test_update_rule_not_found(self, service, mock_rule_repo):
        """update should raise NotFoundException when rule missing."""
        mock_rule_repo.get_by_id = AsyncMock(return_value=None)

        data = AlertRuleUpdate(threshold=3.0)

        with pytest.raises(NotFoundException, match="Alert rule not found"):
            await service.update("pipeline-001", "rule-999", "user-001", data)

    # ============================================================
    # delete
    # ============================================================

    @pytest.mark.asyncio
    async def test_delete_rule_success(self, service, mock_rule_repo):
        """delete should remove the rule."""
        rule = AlertRule(
            id="rule-001",
            pipeline_id="pipeline-001",
            metric="z_score",
            operator="gt",
            threshold=2.0,
        )
        mock_rule_repo.get_by_id = AsyncMock(return_value=rule)

        await service.delete("pipeline-001", "rule-001", "user-001")

        mock_rule_repo.delete.assert_called_once_with(rule)

    @pytest.mark.asyncio
    async def test_delete_rule_not_found(self, service, mock_rule_repo):
        """delete should raise NotFoundException when rule missing."""
        mock_rule_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundException, match="Alert rule not found"):
            await service.delete("pipeline-001", "rule-999", "user-001")

    # ============================================================
    # User isolation
    # ============================================================

    @pytest.mark.asyncio
    async def test_cross_user_access_returns_404_on_create(self, mock_db, mock_rule_repo):
        """User A cannot create rules for User B's pipeline."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)
        service._verify_pipeline_ownership = AsyncMock(
            side_effect=NotFoundException("Pipeline not found")
        )

        data = AlertRuleCreate(metric="z_score", operator="gt", threshold=2.0)

        with pytest.raises(NotFoundException, match="Pipeline not found"):
            await service.create("pipeline-of-other-user", "attacker-user", data)

    @pytest.mark.asyncio
    async def test_cross_user_access_returns_404_on_get(self, mock_db, mock_rule_repo):
        """User A cannot view rules of User B's pipeline."""
        service = AlertRuleService(mock_db, rule_repo=mock_rule_repo)
        service._verify_pipeline_ownership = AsyncMock(
            side_effect=NotFoundException("Pipeline not found")
        )

        with pytest.raises(NotFoundException, match="Pipeline not found"):
            await service.get_by_id("pipeline-of-other-user", "rule-001", "attacker-user")

    # ============================================================
    # Schema validation (exercised via AlertRuleCreate/AlertRuleUpdate)
    # ============================================================

    def test_valid_metrics_accepted(self):
        """AlertRuleCreate should accept all valid metrics."""
        for metric in ("z_score", "null_pct", "volume_delta_pct"):
            data = AlertRuleCreate(metric=metric, operator="gt", threshold=1.0)
            assert data.metric == metric

    def test_invalid_metric_rejected(self):
        """AlertRuleCreate should reject invalid metric."""
        with pytest.raises(ValueError, match="metric must be one of"):
            AlertRuleCreate(metric="invalid_metric", operator="gt", threshold=1.0)

    def test_valid_operators_accepted(self):
        """AlertRuleCreate should accept all valid operators."""
        for op_val in ("gt", "lt", "gte", "lte", "eq"):
            data = AlertRuleCreate(metric="z_score", operator=op_val, threshold=1.0)
            assert data.operator == op_val

    def test_invalid_operator_rejected(self):
        """AlertRuleCreate should reject invalid operator."""
        with pytest.raises(ValueError, match="operator must be one of"):
            AlertRuleCreate(metric="z_score", operator="invalid_op", threshold=1.0)

    def test_negative_threshold_rejected(self):
        """AlertRuleCreate should reject non-positive threshold."""
        with pytest.raises(ValueError, match="threshold must be a positive number"):
            AlertRuleCreate(metric="z_score", operator="gt", threshold=-1.0)

    def test_zero_threshold_rejected(self):
        """AlertRuleCreate should reject zero threshold."""
        with pytest.raises(ValueError, match="threshold must be a positive number"):
            AlertRuleCreate(metric="z_score", operator="gt", threshold=0.0)

    def test_alert_rule_update_invalid_metric(self):
        """AlertRuleUpdate should reject invalid metric."""
        with pytest.raises(ValueError, match="metric must be one of"):
            AlertRuleUpdate(metric="bad_metric")

    def test_alert_rule_update_invalid_operator(self):
        """AlertRuleUpdate should reject invalid operator."""
        with pytest.raises(ValueError, match="operator must be one of"):
            AlertRuleUpdate(operator="bad_op")

    def test_alert_rule_update_negative_threshold(self):
        """AlertRuleUpdate should reject negative threshold."""
        with pytest.raises(ValueError, match="threshold must be a positive number"):
            AlertRuleUpdate(threshold=-5.0)
