#!/usr/bin/env bash
# One-time box baseline. Idempotent: safe to re-run, and re-running is how the
# box gets rebuilt if it is ever lost.
#
# Run as root on a fresh Ubuntu 24.04 Hetzner box:
#   scp deploy/provision.sh root@<ip>:/tmp/ && ssh root@<ip> bash /tmp/provision.sh
#
# Architecture-agnostic: the Docker repository line is derived from
# `dpkg --print-architecture`, so this works unchanged on a CX22 (x86_64) and
# on a CAX21 (arm64). What is NOT architecture-agnostic is the image build --
# .github/workflows/build.yml publishes amd64 only, so an arm64 box needs
# `platforms: linux/arm64` there before any deploy can pull.
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/alsigil

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw restic

echo "==> Docker Engine + Compose plugin"
if ! command -v docker >/dev/null; then
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
		-o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
		docker-buildx-plugin docker-compose-plugin
fi

echo "==> Deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
	adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
# The deploy user administers the box: the backup, restore-check and monitoring
# work all install systemd units, edit /opt/alsigil/.env and run scripts through
# `sudo` over an SSH session opened as this user. Without this the account can
# only talk to Docker, and every one of those steps fails with "deploy is not in
# the sudoers file".
usermod -aG sudo "$DEPLOY_USER"
# ...and NOPASSWD, because the account has no password to type. It is created
# with --disabled-password and authenticates by key alone, so membership in
# `sudo` on its own produces "sudo: interactive authentication is required" --
# a prompt nobody can ever answer, including the backup timer and the restore
# check, which run unattended.
#
# This is not the privilege boundary it looks like: $DEPLOY_USER is already in
# the `docker` group, and access to the Docker socket is root on this box by
# construction (any container may bind-mount /). The sudoers entry adds
# convenience, not authority.
#
# Validated with `visudo -c` before it is moved into place: a malformed file in
# /etc/sudoers.d breaks sudo for every account, and on a box with root login
# disabled that is unrecoverable without the rescue console.
sudoers_file=/etc/sudoers.d/90-alsigil-deploy
printf '%s ALL=(ALL) NOPASSWD:ALL\n' "$DEPLOY_USER" > "$sudoers_file.tmp"
chmod 0440 "$sudoers_file.tmp"
visudo -cf "$sudoers_file.tmp" >/dev/null
mv "$sudoers_file.tmp" "$sudoers_file"
install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
if [ -f /root/.ssh/authorized_keys ]; then
	install -m 0600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
		/root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi

echo "==> SSH hardening"
# Fail closed rather than lock the box. The hardening below turns off root
# login AND password authentication, so the only way in afterwards is a key
# authorised for $DEPLOY_USER -- copied from root's authorized_keys just above.
# A server created without an SSH key attached has no such file, and running
# this script on it succeeds, prints "Done", and leaves a machine nobody can
# reach again except through the provider's rescue console.
if [ ! -s "/home/$DEPLOY_USER/.ssh/authorized_keys" ]; then
	echo "ERROR: /home/$DEPLOY_USER/.ssh/authorized_keys is missing or empty." >&2
	echo "Disabling password login now would lock every account out of this box." >&2
	echo "Attach an SSH key to the server and rebuild it, or run" >&2
	echo "  ssh-copy-id root@<this-box>" >&2
	echo "from a machine holding the key, then re-run this script." >&2
	exit 1
fi
cat > /etc/ssh/sshd_config.d/99-alsigil.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
systemctl restart ssh

