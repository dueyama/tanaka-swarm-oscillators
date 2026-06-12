import { PRESETS, PUBLIC_MODEL } from "./src/presets.js";
import { createSystem, stepSystem } from "./src/simulation.js";
import {
  applyStaticTranslations,
  hrefWithLanguage,
  persistLanguageMode,
  presetText,
  readInitialLanguageMode,
  resolveLanguage,
  setupLanguageControl,
  syncLanguageControl,
  syncLanguageUrl,
  text,
} from "./src/i18n.js";

const grid = document.getElementById("presetGuideGrid");
const presets = PRESETS[PUBLIC_MODEL];
const previewJobs = [];
const ui = {
  languageSwitch: document.getElementById("languageSwitch"),
  guideBack: document.getElementById("guideBack"),
};

const languageState = {
  mode: readInitialLanguageMode(),
  lang: "en",
};

let previewRenderSerial = 0;

const PREVIEW_SPECS = {
  tanaka_membrane: { steps: 520, drawEvery: 4 },
  tanaka_clustered_clusters: { steps: 620, drawEvery: 3 },
  tanaka_fireworks: { steps: 560, drawEvery: 3 },
  tanaka_magnetic_membrane: { steps: 620, drawEvery: 4 },
  tanaka_rims_phase_a: { steps: 460, drawEvery: 4 },
  tanaka_rims_phase_b: { steps: 460, drawEvery: 4 },
  tanaka_rims_phase_c: { steps: 460, drawEvery: 4 },
  tanaka_rims_phase_d: { steps: 460, drawEvery: 4 },
};

const PARAMETER_SPECS = [
  { label: "<i>N</i>", value: (params) => params.n },
  { label: "&Delta;<i>t</i>", value: (params) => params.dt },
  { label: "<i>c</i><sub>1</sub>", value: (params) => params.c1 },
  { label: "<i>c</i><sub>2</sub>", value: (params) => params.c2 },
  { label: "<i>c</i><sub>3</sub>", value: (params) => params.c3 },
  { label: "<i>&alpha;</i>", value: (params) => params.alpha },
  { label: "<i>L</i>", value: (params) => params.boxSize },
];

function appendParameterList(element, params) {
  for (const spec of PARAMETER_SPECS) {
    const rawValue = spec.value(params);
    if (rawValue === undefined || rawValue === null) continue;
    const item = document.createElement("span");
    item.className = "param-equation";

    const label = document.createElement("span");
    label.className = "formula";
    label.innerHTML = spec.label;

    const equals = document.createElement("span");
    equals.className = "param-equals";
    equals.textContent = "=";

    const value = document.createElement("span");
    value.className = "param-value";
    value.textContent = formatNumber(spec.value(params));

    item.append(label, equals, value);
    element.appendChild(item);
  }
}

function appendPaperParameterList(element, paperParams) {
  if (!paperParams) return;
  appendParameterList(element, {
    n: paperParams.n,
    dt: paperParams.dt,
    c1: paperParams.c1,
    c2: paperParams.c2,
    c3: paperParams.c3,
    alpha: paperParams.alpha,
    boxSize: paperParams.L,
  });
}

function appendParameterBlock(parent, label, className, fill) {
  const block = document.createElement("div");
  block.className = `param-block ${className}`;
  const title = document.createElement("span");
  title.className = "param-block-title";
  title.textContent = label;
  const values = document.createElement("div");
  values.className = "param-block-values";
  fill(values);
  block.append(title, values);
  parent.appendChild(block);
}

function appendPreviewCaption(element, n) {
  element.appendChild(document.createTextNode(text(languageState.lang).guide.previewCaptionPrefix));
  const label = document.createElement("span");
  label.className = "formula";
  label.innerHTML = "<i>N</i>";
  const equals = document.createElement("span");
  equals.className = "param-equals";
  equals.textContent = "=";
  const value = document.createElement("span");
  value.className = "param-value";
  value.textContent = formatNumber(n);
  element.append(label, document.createTextNode(" "), equals, document.createTextNode(" "), value);
}

