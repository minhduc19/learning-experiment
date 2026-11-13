# GitHub Actions SSH access

The **Deploy to droplet** workflow connects to `144.126.225.254`, clones or updates this public repository, checks out the exact commit selected by the workflow run, and deploys it with Docker Compose. After merging, run it from **Actions → Deploy to droplet → Run workflow**, selecting **main**. Runs from other branches are skipped.

The droplet needs Bash, Git, curl, flock, Docker Engine, and the Docker Compose plugin installed. `SSH_USER` must be able to run Docker without interactive sudo. The workflow uses the dedicated checkout `~/github-actions/learning-experiment` and the Compose project name `learning-experiment`, which matches the existing deployment. It refuses to overwrite local changes in its checkout. The app remains on port 8080. Building and recreating services can briefly interrupt access; failed health checks fail the workflow but do not automatically roll back.

Deployments are serialized. Pushes to `main` deploy automatically; the manual
**Run workflow** trigger can deploy the selected `main` commit again. The workflow
starts PostgreSQL, runs corpus migrations, and starts the backend, corpus worker,
and frontend with `docker compose -p learning-experiment up --build -d --wait
--wait-timeout 180`. It checks `/api/health/db` afterward. The fixed Compose project
name reuses the named database and file-storage volumes across deployments.

## Why this uses a Droplet

The [App Platform deploy button](https://docs.digitalocean.com/products/app-platform/how-to/add-deploy-do-button/)
supports one service or static site, optionally with a development database.
This app also needs a corpus worker and persistent local storage for SQLite
bookings, generated readings, and corpus upload files. App Platform's temporary
local filesystem would lose those files on replacement or redeployment. The
README button therefore opens this repository's Droplet deployment workflow.
It requires GitHub access to run workflows and the one-time SSH setup below;
it does not provision infrastructure or deploy to a visitor's DigitalOcean account.

In **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret | Value |
| --- | --- |
| `SSH_USER` | The existing droplet login user, for example `root` or a dedicated automation user. |
| `SSH_PRIVATE_KEY` | The full private key, including BEGIN/END lines, for a dedicated automation key without a passphrase. |
| `SSH_KNOWN_HOSTS` | The verified OpenSSH known_hosts entry for the droplet, including the address, key type, and public host key. This is a server host key, not the automation user's public key. |

The host is configured in the workflow. SSH uses port 22 unless you set the repository **variable** `SSH_PORT` to a different port. No DigitalOcean API token or GitHub personal access token is required.

## Create the login key

On your own computer, create a dedicated key (do not overwrite an existing key):

```sh
ssh-keygen -t ed25519 -C github-actions-learning-experiment -f ./github-actions-droplet -N ''
```

Add the contents of `github-actions-droplet.pub` to `~/.ssh/authorized_keys` for the chosen user on the droplet. Its `.ssh` directory should have permission `700`, and `authorized_keys` should have permission `600`, owned by that user. Put the contents of the file **without** `.pub` into `SSH_PRIVATE_KEY`. Keep it out of Git and chat.

## Verify the server host key

Using DigitalOcean's trusted droplet console, obtain the host fingerprint:

```sh
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

On your computer, collect the public host key and check its fingerprint:

```sh
ssh-keyscan -t ed25519 -p 22 144.126.225.254 > droplet_known_hosts
ssh-keygen -lf droplet_known_hosts
```

Only after confirming the fingerprints match, paste the contents of `droplet_known_hosts` into `SSH_KNOWN_HOSTS`. Use your actual SSH port in the scan if it differs from 22; the resulting entry then uses `[144.126.225.254]:PORT`.

The droplet's SSH service and any DigitalOcean/UFW firewall must allow the workflow runner to reach the configured SSH port. GitHub-hosted runners use changing public IPs; a firewall that permits only your laptop will block this workflow. The workflow has not been run against your droplet; configure the secrets and run it when ready.
