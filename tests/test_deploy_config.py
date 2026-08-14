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
    which takes Postgres down with it.

    Asserts the resolved structure rather than counting raw text: the file
    defines the options once as a YAML anchor and references it per service,
    so a text count would be testing the formatting rather than the effect.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    services = compose["services"]
    assert set(services) == {"caddy", "web", "api", "postgres"}
    for name, service in services.items():
        options = (service.get("logging") or {}).get("options") or {}
        assert options.get("max-size"), f"{name} has no log size limit"
        assert options.get("max-file"), f"{name} has no log file limit"


def test_production_compose_pins_image_tags_to_a_variable():
    """Rollback is `IMAGE_TAG=<old-sha> docker compose up -d`, which only works
    if the tag is a variable rather than hardcoded to latest."""
    compose = read("deploy/docker-compose.prod.yml")
    assert "${IMAGE_TAG:-latest}" in compose


def test_production_compose_requires_the_image_owner_variable():
    """GITHUB_REPOSITORY_OWNER has no default, unlike IMAGE_TAG. Compose
    interpolates unset variables as blank, so without the required-variable
    (`:?`) form both image references would silently degrade to
    `ghcr.io//alsigil-{web,api}:latest` -- not a valid image name -- instead
    of failing loudly. That matters because CI always exports the variable,
    but `deploy/backup.sh` runs `docker compose ... exec` nightly from a
    systemd timer with a bare environment, and so does anyone running compose
    by hand on the box (rollback, `restore_check.sh`, `docker compose logs`).
    """
    compose = read("deploy/docker-compose.prod.yml")
    assert "${GITHUB_REPOSITORY_OWNER:?" in compose
    assert compose.count("${GITHUB_REPOSITORY_OWNER:?") == 2, (
        "expected the required-variable form on both the web and api images"
    )


def test_caddyfile_routes_api_prefix_to_the_api_service():
    caddyfile = read("deploy/Caddyfile")
    assert "handle /api/*" in caddyfile
    assert "reverse_proxy api:8000" in caddyfile


def test_caddyfile_holds_requests_across_a_container_restart():
    """Without this, every deploy shows visitors a 502 for 5-15 seconds while
    the new API container boots."""
    assert "lb_try_duration" in read("deploy/Caddyfile")


def _build_workflow_steps():
    import yaml

    workflow = yaml.safe_load(read(".github/workflows/build.yml"))
    return workflow["jobs"]["build"]["steps"]


def test_build_workflow_passes_api_base_as_a_build_arg():
    """NEXT_PUBLIC_API_BASE is inlined into the client bundle at build time, so
    a runtime environment variable on the step (or container) has no effect.
    If this ever regresses to `env:`, the API stays healthy and the frontend
    silently ships pointed at nothing."""
    steps = _build_workflow_steps()
    web_build_step = next(
        s for s in steps if s.get("name") == "Build and push the web image"
    )
    build_args = web_build_step.get("with", {}).get("build-args", "")
    assert "NEXT_PUBLIC_API_BASE" in build_args, (
        "NEXT_PUBLIC_API_BASE must be passed via build-args, not env"
    )
    assert "NEXT_PUBLIC_API_BASE" not in web_build_step.get("env", {})


def test_build_workflow_fails_the_build_if_localhost_leaks_into_the_bundle():
    """This grep is the only automated guard against a dropped or misrouted
    NEXT_PUBLIC_API_BASE build arg reaching a pushed image. It must run after
    the web image is built and pushed (there is nothing to grep before that),
    and it must actually fail the job rather than just warn."""
    steps = _build_workflow_steps()
    web_build_index = next(
        i
        for i, s in enumerate(steps)
        if s.get("name") == "Build and push the web image"
    )
    guard_step = next(
        (
            s
            for s in steps
            if "localhost:8000" in s.get("run", "")
        ),
        None,
    )
    assert guard_step is not None, (
        "no step greps the built bundle for a leaked localhost API base"
    )
    guard_index = steps.index(guard_step)
    assert guard_index > web_build_index, (
        "the localhost guard must run after the web image is built and pushed"
    )
    assert "exit 1" in guard_step["run"], (
        "the guard must fail the job, not just print a warning"
    )
