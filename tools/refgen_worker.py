#!/usr/bin/env python3
"""refgen_worker.py — make reference STILLS on Harry's Mac with no one in the loop: a cloud session commits a request
file, this worker (launchd, every 2 minutes) generates it with the Codex CLI on the ChatGPT login and pushes the stills.
Harry approved running it unattended (2026-10-12).

  A request: requests/refgen/<name>.json on any claude/* branch, committed and pushed —
    {"char": "mum2", "name": "h_fore3", "prompt_file": "docs/prompts/h_fore3.txt",
     "refs": ["characters/mum2/ref/standing_34.jpg", "characters/mum2/refs/images/k4_cover_v2_0.png", "..."],
     "n": 3, "force": false}
  The result, pushed to the same branch within a few minutes:
    · characters/<char>/refs/images/<name>_<i>.png (letterboxed onto image 2's canvas) + one ledger line, as refgen.py
    · the request moved to requests/refgen/done/<name>.json with "status" (ok | partial | failed | rejected),
      "outputs" and "error"
  Pose estimation is not run here; do it where pose_est.py is set up.

  python3 tools/refgen_worker.py --install      # pin this file + refgen.py into ~/.refgen-worker, load the launchd job
  python3 tools/refgen_worker.py --uninstall    # unload the job (the pinned copy and log stay)
  python3 tools/refgen_worker.py --status       # codex readiness, today's count, pending requests on each branch
  ~/.refgen-worker/refgen_worker.py --once      # what launchd runs; log in ~/.refgen-worker/worker.log

Safety: launchd runs the PINNED copy in ~/.refgen-worker, never code from the repo, so a push cannot change what runs on
the Mac; re-run --install on the Mac to update it. From the repo it reads only request JSON, prompt text and reference
images, each checked to be a plain file inside its own clone. Codex runs locked down as in refgen.py (read-only, empty
folder, image tool only). No image budget (Harry: as many as the job needs); MAX_PER_DAY is only a runaway guard. It works in its own clone
(~/.refgen-worker/repo), pushes only to claude/* branches, and runs only while the Mac is awake and logged in."""
import argparse
import datetime
import fcntl
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time

HOME = os.path.join(os.path.expanduser('~'), '.refgen-worker')
REPO = os.path.join(HOME, 'repo')
STATE = os.path.join(HOME, 'state.json')
LOG = os.path.join(HOME, 'worker.log')
LABEL = 'com.pregnancyplus.refgen-worker'
PLIST = os.path.join(os.path.expanduser('~'), 'Library', 'LaunchAgents', LABEL + '.plist')
REMOTE = 'https://github.com/hrobinsona/pregnancy-plus-rigging'
QUEUE = 'requests/refgen'
MAX_PER_RUN = 12
MAX_PER_DAY = 1000                                       # no budget (Harry, 2026-10-12): only a runaway guard
INTERVAL = 120
NAME = re.compile(r'^[a-z0-9][a-z0-9_]{0,47}$')
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp')
SECRETISH = re.compile(r'(sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}|[A-Za-z0-9_-]{40,})')


def log(*a):
    print(time.strftime('%Y-%m-%d %H:%M:%S ') + ' '.join(str(x) for x in a), flush=True)


def git(*args, check=True):
    p = subprocess.run(['git', '-C', REPO, *args], capture_output=True, text=True)
    if check and p.returncode:
        raise RuntimeError(f'git {" ".join(args)}: {p.stderr.strip()[-300:]}')
    return p.stdout.strip()


