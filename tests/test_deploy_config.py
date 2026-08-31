"""Assertions about deployment configuration files.

These are cheap regression tests for settings whose failure mode is silent:
a web image built without the API base arg looks healthy and is unusable, and
a production compose file that publishes 5432 exposes the database to the
internet without any error to signal it.
"""
from __future__ import annotations

import re
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


def _workflow(relative_path: str):
    import yaml

    return yaml.safe_load(read(relative_path))


def _triggers(workflow) -> dict:
    """A workflow's `on:` block.

    YAML 1.1 reads a bare `on` key as the boolean True, so `workflow["on"]`
    is a KeyError on every GitHub workflow file loaded with pyyaml. This is
    the reason the assertions below are written against a helper rather than
    against the key directly.
    """
    return workflow.get("on", workflow.get(True))


def _build_workflow_steps():
    return _workflow(".github/workflows/build.yml")["jobs"]["build"]["steps"]


def test_build_workflow_runs_the_suite_before_building_anything():
    """The tests must gate the image, not merely run beside it.

    Both workflows used to fire independently on a push to main, so a commit
    that broke tenant isolation was built, pushed to GHCR, and shipped by
    deploy.yml -- which triggers on this workflow's conclusion -- while the
    suite was still running. The red X then arrived after the box was already
    serving the change. A `needs:` on a job that actually runs the suite is
    what makes the failure structural instead of a race.
    """
    build_workflow = _workflow(".github/workflows/build.yml")
    jobs = build_workflow["jobs"]

    gate_names = [
        name
        for name, job in jobs.items()
        if str(job.get("uses", "")).endswith(".github/workflows/test.yml")
    ]
    assert gate_names, (
        "no job in build.yml runs the test suite; a failing suite would not "
        "stop an image from being built and deployed"
    )

    needs = jobs["build"].get("needs")
    required = [needs] if isinstance(needs, str) else (needs or [])
    assert any(name in required for name in gate_names), (
        "the build job does not depend on the test job, so the two run in "
        "parallel and the gate is decorative"
    )


def test_test_workflow_is_callable_and_does_not_also_run_itself_on_main():
    """The gate above needs `workflow_call`, and main must not additionally
    trigger the same suite on its own -- that is a second run with no added
    signal, and it makes the pre-merge and pre-build results diverge in the
    logs for no reason. Pull requests keep their own trigger: that is where
    the suite is read before a merge exists.
    """
    triggers = _triggers(_workflow(".github/workflows/test.yml"))

    assert "workflow_call" in triggers, (
        "test.yml is not callable, so build.yml cannot gate on it"
    )
    assert "pull_request" in triggers, (
        "the suite must still run on pull requests"
    )

    push = triggers.get("push") or {}
    branches = push.get("branches") or []
    ignored = push.get("branches-ignore") or []
    assert "main" in ignored or ("main" not in branches and "**" not in branches), (
        "main triggers the suite directly as well as through build.yml; "
        "the same commit would run the whole suite twice"
    )


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


def _provision_script() -> str:
    return read("deploy/provision.sh")


def test_provision_aborts_on_the_first_failure():
    """Half a baseline is worse than none: without this, a failed `ufw enable`
    or a failed Docker install scrolls past and the script still prints
    "Done", so the box looks provisioned and is not.
    """
    assert "set -euo pipefail" in _provision_script()


def test_provision_never_overwrites_the_secrets_files():
    """Re-running is how the box is rebuilt, and it is also what somebody does
    when a deploy misbehaves. An unguarded `install /dev/null` over
    /opt/alsigil/.env would blank every secret on the machine -- the database
    password, the restic key -- and the failure would surface later as a
    container that cannot connect, with nothing pointing back at the re-run.
    """
    script = _provision_script()
    for target in ("$APP_DIR/.env", "$APP_DIR/web.env", "$APP_DIR/deploy/.env"):
        guard = f'if [ ! -f "{target}" ]; then'
        assert guard in script, (
            f"{target} is created without an existence guard, so re-running "
            "provision.sh destroys it"
        )


