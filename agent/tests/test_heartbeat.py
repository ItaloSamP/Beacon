"""Unit tests for HeartbeatService — RED PHASE: module does not exist yet."""

import asyncio

import pytest
from unittest.mock import AsyncMock, MagicMock

# RED PHASE — these imports will fail until the modules are created
from agent.heartbeat import HeartbeatService  # noqa: E402


# ── helpers ───────────────────────────────────────────────────────────

def _make_mock_client():
    """Return a MagicMock whose send_heartbeat is an AsyncMock."""
    client = MagicMock()
    client.send_heartbeat = AsyncMock(return_value={"status": "ok"})
    return client


def _make_service(client=None, agent_id="agent-1", interval=0.01):
    """Quick builder for HeartbeatService with test defaults."""
    if client is None:
        client = _make_mock_client()
    return HeartbeatService(api_client=client, agent_id=agent_id, interval=interval)


# ── Initialization ────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestHeartbeatServiceInit:
    async def test_stores_agent_id(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="uuid-123", interval=5)
        assert service.agent_id == "uuid-123"

    async def test_stores_interval(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="agent-1", interval=15)
        assert service.interval == 15

    async def test_stores_api_client(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="agent-1", interval=10)
        assert service.api_client is client

    async def test_default_interval_is_30(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="agent-1")
        assert service.interval == 30

    async def test_custom_interval_is_respected(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="agent-1", interval=7)
        assert service.interval == 7

    async def test_not_running_after_init(self):
        client = _make_mock_client()
        service = HeartbeatService(api_client=client, agent_id="agent-1")
        # Before start() is called, the service should report not running
        assert service._running is False


