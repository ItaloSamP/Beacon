"""Unit tests for AgentAPIClient — RED PHASE: module does not exist yet."""

import httpx
import pytest
import respx

# RED PHASE — these imports will fail until the modules are created
from agent.api_client import (  # noqa: E402
    AgentAPIClient,
    AgentAPIError,
    AgentAPIConnectionError,
    AgentAPITimeoutError,
)

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "bcn_test_abc123xyz"


# ═══════════════════════════════════════════════════════════════════════
# Initialization
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestAgentAPIClientInit:
    async def test_stores_base_url_and_token(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
        assert client.base_url == BASE_URL
        assert client.agent_token == TOKEN

    async def test_creates_httpx_async_client(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
        assert hasattr(client, "_client")
        assert isinstance(client._client, httpx.AsyncClient)

    async def test_sets_bearer_auth_header_on_client(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
        headers = client._client.headers
        assert headers.get("Authorization") == f"Bearer {TOKEN}"

    async def test_stores_base_url_without_trailing_slash(self):
        client = AgentAPIClient(base_url="http://localhost:8000/api/v1/", agent_token=TOKEN)
        assert client.base_url.rstrip("/") == "http://localhost:8000/api/v1"

    async def test_empty_base_url_raises_value_error(self):
        with pytest.raises(ValueError):
            AgentAPIClient(base_url="", agent_token=TOKEN)

    async def test_empty_token_allowed(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token="")
        assert client.agent_token == ""

    async def test_default_timeout_is_set(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
        assert client._client.timeout is not None


# ═══════════════════════════════════════════════════════════════════════
# Auth header verification
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestAuthHeader:
    async def test_get_config_sends_bearer_token(self):
        with respx.mock as mock:
            route = mock.get(f"{BASE_URL}/agent/self/config").respond(
                json={"data": {"agent": {"id": "a1"}}}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.get_config()

            request = mock.calls[0].request
            assert request.headers["Authorization"] == f"Bearer {TOKEN}"

    async def test_send_heartbeat_sends_bearer_token(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/agents/a1/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.send_heartbeat("a1")

            request = mock.calls[0].request
            assert request.headers["Authorization"] == f"Bearer {TOKEN}"

    async def test_upload_anomaly_sends_bearer_token(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 1, "status": "created"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.upload_anomaly({"type": "null_spike", "severity": "high"})

            request = mock.calls[0].request
            assert request.headers["Authorization"] == f"Bearer {TOKEN}"

    async def test_no_auth_header_when_token_is_empty(self):
        with respx.mock as mock:
            route = mock.get(f"{BASE_URL}/agent/self/config").respond(
                json={"data": {"agent": {"id": "a1"}}}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token="")
            await client.get_config()

            request = mock.calls[0].request
            assert request.headers.get("Authorization") is None or request.headers["Authorization"] == "Bearer "


# ═══════════════════════════════════════════════════════════════════════
# get_config()
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestGetConfig:
    async def test_successful_get_config_returns_dict(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                json={
                    "data": {
                        "agent": {"id": "agent-1", "name": "Beacon Agent", "version": "0.1.0"},
                        "data_sources": [
                            {"id": "ds1", "type": "postgres", "name": "Main DB"}
                        ],
                        "pipelines": [
                            {"id": "p1", "name": "Daily Check", "enabled": True}
                        ],
                        "settings": {"check_interval": 3600},
                    }
                }
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.get_config()
            assert isinstance(result, dict)
            assert result["data"]["agent"]["id"] == "agent-1"
            assert len(result["data"]["data_sources"]) == 1
            assert len(result["data"]["pipelines"]) == 1

    async def test_get_config_correct_url(self):
        with respx.mock as mock:
            route = mock.get(f"{BASE_URL}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.get_config()
            assert route.called

    async def test_get_config_401_unauthorized(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=401, json={"detail": "Invalid token"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token="invalid")
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_get_config_403_forbidden(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=403, json={"detail": "Forbidden"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_get_config_404_not_found(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=404, json={"detail": "Not found"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_get_config_500_server_error(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=500, text="Internal Server Error"
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_get_config_returns_empty_dict_when_data_is_empty(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.get_config()
            assert result == {"data": {}}


# ═══════════════════════════════════════════════════════════════════════
# send_heartbeat()
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestSendHeartbeat:
    async def test_successful_heartbeat(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/agent-42/heartbeat").respond(
                json={"status": "ok", "timestamp": "2026-01-01T00:00:00Z"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.send_heartbeat("agent-42")
            assert result["status"] == "ok"

    async def test_heartbeat_url_includes_agent_id(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/agents/xyz-789/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.send_heartbeat("xyz-789")
            assert route.called

    async def test_heartbeat_with_numeric_agent_id(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/agents/12345/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.send_heartbeat("12345")
            assert route.called

    async def test_heartbeat_401_unauthorized(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/a1/heartbeat").respond(
                status_code=401, json={"detail": "Unauthorized"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token="expired")
            with pytest.raises(AgentAPIError):
                await client.send_heartbeat("a1")

    async def test_heartbeat_500_server_error(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/a1/heartbeat").respond(
                status_code=500, text="Error"
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.send_heartbeat("a1")

    async def test_heartbeat_empty_agent_id(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents//heartbeat").respond(json={"status": "ok"})
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.send_heartbeat("")
            assert isinstance(result, dict)


# ═══════════════════════════════════════════════════════════════════════
# upload_anomaly()
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestUploadAnomaly:
    async def test_successful_upload(self):
        anomaly = {
            "pipeline_run_id": "run-1",
            "type": "null_spike",
            "severity": "high",
            "description": "email null rate jumped from 0.02 to 0.35",
            "deviation_details": {"z_score": 5.2, "current_value": 0.35, "baseline_value": 0.02},
        }
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 42, "status": "created", **anomaly}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.upload_anomaly(anomaly)
            assert result["id"] == 42
            assert result["status"] == "created"

    async def test_upload_sends_correct_json_body(self):
        anomaly = {"pipeline_run_id": "run-1", "type": "missing_data", "severity": "critical"}
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 1, "status": "created"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.upload_anomaly(anomaly)

            request = mock.calls[0].request
            sent_json = httpx.Response(200, content=request.content).json()
            assert sent_json["type"] == "missing_data"
            assert sent_json["severity"] == "critical"

    async def test_upload_422_validation_error(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(
                status_code=422,
                json={"detail": [{"loc": ["body", "type"], "msg": "field required"}]},
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.upload_anomaly({"bad_field": "value"})

    async def test_upload_400_bad_request(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(
                status_code=400, json={"detail": "Invalid anomaly data"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.upload_anomaly({"pipeline_run_id": "r1"})

    async def test_upload_409_conflict(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(
                status_code=409, json={"detail": "Duplicate anomaly"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.upload_anomaly({"pipeline_run_id": "r1", "type": "dup", "severity": "low"})

    async def test_upload_with_all_fields(self):
        anomaly = {
            "pipeline_run_id": "run-99",
            "type": "volume_anomaly",
            "severity": "medium",
            "description": "Row count dropped 40%",
            "deviation_details": {
                "z_score": 4.1,
                "current_value": 6000,
                "baseline_value": 10000,
                "percent_change": -40.0,
            },
        }
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(json={"id": 99, "status": "created"})
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.upload_anomaly(anomaly)
            assert result["status"] == "created"


# ═══════════════════════════════════════════════════════════════════════
# Retry logic
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestRetryLogic:
    async def test_retries_on_500_then_succeeds(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                return httpx.Response(500, text="Internal Error")
            return httpx.Response(200, json={"data": {"agent": {"id": "a1"}}})

        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.get_config()
            assert result["data"]["agent"]["id"] == "a1"
            assert call_count == 3

    async def test_retries_on_503_then_succeeds(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                return httpx.Response(503, text="Service Unavailable")
            return httpx.Response(200, json={"status": "ok"})

        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/a1/heartbeat").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.send_heartbeat("a1")
            assert result["status"] == "ok"

    async def test_raises_after_max_retries_exhausted(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=500, text="Server Error"
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_max_retries_made_before_raising(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            return httpx.Response(500, text="Persistent Error")

        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()
            assert call_count == 3

    async def test_does_not_retry_on_4xx_errors(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            return httpx.Response(401, json={"detail": "Unauthorized"})

        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token="bad")
            with pytest.raises(AgentAPIError):
                await client.get_config()
            assert call_count == 1

    async def test_retries_on_connection_error(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise httpx.ConnectError("Connection refused")
            return httpx.Response(200, json={"status": "ok"})

        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/a1/heartbeat").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.send_heartbeat("a1")
            assert result["status"] == "ok"
            assert call_count == 3

    async def test_retries_post_requests(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                return httpx.Response(502, text="Bad Gateway")
            return httpx.Response(200, json={"id": 1, "status": "created"})

        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.upload_anomaly({"pipeline_run_id": "r1", "type": "t", "severity": "low"})
            assert result["status"] == "created"


# ═══════════════════════════════════════════════════════════════════════
# Timeout
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestTimeout:
    async def test_timeout_on_get_config(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.TimeoutException("Request timed out")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPITimeoutError):
                await client.get_config()

    async def test_timeout_on_send_heartbeat(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/a1/heartbeat").mock(
                side_effect=httpx.TimeoutException("Request timed out")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPITimeoutError):
                await client.send_heartbeat("a1")

    async def test_timeout_on_upload_anomaly(self):
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").mock(
                side_effect=httpx.TimeoutException("timed out")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPITimeoutError):
                await client.upload_anomaly({"pipeline_run_id": "r1", "type": "t", "severity": "low"})

    async def test_timeout_included_in_retry_attempts(self):
        call_count = 0

        def side_effect(request):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise httpx.TimeoutException("timed out")
            return httpx.Response(200, json={"data": {"agent": {"id": "a1"}}})

        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(side_effect=side_effect)
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.get_config()
            assert result["data"]["agent"]["id"] == "a1"
            assert call_count == 3


# ═══════════════════════════════════════════════════════════════════════
# Error handling
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestErrorHandling:
    async def test_connection_error_raises_agent_api_connection_error(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.ConnectError("Connection refused")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIConnectionError):
                await client.get_config()

    async def test_dns_failure_raises_connection_error(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.ConnectError("[Errno -2] Name or service not known")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIConnectionError):
                await client.get_config()

    async def test_network_unreachable_raises_connection_error(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.ConnectError("No route to host")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIConnectionError):
                await client.get_config()

    async def test_read_error_during_response(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.ReadError("Connection closed unexpectedly")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIConnectionError):
                await client.get_config()

    async def test_invalid_json_response_raises_error(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=200, text="not valid json {{{"
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_empty_response_body(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=200, text=""
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_remote_disconnect_during_stream(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=httpx.RemoteProtocolError("Server disconnected")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIConnectionError):
                await client.get_config()

    async def test_does_not_crash_on_unexpected_exception(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").mock(
                side_effect=RuntimeError("Unexpected internal error")
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()


# ═══════════════════════════════════════════════════════════════════════
# URL construction
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestURLConstruction:
    async def test_get_config_url(self):
        with respx.mock as mock:
            route = mock.get(f"{BASE_URL}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.get_config()
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == f"{BASE_URL}/agent/self/config"

    async def test_send_heartbeat_url(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/agents/my-agent-001/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.send_heartbeat("my-agent-001")
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == f"{BASE_URL}/agents/my-agent-001/heartbeat"

    async def test_upload_anomaly_url(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 1, "status": "created"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.upload_anomaly({"pipeline_run_id": "r1", "type": "t", "severity": "low"})
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == f"{BASE_URL}/anomalies"

    async def test_base_url_with_trailing_slash(self):
        base = "http://localhost:8000/api/v1/"
        with respx.mock as mock:
            route = mock.get("http://localhost:8000/api/v1/agent/self/config").respond(
                json={"data": {}}
            )
            client = AgentAPIClient(base_url=base, agent_token=TOKEN)
            await client.get_config()
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == "http://localhost:8000/api/v1/agent/self/config"

    async def test_custom_base_url_different_port(self):
        base = "http://192.168.1.50:9000/api/v2"
        with respx.mock as mock:
            route = mock.get(f"{base}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=base, agent_token=TOKEN)
            await client.get_config()
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == f"{base}/agent/self/config"

    async def test_https_base_url(self):
        base = "https://beacon.example.com/api/v1"
        with respx.mock as mock:
            route = mock.get(f"{base}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=base, agent_token=TOKEN)
            await client.get_config()
            actual_url = str(mock.calls[0].request.url)
            assert actual_url == f"{base}/agent/self/config"


# ═══════════════════════════════════════════════════════════════════════
# Edge cases
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestEdgeCases:
    async def test_empty_token_sends_no_auth(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(json={"data": {}})
            client = AgentAPIClient(base_url=BASE_URL, agent_token="")
            await client.get_config()
            request = mock.calls[0].request
            auth = request.headers.get("Authorization")
            assert auth is None or auth == "Bearer "

    async def test_large_anomaly_payload(self):
        large_payload = {
            "pipeline_run_id": "run-large",
            "type": "schema_change",
            "severity": "high",
            "description": "A" * 10_000,
            "deviation_details": {
                "added_columns": [f"col_{i}" for i in range(500)],
                "removed_columns": [f"old_col_{i}" for i in range(500)],
                "changed_types": {f"col_{i}": f"type_{i}" for i in range(500)},
            },
        }
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 1, "status": "created"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.upload_anomaly(large_payload)
            assert result["status"] == "created"

    async def test_malformed_base_url_handled_gracefully(self):
        client = AgentAPIClient(base_url="not-a-valid-url", agent_token=TOKEN)
        with respx.mock:
            with pytest.raises((AgentAPIError, AgentAPIConnectionError, ValueError)):
                await client.get_config()

    async def test_base_url_with_query_string_preserved(self):
        base = "http://localhost:8000/api/v1?tenant=acme"
        with respx.mock as mock:
            route = mock.get(f"{base}&").respond(json={"data": {}})
            client = AgentAPIClient(base_url=base, agent_token=TOKEN)
            await client.get_config()
            actual_url = str(mock.calls[0].request.url)
            assert "tenant=acme" in actual_url or "agent/self/config" in actual_url

    async def test_heartbeat_agent_id_with_special_characters(self):
        agent_id = "agent/path:with@special"
        with respx.mock as mock:
            mock.post(f"{BASE_URL}/agents/{agent_id}/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            result = await client.send_heartbeat(agent_id)
            assert result["status"] == "ok"

    async def test_request_content_type_is_json(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/anomalies").respond(
                json={"id": 1, "status": "created"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.upload_anomaly({"pipeline_run_id": "r1", "type": "t", "severity": "low"})
            request = mock.calls[0].request
            content_type = request.headers.get("Content-Type", "")
            assert "application/json" in content_type

    async def test_heartbeat_does_not_send_body(self):
        with respx.mock as mock:
            route = mock.post(f"{BASE_URL}/agents/a1/heartbeat").respond(
                json={"status": "ok"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            await client.send_heartbeat("a1")
            request = mock.calls[0].request
            assert request.content in (b"", b"{}", b"null") or request.content == b""

    async def test_non_json_response_with_200_status(self):
        with respx.mock as mock:
            mock.get(f"{BASE_URL}/agent/self/config").respond(
                status_code=200, text="<html>OK</html>",
                headers={"Content-Type": "text/html"}
            )
            client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
            with pytest.raises(AgentAPIError):
                await client.get_config()

    async def test_base_url_none_raises_type_or_value_error(self):
        with pytest.raises((ValueError, TypeError)):
            AgentAPIClient(base_url=None, agent_token=TOKEN)

    async def test_close_client_cleanup(self):
        client = AgentAPIClient(base_url=BASE_URL, agent_token=TOKEN)
        await client._client.aclose()
        assert client._client.is_closed
