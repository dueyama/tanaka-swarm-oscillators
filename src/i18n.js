const STORAGE_KEY = "danTanakaSwarmLanguageMode";
const LANGUAGE_MODES = new Set(["auto", "ja", "en"]);

export function normalizeLanguageMode(value) {
  const mode = String(value ?? "").toLowerCase();
  return LANGUAGE_MODES.has(mode) ? mode : null;
}

export function readInitialLanguageMode() {
  const queryMode = normalizeLanguageMode(new URLSearchParams(window.location.search).get("lang"));
  if (queryMode) return queryMode;
  const storedMode = normalizeLanguageMode(window.localStorage?.getItem(STORAGE_KEY));
  return storedMode ?? "auto";
}

export function resolveLanguage(mode) {
  const normalized = normalizeLanguageMode(mode) ?? "auto";
  if (normalized === "ja" || normalized === "en") return normalized;
  return (window.navigator.language || "").toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function persistLanguageMode(mode) {
  const normalized = normalizeLanguageMode(mode) ?? "auto";
  window.localStorage?.setItem(STORAGE_KEY, normalized);
}

export function syncLanguageUrl(mode) {
  const normalized = normalizeLanguageMode(mode) ?? "auto";
  const url = new URL(window.location.href);
  url.searchParams.set("lang", normalized);
  window.history.replaceState(null, "", url);
}

export function hrefWithLanguage(href, mode) {
  const normalized = normalizeLanguageMode(mode) ?? "auto";
  const url = new URL(href, window.location.href);
  url.searchParams.set("lang", normalized);
  const file = url.pathname.split("/").pop();
  return `${file}${url.search}${url.hash}`;
}

export function setupLanguageControl(control, mode, onChange) {
  syncLanguageControl(control, mode);
  control.addEventListener("click", (event) => {
    const button = event.target.closest("[data-lang-mode]");
    if (!button || !control.contains(button)) return;
    const nextMode = normalizeLanguageMode(button.dataset.langMode) ?? "auto";
    syncLanguageControl(control, nextMode);
    onChange(nextMode);
  });
}

export function syncLanguageControl(control, mode) {
  const normalized = normalizeLanguageMode(mode) ?? "auto";
  control.dataset.mode = normalized;
  control.querySelectorAll("[data-lang-mode]").forEach((button) => {
    const active = button.dataset.langMode === normalized;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

export function text(lang) {
  return TEXT[lang] ?? TEXT.en;
}

export function controlText(spec, lang) {
  const localized = CONTROL_TEXT[lang]?.[spec.key] ?? {};
  return { ...spec, ...localized };
}

export function presetText(preset, lang) {
  const localized = PRESET_TEXT[lang]?.[preset.id] ?? {};
  return {
    ...preset,
    label: localized.label ?? preset.label,
    description: localized.description ?? preset.description,
    guide: {
      ...(preset.guide ?? {}),
      ...(localized.guide ?? {}),
      tags: localized.guide?.tags ?? preset.guide?.tags,
      paperParams: {
        ...(preset.guide?.paperParams ?? {}),
        ...(localized.guide?.paperParams ?? {}),
      },
    },
  };
}

export function applyStaticTranslations(root, lang) {
  const dict = text(lang);
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = lookup(dict, element.dataset.i18n);
    if (value !== undefined) element.textContent = value;
  });
  root.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = lookup(dict, element.dataset.i18nHtml);
    if (value !== undefined) element.innerHTML = value;
  });
}

function lookup(dict, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => (value && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined), dict);
}

const formula = {
  c1: '<span class="formula"><i>c</i><sub>1</sub></span>',
  c2: '<span class="formula"><i>c</i><sub>2</sub></span>',
  c3: '<span class="formula"><i>c</i><sub>3</sub></span>',
  alpha: '<span class="formula"><i>&alpha;</i></span>',
  Rji: '<span class="formula"><i>R</i><sub>ji</sub></span>',
  Psiji: '<span class="formula"><i>&Psi;</i><sub>ji</sub></span>',
  psiI: '<span class="formula"><i>&psi;</i><sub>i</sub></span>',
  psiJ: '<span class="formula"><i>&psi;</i><sub>j</sub></span>',
  ri: '<span class="formula"><i>r</i><sub>i</sub></span>',
  rj: '<span class="formula"><i>r</i><sub>j</sub></span>',
  Rhat: '<span class="formula"><i>R&#770;</i><sub>ji</sub></span>',
  L: '<span class="formula"><i>L</i></span>',
  N: '<span class="formula"><i>N</i></span>',
  pi2: '<span class="formula"><span>2</span><i>&pi;</i></span>',
  expR: '<span class="formula"><i>e</i><sup>-|<i>R</i><sub>ji</sub>|</sup></span>',
};