def test_provision_creates_the_secrets_files_readable_by_the_deploy_user():
    """0600 root:root is the intuitive choice here and it breaks every deploy:
    Compose resolves `env_file:` client-side as the invoking user, which is
    always `deploy` on this box, so `pull`, `run` and `up -d` all fail with
    "permission denied" before a container exists.
    """
    script = _provision_script()
    for target in ("$APP_DIR/.env", "$APP_DIR/web.env"):
        line = next(
            line for line in script.splitlines()
            if "install -m" in line and target in line
        )
        assert "-m 0640" in line, f"{target} must be group-readable by deploy"
        assert "-o root" in line and '-g "$DEPLOY_USER"' in line, (
            f"{target} must be root:deploy"
        )


def test_provision_creates_swap_that_survives_a_reboot():
    """4 GB across four containers has no headroom for the spikes -- a
    migration, the first vector query after a restart, an image unpack -- and
    the kernel's answer to a spike without swap is to kill the largest
    process, which is Postgres, mid-deploy. An /etc/fstab entry is what makes
    it still be there after the reboot that follows the first crash.
    """
    script = _provision_script()
    assert "mkswap" in script and "swapon" in script, (
        "provision.sh does not create swap"
    )
    assert "/etc/fstab" in script, (
        "the swapfile is not registered in fstab, so it disappears on reboot"
    )


def test_provision_does_not_recreate_swap_it_already_made():
    """Re-running must not append a second fstab line or reformat a swapfile
    the kernel is currently using."""
    script = _provision_script()
    assert 'if ! swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAP_FILE"' in script, (
        "the swap block has no guard against an already-active swapfile"
    )
    assert 'if ! grep -q "^$SWAP_FILE " /etc/fstab' in script, (
        "re-running would append a duplicate fstab entry"
    )


def test_provision_keeps_the_swapfile_private():
    """Swap holds whatever the API had in memory: the database password, Clerk
    keys, document contents. A world-readable swapfile is a world-readable
    copy of all of it.
    """
    script = _provision_script()
    assert 'chmod 0600 "$SWAP_FILE"' in script


def test_provision_lowers_swappiness_for_a_database_box():
    """The default of 60 pages out idle Postgres buffers to grow the page
    cache, turning indexed lookups into disk reads. The swapfile here is an
    OOM cushion, not a memory tier.
    """
    script = _provision_script()
    assert "vm.swappiness=10" in script
    # Written to a file but never loaded would leave the default in force
    # until the next reboot.
    assert "sysctl" in script


def test_provision_lets_the_deploy_user_reach_docker_and_sudo():
    """The deploy workflow SSHs in as `deploy` and runs compose; the backup,
    restore-check and monitoring units are installed by that same account
    through sudo. Missing either group turns a later task into an
    unexplained permission error.
    """
    script = _provision_script()
    assert 'usermod -aG docker "$DEPLOY_USER"' in script
    assert 'usermod -aG sudo "$DEPLOY_USER"' in script


def test_provision_gives_the_deploy_user_passwordless_sudo():
    """Group membership alone is not enough. The account is created with
    --disabled-password and authenticates by key, so `sudo` prompts for a
    password that does not exist -- measured on the box as "sudo: interactive
    authentication is required". Every unattended path that needs root (the
    backup timer, the restore check) would hang or fail on that prompt.
    """
    script = _provision_script()
    assert "NOPASSWD:ALL" in script, (
        "deploy is in the sudo group but has no password, so sudo can never "
        "succeed for it"
    )
    assert "/etc/sudoers.d/" in script, (
        "the rule must be a drop-in file, not an edit to /etc/sudoers"
    )
    assert "visudo -cf" in script, (
        "a malformed sudoers file breaks sudo for every account on a box "
        "where root login is already disabled; validate before installing it"
    )


