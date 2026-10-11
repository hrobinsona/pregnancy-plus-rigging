"""Apply a batch of exact-text replacements to a file; report misses instead of aborting.
usage (python): from edit import apply; apply(path, [(old, new), ...])"""
def apply(path, reps):
    s = open(path).read(); miss = []
    for a, b in reps:
        if a in s: s = s.replace(a, b)
        else: miss.append(a[:90])
    open(path, 'w').write(s)
    for m in miss: print('MISS:', m)
    return not miss
