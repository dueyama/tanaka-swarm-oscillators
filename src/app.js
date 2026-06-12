import { COMMON_CONTROLS, MODEL_CONTROLS, MODEL_META, PRESETS, PUBLIC_MODEL } from "./presets.js";
import { applyStir, cloneParams, createSystem, diagnostics, serializeState, stepSystem } from "./simulation.js";
import {
  controlText,
  hrefWithLanguage,
  persistLanguageMode,
  presetText,
  readInitialLanguageMode,
  resolveLanguage,
  setupLanguageControl,
  syncLanguageControl,
  syncLanguageUrl,
  text,
} from "./i18n.js";

const canvas = document.getElementById("mainCanvas");
const trailCanvas = document.getElementById("trailCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const trailCtx = trailCanvas.getContext("2d", { alpha: true });

const ui = {
  appStage: document.getElementById("appStage"),
  simSurface: document.getElementById("simSurface"),
  presetSelect: document.getElementById("presetSelect"),
  presetSelectLabel: document.getElementById("presetSelectLabel"),
  presetGuide: document.getElementById("presetGuide"),
  modelStory: document.getElementById("modelStory"),
  modelControlTitle: document.getElementById("modelControlTitle"),
  modelControlMeta: document.getElementById("modelControlMeta"),
  commonSectionTitle: document.getElementById("commonSectionTitle"),
  commonSectionMeta: document.getElementById("commonSectionMeta"),
  panelReferencesTitle: document.getElementById("panelReferencesTitle"),
  panelReferencesMeta: document.getElementById("panelReferencesMeta"),
  commonControls: document.getElementById("commonControls"),
  modelControls: document.getElementById("modelControls"),
  languageSwitch: document.getElementById("languageSwitch"),
  controlPanel: document.getElementById("controlPanel"),
  toggleRun: document.getElementById("toggleRun"),
  resetRun: document.getElementById("resetRun"),
  snapshot: document.getElementById("snapshot"),
  fullscreen: document.getElementById("fullscreen"),
  diagOrderLabel: document.getElementById("diagOrderLabel"),
  diagNearestLabel: document.getElementById("diagNearestLabel"),
  diagPhaseVarianceLabel: document.getElementById("diagPhaseVarianceLabel"),
  diagRadiusLabel: document.getElementById("diagRadiusLabel"),
  diagTimeLabel: document.getElementById("diagTimeLabel"),
  diagFpsLabel: document.getElementById("diagFpsLabel"),
  orderValue: document.getElementById("orderValue"),
  nearestValue: document.getElementById("nearestValue"),
  phaseVarianceValue: document.getElementById("phaseVarianceValue"),
  radiusValue: document.getElementById("radiusValue"),
  timeValue: document.getElementById("timeValue"),
  fpsValue: document.getElementById("fpsValue"),
  hudTitle: document.getElementById("hudTitle"),
  hudEquation: document.getElementById("hudEquation"),
  phaseLegend: document.getElementById("phaseLegend"),
};

const state = {
  model: PUBLIC_MODEL,
  presetId: "tanaka_membrane",
  languageMode: "auto",
  language: "en",
  params: {},
  system: null,
  running: true,
  dpr: 1,
  width: 1,
  height: 1,
  camera: { centerX: 0, centerY: 0, scale: 1, worldCx: 0, worldCy: 0, span: 10 },
  pointer: { active: false, x: 0, y: 0, world: null },
  frameCount: 0,
  fpsLastTime: performance.now(),
  fpsFrames: 0,
  fps: 0,
  lastDiag: 0,
};

function init() {
  state.languageMode = readInitialLanguageMode();
  state.language = resolveLanguage(state.languageMode);
  setupLanguageControl(ui.languageSwitch, state.languageMode, setLanguageMode);
  renderStaticLanguage();

  const requestedPreset = new URLSearchParams(window.location.search).get("preset");
  const initialPreset = PRESETS[PUBLIC_MODEL].some((preset) => preset.id === requestedPreset) ? requestedPreset : "tanaka_membrane";
  loadPreset(PUBLIC_MODEL, initialPreset);
  installEvents();
  resize();
  requestAnimationFrame(loop);
}

function populatePresetSelect(model, selectedId) {
  ui.presetSelect.innerHTML = "";
  for (const preset of PRESETS[model]) {
    const opt = document.createElement("option");
    opt.value = preset.id;
    opt.textContent = presetText(preset, state.language).label;
    ui.presetSelect.appendChild(opt);
  }
  ui.presetSelect.value = selectedId;
}

function loadPreset(model, presetId) {
  const preset = PRESETS[model].find((p) => p.id === presetId) ?? PRESETS[model][0];
  state.model = model;
  state.presetId = preset.id;
  state.params = cloneParams(preset.params);
  state.system = createSystem(model, state.params);
  state.camera.scale = 1;
  populatePresetSelect(model, preset.id);
  renderMeta(preset);
  renderControls();
  updateGuideLink(preset.id);
  hardClear();
}

function guideHref(presetId) {
  return hrefWithLanguage(`preset-guide.html?preset=${encodeURIComponent(presetId)}`, state.languageMode);
}

function updateGuideLink(presetId) {
  if (!ui.presetGuide) return;
  ui.presetGuide.href = guideHref(presetId);
}

function renderMeta(preset) {
  const meta = MODEL_META[state.model];
  const localizedPreset = presetText(preset, state.language);
  renderModelStory(preset.id);
  ui.modelControlTitle.textContent = text(state.language).simulator.tanakaControlTitle ?? meta.controlTitle;
  ui.hudTitle.textContent = localizedPreset.label;
  renderHudEquation(meta);
}

function renderModelStory(presetId) {
  const copy = text(state.language).simulator;
  ui.modelStory.innerHTML = "";
  ui.modelStory.appendChild(document.createTextNode(copy.storyPrefix));
  const link = document.createElement("a");
  link.className = "story-link";
  link.href = guideHref(presetId);
  link.textContent = copy.storyLink;
  ui.modelStory.appendChild(link);
  ui.modelStory.appendChild(document.createTextNode(copy.storySuffix));
}

const CONTROL_LABELS = {
  n: "<i>N</i>",
  dt: "&Delta;<i>t</i>",
  c1: "<i>c</i><sub>1</sub>",
  c2: "<i>c</i><sub>2</sub>",
  c3: "<i>c</i><sub>3</sub>",
  alpha: "<i>&alpha;</i>",
};

const INLINE_FORMULAS = {
  "N²": "<i>N</i><sup>2</sup>",
  c1: "<i>c</i><sub>1</sub>",
  c2: "<i>c</i><sub>2</sub>",
  c3: "<i>c</i><sub>3</sub>",
  alpha: "<i>&alpha;</i>",
  dt: "&Delta;<i>t</i>",
};

function appendFormula(element, html) {
  const span = document.createElement("span");
  span.className = "formula";
  span.innerHTML = html;
  element.appendChild(span);
}

function appendRenderedText(element, text) {
  const tokenPattern = /N²|\bc1\b|\bc2\b|\bc3\b|\balpha\b|\bdt\b/g;
  let cursor = 0;
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index > cursor) element.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    appendFormula(element, INLINE_FORMULAS[match[0]]);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) element.appendChild(document.createTextNode(text.slice(cursor)));
}

