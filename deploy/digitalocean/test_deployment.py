"""Deployment checks: python -m unittest discover -s deploy/digitalocean -v."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest

DIRECTORY = Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[1]
spec = importlib.util.spec_from_file_location('user_data', DIRECTORY / 'render-user-data.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DeploymentTests(unittest.TestCase):
    def test_user_data_is_valid_shell_and_pins_source(self):
        script = module.render('Learn.Example.com', 'visitor/learning-experiment', 'a' * 40)
        self.assertIn('export APP_DOMAIN=learn.example.com', script)
        self.assertIn('export SOURCE_SHA=' + 'a' * 40, script)
        self.assertIn('test ! -e app', script)
        self.assertNotIn('DIGITALOCEAN_ACCESS_TOKEN', script)
        self.assertLess(len(script.encode()), 64 * 1024)
        subprocess.run(['bash', '-n'], input=script, text=True, check=True)

    def test_rejects_invalid_hosts_and_shell_injection(self):
        for domain in ('https://example.com', 'example.com:443', 'localhost',
                       '127.0.0.1', 'example.com/path', 'x;touch /tmp/injected',
                       '$(whoami).com', '-bad.example.com', 'a..com'):
            with self.subTest(domain=domain), self.assertRaises(ValueError):
                module.render(domain, 'visitor/repo', 'a' * 40)
        for repository, sha in (('owner/repo;whoami', 'a' * 40),
                                ('owner/repo', 'main')):
            with self.assertRaises(ValueError):
                module.render('learning.example.com', repository, sha)

    def test_effective_compose_exposes_only_https_proxy(self):
        result = subprocess.run(
            ['docker', 'compose', '-f', 'compose.yaml', '-f',
             'deploy/digitalocean/compose.yaml', 'config', '--format', 'json'],
            cwd=ROOT, env={**os.environ, 'APP_DOMAIN': 'learning.example.com'},
            capture_output=True, text=True, check=True)
        config = json.loads(result.stdout)
        services = config['services']
        for name in ('db', 'backend', 'frontend', 'corpus-worker', 'corpus-migrate'):
            self.assertFalse(services[name].get('ports'), name)
        self.assertEqual({p['published'] for p in services['caddy']['ports']}, {'80', '443'})
        self.assertEqual(services['backend']['environment']['AUTH_PUBLIC_ORIGIN'],
                         'https://learning.example.com')
        for name in ('postgres_data', 'booking_data', 'reading_data', 'corpus_data', 'caddy_data'):
            self.assertIn(name, config['volumes'])
        api_volume = next(v['source'] for v in services['backend']['volumes']
                          if v['target'] == '/app/data/corpus')
        self.assertTrue(any(v['source'] == api_volume for v in services['corpus-worker']['volumes']))


if __name__ == '__main__':
    unittest.main()