# ── start() basic ─────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestStartBasic:
    async def test_start_calls_send_heartbeat(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

        assert client.send_heartbeat.await_count >= 1

    async def test_send_heartbeat_receives_agent_id(self):
        client = _make_mock_client()
        service = _make_service(client=client, agent_id="my-agent", interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

        client.send_heartbeat.assert_awaited_with("my-agent")

    async def test_start_sets_running_true(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.02)
        assert service._running is True
        await service.stop()
        await task

    async def test_running_stays_true_during_loop(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.03)
        running_mid_loop = service._running
        await service.stop()
        await task

        assert running_mid_loop is True


# ── stop() graceful ───────────────────────────────────────────────────

@pytest.mark.asyncio
class TestStopGraceful:
    async def test_stop_clears_running_flag(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

        assert service._running is False

    async def test_no_heartbeats_after_stop(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

        count_after_stop = client.send_heartbeat.await_count
        await asyncio.sleep(0.08)
        assert client.send_heartbeat.await_count == count_after_stop

    async def test_stop_halts_loop_cleanly(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.04)
        await service.stop()
        # task should resolve quickly after stop
        await asyncio.wait_for(task, timeout=0.5)

    async def test_stop_returns_none(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.02)
        result = await service.stop()
        await task

        assert result is None


# ── idempotent stop ───────────────────────────────────────────────────

@pytest.mark.asyncio
class TestIdempotentStop:
    async def test_stop_twice_does_not_raise(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.04)
        await service.stop()
        await service.stop()
        await task
        # reaching here without exception is the assertion

    async def test_stop_without_start_does_not_raise(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        await service.stop()
        await service.stop()
        # idempotent — no exception

    async def test_stop_before_start_is_safe(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        await service.stop()
        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.03)
        await service.stop()
        await task
        # no exception expected


# ── network failure resilience ────────────────────────────────────────

@pytest.mark.asyncio
class TestNetworkFailureResilience:
    async def test_loop_survives_connection_error(self):
        client = _make_mock_client()
        client.send_heartbeat = AsyncMock(side_effect=ConnectionError("network down"))
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task
        # loop should complete without raising

    async def test_loop_survives_timeout_error(self):
        client = _make_mock_client()
        client.send_heartbeat = AsyncMock(side_effect=asyncio.TimeoutError("timed out"))
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

    async def test_loop_survives_generic_exception(self):
        client = _make_mock_client()
        client.send_heartbeat = AsyncMock(side_effect=RuntimeError("something broke"))
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

    async def test_loop_survives_oserror(self):
        client = _make_mock_client()
        client.send_heartbeat = AsyncMock(side_effect=OSError("no route to host"))
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task

    async def test_still_running_after_failure(self):
        client = _make_mock_client()
        client.send_heartbeat = AsyncMock(side_effect=ConnectionError("fail"))
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.04)
        assert service._running is True
        await service.stop()
        await task


# ── loop continues after error ────────────────────────────────────────

@pytest.mark.asyncio
class TestLoopContinuesAfterError:
    async def test_next_heartbeat_fires_after_failure(self):
        client = _make_mock_client()
        call_count = [0]

        async def flaky_heartbeat(agent_id):
            call_count[0] += 1
            if call_count[0] <= 2:
                raise ConnectionError("transient error")
            return {"status": "ok"}

        client.send_heartbeat = AsyncMock(side_effect=flaky_heartbeat)
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.10)
        await service.stop()
        await task

        # at least 3 calls: 2 failed + at least 1 success
        assert client.send_heartbeat.await_count >= 3

    async def test_heartbeat_eventually_succeeds(self):
        client = _make_mock_client()
        call_count = [0]

        async def eventually_ok(agent_id):
            call_count[0] += 1
            if call_count[0] < 3:
                raise ConnectionError("fail")
            return {"status": "ok"}

        client.send_heartbeat = AsyncMock(side_effect=eventually_ok)
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.12)
        await service.stop()
        await task

        assert client.send_heartbeat.await_count >= 3


# ── multiple heartbeats ───────────────────────────────────────────────

@pytest.mark.asyncio
class TestMultipleHeartbeats:
    async def test_multiple_heartbeats_sent_over_time(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.02)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.10)
        await service.stop()
        await task

        # With interval 0.02 over ~0.10s, expect roughly 3-6 heartbeats
        assert client.send_heartbeat.await_count >= 2

    async def test_heartbeat_count_grows_with_time(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.03)
        count_before = client.send_heartbeat.await_count
        await asyncio.sleep(0.04)
        count_after = client.send_heartbeat.await_count
        await service.stop()
        await task

        assert count_after > count_before


# ── immediate stop ────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestImmediateStop:
    async def test_immediate_stop_works(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await service.stop()
        await task

        # graceful — no exception

    async def test_no_heartbeat_when_stopped_fast(self):
        client = _make_mock_client()
        # Use a slightly longer interval so we have time to stop before any heartbeat
        service = _make_service(client=client, interval=5.0)

        task = asyncio.create_task(service.start())
        # stop immediately — the loop should exit before the first sleep completes
        await asyncio.sleep(0.01)
        await service.stop()
        await task

        # 0 heartbeats because the stop event was set before sleep expired
        assert client.send_heartbeat.await_count == 0


# ── Running state ─────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestRunningState:
    async def test_start_sets_running(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.02)
        assert service._running is True
        await service.stop()
        await task

    async def test_stop_clears_running(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.05)
        await service.stop()
        await task
        assert service._running is False

    async def test_running_false_after_init(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)
        assert service._running is False

    async def test_running_false_after_stop_completes(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.03)
        await service.stop()
        await task
        await asyncio.sleep(0.02)
        assert service._running is False


# ── Stop event ────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestStopEvent:
    async def test_stop_event_exists(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)
        assert service._stop_event is not None

    async def test_stop_event_is_asyncio_event(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)
        assert isinstance(service._stop_event, asyncio.Event)

    async def test_stop_sets_event(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.02)
        await service.stop()
        await task

        assert service._stop_event.is_set()

    async def test_stop_event_not_set_initially(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)
        assert service._stop_event.is_set() is False

    async def test_stop_event_cleared_on_start(self):
        client = _make_mock_client()
        service = _make_service(client=client, interval=0.01)

        # pre-set the event to simulate a previous stop
        service._stop_event.set()
        assert service._stop_event.is_set()

        task = asyncio.create_task(service.start())
        await asyncio.sleep(0.02)
        # start() should have cleared the event
        assert service._stop_event.is_set() is False
        await service.stop()
        await task