const TEXT = {
  ja: {
    language: {
      label: "言語",
    },
    simulator: {
      title: "Dan Tanaka's Swarm Oscillators",
      description: "Dan Tanaka の chemotactic swarm oscillators をブラウザで動かすインタラクティブシミュレータ。",
      stageAria: "Dan Tanaka's swarm oscillators interactive simulator",
      canvasAria: "位相色付き振動子アニメーション",
      panelAria: "シミュレーション操作",
      preset: "プリセット",
      guideLink: "式・プリセット解説",
      storyPrefix:
        "色は内部位相、暗い軌跡は移動履歴、薄い近接線は見やすくするための視覚補助です。点線枠は周期境界、ドラッグ操作は局所的な攪拌を加えます。モデル式とプリセット詳細は",
      storyLink: "式・プリセット解説へ",
      storySuffix: "。",
      pause: "一時停止",
      run: "再開",
      reset: "リセット",
      snapshot: "スナップショット",
      fullscreen: "全画面",
      common: "共通",
      liveControls: "live controls",
      equationParameters: "equation parameters",
      references: "参考文献",
      papers: "papers",
      phaseLegend: `カラーバーは内部位相 ${formula.psiI} を ${formula.pi2} で一周させたもの。粒子色も同じ対応です。`,
      diag: {
        order: "Order",
        nn: "NN",
        phaseVariance: "Phase var",
        radius: "Radius",
        t: "t",
        fps: "FPS",
      },
      hudEquationFrom: " from ",
      hudEquationTail: " chemotactic phase coupling",
      tanakaControlTitle: "Tanaka",
    },
    guide: {
      title: "式・プリセット解説",
      pageTitle: "式・プリセット解説 — Dan Tanaka's Swarm Oscillators",
      description: "Dan Tanaka chemotactic swarm oscillator の式、パラメータ、プリセット、参考文献の解説。",
      back: "Simulator",
      subtitle: "Dan Tanaka の chemotactic / swarm oscillator の式、パラメータ、プリセットの見どころ。",
      modelKicker: "Model",
      modelTitle: "Tanaka 縮約モデル",
      modelIntro: `ここでは Dan Tanaka の chemotactic / swarm oscillator を、位置と内部位相をもつ縮約モデルとして説明します。プリセット名は複数の論文や観察したいパターンに由来しますが、ブラウザ版では下の方程式と記号を基準に、パラメータ、粒子数、初期乱数、時間刻み、軌跡設定を整理しています <a class="citation-link" href="#references">[1-3]</a>。`,
      equationTitle: "Shared equations",
      equationNote: `周期境界では ${formula.L} の箱で minimum image を使い、自己相互作用 <span class="formula"><i>j</i><span>=</span><i>i</i></span> は和から除きます <a class="citation-link" href="#references">[1-3]</a>。`,
      intuitionTitle: "式の気持ち",
      intuitionPhase: `<strong>位相の式</strong>近くにいる振動子ほど ${formula.expR} で強く効きます。括弧の中身 ${formula.Psiji}<span class="formula"><span>+</span><i>&alpha;</i>|<i>R</i><sub>ji</sub>|<span>-</span><i>c</i><sub>1</sub></span> の sine が正なら ${formula.psiI} は進み、負なら遅れます。つまり ${formula.c1} は、どの位相差の相手が時計を進めるかを決めるオフセットです。`,
      intuitionPosition: `<strong>位置の式</strong>${formula.Rhat} は粒子 <span class="formula"><i>i</i></span> から粒子 <span class="formula"><i>j</i></span> へ向かう単位方向です。sine の値が正なら粒子 <span class="formula"><i>i</i></span> は粒子 <span class="formula"><i>j</i></span> の方向へ動き、負なら逆向きへ動きます。${formula.c2} はその引力・斥力の位相オフセット、${formula.c3} は動く速さ全体の係数です。`,
      intuitionDelay: `<strong>距離依存の遅れ</strong>${formula.alpha}<span class="formula">|<i>R</i><sub>ji</sub>|</span> は、遠い相手ほど相互作用の位相がずれる項です。${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> では相互作用は位相差と ${formula.c1}<span class="formula"><span>/</span></span>${formula.c2} だけで決まり、${formula.alpha} を大きくすると clustered clusters のような距離込みの秩序が出やすくなります。`,
      parameterTitle: "記号とパラメータ",
      parameter: {
        ri: `粒子 <span class="formula"><i>i</i></span> の二次元位置。ブラウザでは周期箱の中の座標として描きます。`,
        psi: `粒子 <span class="formula"><i>i</i></span> の内部振動位相。色はこの値を ${formula.pi2} で割ったものに対応します。`,
        Rji: `${formula.rj}<span class="formula"><span>-</span></span>${formula.ri}。粒子 <span class="formula"><i>i</i></span> から見た粒子 <span class="formula"><i>j</i></span> への相対ベクトルです。`,
        distance: `粒子間距離。相互作用の強さは ${formula.expR} で短距離ほど大きくなります。`,
        Rhat: `${formula.Rji}<span class="formula"><span>/</span>|<i>R</i><sub>ji</sub>|</span>。移動方向だけを表す単位ベクトルです。`,
        Psi: `${formula.psiJ}<span class="formula"><span>-</span></span>${formula.psiI}。粒子 <span class="formula"><i>i</i></span> から見た粒子 <span class="formula"><i>j</i></span> との位相差です。`,
        c1: "位相方程式の応答オフセット。どの位相差の近傍が時計を進めるか、遅らせるかをずらします。",
        c2: "位置方程式の応答オフセット。どの位相差の近傍へ近づくか、離れるかをずらします。",
        c3: "位置ダイナミクスの速度係数。小さいほど位相変化に対して粒子の移動がゆっくりになります。",
        alpha: `距離に比例する位相遅れ。<span class="formula"><span>0</span></span> なら距離は強さだけに効き、位相のずれは作りません。`,
        nL: `${formula.N} は粒子数、${formula.L} は周期正方形箱の一辺です。`,
        dt: "ブラウザの Euler 積分設定です。論文モデルの物理パラメータではありません。",
        seed: "初期位置と初期位相を決める乱数種。同じプリセットを同じ初期条件から再現するための値です。",
        trail: "見た目とブラウザ安定性のための実装設定です。Tanaka の方程式そのもののパラメータではありません。",
      },
      presetContextTitle: "プリセットは入口用の選抜です",
      presetContextCopy: `Tanaka 系の論文では、membrane / section-of-fruit, clustered clusters, branch, grid with defect, fireworks, train, stick-slip motion, moving membranes など複数の状態が報告・示唆されています <a class="citation-link" href="#references">[1-3]</a>。このブラウザ版のプリセットは、その全体を網羅するリストではなく、軽く動かしながら特徴の違いを掴むための入口です。RIMS phase A-D は、特に ${formula.c1} / ${formula.c2} の相図を読むための代表点として追加しています。各カードでは論文・資料側の値と、見やすさや速度のために調整したブラウザ値を分けて表示します。`,
      axisTitle: "主に動かしているパラメータ",
      axis: {
        c1: "位相応答のずれ。近い相手が時計を進めるか、遅らせるかを変えます。",
        c2: "運動応答のずれ。同じ位相差でも近づく側に出るか、離れる側に出るかを変えます。",
        c3: "移動の速さ。membrane 近傍では小さく、clustered clusters では大きめです。",
        alpha: `距離に比例する位相遅れ。${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> では距離は強さだけに効き、大きくすると距離込みの秩序が出やすくなります。`,
      },
      presetMapTitle: "プリセット群の見方",
      presetMapLabels: {
        membrane: "Membrane 系",
      },
      presetMap: {
        membrane: `小さい ${formula.c3} と ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> で、ゆっくり膜・果実断面候補を見る。`,
        clustered: `${formula.alpha} と ${formula.c3} が大きめで、小クラスターの生成と配置を見る。`,
        fireworks: "論文中に名前が挙がる fireworks / train / stick-slip 系を探すための探索用 candidate。",
        rims: `${formula.c1} と ${formula.c2} の相図上で、位相引力/反発と位置引力/斥力の組み合わせを見る。`,
      },
      phaseMapTitle: `RIMS の ${formula.c1}, ${formula.c2} 相図`,
      phaseMap1: `Tanaka–Iida の RIMS 論文 <a class="citation-link" href="#ref-2">[2]</a> では、${formula.N}<span class="formula"><span>=</span><span>20</span></span>, ${formula.L}<span class="formula"><span>=</span><span>10</span></span>, ${formula.c3}<span class="formula"><span>=</span><span>0.02</span></span>, ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> を固定し、${formula.c1} と ${formula.c2} を 0.2 刻みで走査しています。<span class="formula"><i>t</i><span>=</span><span>0</span></span> から <span class="formula"><i>t</i><span>=</span><span>5000</span></span> は捨て、<span class="formula"><i>t</i><span>=</span><span>5000</span></span> から <span class="formula"><i>t</i><span>=</span><span>10000</span></span> の時間平均で、最近接距離の平均と内部状態分散を見ています。`,
      phaseMap2: `代表点は A: ${formula.c1}<span class="formula"><span>=</span><span>0.5</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>1.5</span></span>、B: ${formula.c1}<span class="formula"><span>=</span><span>3.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>2.0</span></span>、C: ${formula.c1}<span class="formula"><span>=</span><span>6.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>4.0</span></span>、D: ${formula.c1}<span class="formula"><span>=</span><span>4.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>4.0</span></span> です。ブラウザの A-D プリセットはこの代表点を見やすい粒子数に増やしたものです。`,
      presetGridAria: "preset explanations",
      referencesTitle: "References",
      sourceValues: "source values",
      browserValues: "browser values",
      openInSimulator: "Open in simulator",
      previewCaptionPrefix: "サンプル画像も同じ値: ",
      previewRendering: "sample image rendering...",
    },
  },
  en: {
    language: {
      label: "Language",
    },
    simulator: {
      title: "Dan Tanaka's Swarm Oscillators",
      description: "Interactive browser simulator for Dan Tanaka's chemotactic swarm oscillators.",
      stageAria: "Dan Tanaka's swarm oscillators interactive simulator",
      canvasAria: "phase-colored oscillator animation",
      panelAria: "simulation controls",
      preset: "Preset",
      guideLink: "Equations and presets",
      storyPrefix:
        "Color encodes internal phase, dark trails show motion history, and faint neighbor lines are visual aids. The dashed frame is the periodic boundary; dragging adds local stirring. For the model equations and preset details, see ",
      storyLink: "Equations and presets",
      storySuffix: ".",
      pause: "Pause",
      run: "Run",
      reset: "Reset",
      snapshot: "Snapshot",
      fullscreen: "Fullscreen",
      common: "Common",
      liveControls: "live controls",
      equationParameters: "equation parameters",
      references: "References",
      papers: "papers",
      phaseLegend: `The color bar maps the internal phase ${formula.psiI} around one ${formula.pi2} cycle. Particle colors use the same scale.`,
      diag: {
        order: "Order",
        nn: "NN",
        phaseVariance: "Phase var",
        radius: "Radius",
        t: "t",
        fps: "FPS",
      },
      hudEquationFrom: " from ",
      hudEquationTail: " chemotactic phase coupling",
      tanakaControlTitle: "Tanaka",
    },
    guide: {
      title: "Equations and Presets",
      pageTitle: "Equations and Presets — Dan Tanaka's Swarm Oscillators",
      description: "Equations, parameters, presets, and references for the Dan Tanaka chemotactic swarm oscillator.",
      back: "Simulator",
      subtitle: "Equations, parameters, and preset notes for Dan Tanaka's chemotactic / swarm oscillator.",
      modelKicker: "Model",
      modelTitle: "Tanaka Reduced Model",
      modelIntro: `This page explains Dan Tanaka's chemotactic / swarm oscillator as a reduced model with positions and internal phases. Preset names come from several papers and from target patterns, while the browser version organizes parameters, particle count, seed, time step, and trail settings around the equations and notation below <a class="citation-link" href="#references">[1-3]</a>.`,
      equationTitle: "Shared equations",
      equationNote: `For periodic boundaries the simulator uses the minimum-image convention in a square box of side ${formula.L}; self-interaction <span class="formula"><i>j</i><span>=</span><i>i</i></span> is excluded from the sums <a class="citation-link" href="#references">[1-3]</a>.`,
      intuitionTitle: "How to Read the Equations",
      intuitionPhase: `<strong>Phase equation</strong>Nearby oscillators contribute more strongly through ${formula.expR}. If the sine argument ${formula.Psiji}<span class="formula"><span>+</span><i>&alpha;</i>|<i>R</i><sub>ji</sub>|<span>-</span><i>c</i><sub>1</sub></span> is positive, ${formula.psiI} advances; if it is negative, it lags. ${formula.c1} is therefore the response offset deciding which phase differences speed up the clock.`,
      intuitionPosition: `<strong>Position equation</strong>${formula.Rhat} is the unit direction from particle <span class="formula"><i>i</i></span> toward particle <span class="formula"><i>j</i></span>. A positive sine term moves particle <span class="formula"><i>i</i></span> toward <span class="formula"><i>j</i></span>; a negative term moves it away. ${formula.c2} is the attraction/repulsion phase offset, and ${formula.c3} scales the overall movement speed.`,
      intuitionDelay: `<strong>Distance-dependent lag</strong>${formula.alpha}<span class="formula">|<i>R</i><sub>ji</sub>|</span> shifts interaction phase more for distant partners. When ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span>, distance only changes interaction strength; increasing ${formula.alpha} makes distance-dependent order such as clustered clusters easier to see.`,
      parameterTitle: "Symbols and Parameters",
      parameter: {
        ri: `Two-dimensional position of particle <span class="formula"><i>i</i></span>. In the browser it is drawn inside the periodic box.`,
        psi: `Internal oscillator phase of particle <span class="formula"><i>i</i></span>. Particle color is this value modulo ${formula.pi2}.`,
        Rji: `${formula.rj}<span class="formula"><span>-</span></span>${formula.ri}. Relative vector from particle <span class="formula"><i>i</i></span> to particle <span class="formula"><i>j</i></span>.`,
        distance: `Particle distance. Interaction strength decays as ${formula.expR}, so nearby particles matter most.`,
        Rhat: `${formula.Rji}<span class="formula"><span>/</span>|<i>R</i><sub>ji</sub>|</span>. A unit vector carrying direction only.`,
        Psi: `${formula.psiJ}<span class="formula"><span>-</span></span>${formula.psiI}. Phase difference from particle <span class="formula"><i>i</i></span> to particle <span class="formula"><i>j</i></span>.`,
        c1: "Phase-response offset. It shifts which nearby phase differences advance or delay the clock.",
        c2: "Motion-response offset. It shifts which phase differences make particles approach or move apart.",
        c3: "Velocity scale for position dynamics. Smaller values make motion slow compared with phase evolution.",
        alpha: `Distance-proportional phase lag. At <span class="formula"><span>0</span></span>, distance changes only interaction strength, not phase lag.`,
        nL: `${formula.N} is particle count; ${formula.L} is the side length of the periodic square box.`,
        dt: "Browser Euler integration settings. They are not physical parameters in the paper model.",
        seed: "Random seed for initial positions and phases. It makes each preset reproducible from the same initial condition.",
        trail: "Visual and browser-stability settings. They are not parameters of Tanaka's equations.",
      },
      presetContextTitle: "Presets Are Entry Points",
      presetContextCopy: `Tanaka-system papers report or suggest multiple states: membrane / section-of-fruit, clustered clusters, branch, grid with defect, fireworks, train, stick-slip motion, and moving membranes <a class="citation-link" href="#references">[1-3]</a>. The browser presets are not an exhaustive catalogue; they are entry points for seeing characteristic differences while the simulation runs. RIMS phase A-D are added as representative points for reading the ${formula.c1} / ${formula.c2} phase map. Each card separates paper/source values from browser values adjusted for readability and speed.`,
      axisTitle: "Main Parameters Being Moved",
      axis: {
        c1: "Phase-response offset. It changes whether nearby partners advance or delay an oscillator.",
        c2: "Motion-response offset. At the same phase difference, it changes whether motion points inward or outward.",
        c3: "Movement speed. It is small near membranes and larger for clustered clusters.",
        alpha: `Distance-proportional phase lag. With ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span>, distance affects strength only; larger values encourage distance-dependent order.`,
      },
      presetMapTitle: "How to Read the Preset Groups",
      presetMapLabels: {
        membrane: "Membrane family",
      },
      presetMap: {
        membrane: `Small ${formula.c3} and ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> emphasize slow membrane / section-of-fruit candidates.`,
        clustered: `Larger ${formula.alpha} and ${formula.c3} emphasize formation and arrangement of small clusters.`,
        fireworks: "An exploratory candidate for fireworks / train / stick-slip motions named in the papers.",
        rims: `Representative points on the ${formula.c1}, ${formula.c2} phase map for comparing phase attraction/repulsion and spatial attraction/repulsion.`,
      },
      phaseMapTitle: `RIMS ${formula.c1}, ${formula.c2} Phase Map`,
      phaseMap1: `In the Tanaka-Iida RIMS paper <a class="citation-link" href="#ref-2">[2]</a>, ${formula.N}<span class="formula"><span>=</span><span>20</span></span>, ${formula.L}<span class="formula"><span>=</span><span>10</span></span>, ${formula.c3}<span class="formula"><span>=</span><span>0.02</span></span>, and ${formula.alpha}<span class="formula"><span>=</span><span>0</span></span> are fixed while ${formula.c1} and ${formula.c2} are scanned in increments of 0.2. The interval <span class="formula"><i>t</i><span>=</span><span>0</span></span> to <span class="formula"><i>t</i><span>=</span><span>5000</span></span> is discarded, and averages over <span class="formula"><i>t</i><span>=</span><span>5000</span></span> to <span class="formula"><i>t</i><span>=</span><span>10000</span></span> are used for nearest-neighbor distance and internal-state variance.`,
      phaseMap2: `Representative points are A: ${formula.c1}<span class="formula"><span>=</span><span>0.5</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>1.5</span></span>; B: ${formula.c1}<span class="formula"><span>=</span><span>3.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>2.0</span></span>; C: ${formula.c1}<span class="formula"><span>=</span><span>6.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>4.0</span></span>; and D: ${formula.c1}<span class="formula"><span>=</span><span>4.0</span></span>, ${formula.c2}<span class="formula"><span>=</span><span>4.0</span></span>. Browser A-D presets increase particle count to make these landmarks easier to see.`,
      presetGridAria: "preset explanations",
      referencesTitle: "References",
      sourceValues: "source values",
      browserValues: "browser values",
      openInSimulator: "Open in simulator",
      previewCaptionPrefix: "Sample image uses the same values: ",
      previewRendering: "rendering sample image...",
    },
  },
};