function appendControlLabel(element, spec) {
  if (spec.key === "boxSize") {
    element.appendChild(document.createTextNode("box "));
    appendFormula(element, "<i>L</i>");
    return;
  }

  const formula = CONTROL_LABELS[spec.key];
  if (formula) {
    appendFormula(element, formula);
  } else {
    element.textContent = spec.label;
  }
}

function renderHudEquation(meta) {
  const copy = text(state.language).simulator;
  ui.hudEquation.innerHTML = "";
  if (state.model === "tanaka") {
    appendFormula(ui.hudEquation, "<i>d</i><i>&psi;</i>");
    ui.hudEquation.appendChild(document.createTextNode(", "));
    appendFormula(ui.hudEquation, "<i>d</i><i>r</i>");
    ui.hudEquation.appendChild(document.createTextNode(copy.hudEquationFrom));
    appendFormula(ui.hudEquation, "<i>e</i><sup>-|<i>R</i>|</sup>");
    ui.hudEquation.appendChild(document.createTextNode(copy.hudEquationTail));
  } else {
    appendRenderedText(ui.hudEquation, meta.equation);
  }
}

function formatValue(value, format) {
  if (format === "int") return String(Math.round(value));
  if (format === "fixed1") return Number(value).toFixed(1);
  if (format === "fixed2") return Number(value).toFixed(2);
  if (format === "fixed3") return Number(value).toFixed(3);
  return String(value);
}

