#!/usr/bin/env python3
"""fal_batch.py <char> <spec.json> [--model M] [--n 2] [--only k1,k2] [--ref path]... — run a set of reference prompts in
parallel (threads), one fal call per pose, outputs + ledger via fal_gen.gen. spec = {base, poses: {name: prompt}}."""
import sys, json, argparse, concurrent.futures as cf
sys.path.insert(0, 'tools'); import fal_gen
ap = argparse.ArgumentParser(); ap.add_argument('char'); ap.add_argument('spec'); ap.add_argument('--model', default='fal-ai/nano-banana/edit')
ap.add_argument('--n', type=int, default=2); ap.add_argument('--only', default=''); ap.add_argument('--ref', action='append', default=[]); ap.add_argument('--suffix', default='')
a = ap.parse_args(); S = json.load(open(a.spec)); refs = a.ref or ['characters/%s/ref/standing_34.jpg' % a.char]
todo = {k: v for k, v in S['poses'].items() if not a.only or k in a.only.split(',')}
def one(item):
    k, p = item
    try:
        outs, _ = fal_gen.gen('image', a.char, k + a.suffix, a.model, S['base'] + ' ' + p, refs, a.n)
        return k, outs, None
    except Exception as e: return k, [], repr(e)[:300]
with cf.ThreadPoolExecutor(8) as ex:
    for k, outs, err in ex.map(one, todo.items()): print(k, outs, err or '')