echo "==> Firewall"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Swap"
# A CPX22 has 4 GB and runs four containers, and the peaks are not the steady
# state: `migrate.py` on a schema change, the first vector query after a
# restart, and `docker compose pull` unpacking a new API image all spike while
# Postgres is holding its shared buffers. Without swap the kernel's answer to a
# spike is to kill something -- usually Postgres, because it is the largest
# process -- in the middle of a deploy. Two gigabytes turns that into a few
# slow seconds.
#
# This is emergency headroom, NOT a substitute for RAM. If the box is steadily
# swapping, the answer is a bigger plan, not a bigger swapfile.
SWAP_FILE=/swapfile
SWAP_SIZE=2G
if ! swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAP_FILE"; then
	if [ ! -f "$SWAP_FILE" ]; then
		# fallocate is instant but leaves a file mkswap refuses if the
		# filesystem gave it holes; dd is the slow, always-correct fallback.
		fallocate -l "$SWAP_SIZE" "$SWAP_FILE" \
			|| dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=none
		# World-readable swap is world-readable memory: every secret the API
		# ever held in RAM can end up in this file.
		chmod 0600 "$SWAP_FILE"
		mkswap "$SWAP_FILE" >/dev/null
	fi
	swapon "$SWAP_FILE"
fi
# Without the fstab entry the swap is gone after the first reboot, which is
# precisely when the box is under memory pressure from starting everything at
# once.
if ! grep -q "^$SWAP_FILE " /etc/fstab; then
	printf '%s none swap sw 0 0\n' "$SWAP_FILE" >> /etc/fstab
fi
# The default swappiness of 60 lets the kernel page out idle Postgres buffers
# in exchange for page cache, which is the opposite of what a database box
# wants: it turns an indexed lookup into disk I/O. 10 keeps the swapfile as
# what it is here -- a cushion under an OOM spike, not a routine tier.
cat > /etc/sysctl.d/99-alsigil.conf <<'EOF'
vm.swappiness=10
EOF
sysctl -q --system

echo "==> App directory"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
# root:deploy 0640, NOT root:root 0600. `env_file:` is resolved by the Compose
# CLI on the *client* side, and every compose command on this box runs as
# $DEPLOY_USER -- so without group read, `docker compose pull`, `run` and
# `up -d` all abort with "permission denied" before a container is ever
# created. Group read is the minimum that lets the deploy work; do not
# "harden" this back to 0600.
if [ ! -f "$APP_DIR/.env" ]; then
	install -m 0640 -o root -g "$DEPLOY_USER" /dev/null "$APP_DIR/.env"
	echo "    created empty $APP_DIR/.env -- fill it before deploying"
fi
# Only the Clerk variables the internet-facing Next.js container actually
# reads. Kept separate from $APP_DIR/.env so that a compromise of the web
# container does not hand over the database password, the restic key and the
# R2 credentials, none of which Next.js has any use for.
if [ ! -f "$APP_DIR/web.env" ]; then
	install -m 0640 -o root -g "$DEPLOY_USER" /dev/null "$APP_DIR/web.env"
	echo "    created empty $APP_DIR/web.env -- fill it before deploying"
fi

# $APP_DIR/deploy/ holds the compose files (the deploy workflow scp's them here)
# plus a SEPARATE .env used only for compose variable interpolation -- distinct
# from $APP_DIR/.env, which is wired in via `env_file:` and becomes each
# container's process environment. Do not confuse the two: only this one
# affects image names. Without GITHUB_REPOSITORY_OWNER in it, `docker compose`
# run by hand (rollback, restore_check.sh, a bare `logs`) or by backup.sh's
# systemd timer -- none of which export it -- aborts loudly on the
# required-variable message instead of pulling a malformed image ref.
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/deploy"
# Owned by $DEPLOY_USER, because the deploy workflow rewrites this file with a
# plain `>` redirect over SSH as that user. A root-owned file here makes the
# very first deploy fail on "permission denied" -- and it holds no secret, only
# the GHCR owner name.
if [ ! -f "$APP_DIR/deploy/.env" ]; then
	install -m 0600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/null "$APP_DIR/deploy/.env"
	echo "    created empty $APP_DIR/deploy/.env -- set GITHUB_REPOSITORY_OWNER before deploying"
fi

echo "==> Done. Verify from your laptop before closing this session:"
echo "    ssh $DEPLOY_USER@<ip> docker ps"
