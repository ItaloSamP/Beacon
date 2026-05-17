import asyncio

import httpx


class AgentAPIError(Exception):
    def __init__(self, message="", status_code=None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AgentAPIConnectionError(AgentAPIError):
    pass


class AgentAPITimeoutError(AgentAPIError):
    pass


class AgentAPIClient:
    def __init__(self, base_url, agent_token):
        if not base_url:
            raise ValueError("base_url must be a non-empty string")
        self.base_url = base_url.rstrip("/")
        self.agent_token = agent_token
        self._client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {agent_token}"},
            timeout=15.0,
        )

    def _build_url(self, path):
        if "?" in self.base_url:
            return self.base_url
        return f"{self.base_url}{path}"

    async def _request(self, method, url, **kwargs):
        max_attempts = 3
        last_exception = None

        for attempt in range(max_attempts):
            try:
                response = await self._client.request(method, url, **kwargs)
            except httpx.ConnectError as e:
                last_exception = AgentAPIConnectionError(message=str(e))
                if attempt < max_attempts - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))
                    continue
                raise last_exception
            except httpx.RemoteProtocolError as e:
                last_exception = AgentAPIConnectionError(message=str(e))
                if attempt < max_attempts - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))
                    continue
                raise last_exception
            except httpx.TimeoutException as e:
                last_exception = AgentAPITimeoutError(message=str(e))
                if attempt < max_attempts - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))
                    continue
                raise last_exception
            except httpx.ReadError as e:
                raise AgentAPIConnectionError(message=str(e))
            except Exception as e:
                raise AgentAPIError(message=str(e))

            if response.status_code >= 400:
                error = AgentAPIError(
                    message=f"HTTP {response.status_code}",
                    status_code=response.status_code,
                )
                if response.status_code in (500, 502, 503) and attempt < max_attempts - 1:
                    last_exception = error
                    await asyncio.sleep(0.1 * (2 ** attempt))
                    continue
                raise error

            try:
                if not response.text or not response.text.strip():
                    raise AgentAPIError(message="Empty response body")
                return response.json()
            except AgentAPIError:
                raise
            except Exception:
                raise AgentAPIError(message="Invalid JSON response")

        if last_exception:
            raise last_exception
        raise AgentAPIError(message="Max retries exhausted")

    async def get_config(self):
        url = self._build_url("/agent/self/config")
        return await self._request("GET", url)

    async def send_heartbeat(self, agent_id):
        url = self._build_url(f"/agents/{agent_id}/heartbeat")
        return await self._request("POST", url)

    async def upload_anomaly(self, anomaly_dict):
        url = self._build_url("/anomalies")
        return await self._request("POST", url, json=anomaly_dict)
