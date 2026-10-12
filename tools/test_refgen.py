"""Offline tests for tools/refgen.py and ref_register --canvas: a stub `codex`, so no ChatGPT allowance is spent.
    python3 tools/test_refgen.py"""
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFGEN = os.path.join(ROOT, 'tools', 'refgen.py')
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
SHEET = os.path.join(ROOT, 'characters', 'mum2', 'ref', 'standing_34.jpg')
KEY = os.path.join(ROOT, 'characters', 'mum2', 'refs', 'images', 'k1_calm_0.png')
CHAR = '_refgen_test'

STUB = r'''#!/usr/bin/env python3
import json, os, sys
a = sys.argv[1:]
mode = os.environ.get('STUB_MODE', 'chatgpt')
if a[:2] == ['login', 'status']:
    print('Logged in using ChatGPT' if mode != 'apikey' else 'Logged in using an API key'); sys.exit(0)
if a[:2] == ['features', 'list']:
    print('image_generation   stable   true'); sys.exit(0)
if a[:1] == ['exec']:
    open(os.environ['STUB_LOG'], 'w').write(json.dumps({'args': a, 'task': sys.stdin.read()}))
    tid = '019a-test-thread'
    print(json.dumps({'type': 'thread.started', 'thread_id': tid}))
    d = os.path.join(os.environ['CODEX_HOME'], 'generated_images', tid); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'ig_1.png'), 'wb').write(bytes.fromhex(os.environ['STUB_PNG']))
    sys.exit(0)
sys.exit(1)
'''


class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        stub = os.path.join(self.d, 'codex'); open(stub, 'w').write(STUB); os.chmod(stub, 0o755)
        self.env = {**os.environ, 'REFGEN_CODEX': stub, 'CODEX_HOME': os.path.join(self.d, 'home'),
                    'STUB_LOG': os.path.join(self.d, 'log.json'), 'STUB_PNG': PNG.hex()}
        self.env.pop('OPENAI_API_KEY', None)
        self.name = 'zz_test'

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)
        shutil.rmtree(os.path.join(ROOT, 'characters', CHAR), ignore_errors=True)
        for f in os.listdir(os.path.join(ROOT, 'out', 'refgen')) if os.path.isdir(os.path.join(ROOT, 'out', 'refgen')) else []:
            if f.startswith(self.name):
                os.remove(os.path.join(ROOT, 'out', 'refgen', f))

    def run_(self, *args, **env):
        return subprocess.run([sys.executable, REFGEN, *args], capture_output=True, text=True, env={**self.env, **env}, cwd=ROOT)

    def test_check(self):
        self.assertEqual(self.run_('--check').returncode, 0)
        self.assertEqual(self.run_('--check', STUB_MODE='apikey').returncode, 3)   # never bills an API-key login

    def test_codex_generate_and_register(self):
        p = self.run_(CHAR, self.name, '--prompt', 'her hand halfway down', '--ref', SHEET, '--ref', KEY, '-n', '2')
        self.assertEqual(p.returncode, 0, p.stderr)
        call = json.load(open(self.env['STUB_LOG']))
        self.assertIn('-s', call['args']); self.assertIn('read-only', call['args'])
        self.assertIn('features.shell_tool=false', call['args'])
        self.assertTrue(any(x.startswith('--image=') and x.endswith('k1_calm_0.png') for x in call['args']))
        self.assertIn('plain white background', call['task'])          # the measurement prefix
        self.assertIn('Portrait image, the same 768:1344 framing', call['task'])
        self.assertIn('her hand halfway down', call['task'])
        from PIL import Image
        for i in range(2):
            im = Image.open(os.path.join(ROOT, 'characters', CHAR, 'refs', 'images', f'{self.name}_{i}.png'))
            self.assertEqual(im.size, (768, 1344))                      # letterboxed onto image 2's canvas
        led = [json.loads(l) for l in open(os.path.join(ROOT, 'characters', CHAR, 'refs', 'ledger.jsonl'))]
        self.assertEqual(led[-1]['provider'], 'codex'); self.assertEqual(led[-1]['canvas'], '768x1344')

    def test_no_clobber(self):
        self.assertEqual(self.run_(CHAR, self.name, '--prompt', 'x', '-n', '1', '--no-register').returncode, 0)
        self.assertEqual(self.run_(CHAR, self.name, '--prompt', 'x', '-n', '1', '--no-register').returncode, 2)

    def test_manual_when_not_chatgpt(self):
        p = self.run_(CHAR, self.name, '--prompt', 'x', '--ref', SHEET, STUB_MODE='apikey')
        self.assertEqual(p.returncode, 3)
        self.assertIn('MANUAL', p.stdout)


if __name__ == '__main__':
    unittest.main()
