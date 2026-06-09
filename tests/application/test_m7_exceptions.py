from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.exc import SQLAlchemyError

from app.application.pipeline_runner import PipelineRunService
from app.domain.models import Pipeline, PipelineRun, PipelineRunStatus, PipelineType
from app.shared.exceptions import NotFoundException


class TestExecutePipelineExceptionTypes:
    """M-7: _execute_pipeline catches NotFoundException and SQLAlchemyError only."""

    @pytest.fixture
    def mock_db(self):
        return AsyncMock()

    @pytest.fixture
    def mock_pipeline_repo(self):
        return AsyncMock()

    @pytest.fixture
    def mock_run_repo(self):
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda run: run)
        repo.update_status = AsyncMock(side_effect=lambda run_id, status, **kw: MagicMock())
        return repo

    @pytest.fixture
    def mock_datasource_repo(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_db, mock_pipeline_repo, mock_run_repo, mock_datasource_repo):
        return PipelineRunService(
            db=mock_db,
            pipeline_run_repo=mock_run_repo,
            pipeline_repo=mock_pipeline_repo,
            datasource_repo=mock_datasource_repo,
        )

    @pytest.fixture
    def sample_pipeline(self):
        pipe = MagicMock(spec=Pipeline)
        pipe.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        pipe.name = "Test Pipeline"
        pipe.type = PipelineType.volume
        pipe.data_source_id = "ds-uuid-001"
        pipe.config = {"query": "SELECT 1", "threshold": 100}
        pipe.enabled = True
        return pipe

    @pytest.fixture
    def sample_pipeline_run(self):
        run = MagicMock(spec=PipelineRun)
        run.id = "run-uuid-001"
        run.pipeline_id = "pipe-uuid-001"
        run.status = PipelineRunStatus.success
        run.metrics_json = {}
        return run

    @pytest.mark.asyncio
    async def test_does_not_catch_runtime_error(
        self, service, mock_datasource_repo, mock_run_repo, sample_pipeline, sample_pipeline_run
    ):
        """RuntimeError should propagate (not caught by _execute_pipeline)."""
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=RuntimeError("Unexpected system failure")
        )

        with pytest.raises(RuntimeError, match="Unexpected system failure"):
            await service._execute_pipeline(sample_pipeline, sample_pipeline_run)

    @pytest.mark.asyncio
    async def test_catches_sqlalchemy_error_sets_error_status(
        self, service, mock_datasource_repo, mock_run_repo, sample_pipeline, sample_pipeline_run
    ):
        """SQLAlchemyError should be caught and status set to error."""
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=SQLAlchemyError("Connection timeout")
        )

        await service._execute_pipeline(sample_pipeline, sample_pipeline_run)

        mock_run_repo.update_status.assert_called_once()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    @pytest.mark.asyncio
    async def test_catches_not_found_exception_sets_error_status(
        self, service, mock_datasource_repo, mock_run_repo, sample_pipeline, sample_pipeline_run
    ):
        """NotFoundException should be caught and status set to error."""
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=NotFoundException("Data source not found")
        )

        await service._execute_pipeline(sample_pipeline, sample_pipeline_run)

        mock_run_repo.update_status.assert_called_once()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error
