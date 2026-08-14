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


def test_production_compose_does_not_publish_postgres():
    """The dev compose publishes 5432 on purpose. Production must not: the box
    has a public IP, and a published port bypasses ufw's docker chain."""
    compose = read("deploy/docker-compose.prod.yml")
    assert "5432:5432" not in compose


def test_production_compose_rotates_logs_on_every_service():
    """Unrotated json-file logs grow without limit and fill the 40 GB disk,
    which takes Postgres down with it."""
    compose = read("deploy/docker-compose.prod.yml")
    assert compose.count("max-size") == 4, "expected log rotation on all 4 services"


def test_production_compose_pins_image_tags_to_a_variable():
    """Rollback is `IMAGE_TAG=<old-sha> docker compose up -d`, which only works
    if the tag is a variable rather than hardcoded to latest."""
    compose = read("deploy/docker-compose.prod.yml")
    assert "${IMAGE_TAG:-latest}" in compose


def test_caddyfile_routes_api_prefix_to_the_api_service():
    caddyfile = read("deploy/Caddyfile")
    assert "handle /api/*" in caddyfile
    assert "reverse_proxy api:8000" in caddyfile


def test_caddyfile_holds_requests_across_a_container_restart():
    """Without this, every deploy shows visitors a 502 for 5-15 seconds while
    the new API container boots."""
    assert "lb_try_duration" in read("deploy/Caddyfile")
