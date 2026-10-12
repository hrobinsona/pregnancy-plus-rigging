#!/usr/bin/env python3
"""fal_video_fl.py <char> <jobs.json> — FIRST→LAST frame motion references (several models in parallel).
jobs = [{name, model, prompt, first, last, args?}]. Each model names its start/end image fields differently; MAP knows them.
A first→last video between two of our KEY references gives the in-between motion of exactly that move in the character's
own style and staging (measurement only: we fit the rig to its frames; nothing is drawn from it)."""
import sys, json, concurrent.futures as cf, time, pathlib
sys.path.insert(0, 'tools'); import fal_gen
MAP = {
  'fal-ai/bytedance/seedance/v1/pro/image-to-video': ('image_url', 'end_image_url', {'camera_fixed': True}),
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': ('image_url', 'tail_image_url', {}),
  'fal-ai/kling-video/o1/image-to-video': ('start_image_url', 'end_image_url', {}),
  'fal-ai/minimax/hailuo-02/pro/image-to-video': ('image_url', 'end_image_url', {}),
  'fal-ai/veo3.1/first-last-frame-to-video': ('first_frame_url', 'last_frame_url', {'generate_audio': False}),
}
char, jobs = sys.argv[1], json.load(open(sys.argv[2]))
up = {}
def url(p):
    if p not in up: up[p] = fal_gen.upload(p)
    return up[p]
def one(j):
    try:
        a, b, extra = MAP[j['model']]
        args = {'prompt': j['prompt'], a: url(j['first']), b: url(j['last']), **extra, **(j.get('args') or {})}
        res, dt = fal_gen.run(j['model'], args)
        outs = []
        for i, u in enumerate(fal_gen.urls_of(res)):
            if not u.split('?')[0].endswith(('.mp4', '.webm', '.mov')): continue
            o = pathlib.Path(f'characters/{char}/refs/videos/{j["name"]}_{i}.mp4'); fal_gen.download(u, o); outs.append(str(o))
        fal_gen.ledger(char, {'t': time.strftime('%Y-%m-%d %H:%M:%S'), 'kind': 'video-fl', 'name': j['name'], 'model': j['model'], 'prompt': j['prompt'],
                              'refs': [j['first'], j['last']], 'args': {k: v for k, v in args.items() if not str(v).startswith('http')}, 'outputs': outs, 'secs': round(dt, 1)})
        return j['name'], outs, None
    except Exception as e: return j['name'], [], repr(e)[:400]
for p in {x for j in jobs for x in (j['first'], j['last'])}: url(p)
with cf.ThreadPoolExecutor(10) as ex:
    for n, o, e in ex.map(one, jobs): print(n, o, e or '', flush=True)
