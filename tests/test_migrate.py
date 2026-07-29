from pathlib import Path

from scripts.migrate import pending_migrations


def test_pending_migrations_excludes_applied(tmp_path: Path):
    (tmp_path / "0001_init.sql").write_text("SELECT 1;")
    (tmp_path / "0002_add_col.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied={"0001_init.sql"})

    assert [p.name for p in pending] == ["0002_add_col.sql"]


def test_pending_migrations_returns_all_when_none_applied(tmp_path: Path):
    (tmp_path / "0001_init.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied=set())

    assert [p.name for p in pending] == ["0001_init.sql"]


def test_pending_migrations_sorted_by_filename(tmp_path: Path):
    (tmp_path / "0002_second.sql").write_text("SELECT 1;")
    (tmp_path / "0001_first.sql").write_text("SELECT 1;")

    pending = pending_migrations(tmp_path, applied=set())

    assert [p.name for p in pending] == ["0001_first.sql", "0002_second.sql"]