function formatNumber(value) {
  if (typeof value === "string") return value;
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function cardForPreset(preset) {
  const localizedPreset = presetText(preset, languageState.lang);
  const copy = text(languageState.lang).guide;
  const article = document.createElement("article");
  article.className = "guide-card";
  article.id = preset.id;

  const preview = document.createElement("canvas");
  preview.className = "guide-preview";
  preview.width = 640;
  preview.height = 360;
  preview.setAttribute("aria-label", `${localizedPreset.label} simulation snapshot preview`);
  drawPreviewPlaceholder(preview, localizedPreset.label);
  previewJobs.push({ canvas: preview, preset: localizedPreset });

  const previewCaption = document.createElement("p");
  previewCaption.className = "preview-caption";
  appendPreviewCaption(previewCaption, preset.params.n);

  const title = document.createElement("h2");
  title.textContent = localizedPreset.label;

  const source = document.createElement("p");
  source.className = "guide-source";
  appendCitedText(source, localizedPreset.guide?.source ?? "Exploratory preset");

  const role = document.createElement("p");
  role.className = "guide-role";
  appendCitedText(role, localizedPreset.guide?.role ?? localizedPreset.description);

  const watch = document.createElement("p");
  watch.className = "guide-copy";
  appendCitedText(watch, localizedPreset.guide?.watch ?? localizedPreset.description);

  const note = document.createElement("p");
  note.className = "guide-copy muted-copy";
  appendCitedText(note, localizedPreset.guide?.note ?? "");

  const params = document.createElement("div");
  params.className = "guide-params";
  if (localizedPreset.guide?.paperParams?.label) {
    const sourceLabel = document.createElement("p");
    sourceLabel.className = "param-source-label";
    sourceLabel.textContent = localizedPreset.guide.paperParams.label;
    params.appendChild(sourceLabel);
  }
  appendParameterBlock(params, copy.sourceValues, "source-values", (values) => {
    appendPaperParameterList(values, localizedPreset.guide?.paperParams);
  });
  appendParameterBlock(params, copy.browserValues, "browser-values", (values) => {
    appendParameterList(values, localizedPreset.params);
  });
  if (localizedPreset.guide?.paperParams?.note) {
    const note = document.createElement("p");
    note.className = "param-note";
    note.textContent = localizedPreset.guide.paperParams.note;
    params.appendChild(note);
  }

  const tags = document.createElement("div");
  tags.className = "guide-tags";
  for (const tag of localizedPreset.guide?.tags ?? []) {
    const span = document.createElement("span");
    span.textContent = tag;
    tags.appendChild(span);
  }

  const link = document.createElement("a");
  link.className = "guide-open";
  link.href = hrefWithLanguage(`index.html?preset=${encodeURIComponent(preset.id)}`, languageState.mode);
  link.textContent = copy.openInSimulator;

  article.append(preview, previewCaption, title, source, role, watch);
  if (note.textContent) article.appendChild(note);
  article.append(params, tags, link);
  return article;
}

function appendCitedText(element, text) {
  const citationPattern = /\[(\d+)\]/g;
  let cursor = 0;
  for (const match of text.matchAll(citationPattern)) {
    if (match.index > cursor) element.appendChild(document.createTextNode(text.slice(cursor, match.index)));
    const anchor = document.createElement("a");
    anchor.className = "citation-link";
    anchor.href = `#ref-${match[1]}`;
    anchor.textContent = match[0];
    element.appendChild(anchor);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) element.appendChild(document.createTextNode(text.slice(cursor)));
}

function setLanguageMode(mode) {
  languageState.mode = mode;
  persistLanguageMode(mode);
  syncLanguageUrl(mode);
  syncLanguageControl(ui.languageSwitch, mode);
  applyLanguage();
  renderPresetCards();
}

function applyLanguage() {
  languageState.lang = resolveLanguage(languageState.mode);
  const copy = text(languageState.lang);
  document.documentElement.lang = languageState.lang;
  document.title = copy.guide.pageTitle;
  document.querySelector('meta[name="description"]')?.setAttribute("content", copy.guide.description);
  ui.languageSwitch.setAttribute("aria-label", copy.language.label);
  ui.guideBack.href = hrefWithLanguage("index.html", languageState.mode);
  grid.setAttribute("aria-label", copy.guide.presetGridAria);
  applyStaticTranslations(document, languageState.lang);
}

function renderPresetCards() {
  const serial = previewRenderSerial + 1;
  previewRenderSerial = serial;
  previewJobs.length = 0;
  grid.innerHTML = "";
  for (const preset of presets) {
    grid.appendChild(cardForPreset(preset));
  }

  let resetScrollAfterPreviews = false;
  const highlighted = new URLSearchParams(window.location.search).get("preset") ?? window.location.hash.slice(1);
  if (highlighted) {
    const target = document.getElementById(decodeURIComponent(highlighted));
    if (target?.classList.contains("guide-card")) {
      target.classList.add("guide-card-active");
      resetScrollAfterPreviews = true;
      keepGuideAtTop();
    }
  }

  renderPreviewQueue(serial).then(() => {
    if (resetScrollAfterPreviews && serial === previewRenderSerial) keepGuideAtTop();
  });
}

setupLanguageControl(ui.languageSwitch, languageState.mode, setLanguageMode);
applyLanguage();
renderPresetCards();

function keepGuideAtTop() {
  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));
  setTimeout(() => window.scrollTo(0, 0), 80);
}

