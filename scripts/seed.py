import asyncio
import uuid

from app.infrastructure.database import async_session_factory, Base, engine
from app.domain.models import User, DataSource, Pipeline
from app.infrastructure.security import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="admin@dhm.local",
            password_hash=hash_password("admin123"),
            name="Admin",
        )
        session.add(user)

        pg_ds = DataSource(
            id=uuid.uuid4(),
            name="Production Postgres",
            type="postgres",
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
        print("Seed completed successfully.")
        print(f"  Admin user: admin@dhm.local / admin123")
        print(f"  {2} data sources created.")
        print(f"  {2} pipelines created.")


if __name__ == "__main__":
    asyncio.run(seed())
