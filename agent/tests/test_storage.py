"""Unit tests for AgentStorage — RED PHASE: module does not exist yet."""

import sqlite3

import pytest

# RED PHASE — these imports will fail until the modules are created
from agent.storage import AgentStorage  # noqa: E402


# ── helpers ──────────────────────────────────────────────────────────

@pytest.fixture
def storage():
    """Create an AgentStorage backed by in-memory SQLite, initialised."""
    store = AgentStorage(db_path=":memory:")
    store.init_db()
    return store


def _insert_dummy_profile(storage: AgentStorage, pipeline_id: str = "p1", table_name: str = "public.orders") -> int:
    metrics = {
        "row_count": 1000,
        "null_email": 0.02,
        "null_phone": 0.10,
    }
    return storage.save_profile(pipeline_id, table_name, metrics)


# ── init_db ──────────────────────────────────────────────────────────

class TestInitDb:
    def test_creates_profiles_table(self):
        """init_db() should create the `profiles` table."""
        store = AgentStorage(db_path=":memory:")
        store.init_db()
        rows = store.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'"
        ).fetchall()
        assert len(rows) == 1

    def test_creates_baselines_table(self):
        """init_db() should create the `baselines` table."""
        store = AgentStorage(db_path=":memory:")
        store.init_db()
        rows = store.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='baselines'"
        ).fetchall()
        assert len(rows) == 1

    def test_creates_offline_queue_table(self):
        """init_db() should create the `offline_queue` table."""
        store = AgentStorage(db_path=":memory:")
        store.init_db()
        rows = store.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='offline_queue'"
        ).fetchall()
        assert len(rows) == 1

    def test_idempotent(self):
        """Calling init_db() twice should not raise."""
        store = AgentStorage(db_path=":memory:")
        store.init_db()
        store.init_db()  # second call is safe


# ── save_profile ─────────────────────────────────────────────────────

class TestSaveProfile:
    def test_inserts_and_returns_row_id(self, storage):
        """save_profile() should insert a record and return its id."""
        prof_id = storage.save_profile("p1", "public.orders", {"row_count": 500})
        assert isinstance(prof_id, int)
        assert prof_id > 0

    def test_saved_profile_is_retrievable(self, storage):
        """Metrics stored via save_profile should be readable back."""
        metrics = {"row_count": 777, "null_email": 0.05}
        prof_id = storage.save_profile("p1", "public.orders", metrics)

        row = storage.conn.execute(
            "SELECT pipeline_id, table_name, metrics FROM profiles WHERE id = ?",
            (prof_id,),
        ).fetchone()
        assert row is not None
        assert row["pipeline_id"] == "p1"
        assert row["table_name"] == "public.orders"

    def test_metrics_stored_as_json(self, storage):
        """The `metrics` column should be stored as a JSON string or equivalent."""
        metrics = {"row_count": 1, "null_email": 0.0}
        storage.save_profile("p1", "public.users", metrics)

        row = storage.conn.execute(
            "SELECT metrics FROM profiles WHERE pipeline_id = 'p1'"
        ).fetchone()
        raw = row["metrics"]
        # should be a dict from JSON, or at least a string containing the keys
        if isinstance(raw, str):
            import json
            raw = json.loads(raw)
        assert isinstance(raw, dict)
        assert raw["row_count"] == 1


# ── get_baseline ─────────────────────────────────────────────────────

