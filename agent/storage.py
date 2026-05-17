"""Agent storage backed by SQLite."""
import json
import sqlite3


class AgentStorage:
    def __init__(self, db_path=":memory:"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        if db_path != ":memory:":
            self.conn.execute("PRAGMA journal_mode=WAL")
        self._closed = False

    def init_db(self):
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id TEXT NOT NULL,
                table_name TEXT NOT NULL,
                metrics TEXT NOT NULL,
                sampled_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS baselines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id TEXT NOT NULL,
                table_name TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                mean REAL NOT NULL,
                stddev REAL NOT NULL,
                n INTEGER NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(pipeline_id, table_name, metric_name)
            );
            CREATE TABLE IF NOT EXISTS offline_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                anomaly_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                synced INTEGER NOT NULL DEFAULT 0
            );
            """
        )
        self.conn.commit()

    def save_profile(self, pipeline_id, table_name, metrics):
        metrics_json = json.dumps(metrics)
        cur = self.conn.execute(
            "INSERT INTO profiles (pipeline_id, table_name, metrics) VALUES (?, ?, ?)",
            (pipeline_id, table_name, metrics_json),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_baseline(self, pipeline_id, table_name, metric_name):
        row = self.conn.execute(
            "SELECT mean, stddev, n FROM baselines "
            "WHERE pipeline_id = ? AND table_name = ? AND metric_name = ?",
            (pipeline_id, table_name, metric_name),
        ).fetchone()
        if row is None:
            return None
        return (row["mean"], row["stddev"], row["n"])

    def update_baseline(self, pipeline_id, table_name, metric_name, mean, stddev, n):
        self.conn.execute(
            "INSERT OR REPLACE INTO baselines "
            "(pipeline_id, table_name, metric_name, mean, stddev, n, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (pipeline_id, table_name, metric_name, mean, stddev, n),
        )
        self.conn.commit()

    def get_profile_history(self, pipeline_id, table_name, limit=30):
        rows = self.conn.execute(
            "SELECT id, pipeline_id, table_name, metrics, sampled_at "
            "FROM profiles WHERE pipeline_id = ? AND table_name = ? "
            "ORDER BY sampled_at DESC LIMIT ?",
            (pipeline_id, table_name, limit),
        ).fetchall()
        result = []
        for row in rows:
            entry = dict(row)
            entry["metrics"] = json.loads(entry["metrics"])
            result.append(entry)
        return result

    def enqueue_anomaly(self, anomaly_data):
        anomaly_json = json.dumps(anomaly_data)
        cur = self.conn.execute(
            "INSERT INTO offline_queue (anomaly_json, synced) VALUES (?, 0)",
            (anomaly_json,),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_pending_anomalies(self):
        rows = self.conn.execute(
            "SELECT id, anomaly_json, created_at, synced FROM offline_queue WHERE synced = 0"
        ).fetchall()
        result = []
        for row in rows:
            item = json.loads(row["anomaly_json"])
            item["id"] = row["id"]
            item["synced"] = bool(row["synced"])
            item["created_at"] = row["created_at"]
            result.append(item)
        return result

    def mark_synced(self, anomaly_id):
        self.conn.execute(
            "UPDATE offline_queue SET synced = 1 WHERE id = ?",
            (anomaly_id,),
        )
        self.conn.commit()

    def close(self):
        if not self._closed:
            self.conn.close()
            self._closed = True
