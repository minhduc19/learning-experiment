# Deploy your own DigitalOcean server

This flow creates a new, billable Ubuntu Droplet **in your DigitalOcean account**.
You do not need write access to this repository or the maintainer's SSH secrets.
It runs the frontend, backend, corpus worker, PostgreSQL, and HTTPS proxy on one
server with persistent Docker volumes. It is a guided deployment, not the App
Platform one-click button: App Platform cannot retain this app's local files.

## One-time setup

1. [Fork this repository](https://github.com/minhduc19/learning-experiment/fork)
   into your GitHub account. Use a **public fork** so the new server can clone it.
2. In DigitalOcean, add your public SSH key under **Settings → Security → SSH
   Keys** and note its numeric ID (also available from `doctl compute ssh-key list`).
   Keep the private key on your computer.
3. Create a DigitalOcean personal access token with read/write access sufficient
   to list/create Droplets and read SSH keys. Save it in **your fork → Settings →
   Secrets and variables → Actions → New repository secret**, named
   `DIGITALOCEAN_ACCESS_TOKEN`. Never paste it into workflow inputs or source files.
4. Have a domain or subdomain ready, such as `learning.example.com`. You must be
   able to edit its DNS records. Public HTTPS is required for account sessions.

## Deploy

Open **your fork → Actions**, enable workflows if prompted, select **Deploy your
own DigitalOcean Droplet**, then **Run workflow**. Select `main`, enter your app's
hostname, SSH key ID, region, and a unique server name, and run it.

Each run creates a **new 2-vCPU / 4-GB Droplet** (`s-2vcpu-4gb`), charged at
DigitalOcean's current rate. Review pricing in your account first. The workflow
refuses an existing Droplet name; use SSH for updates rather than rerunning it.

The run summary shows your server IP. Set the hostname's **A record** to that IP,
remove any stale AAAA record, and allow inbound TCP 80/443 plus SSH (22) in any
DigitalOcean firewall you apply. Caddy automatically obtains and renews HTTPS
certificates once DNS resolves. Ports 5432, 8000, and 8080 are not published.

Server creation completing does **not** mean the app is ready. Startup installs
Docker and builds the app, including its Mandarin voice model; allow roughly
10–20 minutes, depending on network and CPU. From your computer:

```sh
ssh root@YOUR_DROPLET_IP 'cloud-init status --wait'
curl --fail https://YOUR_DOMAIN/api/health/db
```

Open `https://YOUR_DOMAIN` after both succeed. DeepSeek and ElevenLabs features
remain unavailable until you optionally add `DEEPSEEK` and `ELEVEN` to the server's
`.env` and recreate the backend. No API credentials are sent in startup user data.

## Storage and updates

The checkout is `/opt/learning-experiment/app`. Startup generates a random database
password in its root-readable `.env`. The `learning-compose` command consistently
uses both Compose files and the fixed project name, preserving PostgreSQL,
booking, reading, corpus, and certificate volumes across container replacements
and server reboots. Droplet deletion destroys local data; keep independent
backups. Never use `down --volumes` unless you intend to delete that data.

To deploy a reviewed commit from your public fork:

```sh
ssh root@YOUR_DROPLET_IP
cd /opt/learning-experiment/app
git fetch origin main
git checkout --detach YOUR_REVIEWED_COMMIT_SHA
learning-compose up --build -d --wait --wait-timeout 300
curl --fail https://YOUR_DOMAIN/api/health/db
```

The initial deployment checks out the exact commit selected by the workflow.
Your fork's maintainer deployment workflow is disabled by its repository guard;
it cannot deploy to the original author's server. This visitor workflow does not
configure automatic updates.

## Troubleshooting and removal

On the Droplet, inspect `cloud-init status --long`,
`/var/log/cloud-init-output.log`, `learning-compose ps`, and
`learning-compose logs --tail=100`. Check domain DNS and `learning-compose logs
caddy` for HTTPS issues. If a first-boot build fails after the checkout and `.env`
exist, fix the cause and run `learning-compose up --build -d --wait
--wait-timeout 300`; do not rerun the bootstrap script, which refuses to overwrite
an installation. Never share `.env` or unredacted diagnostic logs.

A failed or cancelled workflow can leave a billable Droplet: check your
DigitalOcean dashboard before retrying. To stop charges, delete the Droplet in
**your account** after backing up any data you want to retain. Stop/power-off alone
does not end billing. Remove the DNS record and revoke the deployment token if
you no longer need it.
