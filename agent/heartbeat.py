import asyncio
import logging

logger = logging.getLogger(__name__)


class HeartbeatService:
    def __init__(self, api_client, agent_id, interval=30):
        self.api_client = api_client
        self.agent_id = agent_id
        self.interval = interval
        self._running = False
        self._stop_event = asyncio.Event()

    async def start(self):
        if self._stop_event.is_set():
            self._stop_event.clear()
            self._running = False
            return
        self._stop_event.clear()
        self._running = True
        while self._running:
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.interval)
                break
            except asyncio.TimeoutError:
                pass
            try:
                await self.api_client.send_heartbeat(self.agent_id)
            except (ConnectionError, asyncio.TimeoutError, RuntimeError, OSError):
                logger.warning("Heartbeat failed", exc_info=True)

    async def stop(self):
        self._stop_event.set()
        self._running = False
