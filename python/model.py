"""Krishi-Rakshak concept simulator (Python mirror of model.js).
Illustrative assumptions, NOT measured data."""
P = dict(DAYS=90, AWC=100, CRIT=35, TRIGGER=50, WATCH=65, HOLD_MIN=40, IRR=40, RAIN_EFF=0.9,
         ROUTINE_INTERVAL=8, SKIP_IF_RAIN_YESTERDAY=10)

def _et_normal(d): return 3.8 if d < 25 else 5.0 if d < 65 else 4.2
def _et_drought(d): return 3.8 if d < 25 else 5.2 if d < 65 else 4.4
def _et_heat(d): return 7.5 if 35 <= d <= 46 else (3.8 if d < 25 else 4.6)

SCENARIOS = {
    'normal':  dict(title='Normal season', events={5: (25, .3), 14: (40, .2), 26: (15, .6), 38: (30, .4), 55: (35, .3), 70: (20, .7), 82: (25, .5)},
                    false_alarms=[47], et=_et_normal, routine_start=4, budget=12, s0=70),
    'drought': dict(title='Drought spell, limited water', events={3: (30, .3), 9: (20, .4), 58: (30, .3), 75: (20, .5)},
                    false_alarms=[], et=_et_drought, routine_start=6, budget=7, s0=60),
    'storm':   dict(title='Heavy rain on the way', events={6: (20, .9), 22: (15, .5), 31: (70, .2), 32: (30, -1), 50: (25, .7), 68: (30, .4)},
                    false_alarms=[40], et=_et_normal, routine_start=6, budget=12, s0=70),
    'heat':    dict(title='Heat wave', events={8: (25, .3), 30: (20, .4), 62: (30, .3), 80: (20, .5)},
                    false_alarms=[], et=_et_heat, routine_start=6, budget=12, s0=70),
}

def run(key, reliability, mode):
    sc = SCENARIOS[key]; D = P['DAYS']
    rain = [0.0] * (D + 1)
    for d, (mm, _) in sc['events'].items(): rain[d] = mm
    et = [0.0] + [sc['et'](d) for d in range(1, D + 1)]
    detected = [False] * (D + 1)
    for d, (_, u) in sc['events'].items():
        if u >= 0 and u < reliability: detected[d] = True
    false_alarm = [False] * (D + 1)
    for d in sc['false_alarms']: false_alarm[d] = True
    S = float(sc['s0']); budget = sc['budget']
    out = dict(S=[S], drained=0.0, eta=0.0, etc=0.0, stress=0, irrigations=0, irrigation=[0] * (D + 1))
    for d in range(1, D + 1):
        morning = S; irrigate = False
        if mode == 'with':
            signal = detected[d] or false_alarm[d]
            if signal and morning >= P['HOLD_MIN']: pass
            elif morning <= P['TRIGGER'] and budget > 0: irrigate = True
        else:
            sched = d >= sc['routine_start'] and (d - sc['routine_start']) % P['ROUTINE_INTERVAL'] == 0
            rained = d > 1 and rain[d - 1] >= P['SKIP_IF_RAIN_YESTERDAY']
            if sched and budget > 0 and not rained: irrigate = True
        add = 0
        if irrigate:
            add = P['IRR']; budget -= 1; out['irrigations'] += 1; out['irrigation'][d] = P['IRR']
        S = S + P['RAIN_EFF'] * rain[d] + add
        if S > P['AWC']: out['drained'] += S - P['AWC']; S = P['AWC']
        ks = 1.0 if S >= P['CRIT'] else S / P['CRIT']
        eta = et[d] * ks
        out['etc'] += et[d]; out['eta'] += eta
        S = max(0.0, S - eta)
        if S < P['CRIT']: out['stress'] += 1
        out['S'].append(S)
    out['yield_proxy'] = 100 * out['eta'] / out['etc']
    out['water_used'] = out['irrigations'] * P['IRR']
    return out

def summary(r):
    return dict(irrigations=r['irrigations'], waterUsed=r['water_used'], drained=round(r['drained'], 6),
                stressDays=r['stress'], yieldProxy=round(r['yield_proxy'], 6))
