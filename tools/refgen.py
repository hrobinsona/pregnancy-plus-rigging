#!/usr/bin/env python3
"""refgen.py — make reference STILLS with the Codex CLI on the ChatGPT login (no API key), then register them.

  python3 tools/refgen.py mum2 b_lower1 --prompt-file docs/prompts/b_lower1.txt \
      --ref characters/mum2/ref/standing_34.jpg --ref characters/mum2/refs/images/k4_cover_v2_0.png \
      --ref characters/mum2/refs/images/k8_relief_v2_0.png -n 3 [--est]
  python3 tools/refgen.py --check                                   # which route this machine would use

  · generates n samples (default 3) into out/refgen/<name>_<i>.png, each with a .prompt.txt (route, refs, prompt)
  · then runs tools/ref_register.py: copies them to characters/<char>/refs/images/<name>_<i>.png, letterboxed onto
    the canvas of image 2 (the previous pose, so the framing matches), and appends the ledger; --est pose-estimates them
  · --no-register stops after generating

Routes (--route):
  codex   (default) the Codex CLI's built-in image tool on the ChatGPT login: `codex login status` must say ChatGPT, so
          it uses the plan's allowance, never API billing. Codex runs locked down: read-only sandbox, ephemeral session,
          user config ignored, shell / computer / browser / apps / plugins / multi-agent tools off, in an empty folder.
          Runs only where Codex is logged in (Harry's Mac); a cloud container has no Codex.
  api     the OpenAI Images API with OPENAI_API_KEY (pay per image; only when asked for explicitly). REFGEN_API_MODEL
          (default gpt-image-2).
  manual  writes the full prompt to out/refgen/<name>.prompt.txt and says which images to attach and where to save.
Every prompt starts with docs/prompts/_measure.txt (what measuring needs), then the still's own prompt.
References are MEASUREMENT ONLY: nothing made here is ever drawn into a frame. Ported from pregnancy-plus-reels
tools/refgen (its tracing prefix replaced by the measurement one). Standard library only, apart from the register step.
Exit codes: 0 ok, 2 bad arguments, 3 manual handoff needed, 4 generation failed, 5 timed out.
"""
import argparse
import base64
import glob
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFIX = os.path.join(ROOT, 'docs', 'prompts', '_measure.txt')
OFF = ['shell_tool', 'computer_use', 'browser_use', 'apps', 'plugins', 'multi_agent']   # Codex tools the job never needs
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def log(*a):
    print('[refgen]', *a, file=sys.stderr, flush=True)


def read_text(path):
    return '\n'.join(l for l in open(path).read().splitlines() if l.strip() and not l.lstrip().startswith('#')).strip()


