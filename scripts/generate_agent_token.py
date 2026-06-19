"""
Generate an agent token for the local dev agent.

This script:
1. Waits for the backend to be healthy
2. Logs in as the admin user
3. Lists agents, picks the first one
4. Creates a token via POST /api/v1/agents/{id}/tokens
5. Saves the full token to the file specified by AGENT_TOKEN_FILE env var

Intended to be called from the backend entrypoint after migrations and seed.
"""

import os
import sys
import time

import httpx

# Configuration
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@beacon.dev")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
AGENT_TOKEN_FILE = os.environ.get("AGENT_TOKEN_FILE", "/run/beacon/agent_token")
MAX_RETRIES = int(os.environ.get("TOKEN_GEN_RETRIES", "30"))
RETRY_DELAY = 2  # seconds


def wait_for_backend(client: httpx.Client) -> None:
    """Wait for the backend health endpoint to respond."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.get(f"{BACKEND_URL}/api/v1/health")
            if resp.status_code == 200:
                print(f"Backend is healthy (attempt {attempt})")
                return
        except httpx.RequestError:
            pass
        print(f"  Backend not ready â€” waiting... ({attempt}/{MAX_RETRIES})")
        time.sleep(RETRY_DELAY)
    raise RuntimeError(f"Backend did not become healthy after {MAX_RETRIES} retries")


def login(client: httpx.Client) -> str:
    """Login as admin and return the JWT access token."""
    resp = client.post(
        f"{BACKEND_URL}/api/v1/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"Login failed (status {resp.status_code}): {resp.text}"
        )
    data = resp.json().get("data", {})
    access_token = data.get("access_token")
    if not access_token:
        raise RuntimeError("Login response missing access_token")
    print("Logged in as admin user.")
    return access_token


def find_agent(client: httpx.Client, token: str) -> dict:
    """List agents and return the first one."""
    resp = client.get(
        f"{BACKEND_URL}/api/v1/agents",
        headers={"Authorization": f"Bearer {token}"},
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"Failed to list agents (status {resp.status_code}): {resp.text}"
        )
    agents = resp.json().get("data", [])
    if not agents:
        raise RuntimeError("No agents found. Run seed.py first.")
    agent = agents[0]
    print(f"Found agent: {agent.get('name')} (id={agent.get('id')})")
    return agent


def create_token(client: httpx.Client, jwt: str, agent_id: str) -> str:
    """Create a new agent token and return the full token string."""
    resp = client.post(
        f"{BACKEND_URL}/api/v1/agents/{agent_id}/tokens",
        headers={"Authorization": f"Bearer {jwt}"},
        json={"name": "dev-agent-token"},
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to create agent token (status {resp.status_code}): {resp.text}"
        )
    data = resp.json().get("data", {})
    agent_token = data.get("agent_token")
    if not agent_token:
        raise RuntimeError("Token creation response missing agent_token")
    print(f"Created agent token: {agent_token[:20]}...")
    return agent_token


def save_token(token: str) -> None:
    """Save the agent token to the configured file path."""
    os.makedirs(os.path.dirname(AGENT_TOKEN_FILE), exist_ok=True)
    with open(AGENT_TOKEN_FILE, "w") as f:
        f.write(token)
    print(f"Agent token saved to {AGENT_TOKEN_FILE}")


def main():
    print("==> Beacon Agent Token Generator")

    # Ensure AGENT_TOKEN_FILE is set
    token_file = AGENT_TOKEN_FILE
    if not token_file:
        print("ERROR: AGENT_TOKEN_FILE env var is not set.", file=sys.stderr)
        sys.exit(1)

    with httpx.Client(timeout=10) as client:
        # 1. Wait for backend
        wait_for_backend(client)

        # 2. Login as admin
        jwt = login(client)

        # 3. Find the seed agent
        agent = find_agent(client, jwt)

        # 4. Create a token for the agent
        agent_token = create_token(client, jwt, agent["id"])

        # 5. Save token to shared volume
        save_token(agent_token)

    print("==> Agent token generation complete.")


if __name__ == "__main__":
    main()