def test_provision_refuses_to_harden_ssh_with_no_key_to_come_back_in_with():
    """A Hetzner server created without an SSH key attached has no
    /root/.ssh/authorized_keys, so the deploy user inherits none. Hardening
    such a box turns off root login and password login in one step and
    leaves a machine reachable only through the provider's rescue console --
    while printing "Done". The check must run before the sshd config is
    written, and must exit non-zero.
    """
    script = _provision_script()

    guard_index = script.find('if [ ! -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]')
    assert guard_index != -1, (
        "provision.sh disables password login without first checking that a "
        "key exists to get back in with"
    )

    harden_index = script.index("PasswordAuthentication no")
    assert guard_index < harden_index, (
        "the key check must run before password authentication is disabled"
    )

    guard_block = script[guard_index:harden_index]
    assert "exit 1" in guard_block, (
        "the guard must abort provisioning, not merely warn and continue"
    )


def test_provision_disables_root_login_and_passwords():
    """The box has a public IPv4 and will be scanned within minutes of
    existing. Key-only, non-root is the whole of the SSH story here."""
    script = _provision_script()
    assert "PermitRootLogin no" in script
    assert "PasswordAuthentication no" in script
    # A config file that is written but never loaded hardens nothing.
    assert "systemctl restart ssh" in script


def test_provision_opens_only_ssh_and_the_web_ports():
    """ufw is the second line after Caddy. Anything else opened here -- a
    published 5432 in particular -- would put Postgres on the internet.
    """
    script = _provision_script()
    allowed = re.findall(r"^\s*ufw allow (\S+)", script, flags=re.MULTILINE)
    assert set(allowed) == {"22/tcp", "80/tcp", "443/tcp"}, (
        f"provision.sh opens unexpected ports: {sorted(set(allowed))}"
    )
    assert "ufw --force enable" in script, (
        "the rules are configured but the firewall is never enabled"
    )


def test_web_env_example_carries_nothing_but_clerk():
    """The split between the two env files is only worth having if the
    narrow one stays narrow. This is the test that notices when somebody
    debugging a broken deploy pastes DATABASE_URL in here to see if it
    helps, and then commits it as the template.
    """
    template = read("deploy/web.env.example")
    keys = {
        line.split("=", 1)[0].strip()
        for line in template.splitlines()
        if "=" in line and not line.strip().startswith("#")
    }
    assert keys == {"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"}, (
        f"web.env.example carries more than Clerk: {sorted(keys)}"
    )


def test_env_example_does_not_ship_the_authentication_bypass():
    """LEGALOS_DEV_AUTH treats every request as one user. Present in the
    template -- even blank, even commented as optional -- it is one
    uncomment away from an unauthenticated production box.
    """
    template = read("deploy/env.example")
    settings = [
        line for line in template.splitlines()
        if not line.strip().startswith("#") and "=" in line
    ]
    assert not any(line.startswith("LEGALOS_DEV_AUTH") for line in settings)


def test_env_example_covers_what_the_containers_are_given():
    """A template missing a variable becomes a deploy that fails at runtime
    on a box, which is the most expensive place to discover it.
    """
    template = read("deploy/env.example")
    for variable in (
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "DATABASE_URL",
        "CLERK_JWKS_URL",
        "LEGALOS_DOCUMENT_ROOT",
        "RESTIC_REPOSITORY",
        "RESTIC_PASSWORD",
    ):
        assert f"{variable}=" in template, f"env.example does not mention {variable}"


def _staging_compose():
    import yaml

    return yaml.safe_load(read("deploy/docker-compose.staging.yml"))


def test_staging_is_a_separate_compose_project_from_production():
    """Production's project name comes from its directory (`deploy`) and its
    volumes are namespaced under it. Two projects sharing a name would share
    volumes -- staging would open production's database and its documents.
    """
    compose = _staging_compose()
    assert compose.get("name") == "alsigil-staging", (
        "the staging stack must carry an explicit project name; without one "
        "it inherits the directory name and collides with production"
    )


