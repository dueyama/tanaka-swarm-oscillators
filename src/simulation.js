import { TAU } from "./presets.js";

export function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

export function wrapPhase(value) {
  value %= TAU;
  return value < 0 ? value + TAU : value;
}

export function positiveMod(value, period) {
  value %= period;
  return value < 0 ? value + period : value;
}

export function minimumImage(delta, boxSize) {
  return delta - boxSize * Math.round(delta / boxSize);
}

export function makeRng(seed = 1) {
  let s = Math.trunc(seed) >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return function rand() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSystem(model, params) {
  if (model !== "tanaka") throw new Error(`Unsupported model: ${model}`);
  const n = Math.max(2, Math.round(params.n));
  const rand = makeRng(params.seed ?? 1);
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const phase = new Float64Array(n);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const dphase = new Float64Array(n);

  const L = params.boxSize ?? params.initScale ?? 10;
  for (let i = 0; i < n; i += 1) {
    x[i] = rand() * L;
    y[i] = rand() * L;
    phase[i] = rand() * TAU;
  }

  return { model, n, t: 0, x, y, phase, dx, dy, dphase };
}

function clearDerivatives(system) {
  system.dx.fill(0);
  system.dy.fill(0);
  system.dphase.fill(0);
}

export function stepTanaka(system, params) {
  const { n, x, y, phase, dx, dy, dphase } = system;
  clearDerivatives(system);
  const c1 = params.c1 ?? 1.3;
  const c2 = params.c2 ?? 3.0;
  const c3 = params.c3 ?? 0.02;
  const alpha = params.alpha ?? 0.0;
  const L = params.boxSize ?? 10;
  const periodic = params.periodic !== false;
  const eps = 1e-9;

  for (let i = 0; i < n; i += 1) {
    const xi = x[i];
    const yi = y[i];
    const pi = phase[i];
    let vxi = 0;
    let vyi = 0;
    let wi = 0;

    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      let rx = x[j] - xi;
      let ry = y[j] - yi;
      if (periodic) {
        rx = minimumImage(rx, L);
        ry = minimumImage(ry, L);
      }
      const r2 = rx * rx + ry * ry;
      if (r2 <= eps) continue;
      const r = Math.sqrt(r2);
      const psi = phase[j] - pi;
      const weight = Math.exp(-r);
      wi += weight * Math.sin(psi + alpha * r - c1);
      const spatial = c3 * weight * Math.sin(psi + alpha * r - c2) / r;
      vxi += rx * spatial;
      vyi += ry * spatial;
    }

    dphase[i] = wi;
    dx[i] = vxi;
    dy[i] = vyi;
  }

  integrate(system, params.dt ?? 0.04, params.velocityClamp ?? 4.0, (idx) => {
    phase[idx] = wrapPhase(phase[idx]);
    if (periodic) {
      x[idx] = positiveMod(x[idx], L);
      y[idx] = positiveMod(y[idx], L);
    }
  });
}

function integrate(system, dt, velocityClamp, afterParticle) {
  const { n, x, y, phase, dx, dy, dphase } = system;
  for (let i = 0; i < n; i += 1) {
    let vx = dx[i];
    let vy = dy[i];
    const speed = Math.hypot(vx, vy);
    if (Number.isFinite(velocityClamp) && velocityClamp > 0 && speed > velocityClamp) {
      const scale = velocityClamp / speed;
      vx *= scale;
      vy *= scale;
    }
    x[i] += dt * vx;
    y[i] += dt * vy;
    phase[i] += dt * dphase[i];
    afterParticle(i);
  }
  system.t += dt;
}

export function stepSystem(system, params) {
  stepTanaka(system, params);
}

export function diagnostics(system, params = {}) {
  const { n, x, y, phase } = system;
  let sx = 0;
  let sy = 0;
  let c = 0;
  let s = 0;
  for (let i = 0; i < n; i += 1) {
    sx += x[i];
    sy += y[i];
    c += Math.cos(phase[i]);
    s += Math.sin(phase[i]);
  }
  const cx = sx / n;
  const cy = sy / n;
  let rr = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - cx;
    const dy = y[i] - cy;
    rr += dx * dx + dy * dy;
  }
  const order = Math.hypot(c, s) / n;
  const radius = Math.sqrt(rr / n);
  const meanNearest = nearestNeighborDistance(system, params);
  const phaseVariance = 1 - order;
  return {
    order,
    radius,
    meanNearest,
    phaseVariance,
    t: system.t,
    boxSize: params.boxSize ?? null,
  };
}

function nearestNeighborDistance(system, params) {
  const { n, x, y } = system;
  if (n < 2) return 0;
  const periodic = params.periodic !== false && Number.isFinite(params.boxSize);
  const L = params.boxSize ?? 10;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    let best = Infinity;
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      let rx = x[j] - x[i];
      let ry = y[j] - y[i];
      if (periodic) {
        rx = minimumImage(rx, L);
        ry = minimumImage(ry, L);
      }
      const r2 = rx * rx + ry * ry;
      if (r2 < best) best = r2;
    }
    total += Math.sqrt(best);
  }
  return total / n;
}

export function applyStir(system, params, point, strength) {
  if (!point || strength <= 0) return;
  const { n, x, y, phase } = system;
  const L = params.boxSize ?? params.viewScale ?? 10;
  const radius = L * 0.18;
  const invR2 = 1 / Math.max(radius * radius, 1e-6);
  for (let i = 0; i < n; i += 1) {
    let rx = x[i] - point.x;
    let ry = y[i] - point.y;
    if (params.periodic !== false) {
      rx = minimumImage(rx, L);
      ry = minimumImage(ry, L);
    }
    const r2 = rx * rx + ry * ry;
    const falloff = Math.exp(-r2 * invR2);
    if (falloff < 0.002) continue;
    const angle = Math.atan2(ry, rx);
    const impulse = strength * falloff;
    phase[i] = wrapPhase(phase[i] + 0.12 * impulse * Math.sin(angle + system.t));
    const push = 0.006 * impulse * L;
    x[i] += -Math.sin(angle) * push;
    y[i] += Math.cos(angle) * push;
    if (params.periodic !== false) {
      x[i] = positiveMod(x[i], L);
      y[i] = positiveMod(y[i], L);
    }
  }
}

export function cloneParams(params) {
  return JSON.parse(JSON.stringify(params));
}

export function serializeState(system, params) {
  return {
    model: system.model,
    t: system.t,
    params: cloneParams(params),
    x: Array.from(system.x),
    y: Array.from(system.y),
    phase: Array.from(system.phase),
  };
}
