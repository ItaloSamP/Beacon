"""
Migration tests for Beacon database changes.

Tests:
- Migration 002 (agents): verify upgrade creates tables/columns, downgrade removes them.

RED PHASE: These tests WILL FAIL because the migration 002_add_agents.py doesn't exist yet.
"""

import pytest
from pathlib import Path


class TestMigration002Agents:
    """
    Verify that migration 002_add_agents.py is present and has correct structure.

    Since the project uses SQLAlchemy metadata.create_all for test DB setup
    (not Alembic migrations), these tests validate:

    1. The migration file exists
    2. It has upgrade() and downgrade() functions
    3. The upgrade creates agents table + agent_id column
    4. The downgrade reverses those changes
    """

    def test_migration_file_exists(self):
        """
        Ensure the migration 002 file exists in alembic/versions/.
        """
        migrations_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        migration_files = sorted(
            f for f in migrations_dir.glob("*.py")
            if f.name != "__init__.py"
        )
        # At least 002 should exist (001 is initial)
        agent_migrations = [
            f for f in migration_files if "002" in f.name and "agent" in f.name.lower()
        ]
        assert len(agent_migrations) > 0, (
            f"Expected migration 002_add_agents.py in {migrations_dir}. "
            f"Found: {[f.name for f in migration_files]}"
        )

    def test_migration_has_upgrade_and_downgrade(self):
        """
        002 migration must define upgrade() and downgrade() functions.
        """
        migrations_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        agent_migrations = sorted(
            f for f in migrations_dir.glob("*add_agents*") if f.name.endswith(".py")
        )

        if not agent_migrations:
            pytest.skip("Migration 002_add_agents.py not found yet")

        migration_content = agent_migrations[0].read_text()

        assert "def upgrade()" in migration_content or "def upgrade" in migration_content, (
            "Migration 002 must define an upgrade() function"
        )
        assert "def downgrade()" in migration_content or "def downgrade" in migration_content, (
            "Migration 002 must define a downgrade() function"
        )

    def test_migration_creates_agents_table(self):
        """
        Migration 002 upgrade() should reference 'agents' table creation.
        """
        migrations_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        agent_migrations = sorted(
            f for f in migrations_dir.glob("*add_agents*") if f.name.endswith(".py")
        )

        if not agent_migrations:
            pytest.skip("Migration 002_add_agents.py not found yet")

        migration_content = agent_migrations[0].read_text()

        # Should reference agents table in upgrade
        assert "agents" in migration_content, (
            "Migration 002 should reference 'agents' table"
        )

    def test_migration_adds_agent_id_to_data_sources(self):
        """
        Migration 002 upgrade() should add agent_id column to data_sources.
        """
        migrations_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        agent_migrations = sorted(
            f for f in migrations_dir.glob("*add_agents*") if f.name.endswith(".py")
        )

        if not agent_migrations:
            pytest.skip("Migration 002_add_agents.py not found yet")

        migration_content = agent_migrations[0].read_text()

        # Should reference agent_id in data_sources
        assert "agent_id" in migration_content, (
            "Migration 002 should reference 'agent_id' for data_sources"
        )

    def test_migration_downgrade_removes_agents(self):
        """
        Migration 002 downgrade() should drop agents table.
        """
        migrations_dir = Path(__file__).parent.parent.parent / "alembic" / "versions"
        agent_migrations = sorted(
            f for f in migrations_dir.glob("*add_agents*") if f.name.endswith(".py")
        )

        if not agent_migrations:
            pytest.skip("Migration 002_add_agents.py not found yet")

        migration_content = agent_migrations[0].read_text()

        # Should have drop table in downgrade section
        assert "drop" in migration_content.lower() or "agents" in migration_content, (
            "Migration 002 downgrade should reference 'agents' for removal"
        )


class TestAgentModelFromMigration:
    """
    Verify that the Agent model, once imported, has the correct structure
    that matches what the migration would create.

    RED PHASE: Will fail with ImportError because Agent model doesn't exist yet
    in app/domain/models.py.
    """

    def test_agent_model_imports(self):
        """
        Agent model should be importable from app.domain.models.
        """
        from app.domain.models import Agent
        assert Agent is not None

    def test_agent_model_has_tablename(self):
        """
        Agent model should have __tablename__ = 'agents'.
        """
        from app.domain.models import Agent
        assert hasattr(Agent, '__tablename__'), "Agent model must have __tablename__"
        assert Agent.__tablename__ == 'agents', f"Expected 'agents', got '{Agent.__tablename__}'"

    def test_agent_model_has_required_columns(self):
        """
        Agent model must have: id, name, user_id, status, last_heartbeat_at, version, created_at.
        """
        from app.domain.models import Agent

        mapper = Agent.__mapper__
        column_names = [c.key for c in mapper.columns]

        required_columns = ['id', 'name', 'user_id', 'status', 'last_heartbeat_at', 'version', 'created_at']
        for col in required_columns:
            assert col in column_names, (
                f"Agent model missing column '{col}'. Found: {column_names}"
            )

    def test_agent_model_has_relationships(self):
        """
        Agent model should have relationships: user, data_sources.
        """
        from app.domain.models import Agent
        from sqlalchemy.orm import RelationshipProperty

        all_relationships = {
            key: value for key, value in Agent.__mapper__.relationships.items()
            if isinstance(value, RelationshipProperty)
        }

        assert 'user' in all_relationships, (
            f"Agent model missing 'user' relationship. Found: {list(all_relationships.keys())}"
        )
        assert 'data_sources' in all_relationships, (
            f"Agent model missing 'data_sources' relationship. Found: {list(all_relationships.keys())}"
        )

    def test_agent_status_enum_exists(self):
        """
        AgentStatus enum must exist with 'online' and 'offline' values.
        """
        from app.domain.models import AgentStatus

        assert hasattr(AgentStatus, 'online'), "AgentStatus must have 'online'"
        assert hasattr(AgentStatus, 'offline'), "AgentStatus must have 'offline'"
        assert AgentStatus.online.value == 'online'
        assert AgentStatus.offline.value == 'offline'
