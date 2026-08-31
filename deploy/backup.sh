#!/usr/bin/env bash
# Nightly backup: a logical database dump plus the uploaded documents,
# encrypted client-side by restic and pushed to Cloudflare R2.
#
# The documents go in the same snapshot as the dump on purpose. A database
# backup that omits the files its rows reference is not a restorable system --
# it restores a matter whose every document link points at nothing.
#
# Client-side encryption is the point of restic here: the archive is unreadable
# to Cloudflare, and to anyone who obtains the R2 credentials from this box.
# The passphrase must therefore also live in a password manager -- a copy that
# exists only on this machine is worthless in the one scenario backups are for.
set -euo pipefail

ENV_FILE=/opt/alsigil/.env
COMPOSE_FILE=/opt/alsigil/deploy/docker-compose.prod.yml
STAGING=/var/tmp/alsigil-backup

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Fail before touching anything when the repository is not configured. Without
# these, restic would prompt for a passphrase on a terminal systemd does not
# have, and the unit would hang rather than fail.
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY not set in /opt/alsigil/.env}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD not set in /opt/alsigil/.env}"

rm -rf "$STAGING"
mkdir -p "$STAGING"
# The staging copy holds the entire database in the clear. Remove it however
# this script exits, including on failure.
trap 'rm -rf "$STAGING"' EXIT
chmod 0700 "$STAGING"

echo "==> Dumping the database"
# `exec` against the running container rather than `run --rm`: the same reasons
# spelled out in alsigil-diskalert.service -- `run` resolves IMAGE_TAG, which is
# unset here and falls back to :latest, and after a rollback :latest is the
# image that was rolled back.
docker compose -f "$COMPOSE_FILE" exec -T postgres \
	pg_dump --no-owner --no-privileges -U "${POSTGRES_USER:-legalrag}" \
	-d "${POSTGRES_DB:-legalrag}" > "$STAGING/dump.sql"

test -s "$STAGING/dump.sql" || { echo "dump is empty; aborting" >&2; exit 1; }
# Non-empty is not the same as usable. pg_dump against a database that exists
# but was never migrated still produces a valid file with a header and nothing
# else, and that file would back up, prune the older good snapshots on its
# schedule, and restore into nothing. schema_migrations is created by 0001, so
# its absence means the dump did not come from a real deployment.
grep -q 'schema_migrations' "$STAGING/dump.sql" || {
	echo "dump has no schema_migrations table; refusing to back up" >&2
	echo "this is not a dump of a migrated database" >&2
	exit 1
}

echo "==> Copying uploaded documents"
mkdir -p "$STAGING/documents"
# `|| true` deliberately: an empty documents volume is the normal state of a
# new deployment, and `cp` failing on it must not abort the database backup.
docker compose -f "$COMPOSE_FILE" cp api:/data/documents/. "$STAGING/documents/" \
	|| echo "    (no documents to copy)"

echo "==> Backing up"
restic backup --tag alsigil --host alsigil-box "$STAGING"

echo "==> Pruning old snapshots"
restic forget --tag alsigil \
	--keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "==> Done"
restic snapshots --tag alsigil --latest 1
