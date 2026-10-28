"""Checks that the Python model and the JavaScript model give identical results.
Run:  python3 tests/test_parity.py   (needs Node.js)"""
import json, subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
sys.path.insert(0, os.path.join(root, 'python'))
import model
js = """
const KR = require('./model.js'); const out = {};
for (const k of Object.keys(KR.SCENARIOS)) for (const rel of [0, 0.3, 0.6, 1]) {
  const c = KR.compare(k, rel); out[k + '|' + rel] = { without: KR.summary(c.without), with: KR.summary(c.with) };
} console.log(JSON.stringify(out));"""
res = json.loads(subprocess.check_output(['node', '-e', js], cwd=root))
bad = 0
for k in model.SCENARIOS:
    for rel in (0, 0.3, 0.6, 1):
        for mode in ('without', 'with'):
            a = model.summary(model.run(k, rel, mode)); b = res[f'{k}|{rel}'][mode]
            for f in a:
                if abs(a[f] - b[f]) > 1e-6: bad += 1; print('MISMATCH', k, rel, mode, f, a[f], b[f])
print('parity OK' if not bad else f'{bad} mismatches'); sys.exit(1 if bad else 0)
