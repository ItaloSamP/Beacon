FROM python:3.13-slim

WORKDIR /app

# Install agent package and its dependencies
COPY agent/ ./agent/
RUN pip install --no-cache-dir ./agent/

# The agent needs a token file mounted at /run/beacon/
# The entrypoint for the agent service is defined in docker-compose.yml
CMD ["beacon-agent", "run", "--once"]