def test_staging_has_its_own_database_and_secrets():
    """The whole point of the second track. A staging container pointed at
    /opt/alsigil/.env would run development code against client data.
    """
    compose = _staging_compose()

    for service in ("api", "postgres"):
        env_file = compose["services"][service].get("env_file")
        assert env_file == "/opt/alsigil-staging/.env", (
            f"staging {service} reads {env_file!r}; it must read staging's own "
            "secrets file, never production's"
        )
    assert compose["services"]["web"]["env_file"] == "/opt/alsigil-staging/web.env"

    # Its own volumes, not production's under another name.
    assert set(compose["volumes"]) == {"pgdata", "documents"}


def test_staging_database_is_not_on_the_shared_network():
    """The edge network exists so Caddy can reach staging's web and api. A
    database on it would be reachable from every container in both projects,
    which is a larger blast radius than the feature needs.
    """
    compose = _staging_compose()
    postgres = compose["services"]["postgres"]
    assert "edge" not in (postgres.get("networks") or {}), (
        "staging's database must stay inside its own project network"
    )
    assert "ports" not in postgres, "staging's database must not be published"


def test_staging_upstreams_are_addressable_by_the_names_caddy_uses():
    """Compose names containers `<project>-<service>-<n>`, which the Caddyfile
    cannot know. The network aliases are the contract between the two files:
    drop them and staging 502s with no error anywhere else.
    """
    compose = _staging_compose()
    caddyfile = read("deploy/Caddyfile")

    for service, alias, port in (("api", "api-staging", 8000), ("web", "web-staging", 3000)):
        aliases = compose["services"][service]["networks"]["edge"]["aliases"]
        assert alias in aliases, f"staging {service} has no {alias} alias"
        assert f"reverse_proxy {alias}:{port}" in caddyfile, (
            f"the Caddyfile does not route to {alias}:{port}"
        )