async function renderPreviewQueue(serial) {
  for (const job of previewJobs) {
    if (serial !== previewRenderSerial) return;
    await renderPresetPreview(job.canvas, job.preset, serial);
  }
}

function drawPreviewPlaceholder(canvas, label) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(238,247,255,0.7)";
  ctx.font = "700 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(label, 24, 44);
  ctx.fillStyle = "rgba(94,231,255,0.75)";
  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(text(languageState.lang).guide.previewRendering, 24, 70);
}

async function renderPresetPreview(canvas, preset, serial) {
  const spec = PREVIEW_SPECS[preset.id] ?? { steps: 480, drawEvery: 4 };
  const params = JSON.parse(JSON.stringify(preset.params));
  const system = createSystem(PUBLIC_MODEL, params);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#02040c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let step = 0; step < spec.steps; step += 1) {
    if (serial !== previewRenderSerial || !canvas.isConnected) return;
    stepSystem(system, params);
    if (step % spec.drawEvery === 0) drawPreviewTrail(ctx, canvas, system, params, 0.08);
    if (step % 80 === 79) await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  drawPreviewBox(ctx, canvas, params);
  drawPreviewParticles(ctx, canvas, system, params);
  drawPreviewLabel(ctx, canvas, preset, system);

  canvas.dataset.rendered = "true";
  canvas.dataset.preview = "snapshot";
}

function previewPoint(canvas, params, x, y) {
  const pad = 24;
  const L = params.boxSize ?? params.viewScale ?? 10;
  const size = Math.min(canvas.width - pad * 2, canvas.height - pad * 2);
  const ox = (canvas.width - size) * 0.5;
  const oy = (canvas.height - size) * 0.5;
  return {
    x: ox + (x / L) * size,
    y: oy + (y / L) * size,
  };
}

function phaseHue(phase) {
  return ((phase / (Math.PI * 2)) * 360 + 360) % 360;
}

function drawPreviewTrail(ctx, canvas, system, params, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(2,4,12,0.045)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";
  const r = Math.max(1.0, (params.particleSize ?? 3) * 0.42);
  for (let i = 0; i < system.n; i += 1) {
    const p = previewPoint(canvas, params, system.x[i], system.y[i]);
    ctx.fillStyle = `hsla(${phaseHue(system.phase[i])}, 100%, 62%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPreviewBox(ctx, canvas, params) {
  const pad = 24;
  const size = Math.min(canvas.width - pad * 2, canvas.height - pad * 2);
  const x = (canvas.width - size) * 0.5;
  const y = (canvas.height - size) * 0.5;
  ctx.save();
  ctx.strokeStyle = "rgba(226,241,255,0.22)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(x, y, size, size);
  ctx.restore();
}

function drawPreviewParticles(ctx, canvas, system, params) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const base = Math.max(1.5, (params.particleSize ?? 3) * 0.55);
  for (let i = 0; i < system.n; i += 1) {
    const p = previewPoint(canvas, params, system.x[i], system.y[i]);
    const hue = phaseHue(system.phase[i]);
    const glow = base * 4.2;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
    grad.addColorStop(0, `hsla(${hue}, 100%, 72%, 0.65)`);
    grad.addColorStop(0.35, `hsla(${hue}, 100%, 58%, 0.24)`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < system.n; i += 1) {
    const p = previewPoint(canvas, params, system.x[i], system.y[i]);
    ctx.fillStyle = `hsl(${phaseHue(system.phase[i])}, 100%, 66%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, base, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPreviewLabel(ctx, canvas, preset, system) {
  ctx.save();
  ctx.fillStyle = "rgba(2,4,12,0.72)";
  ctx.fillRect(0, canvas.height - 34, canvas.width, 34);
  ctx.fillStyle = "rgba(238,247,255,0.88)";
  ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${preset.label}   N=${system.n}   t=${system.t.toFixed(1)}`, 18, canvas.height - 13);
  ctx.restore();
}
