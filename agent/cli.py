import asyncio
import signal

import click

from agent.api_client import AgentAPIClient, AgentAPIConnectionError
from agent.config import AgentConfig
from agent.connectors.postgres import PostgresConnectionError, PostgresConnector
from agent.detection import AnomalyDetector
from agent.heartbeat import HeartbeatService
from agent.profiling.runner import ProfileRunner
from agent.storage import AgentStorage


@click.group()
def cli():
    pass


main = cli


@cli.command()
@click.option("--token", required=False, default=None, help="Agent token")
@click.option("--cloud-url", required=False, default=None, help="Cloud API base URL")
@click.option("--once", is_flag=True, default=False, help="Profile once and exit")
def run(token, cloud_url, once):
    config = AgentConfig()

    if not token:
        token = config.BEACON_AGENT_TOKEN
    if not token:
        raise click.UsageError(
            "Missing agent token. Provide --token or set BEACON_AGENT_TOKEN env var."
        )

    if cloud_url:
        base_url = cloud_url
    else:
        base_url = config.BEACON_CLOUD_URL

    signal.signal(signal.SIGINT, lambda sig, frame: None)
    signal.signal(signal.SIGTERM, lambda sig, frame: None)

    asyncio.run(_run_async(token, base_url, once, config))


async def _run_async(token, base_url, once, config):
    client = AgentAPIClient(base_url=base_url, agent_token=token)
    storage = None

    try:
        try:
            cloud_config = await client.get_config()
        except ConnectionError as exc:
            click.echo(f"Error: Unable to reach cloud API: {exc}", err=True)
            raise SystemExit(1)

        agent_info = cloud_config["data"]["agent"]
        data_sources = cloud_config["data"]["data_sources"]
        pipelines = cloud_config["data"]["pipelines"]
        settings = cloud_config["data"].get("settings", {})

        storage = AgentStorage(db_path=config.BEACON_AGENT_DB_PATH)
        storage.init_db()

        detector = AnomalyDetector()

        for ds in data_sources:
            if ds.get("type") != "postgres":
                continue

            connection_config = ds.get("connection_config", {})
            connector = PostgresConnector()

            try:
                await connector.connect(connection_config)
            except (OSError, PostgresConnectionError, ValueError):
                continue

            try:
                runner = ProfileRunner(connector=connector)

                for pipeline in pipelines:
                    pipeline_id = pipeline.get("id", "unknown")
                    target_tables = pipeline.get("config", {}).get("tables", [])

                    profile_result = await runner.run(
                        connector=connector, target_tables=target_tables
                    )
                    profile_dict = profile_result.to_dict()

                    for table_name in target_tables:
                        if table_name not in profile_dict.get("tables", {}):
                            continue

                        table_data = profile_dict["tables"][table_name]
                        storage.save_profile(pipeline_id, table_name, table_data)

                        baselines = {}

                        if (
                            "volume" in table_data
                            and "row_count" in table_data["volume"]
                        ):
                            row_count = float(table_data["volume"]["row_count"])
                            metric_name = "row_count"
                            existing = storage.get_baseline(
                                pipeline_id, table_name, metric_name
                            )
                            if existing is None:
                                storage.update_baseline(
                                    pipeline_id, table_name, metric_name,
                                    row_count, 0.0, 1,
                                )
                            else:
                                mean, stddev, n = existing
                                new_n = n + 1
                                new_mean = mean + (row_count - mean) / new_n
                                storage.update_baseline(
                                    pipeline_id, table_name, metric_name,
                                    new_mean, stddev, new_n,
                                )
                            baselines[(table_name, metric_name)] = (
                                storage.get_baseline(
                                    pipeline_id, table_name, metric_name
                                )
                            )

                        if "nulls" in table_data:
                            nulls_data = table_data["nulls"]
                            null_pcts = nulls_data.get("null_percentages", {})
                            for col_name, null_pct in null_pcts.items():
                                metric_name = f"null_{col_name}"
                                value = float(null_pct)
                                existing = storage.get_baseline(
                                    pipeline_id, table_name, metric_name
                                )
                                if existing is None:
                                    storage.update_baseline(
                                        pipeline_id, table_name, metric_name,
                                        value, 0.0, 1,
                                    )
                                else:
                                    mean, stddev, n = existing
                                    new_n = n + 1
                                    new_mean = mean + (value - mean) / new_n
                                    storage.update_baseline(
                                        pipeline_id, table_name, metric_name,
                                        new_mean, stddev, new_n,
                                    )
                                baselines[(table_name, metric_name)] = (
                                    storage.get_baseline(
                                        pipeline_id, table_name, metric_name
                                    )
                                )

                        anomalies = detector.evaluate(
                            profile_result=profile_dict,
                            baselines=baselines,
                            pipeline_id=pipeline_id,
                        )

                        for anomaly in anomalies:
                            try:
                                await client.upload_anomaly(anomaly.to_dict())
                            except (ConnectionError, AgentAPIConnectionError):
                                storage.enqueue_anomaly(anomaly.to_dict())
            finally:
                try:
                    await connector.disconnect()
                except Exception:
                    pass

        pending = storage.get_pending_anomalies()
        for item in pending:
            try:
                await client.upload_anomaly(item)
                storage.mark_synced(item["id"])
            except (ConnectionError, AgentAPIConnectionError):
                pass

        if not once:
            heartbeat = HeartbeatService(
                api_client=client,
                agent_id=agent_info.get("id", "unknown"),
                interval=settings.get("heartbeat_interval", 30),
            )
            await heartbeat.start()

    finally:
        if storage is not None:
            try:
                storage.close()
            except Exception:
                pass
        try:
            await client._client.aclose()
        except Exception:
            pass