const CONTROL_TEXT = {
  ja: {
    n: { label: "N", hint: "粒子数。多いほど美しいが O(N²) で重くなります。" },
    dt: { label: "dt", hint: "Euler 積分の時間刻み。暴れる時は下げます。" },
    stepsPerFrame: { label: "speed", hint: "1 フレームあたりの積分ステップ数。" },
    particleSize: { label: "particle glow", hint: "粒子の見かけの大きさ。" },
    trailFade: { label: "trail fade", hint: "大きいほど軌跡が早く消えます。" },
    trailGain: { label: "trail gain", hint: "軌跡の明るさ。" },
    stirStrength: { label: "stir", hint: "ドラッグ操作で加える局所的な位相・速度攪拌。" },
    c1: { label: "c1", hint: "位相方程式のオフセット。RIMS の c1,c2 scan は 0..2π で見ると分かりやすい。" },
    c2: { label: "c2", hint: "位置方程式のオフセット。膜候補では 3.0 近傍。" },
    c3: { label: "c3", hint: "位置運動の相対速度。膜候補は非常に小さい。" },
    alpha: { label: "alpha", hint: "距離に比例する位相遅れ。PRL clustered clusters では 1.6。" },
    boxSize: { label: "box L", hint: "周期境界の箱サイズ。変更時は Reset 推奨。" },
    velocityClamp: { label: "velocity cap", hint: "Web 表示を守る安全弁。論文式自体にはない可視化用制限。" },
  },
  en: {
    n: { label: "N", hint: "Particle count. More particles look better but scale as O(N²)." },
    dt: { label: "dt", hint: "Euler integration time step. Lower it if the motion blows up." },
    stepsPerFrame: { label: "speed", hint: "Integration steps per animation frame." },
    particleSize: { label: "particle glow", hint: "Visible particle size." },
    trailFade: { label: "trail fade", hint: "Larger values erase trails faster." },
    trailGain: { label: "trail gain", hint: "Trail brightness." },
    stirStrength: { label: "stir", hint: "Local phase and velocity stirring added by dragging." },
    c1: { label: "c1", hint: "Offset in the phase equation. The RIMS c1,c2 scan is easiest to read over 0..2π." },
    c2: { label: "c2", hint: "Offset in the position equation. Membrane candidates sit near 3.0." },
    c3: { label: "c3", hint: "Relative speed of position dynamics. Membrane candidates use very small values." },
    alpha: { label: "alpha", hint: "Distance-proportional phase lag. PRL clustered clusters use 1.6." },
    boxSize: { label: "box L", hint: "Side length of the periodic box. Reset is recommended after changing it." },
    velocityClamp: { label: "velocity cap", hint: "Browser safety valve for display stability; not part of the paper equation." },
  },
};

