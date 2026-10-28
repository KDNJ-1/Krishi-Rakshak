# Krishi-Rakshak: concept simulator

**Offline, zero-UI soil and micro-climate station for small farms.** This repository is the *concept-stage* evidence for the Seva First Innovation Challenge: a runnable simulation of **a farmer without the station vs. the same farmer with it**, under the same rain and the same limited water.

> **Honest status: concept, not prototype.** Everything here is a model with stated assumptions. It is not measured field data and makes no claim of proven savings. Its purpose is to show the decision logic and to define exactly what a pilot must measure.

**Live demo:** enable GitHub Pages (Settings > Pages > Deploy from branch > `main` / root). The demo is `index.html`; add `?s=drought` (or `normal`, `storm`, `heat`) to open a scenario directly.

## What it shows
| Scenario | Without station | With station |
|---|---|---|
| Normal season | Fixed 8-day routine, irrigates before rain | Irrigates only when soil water is low, holds when rain signal arrives |
| Drought spell (7 irrigations of water) | Water spent on schedule, runs dry in the long spell | Water spent when roots need it; fewer stress days |
| Heavy rain on the way | Irrigates the day before a 70 mm storm; water drains away | Rain signal holds irrigation |
| Heat wave | Routine every 8 days; 2 stress days, drains 89 mm | Soil probe shows depletion; 0 stress days, fewer irrigations |

The "rain signal" is modelled with a **reliability slider**: at 0% the station never warns and it behaves like threshold-only irrigation. One false alarm is built into some scenarios so the failure mode is visible. Unreliable alerts are part of the story, not hidden.

## What the model says (and does not)
In these scripted scenarios most of the saving comes from **soil-based thresholds** (e.g. normal season: 6 vs 11 irrigations; drought: 98% vs 91% yield proxy with the same water). The **rain signal adds a smaller gain** (e.g. storm scenario: drainage falls from 58 mm to 45 mm at 90% reliability) and its real skill is unvalidated. See `results/summary.csv`.

## Model (daily soil-water bucket)
`S(t+1) = S + 0.9 x rain + irrigation - ET x Ks`, capped at 100 mm (excess drains). `Ks = min(1, S/35)`. Yield proxy = sum of actual ET / sum of potential ET. All parameters are at the top of `model.js` / `python/model.py`.

## Run
```
python3 python/run_all.py      # writes results/summary.csv
python3 tests/test_parity.py   # checks Python and JavaScript give identical numbers (needs Node)
```
Open `index.html` in any browser. No build step, no dependencies.

## From concept to proof of concept
1. **Bench calibration.** Capacitive probe vs. oven-dry gravimetric samples from 3 local soils (black cotton, medium, light). Output: calibration curve and error in % volumetric water.
2. **Breadboard station.** ESP32 + capacitive probes (two depths) + tipping-bucket rain gauge + air temperature; log every 15 minutes for 4-6 weeks on one plot.
3. **Side-by-side check.** Compare logged rain and temperature with the nearest government weather station; report agreement and gaps.
4. **Replace assumptions with data.** Re-run this simulator with measured thresholds; test whether a pressure-fall trigger really predicts rain locally (report precision and false-alarm rate).
5. **Usability test.** Paper prototype of circle/triangle/square symbols and Marathi/Ahirani voice with 15-20 farmers; report comprehension rate.
6. **Pilot.** Small cluster, farmer-owned or FPO-shared stations; compare irrigation count and water use against matched plots.

## Limits
Single-crop, single-soil bucket; no runoff, no salinity, no crop stage detail; rain events are scripted; ET values are round illustrative numbers. Forecast skill of a low-cost station is unvalidated.

## Files
`index.html` demo, `model.js` model, `python/` mirror and batch runner, `tests/` parity test, `results/` sample outputs and screenshots.
