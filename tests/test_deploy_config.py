"""Assertions about deployment configuration files.

These are cheap regression tests for settings whose failure mode is silent:
a web image built without the API base arg looks healthy and is unusable, and
a production compose file that publishes 5432 exposes the database to the
internet without any error to signal it.
"""
from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def read(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_next_config_emits_standalone_output():
    """The Dockerfile copies .next/standalone, which only exists in this mode."""
    assert 'output: "standalone"' in read("web/next.config.mjs")


def test_web_dockerfile_declares_the_api_base_build_arg():
    """Inlined at build time, so a runtime env var would silently do nothing."""
    dockerfile = read("web/Dockerfile")
    assert "ARG NEXT_PUBLIC_API_BASE" in dockerfile
    assert "ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE" in dockerfile


def test_web_dockerignore_excludes_build_artefacts():
    """node_modules and .next from the host would poison the image."""
    ignored = read("web/.dockerignore").split()
    assert "node_modules" in ignored
    assert ".next" in ignored