function renderControls() {
  ui.commonControls.innerHTML = "";
  ui.modelControls.innerHTML = "";
  for (const spec of COMMON_CONTROLS) ui.commonControls.appendChild(createSlider(controlText(spec, state.language)));
  for (const spec of MODEL_CONTROLS[state.model]) ui.modelControls.appendChild(createSlider(controlText(spec, state.language)));
}

function createSlider(spec) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const name = document.createElement("span");
  name.className = "control-name";
  appendControlLabel(name, spec);
  const value = document.createElement("span");
  value.className = "control-value";
  value.textContent = formatValue(state.params[spec.key], spec.format);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  input.value = String(state.params[spec.key]);
  const hint = document.createElement("p");
  hint.className = "control-hint";
  appendRenderedText(hint, spec.hint);

  input.addEventListener("input", () => {
    let next = Number(input.value);
    if (spec.format === "int") next = Math.round(next);
    state.params[spec.key] = next;
    value.textContent = formatValue(next, spec.format);
    if (spec.key === "boxSize" && state.model === "tanaka") {
      state.params.viewScale = next;
    }
    if (spec.resets || spec.key === "n") resetSystem();
  });

  wrap.append(name, value, input, hint);
  return wrap;
}

function resetSystem() {
  state.system = createSystem(state.model, state.params);
  state.camera.scale = 1;
  hardClear();
}

function installEvents() {
  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window && ui.simSurface) {
    const observer = new ResizeObserver(resize);
    observer.observe(ui.simSurface);
  }

  ui.presetSelect.addEventListener("change", () => {
    loadPreset(state.model, ui.presetSelect.value);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("preset", ui.presetSelect.value);
    nextUrl.searchParams.set("lang", state.languageMode);
    window.history.replaceState(null, "", nextUrl);
  });

  ui.toggleRun.addEventListener("click", () => toggleRun());
  ui.resetRun.addEventListener("click", () => resetSystem());
  ui.snapshot.addEventListener("click", () => saveSnapshot());
  ui.fullscreen.addEventListener("click", () => toggleFullscreen());

  window.addEventListener("keydown", (event) => {
    if (event.target && ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggleRun();
    } else if (event.key.toLowerCase() === "r") {
      resetSystem();
    } else if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    } else if (event.key.toLowerCase() === "s") {
      saveSnapshot();
    }
  });

  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", endPointer);
}

function toggleRun() {
  state.running = !state.running;
  renderRunButton();
}

function setLanguageMode(mode) {
  state.languageMode = mode;
  state.language = resolveLanguage(mode);
  persistLanguageMode(mode);
  syncLanguageUrl(mode);
  syncLanguageControl(ui.languageSwitch, mode);
  renderStaticLanguage();
  if (state.system) {
    const preset = PRESETS[state.model].find((p) => p.id === state.presetId) ?? PRESETS[state.model][0];
    populatePresetSelect(state.model, state.presetId);
    renderMeta(preset);
    renderControls();
    updateGuideLink(state.presetId);
  }
}

