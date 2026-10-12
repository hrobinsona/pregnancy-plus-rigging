#!/usr/bin/env python3
"""fal_gen.py — reference generation through fal.ai (images AND video), with a provenance ledger.

Reference images/videos are used ONLY for measurement (landmarks, silhouettes, proportions, timing, joint paths): nothing
generated here is ever drawn into a frame. The ledger (refs/ledger.jsonl per character) records model, prompt, inputs and
outputs of every call, so a pipeline run is reproducible and we can learn which prompts/models work.

usage (CLI):
  python3 tools/fal_gen.py image  <char> <name> --model fal-ai/nano-banana/edit --prompt "..." [--ref path ...] [--n 2] [--arg k=v ...]
  python3 tools/fal_gen.py video  <char> <name> --model fal-ai/kling-video/v2.1/standard/image-to-video --prompt "..." --ref img [--arg k=v]
  python3 tools/fal_gen.py raw    <model> '<json args>'          (prints the result JSON — for probing a model's schema)
The key is read from $FAL_KEY or ~/.secrets/fal_key (never from the repo)."""
import os, sys, json, time, argparse, urllib.request, hashlib, pathlib

def key():
    k = os.environ.get('FAL_KEY') or open(os.path.expanduser('~/.secrets/fal_key')).read().strip()
    os.environ['FAL_KEY'] = k
    return k

def client():
    key()
    import fal_client
    return fal_client

def upload(path):
    fc = client()
    return fc.upload_file(path)

def run(model, args, log=True):
    fc = client()
    t0 = time.time()
    res = fc.subscribe(model, arguments=args, with_logs=False)
    return res, time.time() - t0

def download(url, out):
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=600) as r, open(out, 'wb') as f: f.write(r.read())
    return out

def urls_of(res):
    """every media url in a fal result (images[], image, video, videos[])"""
    out = []
    def walk(x):
        if isinstance(x, dict):
            if 'url' in x and isinstance(x['url'], str) and x['url'].startswith('http'): out.append(x['url'])
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk(res); return out

def ledger(char, rec):
    p = pathlib.Path(f'characters/{char}/refs/ledger.jsonl'); p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'a') as f: f.write(json.dumps(rec) + '\n')

def gen(kind, char, name, model, prompt, refs=(), n=1, extra=None):
    extra = dict(extra or {})
    ref_urls = [upload(r) for r in refs]
    args = {'prompt': prompt, **extra}
    if kind == 'image':
        if ref_urls: args.setdefault('image_urls', ref_urls)
        if n > 1: args.setdefault('num_images', n)
    else:
        if ref_urls: args.setdefault('image_url', ref_urls[0])
    res, dt = run(model, args)
    outs = []
    for i, u in enumerate(urls_of(res)):
        ext = os.path.splitext(u.split('?')[0])[1] or ('.png' if kind == 'image' else '.mp4')
        o = pathlib.Path(f'characters/{char}/refs/{kind}s/{name}_{i}{ext}')
        download(u, o); outs.append(str(o))
    ledger(char, {'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'kind': kind, 'name': name, 'model': model, 'prompt': prompt,
                  'refs': list(refs), 'args': {k: v for k, v in args.items() if k not in ('image_urls', 'image_url')}, 'outputs': outs, 'secs': round(dt, 1),
                  'text': res.get('description') if isinstance(res, dict) else None})
    return outs, res

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('kind'); ap.add_argument('a'); ap.add_argument('b', nargs='?')
    ap.add_argument('--model'); ap.add_argument('--prompt', default=''); ap.add_argument('--ref', action='append', default=[])
    ap.add_argument('--n', type=int, default=1); ap.add_argument('--arg', action='append', default=[])
    a = ap.parse_args()
    if a.kind == 'raw':
        res, dt = run(a.a, json.loads(a.b)); print(json.dumps(res, indent=1)[:4000]); print(f'({dt:.1f}s)'); sys.exit()
    extra = {}
    for kv in a.arg:
        k, v = kv.split('=', 1)
        try: v = json.loads(v)
        except Exception: pass
        extra[k] = v
    outs, res = gen(a.kind, a.a, a.b, a.model, a.prompt, a.ref, a.n, extra)
    print('\n'.join(outs))
    if isinstance(res, dict) and res.get('description'): print('model text:', res['description'][:500])
