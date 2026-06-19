from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.alert_rule_service import AlertRuleService
from app.domain.schemas import AlertRuleCreate, AlertRuleUpdate, ApiResponse
from app.infrastructure.database import get_db
from app.presentation.api.middleware.auth import require_auth

router = APIRouter(prefix="/pipelines/{pipeline_id}/rules", tags=["alert-rules"])


def _serialize_rule(rule) -> dict:
    return {
        "id": str(rule.id),
        "pipeline_id": str(rule.pipeline_id),
        "metric": rule.metric,
        "operator": rule.operator,
        "threshold": rule.threshold,
        "channels": rule.channels or [],
        "enabled": rule.enabled,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


@router.get("")
async def list_rules(
    pipeline_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AlertRuleService(db)
    rules = await service.list_by_pipeline(pipeline_id, user_id)
    return ApiResponse(
        data=[_serialize_rule(r) for r in rules],
        error=None,
    )


@router.get("/{rule_id}")
async def get_rule(
    pipeline_id: UUID,
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AlertRuleService(db)
    rule = await service.get_by_id(pipeline_id, rule_id, user_id)
    return ApiResponse(data=_serialize_rule(rule), error=None)


@router.post("", status_code=201)
async def create_rule(
    pipeline_id: UUID,
    req: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AlertRuleService(db)
    rule = await service.create(pipeline_id, user_id, req)
    return ApiResponse(data=_serialize_rule(rule), error=None)


@router.put("/{rule_id}")
async def update_rule(
    pipeline_id: UUID,
    rule_id: UUID,
    req: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AlertRuleService(db)
    rule = await service.update(pipeline_id, rule_id, user_id, req)
    return ApiResponse(data=_serialize_rule(rule), error=None)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    pipeline_id: UUID,
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AlertRuleService(db)
    await service.delete(pipeline_id, rule_id, user_id)
    return None
