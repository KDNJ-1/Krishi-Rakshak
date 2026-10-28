"""Runs every scenario at several rain-signal reliabilities and writes results/summary.csv."""
import csv, os, model
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(root, 'results', 'summary.csv'), 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['scenario', 'reliability', 'farmer', 'irrigations', 'water_mm', 'drained_mm', 'stress_days', 'yield_proxy_pct'])
    for k in model.SCENARIOS:
        for rel in (0.0, 0.3, 0.6, 0.9):
            for mode in ('without', 'with'):
                s = model.summary(model.run(k, rel, mode))
                w.writerow([k, rel, mode, s['irrigations'], s['waterUsed'], round(s['drained'], 1), s['stressDays'], round(s['yieldProxy'], 1)])
print('wrote results/summary.csv')
