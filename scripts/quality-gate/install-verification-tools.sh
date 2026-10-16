#!/usr/bin/env bash
set -euo pipefail

if [ "${GITHUB_ACTIONS:-}" != true ]; then
  printf '%s\n' 'This installer is reserved for the ephemeral GitHub Actions runner.' >&2
  exit 1
fi
if [ ! -x /usr/lib/postgresql/16/bin/pg_ctl ]; then
  clinicos_pgdg_key="${RUNNER_TEMP:?}/clinicos-pgdg.asc"
  curl --fail --silent --show-error --location \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc --output "$clinicos_pgdg_key"
  clinicos_pgdg_key_info="$(gpg --batch --show-keys --with-colons "$clinicos_pgdg_key")"
  clinicos_pgdg_key_count="$(printf '%s\n' "$clinicos_pgdg_key_info" | awk -F: '$1 == "pub" { count++ } END { print count+0 }')"
  clinicos_pgdg_fingerprint="$(printf '%s\n' "$clinicos_pgdg_key_info" | awk -F: '$1 == "fpr" && !seen { print $10; seen = 1 }')"
  if [ "$clinicos_pgdg_key_count" != 1 ]; then
    printf '%s\n' 'Unexpected PostgreSQL signing-key bundle.' >&2
    exit 1
  fi
  if [ "$clinicos_pgdg_fingerprint" != B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8 ]; then
    printf '%s\n' 'PostgreSQL signing key fingerprint mismatch.' >&2
    exit 1
  fi
  sudo install -m 0644 "$clinicos_pgdg_key" /usr/share/keyrings/clinicos-pgdg.asc
  printf '%s\n' 'deb [signed-by=/usr/share/keyrings/clinicos-pgdg.asc] https://apt.postgresql.org/pub/repos/apt jammy-pgdg main' |
    sudo tee /etc/apt/sources.list.d/clinicos-pgdg.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y postgresql-16
  # Stop only the default empty cluster just created by this package installation.
  if sudo pg_ctlcluster 16 main status >/dev/null 2>&1; then
    sudo pg_ctlcluster 16 main stop
  fi
fi
/usr/lib/postgresql/16/bin/postgres --version
