import shlex
import stat
import subprocess
from pathlib import Path


def test_secret_transfer_script_preserves_value_and_private_permissions(tmp_path):
    workflow = (
        Path(__file__).parents[3] / ".github/workflows/ssh-check.yml"
    ).read_text()
    quoted = workflow.split("printf '%s' \"$DEEPSEEK\" | ssh_droplet ", 1)[1].split(
        '\n          ssh_droplet "bash -s', 1
    )[0]
    command = shlex.split(quoted)[0].replace("$HOME/github-actions", str(tmp_path))
    path = tmp_path / "learning-experiment.deepseek"
    for value in (b'test-key-with-$-and-quotes"\nsecond-line', b""):
        result = subprocess.run(
            ["bash", "-c", command], input=value, capture_output=True, check=True
        )
        assert path.read_bytes() == value
        assert stat.S_IMODE(path.stat().st_mode) == 0o600
        assert not result.stdout and not result.stderr