const PRESET_TEXT = {
  ja: {},
  en: {
    tanaka_membrane: {
      label: "Membrane / fruit-section",
      description: "Near the Tanaka-Iida RIMS membrane regime. Long runs can show thin membrane boundaries or section-of-fruit-like separation.",
      guide: {
        source: "Tanaka-Iida RIMS paper [2]",
        role: "Core preset for searching membrane-like boundaries and section-of-fruit separation.",
        watch: "Watch phase colors separate spatially, then look for thin boundaries or bag-like outlines that persist over long runs.",
        note: "Section-of-fruit behavior may appear around t=1e3 to 1e4, so the browser version uses more particles and is best observed for longer runs.",
        tags: ["membrane", "fruit-section", "RIMS"],
        paperParams: {
          label: "RIMS Fig. 1 / membrane near",
          n: "30 in Fig. 1; 50 examples also reported",
          dt: "not specified for browser Euler step",
          note: "Browser N=220 is a display choice, not the reported paper N.",
        },
      },
    },
    tanaka_clustered_clusters: {
      label: "PRL clustered clusters",
      description: "Qualitative target from Tanaka PRL 2007: synchronized small clusters and their anti-phase arrangement.",
      guide: {
        source: "Tanaka PRL 2007 [1]",
        role: "Preset for observing multiple small clusters, their phase relationships, and their motion.",
        watch: "Look for similarly colored particles gathering, then watch distances and anti-phase arrangements between clusters evolve.",
        note: "The large alpha=1.6 and c3 make this faster than membrane presets, so cluster formation and breakup are easier to see.",
        tags: ["PRL 2007", "clustered clusters", "alpha lag"],
        paperParams: {
          label: "PRL Fig. 1 clustered clusters",
          dt: "browser integration choice",
          note: "Browser N=180 keeps the PRL parameter point but uses a denser visual sample.",
        },
      },
    },
    tanaka_fireworks: {
      label: "Fireworks explorer",
      description: "Visual exploration preset for fireworks / train / stick-slip motions mentioned in the papers, not an exact reproduction.",
      guide: {
        source: "Tanaka PTP Supplement 2009 [3]",
        role: "Candidate for exploring fireworks, train, and stick-slip-like motion.",
        watch: "Look for trajectories bursting outward, narrow trains, or stop-and-go motion.",
        note: "This is not a quoted figure reproduction. Set stir to 0 to inspect purely initial-condition-driven behavior.",
        tags: ["candidate", "fireworks", "motion"],
        paperParams: {
          label: "exploratory candidate",
          n: "not a reported reproduction value",
          dt: "browser integration choice",
          c1: "candidate",
          c2: "candidate",
          c3: "candidate",
          alpha: "candidate",
          L: "candidate",
          note: "This preset is tuned for visual exploration of motion types named in the paper, not a quoted figure parameter set.",
        },
      },
    },
    tanaka_magnetic_membrane: {
      label: "High contrast membrane probe",
      description: "Exploratory high-particle-count view for making membrane boundaries easier to see while staying browser-friendly.",
      guide: {
        source: "Tanaka-Iida RIMS paper [2]",
        role: "High-contrast variant for making membrane-candidate boundaries easier to inspect.",
        watch: "Look for phase spread that persists while nearest-neighbor distance settles and thin boundary lines remain visible.",
        note: "This nearby parameter point can fail to reach a section-of-fruit state even over very long runs, so it is best read as a persistent membrane candidate.",
        tags: ["candidate", "persistent membrane", "high contrast"],
        paperParams: {
          label: "RIMS persistent membrane candidate",
          n: "long-run note uses parameter point, not this browser N",
          dt: "not specified for browser Euler step",
          note: "Browser N=260 is a high-contrast display choice.",
        },
      },
    },
    tanaka_rims_phase_a: {
      label: "RIMS phase A landmark",
      description: "Representative point A in the RIMS c1,c2 phase map: phase attraction with spatial repulsion.",
      guide: {
        source: "Tanaka-Iida RIMS c1,c2 phase map [2]",
        role: "Representative point A in the c1,c2 scan, useful before inspecting membrane-adjacent behavior.",
        watch: "Look for particles moving toward similar colors while spreading spatially.",
        note: "The paper phase map uses N=20, L=10, c3=0.02, alpha=0. The browser raises particle count for readability.",
        tags: ["RIMS phase map", "phase A", "c1/c2 scan"],
        paperParams: {
          label: "RIMS local phase diagram point A",
          dt: "scan average after transient; browser step is display choice",
          note: "Browser N=160 increases particles for visual readability.",
        },
      },
    },
    tanaka_rims_phase_b: {
      label: "RIMS phase B landmark",
      description: "Representative point B in the RIMS c1,c2 phase map: spatial attraction with phase repulsion.",
      guide: {
        source: "Tanaka-Iida RIMS c1,c2 phase map [2]",
        role: "Representative point B in the c1,c2 scan, where attraction in position and phase repulsion act together.",
        watch: "Look for particles gathering while colors separate within the same region.",
        note: "In the two-body interpretation in the RIMS paper, B is on the side with spatial attraction and phase repulsion.",
        tags: ["RIMS phase map", "phase B", "cluster tendency"],
        paperParams: {
          label: "RIMS local phase diagram point B",
          dt: "scan average after transient; browser step is display choice",
          note: "Browser N=160 increases particles for visual readability.",
        },
      },
    },
    tanaka_rims_phase_c: {
      label: "RIMS phase C landmark",
      description: "Representative point C in the RIMS c1,c2 phase map: phase attraction and spatial attraction together.",
      guide: {
        source: "Tanaka-Iida RIMS c1,c2 phase map [2]",
        role: "Representative point C in the c1,c2 scan, where phase attraction and spatial attraction overlap.",
        watch: "Look for color synchronization and spatial aggregation progressing together.",
        note: "c1=6.0 and c2=4.0 exceed the older -pi..pi slider range, so browser c1/c2 controls now use 0..2π.",
        tags: ["RIMS phase map", "phase C", "large c1/c2"],
        paperParams: {
          label: "RIMS local phase diagram point C",
          dt: "scan average after transient; browser step is display choice",
          note: "Browser N=160 increases particles for visual readability.",
        },
      },
    },
    tanaka_rims_phase_d: {
      label: "RIMS phase D landmark",
      description: "Representative point D in the RIMS c1,c2 phase map: phase repulsion and spatial repulsion together.",
      guide: {
        source: "Tanaka-Iida RIMS c1,c2 phase map [2]",
        role: "Representative point D in the c1,c2 scan, where phase repulsion and spatial repulsion overlap.",
        watch: "Look for colors staying mixed while particles spread, or membrane-like fluctuations near the boundary.",
        note: "The RIMS paper places membrane / section-of-fruit behavior near boundaries among A-D regions, so D is a useful comparison point.",
        tags: ["RIMS phase map", "phase D", "repulsive side"],
        paperParams: {
          label: "RIMS local phase diagram point D",
          dt: "scan average after transient; browser step is display choice",
          note: "Browser N=160 increases particles for visual readability.",
        },
      },
    },
  },
};