def test_production_caddy_keeps_its_own_network_while_joining_the_shared_one():
    """Naming any network on a service replaces the implicit default. A Caddy
    listed only on `edge` would lose the production api and web -- taking the
    live site down to add a staging one.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    networks = compose["services"]["caddy"].get("networks") or []
    assert "default" in networks and "edge" in networks, (
        f"caddy is on {networks!r}; it needs both its project network and the "
        "shared one"
    )
    assert compose["networks"]["edge"]["external"] is True, (
        "the shared network must be external, so `compose down` on either "
        "project cannot delete the other's routing"
    )


def test_staging_hostname_is_password_protected_and_unindexed():
    """staging runs a Clerk development instance, and may run with
    LEGALOS_DEV_AUTH, which treats every caller as one signed-in user. The
    password is the only thing between that hostname and an open system, and
    it has to cover /api/* too -- an attacker after the data would never load
    the frontend.
    """
    caddyfile = read("deploy/Caddyfile")

    start = caddyfile.index("staging.alsigil.com {")
    block = caddyfile[start:]
    end = block.index("\n}")
    block = block[:end]

    assert "basic_auth" in block, "the staging site has no password"
    assert "X-Robots-Tag" in block and "noindex" in block, (
        "staging would be indexed alongside production"
    )

    # The password must guard the whole site, not sit inside one handle block.
    auth_index = block.index("basic_auth")
    assert auth_index < block.index("handle /api/*"), (
        "basic_auth must apply site-wide, before any route is handled"
    )

    # And it must not have leaked into the production site block.
    production = caddyfile[: caddyfile.index("www.alsigil.com {")]
    assert "basic_auth" not in production, (
        "production is behind a password; that is not staging's guard, it is "
        "an outage"
    )


def test_provision_creates_the_staging_tree_and_the_shared_network():
    """Staging secrets live in their own tree so that no single wrong path can
    point a development container at production's database.
    """
    script = _provision_script()
    assert "STAGING_DIR=/opt/alsigil-staging" in script
    assert 'docker network create "$EDGE_NETWORK"' in script
    assert 'if ! docker network inspect "$EDGE_NETWORK"' in script, (
        "re-running provision.sh must not fail on an existing network"
    )
    for target in ("$STAGING_DIR/.env", "$STAGING_DIR/web.env"):
        assert f'if [ ! -f "{target}" ]; then' in script, (
            f"{target} is created without an existence guard"
        )


def _backup_script() -> str:
    return read("deploy/backup.sh")


def test_backup_fails_before_it_starts_when_restic_is_not_configured():
    """restic asked for a passphrase it cannot get would hang the unit rather
    than fail it, and a hung timer looks like a backup that ran.
    """
    script = _backup_script()
    assert "set -euo pipefail" in script
    for variable in ("RESTIC_REPOSITORY", "RESTIC_PASSWORD"):
        assert f'"${{{variable}:?' in script, (
            f"{variable} is used without the required-variable form, so an "
            "unconfigured box would hang instead of failing"
        )


def test_backup_refuses_a_dump_that_is_not_from_a_migrated_database():
    """`pg_dump` against a database that exists but was never migrated writes
    a valid file with a header and no tables. Backing that up is worse than
    failing: it succeeds, and its retention policy then prunes the older good
    snapshots on schedule.
    """
    script = _backup_script()
    assert 'test -s "$STAGING/dump.sql"' in script, (
        "an empty dump must abort the run"
    )
    assert "schema_migrations" in script, (
        "a non-empty dump is not necessarily a dump of a real database; "
        "check for a table every deployment has"
    )


def test_backup_includes_the_documents_beside_the_dump():
    """A database backup that omits the files its rows reference restores a
    matter whose every document link points at nothing. Both must be in the
    same snapshot, so a restore cannot pick up one without the other.
    """
    script = _backup_script()
    assert "/data/documents" in script, "uploaded documents are not backed up"

    backup_index = script.index("restic backup")
    assert script.index("/data/documents") < backup_index, (
        "the documents must be staged before the snapshot is taken"
    )
    staged = script[:backup_index]
    assert "dump.sql" in staged, "the dump must be in the same snapshot"


def test_backup_removes_the_plaintext_staging_copy_however_it_exits():
    """The staging directory holds the whole database unencrypted. A failure
    between the dump and the upload must not leave it on disk.
    """
    script = _backup_script()
    assert 'trap \'rm -rf "$STAGING"\' EXIT' in script, (
        "the plaintext staging copy is only removed on the happy path"
    )


def test_backup_keeps_more_than_one_snapshot():
    """Retention that keeps only the newest snapshot means corruption
    discovered a day late has already overwritten the last good copy.
    """
    script = _backup_script()
    assert "--keep-daily" in script and "--keep-weekly" in script, (
        "no retention policy; either snapshots accumulate forever or only "
        "the newest survives"
    )


def test_backup_timer_does_not_collide_with_the_other_two():
    """The reminder sweep (06:00) and the disk check (07:00) are the two jobs
    a lawyer notices when they are late. A long prune must not sit in front
    of either.
    """
    import re as _re

    times = {}
    for name in ("backup", "reminders", "diskalert"):
        timer = read(f"deploy/alsigil-{name}.timer")
        match = _re.search(r"OnCalendar=\S+ (\d{2}):(\d{2})", timer)
        assert match, f"{name} timer has no parseable OnCalendar"
        times[name] = int(match.group(1)) * 60 + int(match.group(2))

    assert len(set(times.values())) == 3, f"two timers fire together: {times}"
    assert times["backup"] < times["reminders"], (
        "the backup must finish before the morning reminder sweep"
    )


def test_backup_unit_runs_as_the_account_that_owns_the_stack():
    """root cannot read /opt/alsigil/.env any more usefully than deploy can,
    and running as root puts the restic cache in /root -- so a by-hand
    `restic snapshots` as deploy rebuilds the entire cache. The other two
    timers on this box already run as deploy.
    """
    unit = read("deploy/alsigil-backup.service")
    assert "User=deploy" in unit
    assert "Type=oneshot" in unit


def _deploy_workflow():
    return _workflow(".github/workflows/deploy.yml")


def _deploy_steps():
    return _deploy_workflow()["jobs"]["deploy"]["steps"]


def _step_text(step) -> str:
    """A step's script together with the `env:` block feeding it.

    Values that used to be templated inline now arrive through `env:`, which is
    what stops a dispatch input from executing as shell. These assertions are
    about which values a step uses, not about where the expression is written,
    so they look at both halves.
    """
    env = step.get("env") or {}
    return "\n".join([*(f"{k}={v}" for k, v in env.items()), step.get("run", "")])


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

    assert f"steps.{record_step['id']}.outputs" in _step_text(rollback_step), (
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
    script = _step_text(sync_step)

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
    assert "$SSH_HOST" in argument_tail, (
        "the smoke check must be given the deploy target's address as its "
        "second argument, so it cannot pass against whatever DNS answers"
    )
    assert (smoke_step.get("env") or {}).get("SSH_HOST") == "${{ secrets.SSH_HOST }}", (
        "the pinned address must be the box this workflow deploys to"
    )


def test_web_service_does_not_receive_the_main_secrets_file():
    """`web` is the container the internet reaches first, and it reads exactly
    two variables, both Clerk's. Pointing it at /opt/alsigil/.env would hand
    Next.js POSTGRES_PASSWORD, DATABASE_URL, RESTIC_PASSWORD and the R2
    credentials -- including the keys to the backups that are supposed to
    survive a breach of this very machine. It gets its own narrower file.
    """
    import yaml

    compose = yaml.safe_load(read("deploy/docker-compose.prod.yml"))
    web_env_file = compose["services"]["web"].get("env_file")
    referenced = [web_env_file] if isinstance(web_env_file, str) else (web_env_file or [])

    assert referenced, "web must still receive its Clerk configuration"
    for entry in referenced:
        path = entry if isinstance(entry, str) else entry.get("path", "")
        assert path != "/opt/alsigil/.env", (
            "web must not be given the api's secrets file; it needs only the "
            "Clerk variables, which live in /opt/alsigil/web.env"
        )

    # The api genuinely does need the full file -- this test must not be
    # satisfiable by removing env_file from every service.
    assert compose["services"]["api"]["env_file"] == "/opt/alsigil/.env"


def test_postgres_healthcheck_expands_inside_the_container():
    """`${POSTGRES_USER:-legalrag}` with a single $ is interpolated by Compose
    on the client, from the *host* environment, where it is unset -- so the
    check silently hardcodes `legalrag` no matter what /opt/alsigil/.env says,
    and a renamed database user makes pg_isready report healthy while nothing
    can actually connect. `$$` passes it through for the container's shell.
    """
    compose_text = read("deploy/docker-compose.prod.yml")
    healthcheck_line = next(
        line for line in compose_text.splitlines() if "pg_isready" in line
    )
    for variable in ("POSTGRES_USER", "POSTGRES_DB"):
        assert f"$${{{variable}" in healthcheck_line, (
            f"{variable} in the healthcheck must be escaped as $$ so the "
            "container's shell expands it, not the Compose client"
        )


def test_caddyfile_sends_hsts():
    """Without it, a visitor typing `alsigil.com` makes one plaintext request
    before the redirect -- the request an attacker on the same network can
    intercept. Privileged legal work is not done exclusively on trusted wifi.
    """
    directives = _caddyfile_directives()
    assert "Strict-Transport-Security" in directives
    assert "max-age=31536000" in directives
    assert "includeSubDomains" in directives


def test_no_attacker_controlled_value_is_templated_into_a_shell_script():
    """`${{ inputs.image_tag }}` inside a `run:` block is not a variable
    reference -- GitHub substitutes the raw text before bash ever sees it, so
    a dispatch input containing a quote or `$(...)` executes, first on the
    runner that holds SSH_PRIVATE_KEY and then on the box as `deploy`. The
    value must arrive through `env:`, where the shell only ever sees a name.

    `steps.*.outputs` and `github.event.*` carry the same taint one hop later:
    the previous tag is read back from a file the dispatch input wrote.
    """
    tainted = ("inputs.", "steps.", "github.event.")
    for step in _deploy_steps():
        script = step.get("run", "")
        for expression in re.findall(r"\$\{\{(.*?)\}\}", script):
            assert not any(source in expression for source in tainted), (
                f"step {step.get('name')!r} templates {expression.strip()!r} "
                "directly into its shell script; pass it through env: instead"
            )