function renderStaticLanguage() {
  const copy = text(state.language);
  document.documentElement.lang = state.language;
  document.title = copy.simulator.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", copy.simulator.description);
  ui.appStage?.setAttribute("aria-label", copy.simulator.stageAria);
  canvas.setAttribute("aria-label", copy.simulator.canvasAria);
  ui.controlPanel?.setAttribute("aria-label", copy.simulator.panelAria);
  ui.languageSwitch.setAttribute("aria-label", copy.language.label);
  ui.presetSelectLabel.textContent = copy.simulator.preset;
  ui.presetGuide.textContent = copy.simulator.guideLink;
  ui.resetRun.textContent = copy.simulator.reset;
  ui.snapshot.textContent = copy.simulator.snapshot;
  ui.fullscreen.setAttribute("aria-label", copy.simulator.fullscreen);
  ui.commonSectionTitle.textContent = copy.simulator.common;
  ui.commonSectionMeta.textContent = copy.simulator.liveControls;
  ui.modelControlMeta.textContent = copy.simulator.equationParameters;
  ui.panelReferencesTitle.textContent = copy.simulator.references;
  ui.panelReferencesMeta.textContent = copy.simulator.papers;
  ui.diagOrderLabel.textContent = copy.simulator.diag.order;
  ui.diagNearestLabel.textContent = copy.simulator.diag.nn;
  ui.diagPhaseVarianceLabel.textContent = copy.simulator.diag.phaseVariance;
  ui.diagRadiusLabel.textContent = copy.simulator.diag.radius;
  ui.diagTimeLabel.textContent = copy.simulator.diag.t;
  ui.diagFpsLabel.textContent = copy.simulator.diag.fps;
  ui.phaseLegend.innerHTML = copy.simulator.phaseLegend;
  renderRunButton();
}

function renderRunButton() {
  const copy = text(state.language).simulator;
  ui.toggleRun.textContent = state.running ? copy.pause : copy.run;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function onPointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.active = event.buttons === 1 || event.type === "pointerdown";
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.world = screenToWorld(state.pointer.x, state.pointer.y);
}

function endPointer() {
  state.pointer.active = false;
  state.pointer.world = null;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = (ui.simSurface ?? canvas).getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || window.innerWidth));
  const height = Math.max(1, Math.round(rect.height || window.innerHeight));
  state.dpr = dpr;
  state.width = width;
  state.height = height;
  for (const c of [canvas, trailCanvas]) {
    c.width = Math.floor(state.width * dpr);
    c.height = Math.floor(state.height * dpr);
    c.style.width = `${state.width}px`;
    c.style.height = `${state.height}px`;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hardClear();
}

