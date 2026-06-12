import assert from "node:assert/strict";
import { createSystem, diagnostics, stepTanaka } from "../src/simulation.js";

function twoParticleSystem(phase0, phase1, separation) {
  return {
    model: "test",
    n: 2,
    t: 0,
    x: new Float64Array([0, separation]),
    y: new Float64Array([0, 0]),
    phase: new Float64Array([phase0, phase1]),
    dx: new Float64Array(2),
    dy: new Float64Array(2),
    dphase: new Float64Array(2),
  };
}

function nearly(actual, expected, tol, label) {
  const err = Math.abs(actual - expected);
  assert.ok(err <= tol, `${label}: expected ${expected}, got ${actual}, err=${err}`);
}

{
  const psi0 = 0.21;
  const psi1 = 1.08;
  const R = 1.7;
  const c1 = 0.64;
  const dt = 1e-5;
  const sys = twoParticleSystem(psi0, psi1, R);
  stepTanaka(sys, { c1, c2: 0, c3: 0, alpha: 0, dt, periodic: false, velocityClamp: 100 });
  const measured = ((sys.phase[1] - sys.phase[0]) - (psi1 - psi0)) / dt;
  const expected = -2 * Math.exp(-R) * Math.sin(psi1 - psi0) * Math.cos(c1);
  nearly(measured, expected, 1e-6, "Tanaka two-particle phase-difference sign convention");
}

{
  const a = createSystem("tanaka", { n: 16, seed: 123, boxSize: 10 });
  const b = createSystem("tanaka", { n: 16, seed: 123, boxSize: 10 });
  assert.deepEqual(Array.from(a.x), Array.from(b.x), "seeded x coordinates are reproducible");
  assert.deepEqual(Array.from(a.phase), Array.from(b.phase), "seeded phases are reproducible");
}

{
  const sys = {
    model: "tanaka",
    n: 2,
    t: 0,
    x: new Float64Array([0.1, 9.9]),
    y: new Float64Array([0, 0]),
    phase: new Float64Array([0, Math.PI]),
    dx: new Float64Array(2),
    dy: new Float64Array(2),
    dphase: new Float64Array(2),
  };
  const d = diagnostics(sys, { boxSize: 10, periodic: true });
  nearly(d.meanNearest, 0.2, 1e-12, "Tanaka diagnostic nearest-neighbor distance uses minimum image");
  nearly(d.phaseVariance, 1, 1e-12, "phase variance is circular variance 1 - order");
}

console.log("simulation tests passed");