def image_size(path):
    """(w, h) of a PNG or JPEG without PIL, or None"""
    with open(path, 'rb') as f:
        head = f.read(26)
        if head[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', head[16:24])
        if head[:2] != b'\xff\xd8':
            return None
        f.seek(2)
        while True:
            b = f.read(1)
            while b and b != b'\xff':
                b = f.read(1)
            while b == b'\xff':
                b = f.read(1)
            if not b:
                return None
            if b[0] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                f.read(3)
                h, w = struct.unpack('>HH', f.read(4))
                return w, h
            f.seek(struct.unpack('>H', f.read(2))[0] - 2, 1)


def full_prompt(prompt, canvas):
    parts = [read_text(PREFIX)]
    if canvas:
        w, h = canvas
        parts.append(f'Portrait image, the same {w}:{h} framing as image 2.' if h > w else f'The same {w}:{h} framing as image 2.')
    parts.append(prompt.strip())
    return '\n\n'.join(parts)


# ---- route: codex ---------------------------------------------------------------------------------------------------
def codex_bin():
    return os.environ.get('REFGEN_CODEX') or shutil.which('codex')


def codex_ready():
    """(ok, why): Codex is installed, logged in with ChatGPT (plan allowance, not API billing), image tool enabled"""
    exe = codex_bin()
    if not exe:
        return False, 'codex is not installed (npm i -g @openai/codex, then `codex login` with ChatGPT)'
    try:
        st = subprocess.run([exe, 'login', 'status'], capture_output=True, text=True, timeout=30)
    except Exception as e:  # noqa: BLE001
        return False, f'codex login status failed: {e}'
    status = (st.stdout + st.stderr).strip()
    if 'chatgpt' not in status.lower():
        return False, f'codex is not logged in with ChatGPT ({status or "no status"}); run `codex login`'
    try:
        fl = subprocess.run([exe, 'features', 'list'], capture_output=True, text=True, timeout=30).stdout
    except Exception:  # noqa: BLE001
        fl = ''
    row = next((l.split() for l in fl.splitlines() if l.split()[:1] == ['image_generation']), None)
    if row is not None and row[-1].lower() != 'true':
        return False, 'the Codex image_generation feature is off (`codex features list`)'
    return True, status


def codex_home():
    return os.environ.get('CODEX_HOME') or os.path.join(os.path.expanduser('~'), '.codex')


def newest_image(folder, since=0.0):
    best = None
    for p in glob.glob(os.path.join(folder, '*')):
        if not p.lower().endswith(IMG_EXT) or not os.path.isfile(p) or os.path.getsize(p) == 0:
            continue
        m = os.path.getmtime(p)
        if m >= since and (best is None or (m, p) > best):
            best = (m, p)
    return best[1] if best else None


def gen_codex(prompt, refs, timeout):
    exe = codex_bin()
    task = ('Use your built-in image generation tool exactly once to generate the image described below, using the '
            'attached images as described. Do not run shell commands, do not write code, do not call any API, and do '
            'not edit any files. When it is done, reply with only the full file path of the saved image.\n\n' + prompt)
    with tempfile.TemporaryDirectory(prefix='refgen-') as scratch:
        last = os.path.join(scratch, 'last_message.txt')
        args = [exe, 'exec', '--skip-git-repo-check', '--ignore-user-config', '--ephemeral', '--json', '-s', 'read-only']
        for f in OFF:
            args += ['-c', f'features.{f}=false']
        args += ['-C', scratch, '-o', last]
        for r in refs:
            args.append(f'--image={os.path.abspath(r)}')
        t0 = time.time()
        try:
            p = subprocess.run(args, input=task, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            raise TimeoutError(f'codex did not finish within {timeout}s')
        thread = None
        for line in p.stdout.splitlines():
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            if isinstance(ev, dict) and ev.get('type') == 'thread.started' and isinstance(ev.get('thread_id'), str):
                thread = ev['thread_id']
                break
        img = None
        if thread and thread.replace('-', '').replace('_', '').replace('.', '').isalnum():
            img = newest_image(os.path.join(codex_home(), 'generated_images', thread))
        if not img and os.path.exists(last):               # fall back to a path in the final message, if written this run
            for tok in open(last).read().split():
                tok = tok.strip('`"\'()[]<>,')
                if tok.lower().endswith(IMG_EXT) and os.path.isfile(tok) and os.path.getmtime(tok) >= t0 - 2:
                    img = tok
                    break
        if not img:
            tail = (p.stderr or p.stdout)[-600:]
            raise RuntimeError(f'codex finished (exit {p.returncode}) without an image. {tail}')
        return open(img, 'rb').read()


# ---- route: api (explicit only) -------------------------------------------------------------------------------------
def api_ready():
    return (True, 'OPENAI_API_KEY is set') if os.environ.get('OPENAI_API_KEY') else (False, 'OPENAI_API_KEY is not set')


def _multipart(fields, files):
    b = uuid.uuid4().hex
    body = b''
    for k, v in fields.items():
        body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, path in files:
        ctype = 'image/png' if path.lower().endswith('.png') else 'image/jpeg' if path.lower().endswith(('.jpg', '.jpeg')) else 'image/webp'
        body += (f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{os.path.basename(path)}"\r\n'
                 f'Content-Type: {ctype}\r\n\r\n').encode() + open(path, 'rb').read() + b'\r\n'
    return body + f'--{b}--\r\n'.encode(), f'multipart/form-data; boundary={b}'


def gen_api(prompt, refs, timeout, size):
    base = os.environ.get('REFGEN_API_BASE', 'https://api.openai.com/v1').rstrip('/')
    model = os.environ.get('REFGEN_API_MODEL', 'gpt-image-2')
    hdr = {'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY']}
    if refs:
        body, ctype = _multipart({'model': model, 'prompt': prompt, 'size': size, 'n': '1'}, [('image[]', r) for r in refs])
        req = urllib.request.Request(base + '/images/edits', data=body, headers={**hdr, 'Content-Type': ctype})
    else:
        body = json.dumps({'model': model, 'prompt': prompt, 'size': size, 'n': 1}).encode()
        req = urllib.request.Request(base + '/images/generations', data=body, headers={**hdr, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'OpenAI API error {e.code}: {e.read().decode(errors="replace")[:400]}')
    item = (data.get('data') or [{}])[0]
    if item.get('b64_json'):
        return base64.b64decode(item['b64_json'])
    if item.get('url'):
        with urllib.request.urlopen(item['url'], timeout=timeout) as r:
            return r.read()
    raise RuntimeError('OpenAI API returned no image')


# ---- route: manual --------------------------------------------------------------------------------------------------
def manual(prompt, outs, refs, pf):
    open(pf, 'w').write(prompt + '\n')
    print(f'MANUAL: no image route available. Prompt saved to {pf}')
    print('Generate it in ChatGPT with these attached, in this order: ' + ', '.join(refs) if refs else 'Generate it in ChatGPT')
    print('Save the samples as ' + ', '.join(outs) + ', then run tools/ref_register.py (see docs/REF_PROMPTS.md).')
    print('\n' + prompt)
    return 3


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('char', nargs='?'); ap.add_argument('name', nargs='?')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--prompt'); g.add_argument('--prompt-file')
    ap.add_argument('--ref', action='append', default=[], help='image 1 = character sheet, 2 = previous pose, 3 = target pose')
    ap.add_argument('-n', type=int, default=3, help='samples to generate (1-4, default 3)')
    ap.add_argument('--route', choices=['codex', 'api', 'manual'], default='codex')
    ap.add_argument('--timeout', type=int, default=600, help='seconds per image')
    ap.add_argument('--force', action='store_true', help='overwrite existing samples')
    ap.add_argument('--no-register', action='store_true', help='only generate, into out/refgen/')
    ap.add_argument('--est', action='store_true', help='pose-estimate the registered samples (ref_register --est)')
    ap.add_argument('--check', action='store_true', help='only report whether the route is ready')
    a = ap.parse_args()
    if a.check:
        ok, why = codex_ready() if a.route == 'codex' else api_ready() if a.route == 'api' else (True, 'manual')
        print(f'{a.route}: {"ready" if ok else "unavailable"} - {why}')
        return 0 if ok else 3
    if not (a.char and a.name and (a.prompt or a.prompt_file)):
        ap.error('char, name and --prompt/--prompt-file are required')
    if not 1 <= a.n <= 4:
        ap.error('-n must be 1-4')
    for r in a.ref:
        if not os.path.isfile(r):
            ap.error(f'reference not found: {r}')
    raw = a.prompt if a.prompt is not None else open(a.prompt_file).read()
    canvas = image_size(a.ref[1]) if len(a.ref) > 1 else None
    prompt = full_prompt(raw, canvas)
    od = os.path.join(ROOT, 'out', 'refgen'); os.makedirs(od, exist_ok=True)
    outs = [os.path.join(od, f'{a.name}_{i}.png') for i in range(a.n)]
    if not a.force:
        clash = [o for o in outs if os.path.exists(o)]
        if clash:
            ap.error(f'exists (use --force): {", ".join(clash)}')

    if a.route == 'manual':
        return manual(prompt, outs, a.ref, os.path.join(od, f'{a.name}.prompt.txt'))
    ok, why = codex_ready() if a.route == 'codex' else api_ready()
    log(f'{a.route}: {"ready" if ok else "unavailable"} - {why}')
    if not ok:
        return manual(prompt, outs, a.ref, os.path.join(od, f'{a.name}.prompt.txt'))
    size = '1024x1536' if canvas and canvas[1] > canvas[0] else '1024x1024'
    for o in outs:
        log(f'{a.route}: generating {o} …')
        t = time.time()
        try:
            data = gen_codex(prompt, a.ref, a.timeout) if a.route == 'codex' else gen_api(prompt, a.ref, a.timeout, size)
        except TimeoutError as e:
            log(str(e)); return 5
        except Exception as e:  # noqa: BLE001
            log(f'failed: {e}'); return 4
        open(o, 'wb').write(data)
        open(os.path.splitext(o)[0] + '.prompt.txt', 'w').write(f'route: {a.route}\nrefs: {a.ref}\n\n{prompt}\n')
        print(f'{o}  ({len(data) // 1024} KB, {time.time() - t:.0f}s via {a.route})')
    if a.no_register:
        return 0
    cmd = [sys.executable, os.path.join(ROOT, 'tools', 'ref_register.py'), a.char, a.name, *outs, '--provider', a.route,
           '--model', 'chatgpt-image' if a.route == 'codex' else os.environ.get('REFGEN_API_MODEL', 'gpt-image-2'),
           '--prompt', prompt]                              # the full prompt as sent, prefix included
    for r in a.ref:
        cmd += ['--ref', r]
    if canvas:
        cmd += ['--canvas', f'{canvas[0]}x{canvas[1]}']
    if a.est:
        cmd.append('--est')
    return subprocess.run(cmd, cwd=ROOT).returncode


if __name__ == '__main__':
    sys.exit(main())
