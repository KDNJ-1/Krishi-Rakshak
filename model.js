/* Krishi-Rakshak concept simulator: daily soil-water bucket model.
   Illustrative assumptions, NOT measured data. Same logic is mirrored in python/model.py
   and checked by tests/test_parity.py. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KR = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const P = {
    DAYS: 90,
    AWC: 100,        // plant-available water the root zone can hold (mm)
    CRIT: 35,        // below this the crop is water-stressed (mm)
    TRIGGER: 50,     // station says IRRIGATE NOW at or below this (mm)
    WATCH: 65,       // station says WATCH at or below this (mm)
    HOLD_MIN: 40,    // station holds irrigation for incoming rain only if soil water >= this (mm)
    IRR: 40,         // water applied per irrigation (mm)
    RAIN_EFF: 0.9,   // fraction of rain that enters the soil
    ROUTINE_INTERVAL: 8, // farmer without station irrigates on a fixed routine (days)
    SKIP_IF_RAIN_YESTERDAY: 10 // routine farmer skips if it rained >= this yesterday (mm)
  };

  function series(days, fn) { const a = new Array(days + 1).fill(0); for (let d = 1; d <= days; d++) a[d] = fn(d); return a; }
  function rainFrom(events) { const r = new Array(P.DAYS + 1).fill(0); Object.keys(events).forEach(k => r[+k] = events[k][0]); return r; }

  // events: day -> [rain_mm, detectU]; the station gives an incoming-rain signal if detectU < reliability
  const SCENARIOS = {
    normal: {
      title: 'Normal season', blurb: 'Scattered rain through the season. Shows everyday benefit and one false alarm.',
      events: { 5: [25, 0.3], 14: [40, 0.2], 26: [15, 0.6], 38: [30, 0.4], 55: [35, 0.3], 70: [20, 0.7], 82: [25, 0.5] },
      falseAlarms: [47], et: d => d < 25 ? 3.8 : d < 65 ? 5.0 : 4.2, routineStart: 4, budget: 12, s0: 70, heat: null
    },
    drought: {
      title: 'Drought spell, limited water', blurb: 'Long dry spell and only 7 irrigations of water available (borewell or tank).',
      events: { 3: [30, 0.3], 9: [20, 0.4], 58: [30, 0.3], 75: [20, 0.5] },
      falseAlarms: [], et: d => d < 25 ? 3.8 : d < 65 ? 5.2 : 4.4, routineStart: 6, budget: 7, s0: 60, heat: null
    },
    storm: {
      title: 'Heavy rain on the way', blurb: 'A 70 mm storm arrives right after a routine irrigation day.',
      events: { 6: [20, 0.9], 22: [15, 0.5], 31: [70, 0.2], 32: [30, -1], 50: [25, 0.7], 68: [30, 0.4] },
      falseAlarms: [40], et: d => d < 25 ? 3.8 : d < 65 ? 5.0 : 4.2, routineStart: 6, budget: 12, s0: 70, heat: null
    },
    heat: {
      title: 'Heat wave', blurb: 'Twelve very hot days (ET about 7.5 mm/day) in mid-season.',
      events: { 8: [25, 0.3], 30: [20, 0.4], 62: [30, 0.3], 80: [20, 0.5] },
      falseAlarms: [], et: d => (d >= 35 && d <= 46) ? 7.5 : (d < 25 ? 3.8 : 4.6), routineStart: 6, budget: 12, s0: 70, heat: [35, 46]
    }
  };

  function run(key, reliability, mode) {
    const sc = SCENARIOS[key];
    const rain = rainFrom(sc.events);
    const et = series(P.DAYS, sc.et);
    const detected = new Array(P.DAYS + 1).fill(false);
    Object.keys(sc.events).forEach(k => { const u = sc.events[k][1]; if (u >= 0 && u < reliability) detected[+k] = true; });
    const falseAlarm = new Array(P.DAYS + 1).fill(false);
    sc.falseAlarms.forEach(d => falseAlarm[d] = true);

    let S = sc.s0, budget = sc.budget;
    const out = { key, mode, S: [S], morningS: [S], rain, et, irrigation: new Array(P.DAYS + 1).fill(0), symbol: new Array(P.DAYS + 1).fill(''), alert: new Array(P.DAYS + 1).fill(''),
                  log: [], drained: 0, etaSum: 0, etcSum: 0, stressDays: 0, irrigations: 0 };
    for (let d = 1; d <= P.DAYS; d++) {
      const morning = S; out.morningS[d] = morning;
      let irrigate = false, note = '', symbol = '';
      if (mode === 'with') {
        const signal = detected[d] || falseAlarm[d];
        symbol = morning <= P.TRIGGER ? 'square' : morning <= P.WATCH ? 'triangle' : 'circle';
        if (signal && morning >= P.HOLD_MIN) {
          if (morning <= P.TRIGGER) { note = 'Rain signal: irrigation held'; }
          out.alert[d] = 'rain'; if (!note) note = '';
          if (morning <= P.TRIGGER) out.log.push([d, 'hold', 'Rain signal: irrigation held (soil water ' + Math.round(morning) + ' mm)']);
          else out.log.push([d, 'info', 'Rain signal: no irrigation needed']);
        } else if (morning <= P.TRIGGER && budget > 0) {
          irrigate = true; out.log.push([d, 'irrigate', 'IRRIGATE NOW (soil water ' + Math.round(morning) + ' mm)']);
        } else if (morning <= P.TRIGGER && budget <= 0) {
          out.log.push([d, 'dry', 'IRRIGATE NOW, but no water left']);
        }
        out.symbol[d] = symbol;
      } else {
        const sched = d >= sc.routineStart && ((d - sc.routineStart) % P.ROUTINE_INTERVAL === 0);
        const rainedYesterday = d > 1 && rain[d - 1] >= P.SKIP_IF_RAIN_YESTERDAY;
        if (sched && budget > 0 && !rainedYesterday) { irrigate = true; out.log.push([d, 'irrigate', 'Routine irrigation (every ' + P.ROUTINE_INTERVAL + ' days)']); }
        else if (sched && rainedYesterday) out.log.push([d, 'info', 'Routine irrigation skipped (rain yesterday)']);
      }
      let add = 0;
      if (irrigate) { add = P.IRR; budget--; out.irrigations++; out.irrigation[d] = P.IRR; }
      S = S + P.RAIN_EFF * rain[d] + add;
      if (S > P.AWC) { out.drained += S - P.AWC; S = P.AWC; }
      const ks = S >= P.CRIT ? 1 : S / P.CRIT;
      const eta = et[d] * ks;
      out.etcSum += et[d]; out.etaSum += eta;
      S = Math.max(0, S - eta);
      if (S < P.CRIT) out.stressDays++;
      out.S.push(S);
    }
    out.yieldProxy = 100 * out.etaSum / out.etcSum;
    out.waterUsed = out.irrigations * P.IRR;
    return out;
  }
  function compare(key, reliability) {
    const a = run(key, reliability, 'without'), b = run(key, reliability, 'with');
    return { without: a, with: b };
  }
  function summary(r) {
    return { irrigations: r.irrigations, waterUsed: r.waterUsed, drained: +r.drained.toFixed(6), stressDays: r.stressDays, yieldProxy: +r.yieldProxy.toFixed(6) };
  }
  return { P, SCENARIOS, run, compare, summary };
});
