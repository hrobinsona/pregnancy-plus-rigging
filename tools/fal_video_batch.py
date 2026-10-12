#!/usr/bin/env python3
"""fal_video_batch.py <char> <jobs.json> — run several video generations in parallel. jobs = [{name, model, prompt, image?, args?}]
Each result → characters/<char>/refs/videos/<name>_0.mp4 + ledger. Failures are printed (model id / schema probing)."""
import sys, json, concurrent.futures as cf
sys.path.insert(0, 'tools'); import fal_gen
char, jobs = sys.argv[1], json.load(open(sys.argv[2]))
def one(j):
    try:
        outs, res = fal_gen.gen('video', char, j['name'], j['model'], j['prompt'], [j['image']] if j.get('image') else [], 1, j.get('args'))
        return j['name'], outs, None
    except Exception as e: return j['name'], [], repr(e)[:400]
with cf.ThreadPoolExecutor(8) as ex:
    for n, o, e in ex.map(one, jobs): print(n, o, e or '', flush=True)