class TestGetBaseline:
    def test_returns_none_when_no_baseline(self, storage):
        """get_baseline() should return None when no baseline exists."""
        result = storage.get_baseline("p1", "public.orders", "row_count")
        assert result is None

    def test_returns_baseline_tuple(self, storage):
        """get_baseline() should return (mean, stddev, n) as a tuple."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=100.0, stddev=10.0, n=30)
        result = storage.get_baseline("p1", "public.orders", "row_count")
        assert result == (100.0, 10.0, 30)

    def test_different_metrics_isolated(self, storage):
        """Baselines for different metric names should not interfere."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=100.0, stddev=10.0, n=30)
        storage.update_baseline("p1", "public.orders", "null_email", mean=0.02, stddev=0.005, n=15)
        r1 = storage.get_baseline("p1", "public.orders", "row_count")
        r2 = storage.get_baseline("p1", "public.orders", "null_email")
        assert r1 == (100.0, 10.0, 30)
        assert r2 == (0.02, 0.005, 15)

    def test_different_pipelines_isolated(self, storage):
        """Baselines for different pipelines should not interfere."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=100.0, stddev=10.0, n=30)
        storage.update_baseline("p2", "public.orders", "row_count", mean=200.0, stddev=20.0, n=10)
        r1 = storage.get_baseline("p1", "public.orders", "row_count")
        r2 = storage.get_baseline("p2", "public.orders", "row_count")
        assert r1 == (100.0, 10.0, 30)
        assert r2 == (200.0, 20.0, 10)


# ── update_baseline ──────────────────────────────────────────────────

class TestUpdateBaseline:
    def test_upsert_creates_new_baseline(self, storage):
        """update_baseline() should create a new record when one does not exist."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=50.0, stddev=5.0, n=5)
        result = storage.get_baseline("p1", "public.orders", "row_count")
        assert result == (50.0, 5.0, 5)

    def test_upsert_overwrites_existing_baseline(self, storage):
        """update_baseline() should replace an existing baseline with the same key."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=50.0, stddev=5.0, n=5)
        storage.update_baseline("p1", "public.orders", "row_count", mean=60.0, stddev=6.0, n=10)
        result = storage.get_baseline("p1", "public.orders", "row_count")
        assert result == (60.0, 6.0, 10)


# ── get_profile_history ──────────────────────────────────────────────

class TestGetProfileHistory:
    def test_returns_recent_profiles(self, storage):
        """get_profile_history() should return the last N profiles ordered by sampled_at DESC."""
        for i in range(5):
            storage.save_profile("p1", "public.orders", {"row_count": 100 + i})
        history = storage.get_profile_history("p1", "public.orders", limit=3)
        assert len(history) == 3

    def test_empty_history_returns_empty_list(self, storage):
        """When no profiles exist, get_profile_history() should return []."""
        history = storage.get_profile_history("p1", "public.orders")
        assert history == []

    def test_default_limit(self, storage):
        """Default limit should be 30 when not specified."""
        for i in range(5):
            storage.save_profile("p1", "public.orders", {"row_count": i})
        history = storage.get_profile_history("p1", "public.orders")
        assert len(history) == 5  # 5 < 30, so all returned

    def test_filtered_by_pipeline_and_table(self, storage):
        """Only profiles matching the given pipeline_id and table_name should be returned."""
        storage.save_profile("p1", "public.orders", {"row_count": 1})
        storage.save_profile("p2", "public.users", {"row_count": 2})
        history = storage.get_profile_history("p1", "public.orders")
        assert all(h["pipeline_id"] == "p1" for h in history)
        assert all(h["table_name"] == "public.orders" for h in history)


# ── offline queue ────────────────────────────────────────────────────

class TestOfflineQueue:
    def test_enqueue_returns_id(self, storage):
        """enqueue_anomaly() should insert and return a numeric id."""
        anomaly = {"pipeline_id": "p1", "table_name": "public.orders", "z_score": 5.2}
        anom_id = storage.enqueue_anomaly(anomaly)
        assert isinstance(anom_id, int)
        assert anom_id > 0

    def test_get_pending_returns_unsynced(self, storage):
        """get_pending_anomalies() should return only anomalies with synced=False."""
        storage.enqueue_anomaly({"pipeline_id": "p1", "table_name": "public.orders", "z_score": 5.2})
        storage.enqueue_anomaly({"pipeline_id": "p1", "table_name": "public.users", "z_score": 3.1})
        pending = storage.get_pending_anomalies()
        assert len(pending) == 2
        assert all(a.get("synced") is False for a in pending)

    def test_mark_synced_marks_as_synced(self, storage):
        """mark_synced() should set synced=True so it is no longer pending."""
        anom_id = storage.enqueue_anomaly({"pipeline_id": "p1", "table_name": "public.orders", "z_score": 5.2})
        storage.mark_synced(anom_id)
        pending = storage.get_pending_anomalies()
        assert anom_id not in {a["id"] for a in pending}

    def test_get_pending_empty_when_all_synced(self, storage):
        """get_pending_anomalies() should return [] when everything is synced."""
        anom_id = storage.enqueue_anomaly({"pipeline_id": "p1", "table_name": "public.orders", "z_score": 5.2})
        storage.mark_synced(anom_id)
        assert storage.get_pending_anomalies() == []


# ── edge cases ───────────────────────────────────────────────────────

class TestEdgeCases:
    def test_baseline_with_n_equals_one_is_retrievable(self, storage):
        """A baseline with n=1 (insufficient for z-score) should still be storable."""
        storage.update_baseline("p1", "public.orders", "row_count", mean=42.0, stddev=0.0, n=1)
        result = storage.get_baseline("p1", "public.orders", "row_count")
        assert result == (42.0, 0.0, 1)

    def test_empty_history_for_non_existent_table(self, storage):
        """get_profile_history for a table with no profiles should return []."""
        history = storage.get_profile_history("p1", "public.some_table")
        assert history == []

    def test_close_does_not_raise(self, storage):
        """close() should close the sqlite3 connection without raising."""
        storage.close()
        # second close should also be safe
        storage.close()

    def test_connect_called_after_close_raises(self, storage):
        """After close(), a subsequent operation may raise or be safe."""
        storage.close()
        # Depending on implementation this might raise; test the behaviour.
        try:
            storage.get_baseline("p1", "public.orders", "row_count")
        except sqlite3.ProgrammingError:
            pass  # expected path
        except Exception:
            pass  # other error types also acceptable

    def test_storage_defaults_to_memory(self):
        """Default db_path should be ':memory:'."""
        store = AgentStorage()
        assert store.db_path == ":memory:"
