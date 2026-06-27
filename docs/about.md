# About Beacon

## Vision

**Beacon** is a data trust platform that eliminates _"silent uncertainty"_ — the constant fear that dashboards, reports, and decisions are built on corrupted data without anyone knowing.

Data teams spend a disproportionate amount of their time firefighting data quality issues (missing rows, nulls creep, schema drift, distribution shifts) rather than building value. Beacon automates the detection of these issues using statistical profiling and anomaly detection, alerting teams before bad data propagates downstream.

## Problem

**The status quo is reactive:**

- Data quality checks are written manually — usually AFTER a problem has already caused damage
- Nobody writes a check for every table and every metric
- "Unknown unknowns" silently corrupt analytics, ML models, and business decisions
- Existing tools (Metabase, Grafana) focus on visualization and infrastructure — not on _data quality itself_

## Solution

Beacon uses a **hybrid architecture** to solve this at the root:

| Component | Where It Runs | What It Does |
|-----------|--------------|--------------|
| **Agent** (Python) | Client infrastructure | Connects to databases, profiles data (schema, volume, nulls), learns statistical baselines, detects anomalies via z-score. **Never uploads raw data.** |
| **Cloud** (FastAPI + React) | SaaS (beacon.app) | Centralized dashboard, anomaly history, alert dispatch (email), remote agent configuration, user authentication. |

The agent learns the _normal_ behavior of every table automatically. When a pipeline runs, it compares the current state against historical baselines and alerts when deviations exceed configured thresholds — even for tables and metrics nobody explicitly configured.

## Key Value Proposition

- :material-clock-fast: **5-minute setup** — install the agent, link with a token, and profiling starts automatically
- :material-brain: **Auto-learning** — builds statistical baselines without writing a single validation rule
- :material-shield-lock: **Privacy-first** — the agent runs in _your_ infrastructure and never uploads raw data; only statistical summaries go to the cloud
- :material-bell-ring: **Threshold enforcement** — configure alert rules per pipeline (metric, operator, threshold) with granular control
- :material-resistor: **Resilient** — heartbeat monitoring, offline alert queue, never emits phantom alerts
- :material-scale-balance: **Open core** — the agent and application code are open source; the cloud service is optional

## Target Audience

Beacon is built for:

- **Data Engineers** managing ingestion and transformation pipelines
- **Data Analysts** who depend on accurate data for dashboards and reports
- **DataOps teams** responsible for data reliability and observability
- **Technical stakeholders** who need simpler setup than traditional data quality tools

## Comparison

| Capability | Beacon | Metabase | Grafana | Great Expectations |
|-----------|--------|----------|---------|-------------------|
| Data quality monitoring | :material-check: | :material-close: | :material-close: | :material-check: |
| Auto-learn baselines | :material-check: | :material-close: | :material-close: | :material-close: |
| No SQL required | :material-check: | :material-check: | :material-check: | :material-check: |
| Privacy-first (local agent) | :material-check: | :material-close: | :material-close: | :material-check: |
| Visualization | :material-check: | :material-check: | :material-check: | :material-close: |
| Alerting | :material-check: | :material-close: | :material-check: | :material-close: |
