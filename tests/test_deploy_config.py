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
    has a public IP, and a published port bypasses ufw's docker chain.

    Asserts the absence of the key rather than of the string "5432:5432",
    which is what this test used to do and which let two equally fatal forms
    straight through: `ports: ["5433:5432"]` publishes the database on another
    host port, and `ports: ["5432"]` publishes it on a random high port. Both
    are reachable from the internet.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    postgres = compose["services"]["postgres"]
    assert "ports" not in postgres, (
        f"postgres publishes ports to the host: {postgres.get('ports')!r} -- "
        "in production it must be reachable only over the compose network"
    )


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
    if the tag is a variable rather than hardcoded to latest.

    Counted, not merely searched for: as a bare substring check this passed
    when only one of the two images used the variable, so hardcoding the api
    image would make rollback a silent no-op for the API while the web
    container rolled back correctly -- the worst of both states.
    """
    compose = read("deploy/docker-compose.prod.yml")
    assert compose.count("${IMAGE_TAG:-latest}") == 2, (
        "expected the tag variable on both the web and api images"
    )


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


def _caddyfile_directives() -> str:
    """The Caddyfile with comment lines removed.

    Necessary because the file documents `lb_try_duration` in a comment, so a
    plain substring assertion over the raw text stays green after both real
    directives are deleted -- the exact regression this test exists to catch.
    """
    return "\n".join(
        line
        for line in read("deploy/Caddyfile").splitlines()
        if not line.strip().startswith("#")
    )


def test_caddyfile_holds_requests_across_a_container_restart():
    """Without this, every deploy shows visitors a 502 for 5-15 seconds while
    the new API container boots.

    Checked per upstream: the API and the frontend are swapped by the same
    `up -d`, so a retry window on only one of them still means a visible 502
    for every page load, or for every API call, during the restart.
    """
    directives = _caddyfile_directives()
    assert "lb_try_duration" in directives, (
        "the retry window appears only in a comment, not in any "
        "reverse_proxy block"
    )

    for upstream in ("api:8000", "web:3000"):
        start = directives.index(f"reverse_proxy {upstream}")
        block = directives[start : directives.index("}", start)]
        assert "lb_try_duration" in block, (
            f"the reverse_proxy block for {upstream} has no retry window, so "
            "a deploy 502s that route while the container restarts"
        )


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


def _deploy_workflow():
    import yaml

    return yaml.safe_load(read(".github/workflows/deploy.yml"))


def _deploy_steps():
    return _deploy_workflow()["jobs"]["deploy"]["steps"]


def test_deploy_job_does_not_run_on_a_failed_build():
    """workflow_run fires on both success and failure. Without a job-level
    gate keyed to the conclusion, a broken build would still reach the box --
    the entire point of splitting build and deploy into separate workflows.
    """
    condition = _deploy_workflow()["jobs"]["deploy"]["if"]
    assert "github.event.workflow_run.conclusion" in condition
    assert "success" in condition
    # workflow_dispatch (manual rollback) has no build conclusion to check,
    # so it must be admitted independently rather than folded into the same
    # equality check.
    assert "workflow_dispatch" in condition


def test_rollback_step_is_gated_on_the_health_check_and_uses_the_recorded_tag():
    """The rollback must not run on a clean deploy, and it must redeploy
    whatever tag was actually running before -- not a hardcoded value that
    would drift the moment a second deploy happens.
    """
    steps = _deploy_steps()

    record_step = next(
        s for s in steps if s.get("id") == "previous"
    )
    assert "GITHUB_OUTPUT" in record_step["run"], (
        "the previously-running tag must be captured as a step output "
        "before any rollback could reference it"
    )

    rollback_step = next(
        s for s in steps if "roll back" in s.get("name", "").lower()
    )

    condition = rollback_step.get("if", "")
    assert condition, "rollback step must be conditional, not unconditional"
    assert f"steps.{record_step['id']}.outcome" in condition, (
        "rollback must be tied to whether the previous-tag was recorded, "
        "not the smoke-check outcome -- see "
        "test_rollback_condition_is_not_keyed_off_the_smoke_step for why"
    )
    assert "failure" in condition.lower()

    rollback_script = rollback_step["run"]
    assert f"steps.{record_step['id']}.outputs" in rollback_script, (
        "rollback must redeploy the tag recorded before this deploy, "
        "not a hardcoded tag"
    )


def test_rollback_condition_is_not_keyed_off_the_smoke_step():
    """When "Pull, migrate, and swap" itself fails (e.g. `up -d` fails
    partway through), Actions skips every later step, including the smoke
    check -- so steps.smoke.outcome is 'skipped', not 'failure'. A rollback
    condition written as `steps.smoke.outcome == 'failure'` would then never
    fire for exactly the case that leaves containers in a mixed old/new
    state with no remediation. The condition must instead key off
    steps.previous, the last step guaranteed to run before anything is
    mutated.
    """
    steps = _deploy_steps()
    rollback_step = next(
        s for s in steps if "roll back" in s.get("name", "").lower()
    )
    condition = rollback_step.get("if", "")
    assert "steps.smoke" not in condition, (
        "the rollback condition must not depend on the smoke step's "
        "outcome, because a failed swap skips the smoke step entirely"
    )
    assert "steps.previous.outcome" in condition


def test_no_rollback_target_fails_closed_instead_of_defaulting_to_latest():
    """build.yml tags every image :latest, so falling back to 'latest' when
    /opt/alsigil/deploy/.current_tag is absent (a bootstrap deploy) would
    redeploy the very image that just failed while reporting a rollback
    occurred -- worse than doing nothing, because it looks like it worked.
    The workflow must instead record an empty value and treat that as a
    reason to stop loudly, not a reason to substitute a real-looking tag.
    """
    steps = _deploy_steps()
    record_step = next(s for s in steps if s.get("id") == "previous")
    assert "echo latest" not in record_step["run"], (
        "the previous-tag lookup must not fall back to a real-looking "
        "tag when no tag was ever recorded"
    )

    no_target_step = next(
        (
            s
            for s in steps
            if "steps.previous.outputs.value == ''" in s.get("if", "")
            and "steps.previous.outcome" not in s.get("if", "")
        ),
        None,
    )
    assert no_target_step is not None, (
        "a step must exist that fires when there is no recorded tag to "
        "roll back to, so the first-deploy failure case is loud rather "
        "than silently swallowed"
    )
    assert "exit 1" in no_target_step["run"], (
        "the no-rollback-target report must fail the job, not just warn"
    )


def test_migration_step_runs_before_and_separately_from_up_d():
    """A failed migration must abort the deploy rather than leave a container
    crash-looping against a half-applied schema. That requires the migration
    command to run as its own step in the script (not folded into `up -d`),
    positioned before it, under a shell that aborts on the first failure.
    """
    steps = _deploy_steps()
    deploy_step = next(
        s for s in steps if s.get("name") == "Pull, migrate, and swap"
    )
    script = deploy_step["run"]

    assert "bash -euo pipefail" in script or "set -euo pipefail" in script, (
        "the deploy script must abort on the first failing command, "
        "otherwise a failed migration would not stop `up -d` from running"
    )

    migrate_index = script.index("migrate.py")
    up_index = script.index("up -d")
    assert migrate_index < up_index, (
        "migrations must run before the containers are swapped in"
    )

    # They must be distinct commands, not the same docker compose invocation.
    migrate_command_end = script.index("\n", migrate_index)
    assert "up -d" not in script[migrate_index:migrate_command_end], (
        "migrate and up -d must be separate docker compose invocations"
    )


def test_sync_step_writes_the_compose_interpolation_env_file():
    """docker-compose.prod.yml now requires GITHUB_REPOSITORY_OWNER
    (`${GITHUB_REPOSITORY_OWNER:?...}`). Compose only reads that from a
    `.env` file next to the compose file for interpolation purposes -- a
    completely different mechanism from `env_file:` (container secrets, read
    from /opt/alsigil/.env). Without this step writing
    /opt/alsigil/deploy/.env, the nightly backup timer and any manual
    `docker compose` run on the box with a bare environment would resolve
    the image to the invalid `ghcr.io//alsigil-api`.
    """
    steps = _deploy_steps()
    sync_step = next(
        s for s in steps if s.get("name") == "Sync the compose configuration"
    )
    script = sync_step["run"]

    assert "/opt/alsigil/deploy/.env" in script
    assert "GITHUB_REPOSITORY_OWNER=" in script
    assert "github.repository_owner" in script


def test_rollback_restores_the_configuration_not_only_the_image_tag():
    """The sync step scp's the new Caddyfile and compose file onto the box
    *before* the swap. A commit that breaks the Caddyfile therefore fails the
    smoke check and, if rollback only re-ran `up -d` with the old IMAGE_TAG,
    would bring the old image up behind the new broken proxy config -- the run
    would report a successful rollback while the site stayed down. So the sync
    step must preserve the live configuration, and the rollback step must put
    it back before restarting anything.
    """
    steps = _deploy_steps()

    sync_script = next(
        s for s in steps if s.get("name") == "Sync the compose configuration"
    )["run"]
    assert ".rollback" in sync_script, (
        "the sync step must copy the live Caddyfile and compose file aside "
        "before overwriting them, or there is nothing to roll back to"
    )
    for name in ("docker-compose.prod.yml", "Caddyfile"):
        assert name in sync_script, f"{name} is not preserved before the swap"

    rollback_script = next(
        s for s in steps if "roll back" in s.get("name", "").lower()
    )["run"]
    assert ".rollback" in rollback_script, (
        "the rollback step must restore the preserved configuration, not "
        "only redeploy the previous image tag"
    )
    restore_index = rollback_script.index(".rollback")
    up_index = rollback_script.index("up -d")
    assert restore_index < up_index, (
        "the configuration must be restored before the containers come back "
        "up, otherwise the old image starts behind the broken config"
    )
    for name in ("docker-compose.prod.yml", "Caddyfile"):
        assert name in rollback_script, f"{name} is not restored on rollback"


def test_smoke_check_is_pinned_to_the_box_being_deployed():
    """`smoke_check.py https://alsigil.com` on its own resolves the name
    through DNS, which before the Task 7 cutover still points at Vercel. A box
    that never came up would then smoke-green off the old host and no rollback
    would fire. The check must be pinned to the deploy target's address.
    """
    steps = _deploy_steps()
    smoke_step = next(s for s in steps if s.get("id") == "smoke")
    script = smoke_step["run"]

    assert "smoke_check.py" in script
    argument_tail = script.split("smoke_check.py", 1)[1]
    assert "secrets.SSH_HOST" in argument_tail, (
        "the smoke check must be given the deploy target's address as its "
        "second argument, so it cannot pass against whatever DNS answers"
    )