def load_refgen():
    """the refgen.py next to this file: the pinned copy under launchd, the repo's when run from tools/"""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refgen.py')
    spec = importlib.util.spec_from_file_location('refgen_pinned', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def state():
    try:
        s = json.load(open(STATE))
    except (OSError, ValueError):
        s = {}
    today = datetime.date.today().isoformat()
    return s if s.get('day') == today else {'day': today, 'images': 0}


def save_state(s):
    json.dump(s, open(STATE, 'w'))


def inside(rel, exts=None, under=None):
    """the absolute path of a repo-relative plain file inside the clone, else None"""
    if not isinstance(rel, str) or not rel or rel.startswith('/') or '\\' in rel or '..' in rel.split('/'):
        return None
    if under and not rel.startswith(under):
        return None
    raw = os.path.join(REPO, rel)
    full = os.path.realpath(raw)
    if not full.startswith(os.path.realpath(REPO) + os.sep) or os.path.islink(raw) or not os.path.isfile(full):
        return None
    if exts and not full.lower().endswith(exts):
        return None
    return full


def validate(req):
    if not isinstance(req, dict):
        return 'request is not a JSON object'
    if not NAME.match(str(req.get('char', ''))) or not NAME.match(str(req.get('name', ''))):
        return 'char and name must match [a-z0-9_]'
    n = req.get('n', 3)
    if not isinstance(n, int) or isinstance(n, bool) or not 1 <= n <= 4:
        return 'n must be 1-4'
    if not inside(req.get('prompt_file'), ('.txt',), 'docs/prompts/'):
        return 'prompt_file must be an existing .txt under docs/prompts/'
    refs = req.get('refs', [])
    if not isinstance(refs, list) or not 1 <= len(refs) <= 3:
        return 'refs must list 1-3 images (1 sheet, 2 previous pose, 3 target pose)'
    for r in refs:
        if not inside(r, IMG_EXT, 'characters/'):
            return f'ref not found or not an image under characters/: {r}'
    return None


def register(char, name, imgs, prompt, refs, canvas):
    """as tools/ref_register.py: letterbox onto image 2's canvas, save as PNG, append the ledger"""
    from PIL import Image
    d = os.path.join(REPO, 'characters', char, 'refs')
    os.makedirs(os.path.join(d, 'images'), exist_ok=True)
    outs = []
    for i, data in enumerate(imgs):
        tmp = os.path.join(HOME, f'_gen_{i}.png')
        open(tmp, 'wb').write(data)
        im = Image.open(tmp).convert('RGB')
        if canvas:
            W, H = canvas
            k = min(W / im.width, H / im.height)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            bg = Image.new('RGB', (W, H), 'white'); bg.paste(im, ((W - im.width) // 2, (H - im.height) // 2)); im = bg
        rel = f'characters/{char}/refs/images/{name}_{i}.png'
        im.save(os.path.join(REPO, rel)); outs.append(rel); os.remove(tmp)
    entry = {'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'kind': 'image', 'name': name, 'provider': 'codex',
             'model': 'chatgpt-image', 'prompt': prompt, 'refs': refs, 'outputs': outs, 'via': 'refgen_worker',
             **({'canvas': f'{canvas[0]}x{canvas[1]}'} if canvas else {})}
    with open(os.path.join(d, 'ledger.jsonl'), 'a') as f:
        f.write(json.dumps(entry) + '\n')
    return outs


def process(rg, req, s):
    """generate one request; returns the result for done/<name>.json, or None to leave it queued"""
    err = validate(req)
    if err:
        return {'status': 'rejected', 'error': err}
    char, name, n = req['char'], req['name'], req.get('n', 3)
    existing = [os.path.join(REPO, f'characters/{char}/refs/images/{name}_{i}.png') for i in range(n)]
    if not req.get('force') and any(os.path.exists(e) for e in existing):
        return {'status': 'rejected', 'error': f'{name}_* already exists (set "force": true to replace)'}
    if s['images'] + n > MAX_PER_DAY:
        return None
    refs = req['refs']
    full_refs = [inside(r) for r in refs]
    rg.PREFIX = os.path.join(REPO, 'docs', 'prompts', '_measure.txt')
    canvas = rg.image_size(full_refs[1]) if len(full_refs) > 1 else None
    prompt = rg.full_prompt(open(inside(req['prompt_file'])).read(), canvas)
    imgs = []
    for i in range(n):
        t = time.time()
        for attempt in (1, 2):                          # one retry per image
            try:
                imgs.append(rg.gen_codex(prompt, full_refs, 600))
                s['images'] += 1; save_state(s)
                log(f'  {name}_{i}: {time.time() - t:.0f}s')
                break
            except Exception as e:  # noqa: BLE001
                s['images'] += 1; save_state(s)         # a failed attempt may still have used allowance
                log(f'  {name}_{i}: attempt {attempt} failed: {SECRETISH.sub("[redacted]", str(e))[-200:]}')
                if attempt == 2:
                    msg = SECRETISH.sub('[redacted]', str(e))[-300:]
                    if not imgs:
                        return {'status': 'failed', 'error': msg}
                    return {'status': 'partial', 'outputs': register(char, name, imgs, prompt, refs, canvas), 'error': msg}
    return {'status': 'ok', 'outputs': register(char, name, imgs, prompt, refs, canvas)}


def push(branch):
    for attempt in range(4):
        p = subprocess.run(['git', '-C', REPO, 'push', 'origin', f'HEAD:refs/heads/{branch}'], capture_output=True, text=True)
        if p.returncode == 0:
            return True
        log(f'  push failed ({p.stderr.strip()[-160:]}); rebasing and retrying')
        time.sleep(2 ** (attempt + 1))
        subprocess.run(['git', '-C', REPO, 'pull', '-q', '--rebase', 'origin', branch], capture_output=True, text=True)
    return False


def pending(branch):
    names = git('ls-tree', '--name-only', f'origin/{branch}', QUEUE + '/', check=False).splitlines()
    return sorted(p for p in names if p.endswith('.json'))


def branches():
    out = git('for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/claude/')
    return [b[len('origin/'):] for b in out.splitlines() if b.startswith('origin/claude/')]


def once():
    os.makedirs(HOME, exist_ok=True)
    lock = open(os.path.join(HOME, 'lock'), 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return 0                                        # the previous run is still generating
    if not os.path.isdir(os.path.join(REPO, '.git')):
        subprocess.run(['git', 'clone', '-q', REMOTE, REPO], check=True)
    git('fetch', '-q', '--prune', 'origin')
    work = [(b, reqs) for b in branches() for reqs in [pending(b)] if reqs]
    if not work:
        return 0
    rg = load_refgen()
    ok, why = rg.codex_ready()
    if not ok:
        log('codex not ready:', why, '— requests stay queued'); return 3
    s = state(); made = 0
    for branch, reqs in work:
        git('checkout', '-q', '-B', branch, f'origin/{branch}')
        git('reset', '-q', '--hard', f'origin/{branch}'); git('clean', '-qfd')
        changed = []
        for rel in reqs:
            if made >= MAX_PER_RUN:
                break
            try:
                req = json.load(open(os.path.join(REPO, rel)))
            except (OSError, ValueError):
                req = None
            log(f'{branch}: {rel}')
            res = process(rg, req, s) if req is not None else {'status': 'rejected', 'error': 'invalid JSON'}
            if res is None:
                log(f'  daily budget reached ({s["images"]}/{MAX_PER_DAY}); left queued'); break
            made += len(res.get('outputs', []))
            os.makedirs(os.path.join(REPO, QUEUE, 'done'), exist_ok=True)
            dst = f'{QUEUE}/done/{os.path.basename(rel)}'
            git('mv', '-f', rel, dst)
            out = {**(req if isinstance(req, dict) else {}), **res, 'finished': time.strftime('%Y-%m-%d %H:%M:%S')}
            json.dump(out, open(os.path.join(REPO, dst), 'w'), indent=2)
            git('add', dst, *res.get('outputs', []))
            if res.get('outputs'):
                git('add', f'characters/{req["char"]}/refs/ledger.jsonl')
            changed.append(f'{os.path.basename(rel)[:-5]} {res["status"]}')
            log(f'  → {res["status"]}', res.get('error', ''))
        if changed:
            git('commit', '-q', '-m', 'refs (worker): ' + ', '.join(changed),
                '-m', "Generated on Harry's Mac by tools/refgen_worker.py (Codex, ChatGPT login).")
            log(f'{branch}: pushed' if push(branch) else f'{branch}: PUSH FAILED, will retry next run')
    return 0


def install():
    os.makedirs(HOME, exist_ok=True)
    src = os.path.dirname(os.path.abspath(__file__))
    for f in ('refgen_worker.py', 'refgen.py'):
        shutil.copy2(os.path.join(src, f), os.path.join(HOME, f))
    dirs = [os.path.dirname(shutil.which(x) or '') for x in ('codex', 'node', 'git')]
    path = ':'.join(d for d in dict.fromkeys(dirs + [os.path.dirname(sys.executable), '/usr/local/bin', '/opt/homebrew/bin',
                                                     '/usr/bin', '/bin', '/usr/sbin', '/sbin']) if d)
    plist = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>{LABEL}</string>
  <key>ProgramArguments</key><array><string>{sys.executable}</string><string>{HOME}/refgen_worker.py</string><string>--once</string></array>
  <key>StartInterval</key><integer>{INTERVAL}</integer>
  <key>RunAtLoad</key><true/>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>{path}</string></dict>
  <key>StandardOutPath</key><string>{LOG}</string>
  <key>StandardErrorPath</key><string>{LOG}</string>
  <key>ProcessType</key><string>Background</string>
</dict></plist>
'''
    os.makedirs(os.path.dirname(PLIST), exist_ok=True)
    subprocess.run(['launchctl', 'bootout', f'gui/{os.getuid()}', PLIST], capture_output=True)
    open(PLIST, 'w').write(plist)
    r = subprocess.run(['launchctl', 'bootstrap', f'gui/{os.getuid()}', PLIST], capture_output=True, text=True)
    print('installed', PLIST, 'ok' if r.returncode == 0 else r.stderr.strip())
    return r.returncode


def uninstall():
    subprocess.run(['launchctl', 'bootout', f'gui/{os.getuid()}', PLIST], capture_output=True)
    if os.path.exists(PLIST):
        os.remove(PLIST)
    print('uninstalled', LABEL)
    return 0


def status():
    print('codex:', load_refgen().codex_ready())
    s = state(); print(f'today: {s["images"]}/{MAX_PER_DAY} images')
    if os.path.isdir(os.path.join(REPO, '.git')):
        git('fetch', '-q', 'origin')
        for b in branches():
            for p in pending(b):
                print(f'pending  {b}: {p}')
    loaded = subprocess.run(['launchctl', 'print', f'gui/{os.getuid()}/{LABEL}'], capture_output=True).returncode == 0
    print('launchd job:', 'loaded' if loaded else 'not loaded')
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--once', action='store_true'); g.add_argument('--install', action='store_true')
    g.add_argument('--uninstall', action='store_true'); g.add_argument('--status', action='store_true')
    a = ap.parse_args()
    sys.exit(once() if a.once else install() if a.install else uninstall() if a.uninstall else status())
