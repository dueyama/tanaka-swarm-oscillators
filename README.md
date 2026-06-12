# Dan Tanaka's Swarm Oscillators

Interactive browser simulator for **Dan Tanaka's chemotactic / swarm oscillator** model.

The app explores the Tanaka reduced model through membrane / fruit-section candidates, PRL clustered clusters, RIMS phase-map landmarks, and exploratory fireworks-like motion. It is built as a static Canvas app, so it runs entirely in the browser with no backend, no account system, and no server-side simulation.

## What You Can Do

- Run luminous phase-colored particle simulations directly in the browser.
- Switch between Tanaka presets such as membrane / fruit-section, clustered clusters, fireworks explorer, and RIMS phase A-D.
- Adjust live parameters: `N`, `dt`, speed, trail settings, `c1`, `c2`, `c3`, `alpha`, `box L`, and `velocity cap`.
- Drag on the canvas to locally stir phase and velocity.
- Save a PNG snapshot from the current simulation.
- Open the equation and preset guide for rendered formulas, parameter notes, and preset-specific sample images.

The particle color encodes the oscillator phase. Dark trails show recent motion history. Faint neighbor lines are visual aids, not extra model interactions.

## Model Scope

The public app presents Dan Tanaka's chemotactic / swarm oscillator model. The simulated state is a set of moving oscillators with positions and internal phases. Nearby oscillators interact through exponentially decaying chemotactic coupling, with phase and motion controlled by the Tanaka parameters `c1`, `c2`, `c3`, and `alpha`.

The browser presets are not exhaustive reproductions of every reported state. They are practical entry points chosen to make the characteristic patterns visible at interactive frame rates.

## Run Locally

```bash
npm test
npm run dev
```

Open:

- Simulator: `http://127.0.0.1:5173/`
- Equation and preset guide: `http://127.0.0.1:5173/preset-guide.html`

Keyboard shortcuts:

- `Space`: pause / run
- `R`: reset
- `F`: fullscreen
- `S`: save PNG snapshot

## Build

```bash
npm run build
npm run preview
```

The static build is written to `dist/`.

## Project Layout

```text
package.json              root scripts for local use and static hosting builds
vercel.json               static hosting build configuration
index.html                simulator page
preset-guide.html         equation and preset guide
app.js                    Canvas runtime and controls
preset-guide.js           guide-page preview rendering
styles.css                app and guide styling
src/
  simulation.js           Tanaka RHS and diagnostics
  presets.js              preset and slider definitions
  i18n.js                 English / Japanese UI text
  vercel-analytics.js     Vercel Web Analytics loader
tests/
  simulation.test.mjs     sign-convention and smoke tests
scripts/
  build.mjs               static build script
  serve.mjs               local dev / preview server
```

## References

[1] D. Tanaka, "General chemotactic model of oscillators," *Physical Review Letters* 99, 134103, 2007.  
Source: <https://u-fukui.repo.nii.ac.jp/record/22564/files/GetPDFServlet.pdf>

[2] D. Tanaka and K. Iida, "Membrane pattern in a swarm oscillator model," *RIMS Kokyuroku* 1633, 2009.  
Source: <https://www.kurims.kyoto-u.ac.jp/~kyodo/kokyuroku/contents/pdf/1633-06.pdf>

[3] D. Tanaka, "Swarm oscillators," *Progress of Theoretical Physics Supplement* 178, 169-177, 2009.  
Source: <https://academic.oup.com/ptps/article-pdf/doi/10.1143/PTPS.178.169/5287835/178-169.pdf>
