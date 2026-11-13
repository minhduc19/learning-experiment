"""Render validated cloud-init user data without including API credentials."""
import os
from pathlib import Path
import re
import shlex


def render(domain: str, repository: str, sha: str) -> str:
    domain = domain.lower()
    labels = domain.split('.')
    if (len(domain) > 253 or len(labels) < 2
            or not re.fullmatch(r'[a-z]{2,63}', labels[-1])
            or any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label)
                   for label in labels)):
        raise ValueError('Enter a public DNS hostname, without https://, port, or path')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('Invalid source repository')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Source must be an exact commit SHA')
    exports = '\n'.join(f'export {key}={shlex.quote(value)}' for key, value in (
        ('APP_DOMAIN', domain), ('SOURCE_REPOSITORY', repository), ('SOURCE_SHA', sha)))
    script = Path(__file__).with_name('bootstrap.sh').read_text()
    return '#!/bin/bash\n' + exports + '\n' + script.split('\n', 1)[1]


if __name__ == '__main__':
    print(render(os.environ['APP_DOMAIN'], os.environ['GITHUB_REPOSITORY'],
                 os.environ['GITHUB_SHA']), end='')
