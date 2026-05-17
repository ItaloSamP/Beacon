import asyncio
import uuid

from sqlalchemy import select

from app.infrastructure.database import async_session_factory, Base, engine
from app.domain.models import User, Agent, DataSource, Pipeline
from app.infrastructure.security import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # Check if admin user already exists
        existing = await session.execute(
            select(User).where(User.email == "admin@beacon.dev")
        )
        existing_user = existing.scalar_one_or_none()

        if existing_user:
            print("Seed data already exists. Nothing to do.")
            print(f"  Admin user: admin@beacon.dev / admin123 (already present)")
            return

        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="admin@beacon.dev",
            password_hash=hash_password("admin123"),
            name="Admin",
        )
        session.add(user)

        agent = Agent(
            id=uuid.uuid4(),
            name="Production Agent",
            user_id=user_id,
            status="online",
            version="0.1.0",
        )
        session.add(agent)

        pg_ds = DataSource(
            id=uuid.uuid4(),
            name="Production Postgres",
            type="postgres",
            agent_id=agent.id,
            connection_config={
                "host": "prod-db.internal",
                "port": 5432,
                "database": "analytics",
                "username": "reader",
                "password": "secret123",
            },
            status="active",
        )
        session.add(pg_ds)

        bq_ds = DataSource(
            id=uuid.uuid4(),
            name="Marketing BigQuery",
            type="bigquery",
            agent_id=agent.id,
            connection_config={"project": "my-project", "dataset": "marketing"},
            status="active",
        )
        session.add(bq_ds)

        pipeline1 = Pipeline(
            id=uuid.uuid4(),
            name="Daily Row Count",
            type="volume",
            data_source_id=pg_ds.id,
            schedule="0 6 * * *",
            config={"query": "SELECT COUNT(*) FROM users", "threshold": 10000},
            enabled=True,
        )
        session.add(pipeline1)

        pipeline2 = Pipeline(
            id=uuid.uuid4(),
            name="Null Check Email",
            type="null_check",
            data_source_id=bq_ds.id,
            schedule="0 * * * *",
            config={"column": "email", "table": "users"},
            enabled=True,
        )
        session.add(pipeline2)

        await session.commit()
        print("Beacon seed completed successfully.")
        print("  Admin user: admin@beacon.dev / admin123")
        print("  1 agent created.")
        print("  2 data sources created.")
        print("  2 pipelines created.")


if __name__ == "__main__":
    asyncio.run(seed())