function hardClear() {
  trailCtx.save();
  trailCtx.setTransform(1, 0, 0, 1, 0, 0);
  trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  trailCtx.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function loop(now) {
  if (state.running && state.system) {
    if (state.pointer.active && state.pointer.world) {
      applyStir(state.system, state.params, state.pointer.world, state.params.stirStrength ?? 0);
    }
    const steps = Math.max(1, Math.round(state.params.stepsPerFrame ?? 1));
    for (let k = 0; k < steps; k += 1) stepSystem(state.system, state.params);
  }

  draw(now);
  updateFps(now);
  if (now - state.lastDiag > 150) {
    updateDiagnostics();
    state.lastDiag = now;
  }
  requestAnimationFrame(loop);
}

function updateFps(now) {
  state.fpsFrames += 1;
  const elapsed = now - state.fpsLastTime;
  if (elapsed >= 500) {
    state.fps = (state.fpsFrames * 1000) / elapsed;
    state.fpsFrames = 0;
    state.fpsLastTime = now;
    ui.fpsValue.textContent = String(Math.round(state.fps));
  }
}

function updateDiagnostics() {
  const d = diagnostics(state.system, state.params);
  ui.orderValue.textContent = d.order.toFixed(3);
  ui.nearestValue.textContent = d.meanNearest.toFixed(3);
  ui.phaseVarianceValue.textContent = d.phaseVariance.toFixed(3);
  ui.radiusValue.textContent = d.radius.toFixed(3);
  ui.timeValue.textContent = d.t.toFixed(2);
}

function computeCamera() {
  const desktopPanel = state.width > 940 ? 430 : 0;
  const viewW = Math.max(220, state.width - desktopPanel);
  const viewH = state.height;
  const centerX = viewW * 0.5;
  const centerY = viewH * 0.52;
  const sys = state.system;
  let worldCx = 0;
  let worldCy = 0;
  let span = state.params.viewScale ?? state.params.boxSize ?? 10;

  if (state.model === "tanaka") {
    const L = state.params.boxSize ?? 10;
    worldCx = L / 2;
    worldCy = L / 2;
    span = L;
  } else {
    for (let i = 0; i < sys.n; i += 1) {
      worldCx += sys.x[i];
      worldCy += sys.y[i];
    }
    worldCx /= sys.n;
    worldCy /= sys.n;
    let maxR = 0;
    for (let i = 0; i < sys.n; i += 1) {
      maxR = Math.max(maxR, Math.hypot(sys.x[i] - worldCx, sys.y[i] - worldCy));
    }
    span = Math.max(state.params.viewScale ?? 4, maxR * 2.35, 1);
  }

  const targetScale = (Math.min(viewW, viewH) * 0.78) / span;
  const blend = state.camera.scale === 1 ? 1 : 0.08;
  state.camera = {
    centerX,
    centerY,
    scale: state.camera.scale * (1 - blend) + targetScale * blend,
    worldCx,
    worldCy,
    span,
  };
}

function worldToScreen(x, y) {
  const cam = state.camera;
  return {
    x: cam.centerX + (x - cam.worldCx) * cam.scale,
    y: cam.centerY + (y - cam.worldCy) * cam.scale,
  };
}

function screenToWorld(px, py) {
  const cam = state.camera;
  return {
    x: (px - cam.centerX) / cam.scale + cam.worldCx,
    y: (py - cam.centerY) / cam.scale + cam.worldCy,
  };
}

function draw(now) {
  if (!state.system) return;
  computeCamera();
  fadeTrails();
  drawNebula(now);
  drawLinks();
  drawPeriodicBox();
  drawParticles();
  if (state.pointer.active) drawPointer();
  state.frameCount += 1;
}

function fadeTrails() {
  trailCtx.save();
  trailCtx.globalCompositeOperation = "source-over";
  trailCtx.fillStyle = `rgba(3, 7, 18, ${state.params.trailFade ?? 0.08})`;
  trailCtx.fillRect(0, 0, state.width, state.height);
  trailCtx.restore();

  ctx.clearRect(0, 0, state.width, state.height);
}

function drawNebula(now) {
  const t = now * 0.00008;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const gradients = [
    [0.18 + 0.04 * Math.sin(t * 2.1), 0.24 + 0.04 * Math.cos(t * 1.7), "rgba(94,231,255,0.045)"],
    [0.64 + 0.05 * Math.sin(t * 1.4 + 2), 0.35 + 0.05 * Math.cos(t * 1.9), "rgba(255,99,216,0.038)"],
    [0.48 + 0.04 * Math.cos(t * 1.8), 0.75 + 0.03 * Math.sin(t * 1.2), "rgba(140,255,176,0.034)"],
  ];
  for (const [gx, gy, color] of gradients) {
    const r = Math.max(state.width, state.height) * 0.46;
    const grad = ctx.createRadialGradient(state.width * gx, state.height * gy, 0, state.width * gx, state.height * gy, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.width, state.height);
  }
  ctx.restore();
}

function phaseHue(phase) {
  return ((phase / (Math.PI * 2)) * 360 + 360) % 360;
}

function particleScreenPosition(i) {
  return worldToScreen(state.system.x[i], state.system.y[i]);
}

function drawLinks() {
  const sys = state.system;
  const n = sys.n;
  if (n > 280) return;
  const maxLines = n > 170 ? 750 : 1300;
  const distanceLimit = 70;
  let lines = 0;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < n && lines < maxLines; i += 1) {
    const pi = particleScreenPosition(i);
    for (let j = i + 1; j < n && lines < maxLines; j += n > 160 ? 2 : 1) {
      const pj = particleScreenPosition(j);
      const dx = pj.x - pi.x;
      const dy = pj.y - pi.y;
      const dist = Math.hypot(dx, dy);
      if (dist > distanceLimit || dist < 2) continue;
      const phaseAffinity = 0.5 + 0.5 * Math.cos(sys.phase[j] - sys.phase[i]);
      const alpha = (1 - dist / distanceLimit) * (0.04 + 0.13 * phaseAffinity);
      const hue = phaseHue((sys.phase[i] + sys.phase[j]) * 0.5);
      ctx.strokeStyle = `hsla(${hue}, 96%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(pi.x, pi.y);
      ctx.lineTo(pj.x, pj.y);
      ctx.stroke();
      lines += 1;
    }
  }
  ctx.restore();
}

function drawPeriodicBox() {
  const L = state.params.boxSize ?? 10;
  const a = worldToScreen(0, 0);
  const b = worldToScreen(L, L);
  ctx.save();
  ctx.strokeStyle = "rgba(226,241,255,0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 10]);
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.restore();
}

function drawParticles() {
  const sys = state.system;
  const n = sys.n;
  const size = state.params.particleSize ?? 3.2;
  const trailGain = state.params.trailGain ?? 0.8;

  trailCtx.save();
  trailCtx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i += 1) {
    const p = particleScreenPosition(i);
    const hue = phaseHue(sys.phase[i]);
    const r = size * 1.15;
    trailCtx.fillStyle = `hsla(${hue}, 100%, 62%, ${0.16 * trailGain})`;
    trailCtx.beginPath();
    trailCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    trailCtx.fill();
  }
  trailCtx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i += 1) {
    const p = particleScreenPosition(i);
    const hue = phaseHue(sys.phase[i]);
    const pulse = 1 + 0.22 * Math.sin(sys.phase[i] + sys.t * 0.8);
    const glow = size * (3.1 + 0.7 * pulse);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
    grad.addColorStop(0, `hsla(${hue}, 100%, 72%, 0.66)`);
    grad.addColorStop(0.32, `hsla(${hue}, 100%, 58%, 0.22)`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < n; i += 1) {
    const p = particleScreenPosition(i);
    const hue = phaseHue(sys.phase[i]);
    ctx.fillStyle = `hsl(${hue}, 100%, 66%)`;
    ctx.strokeStyle = `hsla(${hue}, 100%, 86%, 0.78)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPointer() {
  const { x, y } = state.pointer;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const r = 80 + 18 * Math.sin(state.system.t * 6);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, "rgba(255,255,255,0.26)");
  grad.addColorStop(0.35, "rgba(94,231,255,0.12)");
  grad.addColorStop(1, "rgba(94,231,255,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function saveSnapshot() {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const outCtx = out.getContext("2d");
  outCtx.drawImage(trailCanvas, 0, 0);
  outCtx.drawImage(canvas, 0, 0);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const a = document.createElement("a");
  a.download = `dan-tanaka-swarm-oscillator-${stamp}.png`;
  a.href = out.toDataURL("image/png");
  a.click();

  // Also expose JSON in the console for reproducibility without adding backend storage.
  console.info("Dan Tanaka's Swarm Oscillators snapshot state", serializeState(state.system, state.params));
}

init();
