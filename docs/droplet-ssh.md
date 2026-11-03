# GitHub Actions SSH access

The **Check droplet SSH** workflow connects to `144.126.225.254` and runs `hostname`, `whoami`, and `uptime`. It does not deploy or restart the app. After merging, run it from **Actions → Check droplet SSH → Run workflow**.

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

The droplet's SSH service and any DigitalOcean/UFW firewall must allow the workflow runner to reach the configured SSH port. GitHub-hosted runners use changing public IPs; a firewall that permits only your laptop will block this workflow. No SSH connection has been tested until you configure the secrets and run the workflow.
