// =============================================================================
// HO Motion Exporter v3.0 — After Effects Script
// Exporta dados de animação para JSON compatível com o plugin
// "Motion Timeline HO" do Figma.
//
// FLUXO (Wizard de 2 passos):
//   1. Defina a Work Area (B e N) → Próximo passo
//   2. Selecione layers → Carregar layers → Exportar JSON
//   3. Arraste o .json no plugin do Figma
//
// CURVAS DE EASING (baseado na cor do label do layer):
//   🔵 Azul/Roxo  → motion.ease.exit     (saída)
//   🟢 Verde      → motion.ease.linear   (linear)
//   🔴 Vermelho   → motion.ease.onScreen (em tela)
//   🟡 Amarelo    → motion.ease.enter    (entrada)
//
// HERANÇA: Animações de Null Objects usam a label color do Null.
//          Animações diretas usam a label color do próprio layer.
// =============================================================================

(function () {

  // =========================================================================
  // POLYFILLS (ExtendScript é ES3, não tem métodos modernos)
  // =========================================================================

  function dateToISO() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
           "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "Z";
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  var TRACK_COLORS = [
    "#ff0404", "#04a6ff", "#22c55e", "#f59e0b",
    "#a855f7", "#ec4899", "#14b8a6", "#f97316",
    "#6366f1", "#ef4444", "#3b82f6", "#10b981"
  ];

  function round(val, decimals) {
    if (decimals === undefined) decimals = 2;
    var m = Math.pow(10, decimals);
    return Math.round(val * m) / m;
  }

  function isNullObject(layer) {
    try { return layer.nullLayer === true; } catch (e) { return false; }
  }

  // =========================================================================
  // EASING ANALYSIS
  // =========================================================================

  function labelToEasing(labelIndex) {
    switch (labelIndex) {
      case 8: case 10: case 5: case 14:
        return "motion.ease.exit";
      case 9: case 16: case 7: case 3:
        return "motion.ease.linear";
      case 1: case 4: case 13:
        return "motion.ease.onScreen";
      case 2: case 6: case 11:
        return "motion.ease.enter";
      default:
        return null;
    }
  }

  function labelColorName(labelIndex) {
    var names = [
      "None", "Red", "Yellow", "Aqua", "Pink", "Lavender",
      "Peach", "Sea Foam", "Blue", "Green", "Purple", "Orange",
      "Brown", "Fuchsia", "Cyan", "Sandstone", "Dark Green"
    ];
    return (labelIndex >= 0 && labelIndex < names.length) ? names[labelIndex] : "Unknown";
  }

  var KNOWN_CURVES = [
    { name: "motion.ease.linear",   cx1: 0.00, cx2: 1.00 },
    { name: "motion.ease.enter",    cx1: 0.05, cx2: 0.10 },
    { name: "motion.ease.exit",     cx1: 0.30, cx2: 0.80 },
    { name: "motion.ease.onScreen", cx1: 0.40, cx2: 0.00 }
  ];

  function analyzeKeyframeBezier(prop, keyIdx, numKeys) {
    try {
      var outType = prop.keyOutInterpolationType(keyIdx);
      var inType = (keyIdx < numKeys) ? prop.keyInInterpolationType(keyIdx + 1) : outType;
      if (outType === KeyframeInterpolationType.HOLD) return { easing: "hold", method: "hold" };
      if (outType === KeyframeInterpolationType.LINEAR && inType === KeyframeInterpolationType.LINEAR) {
        return { easing: "motion.ease.linear", method: "linear-interp" };
      }
      if (outType === KeyframeInterpolationType.BEZIER) {
        var outEase = prop.keyOutTemporalEase(keyIdx);
        var inEase = (keyIdx < numKeys) ? prop.keyInTemporalEase(keyIdx + 1) : outEase;
        var outInf = outEase[0].influence;
        var inInf = inEase[0].influence;
        var x1 = outInf / 100;
        var x2 = 1.0 - (inInf / 100);
        var bestDist = 999;
        var bestCurve = KNOWN_CURVES[0];
        for (var c = 0; c < KNOWN_CURVES.length; c++) {
          var dx1 = x1 - KNOWN_CURVES[c].cx1;
          var dx2 = x2 - KNOWN_CURVES[c].cx2;
          var dist = dx1 * dx1 + dx2 * dx2;
          if (dist < bestDist) { bestDist = dist; bestCurve = KNOWN_CURVES[c]; }
        }
        return { easing: bestCurve.name, method: "bezier-match", x1: round(x1, 3), x2: round(x2, 3),
          outInf: round(outInf, 1), inInf: round(inInf, 1), dist: round(bestDist, 4) };
      }
      return { easing: "motion.ease.onScreen", method: "unknown-interp" };
    } catch (e) {
      return { easing: "motion.ease.onScreen", method: "error" };
    }
  }

  function extractKeyframes(prop, numKeys, sourceLayer) {
    var kfs = [];
    var labelEasing = null;
    var labelIdx = 0;
    if (sourceLayer) {
      try {
        labelIdx = sourceLayer.label;
        if (typeof labelIdx === "number" && labelIdx > 0) labelEasing = labelToEasing(labelIdx);
      } catch (e) {}
    }
    for (var k = 1; k <= numKeys; k++) {
      var bezierResult = analyzeKeyframeBezier(prop, k, numKeys);
      var finalEasing, method;
      if (labelEasing) {
        finalEasing = labelEasing;
        method = "label:" + labelColorName(labelIdx) + "(" + labelIdx + ")";
      } else {
        finalEasing = bezierResult.easing;
        method = bezierResult.method;
        if (bezierResult.x1 !== undefined) {
          method += ":x1=" + bezierResult.x1 + ",x2=" + bezierResult.x2
            + "(inf:out=" + bezierResult.outInf + ",in=" + bezierResult.inInf + ")";
        }
      }
      kfs.push({ time: round(prop.keyTime(k) * 1000, 0), value: prop.keyValue(k),
        easing: finalEasing, _easingMethod: method });
    }
    return kfs;
  }

  // =========================================================================
  // PROPERTY EXTRACTION
  // =========================================================================

  function extractPosition(layer) {
    var anims = [];
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    if (!pos || pos.numKeys < 2) return anims;
    var kfs = extractKeyframes(pos, pos.numKeys, layer);
    var hasX = false, hasY = false;
    for (var i = 1; i < kfs.length; i++) {
      if (Math.abs(kfs[i].value[0] - kfs[i - 1].value[0]) > 0.5) hasX = true;
      if (Math.abs(kfs[i].value[1] - kfs[i - 1].value[1]) > 0.5) hasY = true;
    }
    if (hasX) {
      for (var j = 0; j < kfs.length - 1; j++) {
        anims.push({ property: "position", axis: "X",
          from: String(round(kfs[j].value[0])), to: String(round(kfs[j + 1].value[0])),
          startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
          easing: kfs[j].easing, _easingMethod: kfs[j]._easingMethod });
      }
    }
    if (hasY) {
      for (var j = 0; j < kfs.length - 1; j++) {
        anims.push({ property: "position", axis: "Y",
          from: String(round(kfs[j].value[1])), to: String(round(kfs[j + 1].value[1])),
          startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
          easing: kfs[j].easing, _easingMethod: kfs[j]._easingMethod });
      }
    }
    return anims;
  }

  function extractScale(layer) {
    var anims = [];
    var scale = layer.property("ADBE Transform Group").property("ADBE Scale");
    if (!scale || scale.numKeys < 2) return anims;
    var kfs = extractKeyframes(scale, scale.numKeys, layer);
    var hasW = false, hasH = false;
    for (var i = 1; i < kfs.length; i++) {
      if (Math.abs(kfs[i].value[0] - kfs[i - 1].value[0]) > 0.1) hasW = true;
      if (Math.abs(kfs[i].value[1] - kfs[i - 1].value[1]) > 0.1) hasH = true;
    }
    if (hasW) {
      for (var j = 0; j < kfs.length - 1; j++) {
        anims.push({ property: "scale", dimension: "W",
          from: String(round(kfs[j].value[0])), to: String(round(kfs[j + 1].value[0])),
          fromPercent: String(round(kfs[j].value[0])) + "%", toPercent: String(round(kfs[j + 1].value[0])) + "%",
          startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
          easing: kfs[j].easing, _easingMethod: kfs[j]._easingMethod });
      }
    }
    if (hasH) {
      for (var j = 0; j < kfs.length - 1; j++) {
        anims.push({ property: "scale", dimension: "H",
          from: String(round(kfs[j].value[1])), to: String(round(kfs[j + 1].value[1])),
          fromPercent: String(round(kfs[j].value[1])) + "%", toPercent: String(round(kfs[j + 1].value[1])) + "%",
          startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
          easing: kfs[j].easing, _easingMethod: kfs[j]._easingMethod });
      }
    }
    return anims;
  }

  function extractOpacity(layer) {
    var anims = [];
    var opacity = layer.property("ADBE Transform Group").property("ADBE Opacity");
    if (!opacity || opacity.numKeys < 2) return anims;
    var kfs = extractKeyframes(opacity, opacity.numKeys, layer);
    for (var j = 0; j < kfs.length - 1; j++) {
      anims.push({ property: "opacity",
        from: String(round(kfs[j].value)), to: String(round(kfs[j + 1].value)),
        startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
        easing: "motion.ease.linear", _easingMethod: "rule:opacity-always-linear" });
    }
    return anims;
  }

  function extractRotation(layer) {
    var anims = [];
    var rot = layer.property("ADBE Transform Group").property("ADBE Rotate Z");
    if (!rot || rot.numKeys < 2) return anims;
    var kfs = extractKeyframes(rot, rot.numKeys, layer);
    for (var j = 0; j < kfs.length - 1; j++) {
      anims.push({ property: "rotation",
        from: String(round(kfs[j].value)), to: String(round(kfs[j + 1].value)),
        startTime: kfs[j].time, duration: kfs[j + 1].time - kfs[j].time,
        easing: kfs[j].easing, _easingMethod: kfs[j]._easingMethod });
    }
    return anims;
  }

  // =========================================================================
  // LAYER ANALYSIS
  // =========================================================================

  function collectAllAnimations(layer) {
    var animations = [];
    var a;
    a = extractPosition(layer);  for (var i = 0; i < a.length; i++) animations.push(a[i]);
    a = extractScale(layer);     for (var i = 0; i < a.length; i++) animations.push(a[i]);
    a = extractOpacity(layer);   for (var i = 0; i < a.length; i++) animations.push(a[i]);
    a = extractRotation(layer);  for (var i = 0; i < a.length; i++) animations.push(a[i]);
    var current = layer.parent;
    var visited = {};
    while (current) {
      if (visited[current.index]) break;
      visited[current.index] = true;
      var parentLabelIdx = 0;
      try { parentLabelIdx = current.label; } catch (e) {}
      a = extractPosition(current);
      for (var i = 0; i < a.length; i++) { a[i].inheritedFrom = current.name; a[i].inheritedLabel = labelColorName(parentLabelIdx); animations.push(a[i]); }
      a = extractScale(current);
      for (var i = 0; i < a.length; i++) { a[i].inheritedFrom = current.name; a[i].inheritedLabel = labelColorName(parentLabelIdx); animations.push(a[i]); }
      a = extractRotation(current);
      for (var i = 0; i < a.length; i++) { a[i].inheritedFrom = current.name; a[i].inheritedLabel = labelColorName(parentLabelIdx); animations.push(a[i]); }
      current = current.parent;
    }
    return animations;
  }

  function getAnimSummary(layer) {
    var anims = collectAllAnimations(layer);
    if (anims.length === 0) return "Sem animacao";
    var parts = [];
    for (var i = 0; i < anims.length; i++) {
      var a = anims[i];
      var propName = a.property;
      if (a.axis) propName += a.axis;
      if (a.inheritedFrom) propName += "*";
      var easingShort = (a.easing || "?").replace("motion.ease.", "");
      parts.push(propName + ":" + easingShort);
    }
    return parts.join(", ");
  }

  // =========================================================================
  // JSON SERIALIZATION
  // =========================================================================

  function jsonStringify(obj, indent) {
    if (indent === undefined) indent = 2;
    function serialize(val, depth) {
      var spaces = "";
      var innerSpaces = "";
      for (var s = 0; s < depth * indent; s++) spaces += " ";
      for (var s = 0; s < (depth + 1) * indent; s++) innerSpaces += " ";
      if (val === null || val === undefined) return "null";
      if (typeof val === "boolean") return val ? "true" : "false";
      if (typeof val === "number") {
        if (isNaN(val) || !isFinite(val)) return "null";
        return String(val);
      }
      if (typeof val === "string") {
        var escaped = val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        return '"' + escaped + '"';
      }
      if (val instanceof Array) {
        if (val.length === 0) return "[]";
        var items = [];
        for (var i = 0; i < val.length; i++) items.push(innerSpaces + serialize(val[i], depth + 1));
        return "[\n" + items.join(",\n") + "\n" + spaces + "]";
      }
      if (typeof val === "object") {
        var keys = [];
        for (var k in val) { if (val.hasOwnProperty(k)) keys.push(k); }
        if (keys.length === 0) return "{}";
        var pairs = [];
        for (var i = 0; i < keys.length; i++) pairs.push(innerSpaces + '"' + keys[i] + '": ' + serialize(val[keys[i]], depth + 1));
        return "{\n" + pairs.join(",\n") + "\n" + spaces + "}";
      }
      return String(val);
    }
    return serialize(obj, 0);
  }

  // =========================================================================
  // UI — Andes Design System — Wizard de 2 passos
  // Usa graphics.backgroundColor para fundos (nao bloqueia filhos)
  // Usa onDraw apenas em botoes (leaf nodes sem filhos)
  // =========================================================================

  function buildUI(thisObj) {
    // Sempre cria palette flutuante (nao usa painel docked do AE)
    var WIN_W = 500;
    var win = new Window("palette", "Export JSON Meli", undefined, { resizeable: true });

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 12;
    win.margins = [20, 16, 20, 20];
    win.preferredSize = [WIN_W, -1];

    // Fundo branco
    try {
      var gWin = win.graphics;
      gWin.backgroundColor = gWin.newBrush(gWin.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
    } catch (e) {}

    // ── Andes DS Colors (valores RGBA 0-1) ──
    var COL_ACCENT     = [0.263, 0.298, 0.894, 1];   // #434CE4
    var COL_ACCENT_LT  = [0.314, 0.349, 0.933, 1];   // #505AEE
    var COL_WHITE      = [1, 1, 1, 1];                // #FFFFFF
    var COL_SURFACE    = [0.941, 0.945, 0.969, 1];    // #F0F1F7 (fundo cards)
    var COL_TEXT_PRI   = [0.157, 0.157, 0.200, 1];    // #282833
    var COL_TEXT_SEC   = [0.400, 0.404, 0.467, 1];    // #666777
    var COL_TEXT_DIM   = [0.700, 0.706, 0.757, 1];    // #B3B4C1
    var COL_POSITIVE   = [0.055, 0.514, 0.271, 1];    // #0E8345
    var COL_NEGATIVE   = [0.871, 0.067, 0.208, 1];    // #DE1135
    var COL_DISABLED_BG = [0.878, 0.886, 0.925, 1];   // #E0E2EC
    var COL_DISABLED_TXT = [0.600, 0.608, 0.667, 1];  // #999BAA

    // ── Fontes ──
    var FONT_TITLE, FONT_HEADING, FONT_BODY, FONT_SMALL, FONT_BTN;
    try {
      FONT_TITLE   = ScriptUI.newFont("dialog", "BOLD", 15);
      FONT_HEADING = ScriptUI.newFont("dialog", "BOLD", 12);
      FONT_BODY    = ScriptUI.newFont("dialog", "REGULAR", 12);
      FONT_SMALL   = ScriptUI.newFont("dialog", "REGULAR", 11);
      FONT_BTN     = ScriptUI.newFont("dialog", "BOLD", 13);
    } catch (e) {}

    // ── Helpers ──
    function setTextColor(el, col) {
      try { el.graphics.foregroundColor = el.graphics.newPen(el.graphics.PenType.SOLID_COLOR, col, 1); } catch (e) {}
    }
    function setFont(el, font) {
      try { el.graphics.font = font; } catch (e) {}
    }
    function setBgColor(el, col) {
      try { el.graphics.backgroundColor = el.graphics.newBrush(el.graphics.BrushType.SOLID_COLOR, col); } catch (e) {}
    }
    function addLabel(parent, text, font, color, opts) {
      var st = parent.add("statictext", undefined, text, opts || {});
      if (font) setFont(st, font);
      if (color) setTextColor(st, color);
      return st;
    }
    function drawCenteredText(g, text, pen, bw, bh, font) {
      try {
        var dim = g.measureString(text, font, bw);
        var mw = dim.width || (text.length * 8);
        var mh = dim.height || 16;
        g.drawString(text, pen, (bw - mw) / 2, (bh - mh) / 2, font);
      } catch (e) {
        try { g.drawString(text, pen, 10, (bh - 14) / 2, font); } catch (e2) {}
      }
    }

    // ── Bot\u00E3o Loud (accent com texto branco) ──
    function styleLoudButton(btn, h) {
      btn.preferredSize = [0, h || 40];
      btn.onDraw = function () {
        var g = this.graphics;
        var bw = this.size[0], bh = this.size[1];
        var bgCol = this.enabled ? COL_ACCENT : COL_DISABLED_BG;
        var txtCol = this.enabled ? COL_WHITE : COL_DISABLED_TXT;
        g.newPath(); g.rectPath(0, 0, bw, bh);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, bgCol));
        if (this.text) drawCenteredText(g, this.text, g.newPen(g.PenType.SOLID_COLOR, txtCol, 1), bw, bh, FONT_BTN || g.font);
      };
      return btn;
    }

    // ── Bot\u00E3o Outline (borda accent, texto accent) ──
    function styleOutlineButton(btn, h) {
      btn.preferredSize = [0, h || 36];
      btn.onDraw = function () {
        var g = this.graphics;
        var bw = this.size[0], bh = this.size[1];
        g.newPath(); g.rectPath(0, 0, bw, bh);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, COL_WHITE));
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, COL_ACCENT, 1));
        if (this.text) drawCenteredText(g, this.text, g.newPen(g.PenType.SOLID_COLOR, COL_ACCENT, 1), bw, bh, FONT_BODY || g.font);
      };
      return btn;
    }

    // ── Bot\u00E3o Link (texto accent, sem fundo) ──
    function styleLinkButton(btn) {
      btn.preferredSize = [0, 24];
      btn.onDraw = function () {
        var g = this.graphics;
        var bw = this.size[0], bh = this.size[1];
        // Limpa fundo (branco para combinar)
        g.newPath(); g.rectPath(0, 0, bw, bh);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, COL_WHITE));
        if (this.text) drawCenteredText(g, this.text, g.newPen(g.PenType.SOLID_COLOR, COL_ACCENT_LT, 1), bw, bh, FONT_SMALL || g.font);
      };
      return btn;
    }

    // ====================================================================
    // ESTADO INTERNO
    // ====================================================================
    var currentStep = 1;
    var selectedLayers = [];
    var workAreaData = null;

    // ====================================================================
    // HEADER — direto no win (sem wrappers)
    // ====================================================================
    var headerRow = win.add("group");
    headerRow.orientation = "row";
    headerRow.alignChildren = ["left", "center"];
    headerRow.spacing = 8;

    var btnBack = headerRow.add("button", undefined, "");
    btnBack.preferredSize = [24, 24];
    btnBack.visible = false;
    btnBack.onDraw = function () {
      var g = this.graphics;
      var bw = this.size[0], bh = this.size[1];
      g.newPath(); g.rectPath(0, 0, bw, bh);
      g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, COL_WHITE));
      var pen = g.newPen(g.PenType.SOLID_COLOR, COL_TEXT_PRI, 2);
      var cx = bw / 2, cy = bh / 2;
      g.newPath();
      g.moveTo(cx + 4, cy - 6);
      g.lineTo(cx - 2, cy);
      g.lineTo(cx + 4, cy + 6);
      g.strokePath(pen);
    };

    var titleLabel = addLabel(headerRow, "Export JSON Meli", FONT_TITLE, COL_TEXT_PRI);
    titleLabel.alignment = ["fill", "center"];

    var stepCounterLabel = addLabel(headerRow, "1/2", FONT_HEADING, COL_TEXT_SEC);

    // Divider nativo
    var divider = win.add("panel", undefined, "");
    divider.alignment = ["fill", "center"];
    divider.preferredSize = [0, 2];

    // ====================================================================
    // STEP 1 — Work Area
    // ====================================================================
    var step1Group = win.add("group");
    step1Group.orientation = "column";
    step1Group.alignChildren = ["fill", "top"];
    step1Group.spacing = 12;

    var s1Help = addLabel(step1Group,
      "Defina a Work Area para recortar o trecho da anima\u00E7\u00E3o.",
      FONT_BODY, COL_TEXT_SEC);

    // Card — Work Area info
    var s1Card = step1Group.add("panel", undefined, "");
    s1Card.alignChildren = ["fill", "top"];
    s1Card.margins = [14, 14, 14, 14];
    s1Card.spacing = 6;
    setBgColor(s1Card, COL_SURFACE);

    var waPlaceholder = addLabel(s1Card, "Nenhuma Work Area definida", FONT_BODY, COL_TEXT_SEC);
    waPlaceholder.alignment = ["center", "center"];

    var waStartText = addLabel(s1Card, "", FONT_BODY, COL_TEXT_PRI);
    waStartText.visible = false;
    var waEndText = addLabel(s1Card, "", FONT_BODY, COL_TEXT_PRI);
    waEndText.visible = false;

    // Bot\u00E3o atualizar WA
    var btnRefreshWA = step1Group.add("button", undefined, "Atualizar Work Area");
    styleLinkButton(btnRefreshWA);

    // CTA — Pr\u00F3ximo passo
    var btnNextStep = step1Group.add("button", undefined, "Pr\u00F3ximo passo");
    styleLoudButton(btnNextStep, 40);
    btnNextStep.enabled = false;

    // Status text
    var s1Status = addLabel(step1Group, "", FONT_SMALL, COL_POSITIVE);

    // ====================================================================
    // STEP 2 — Layers & Export
    // ====================================================================
    var step2Group = win.add("group");
    step2Group.orientation = "column";
    step2Group.alignChildren = ["fill", "top"];
    step2Group.spacing = 12;
    step2Group.visible = false;
    step2Group.maximumSize = [0, 0];

    // --- Estado VAZIO (antes de carregar layers) ---
    var s2EmptyState = step2Group.add("group");
    s2EmptyState.orientation = "column";
    s2EmptyState.alignChildren = ["fill", "top"];
    s2EmptyState.spacing = 16;

    addLabel(s2EmptyState,
      "Selecione layers na timeline do AE e clique em carregar.",
      FONT_BODY, COL_TEXT_SEC, { multiline: true });

    // Card vazio visual
    var s2EmptyCard = s2EmptyState.add("panel", undefined, "");
    s2EmptyCard.alignChildren = ["center", "center"];
    s2EmptyCard.margins = [20, 24, 20, 24];
    setBgColor(s2EmptyCard, COL_SURFACE);

    addLabel(s2EmptyCard,
      "Nenhum layer carregado",
      FONT_BODY, COL_TEXT_SEC);

    // Bot\u00E3o Carregar layers (FORA do card, com largura real)
    var btnLoadLayers = s2EmptyState.add("button", undefined, "Carregar layers selecionados");
    styleLoudButton(btnLoadLayers, 40);

    // --- Estado PREENCHIDO (ap\u00F3s carregar layers) ---
    var s2FilledState = step2Group.add("group");
    s2FilledState.orientation = "column";
    s2FilledState.alignChildren = ["fill", "top"];
    s2FilledState.spacing = 8;
    s2FilledState.visible = false;
    s2FilledState.maximumSize = [0, 0];

    addLabel(s2FilledState,
      "Layers carregados. Revise e exporte.",
      FONT_BODY, COL_TEXT_SEC);

    var LIST_ROW_H = 26;       // altura de cada row na listbox
    var LIST_HEADER_H = 28;    // altura do header da listbox
    var LIST_PAD = 8;          // padding interno da listbox

    // Colunas: WIN_W(500) - margins(40) = 460px dispon\u00EDvel
    var COL_CHECK_W = 30;
    var COL_LAYER_W = 180;
    var COL_ANIM_W  = 240;
    var LIST_W = COL_CHECK_W + COL_LAYER_W + COL_ANIM_W + 12; // +12 padding interno

    var listBox = s2FilledState.add("listbox", undefined, [],
      { multiselect: false, numberOfColumns: 3,
        showHeaders: true,
        columnTitles: ["\u2713", "Layer", "Anima\u00E7\u00F5es"],
        columnWidths: [COL_CHECK_W, COL_LAYER_W, COL_ANIM_W] });
    listBox.alignment = ["fill", "fill"];
    listBox.minimumSize = [LIST_W, 100];

    var s2InfoRow = s2FilledState.add("group");
    s2InfoRow.orientation = "row";
    s2InfoRow.alignChildren = ["left", "center"];

    var s2Info = addLabel(s2InfoRow, "", FONT_SMALL, COL_POSITIVE);
    s2Info.alignment = ["fill", "center"];

    var btnReloadLayers = s2InfoRow.add("button", undefined, "Recarregar");
    styleLinkButton(btnReloadLayers);
    btnReloadLayers.preferredSize = [70, 22];

    // CTA — Exportar JSON
    var btnExport = s2FilledState.add("button", undefined, "Exportar JSON");
    styleLoudButton(btnExport, 40);
    btnExport.enabled = false;

    // Status text
    var s2Status = addLabel(s2FilledState, "", FONT_SMALL, COL_TEXT_SEC, { multiline: true });
    s2Status.preferredSize = [0, 18];

    // ====================================================================
    // NAVEGA\u00C7\u00C3O ENTRE PASSOS
    // ====================================================================
    function goToStep(step) {
      currentStep = step;
      // Colapsa o step hidden com maximumSize [0,0] (ScriptUI macOS nao colapsa visible=false)
      step1Group.visible = (step === 1);
      step1Group.maximumSize = (step === 1) ? [9999, 9999] : [0, 0];
      step2Group.visible = (step === 2);
      step2Group.maximumSize = (step === 2) ? [9999, 9999] : [0, 0];
      btnBack.visible = (step > 1);
      stepCounterLabel.text = step + "/2";
      // Se entrou no step 2, mostrar estado vazio
      if (step === 2) {
        s2EmptyState.visible = true;
        s2EmptyState.maximumSize = [9999, 9999];
        s2FilledState.visible = false;
        s2FilledState.maximumSize = [0, 0];
      }
      win.layout.layout(true);
    }

    // ====================================================================
    // FUN\u00C7\u00D5ES DA UI
    // ====================================================================

    function formatTimeCode(sec) {
      var totalMs = round(sec * 1000, 0);
      var mins = Math.floor(totalMs / 60000);
      var secs = Math.floor((totalMs % 60000) / 1000);
      var cs = Math.floor((totalMs % 1000) / 10);
      function pad2(n) { return n < 10 ? "0" + n : String(n); }
      return pad2(mins) + ":" + pad2(secs) + ":" + pad2(cs);
    }

    function refreshWorkArea() {
      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        waPlaceholder.visible = true;
        waStartText.visible = false;
        waEndText.visible = false;
        btnNextStep.enabled = false;
        workAreaData = null;
        s1Status.text = "Abra uma composi\u00E7\u00E3o primeiro.";
        setTextColor(s1Status, COL_NEGATIVE);
        return null;
      }
      var waStart = comp.workAreaStart;
      var waDuration = comp.workAreaDuration;
      var waEnd = waStart + waDuration;
      var startMs = round(waStart * 1000, 0);
      var endMs = round(waEnd * 1000, 0);
      var durationMs = round(waDuration * 1000, 0);
      workAreaData = { startMs: startMs, endMs: endMs, durationMs: durationMs };

      waPlaceholder.visible = false;
      waStartText.visible = true;
      waEndText.visible = true;
      waStartText.text = "In\u00EDcio da anima\u00E7\u00E3o: " + formatTimeCode(waStart);
      waEndText.text = "Fim da anima\u00E7\u00E3o: " + formatTimeCode(waEnd);
      btnNextStep.enabled = true;
      s1Status.text = "Dura\u00E7\u00E3o: " + durationMs + "ms (" + formatTimeCode(waDuration) + ")";
      setTextColor(s1Status, COL_POSITIVE);
      try { win.layout.layout(true); } catch (e) {}
      return workAreaData;
    }

    function isNoOpAnimation(anim) {
      return String(anim.from || "") === String(anim.to || "");
    }

    function filterAnimsByWorkArea(anims, waStartMs, waEndMs) {
      var filtered = [];
      for (var i = 0; i < anims.length; i++) {
        var a = anims[i];
        if (isNoOpAnimation(a)) continue;
        var animStart = a.startTime || 0;
        var animEnd = animStart + (a.duration || 0);
        if (animEnd <= waStartMs || animStart >= waEndMs) continue;
        var cloned = {};
        for (var k in a) { if (a.hasOwnProperty(k)) cloned[k] = a[k]; }
        cloned.startTime = Math.max(0, animStart - waStartMs);
        if (animStart < waStartMs) cloned.duration = (a.duration || 0) - (waStartMs - animStart);
        if (animEnd > waEndMs) cloned.duration = waEndMs - Math.max(animStart, waStartMs);
        if (cloned.duration > 0) filtered.push(cloned);
      }
      if (filtered.length > 0) {
        var minStart = filtered[0].startTime;
        for (var i = 1; i < filtered.length; i++) {
          if (filtered[i].startTime < minStart) minStart = filtered[i].startTime;
        }
        if (minStart > 0) {
          for (var i = 0; i < filtered.length; i++) filtered[i].startTime -= minStart;
        }
      }
      return filtered;
    }

    function showEmptyState() {
      s2EmptyState.visible = true;
      s2EmptyState.maximumSize = [9999, 9999];
      s2FilledState.visible = false;
      s2FilledState.maximumSize = [0, 0];
      try { win.layout.layout(true); } catch (e) {}
    }

    function showFilledState() {
      s2EmptyState.visible = false;
      s2EmptyState.maximumSize = [0, 0];
      s2FilledState.visible = true;
      s2FilledState.maximumSize = [9999, 9999];
      try { win.layout.layout(true); } catch (e) {}
    }

    function loadSelection() {
      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        showEmptyState();
        s2Status.text = "Abra uma composi\u00E7\u00E3o primeiro.";
        setTextColor(s2Status, COL_NEGATIVE);
        return;
      }
      var sel = comp.selectedLayers;
      if (!sel || sel.length === 0) {
        showEmptyState();
        s2Status.text = "Nenhum layer selecionado na timeline.";
        setTextColor(s2Status, COL_NEGATIVE);
        return;
      }
      selectedLayers = [];
      listBox.removeAll();
      for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];
        if (isNullObject(layer)) continue;
        var anims = collectAllAnimations(layer);
        var summary = getAnimSummary(layer);
        var item = listBox.add("item", "\u2713");
        item.subItems[0].text = layer.name;
        item.subItems[1].text = summary;
        item.checked = true;
        selectedLayers.push({ layer: layer, checked: true, anims: anims, summary: summary });
      }
      if (selectedLayers.length > 0) {
        // Altura exata para mostrar TODOS os layers sem scroll
        var listH = LIST_HEADER_H + (selectedLayers.length * LIST_ROW_H) + LIST_PAD;
        if (listH < 100) listH = 100;
        if (listH > 550) listH = 550; // limite de seguran\u00E7a

        showFilledState();
        btnExport.enabled = true;
        var totalAnims = 0;
        for (var i = 0; i < selectedLayers.length; i++) totalAnims += selectedLayers[i].anims.length;
        s2Info.text = selectedLayers.length + " layers  \u00B7  " + totalAnims + " anima\u00E7\u00F5es";
        s2Status.text = "";

        // Primeiro redimensiona a janela, depois for\u00E7a o size da listbox
        try {
          var uiFixedH = 200;
          var newWinH = listH + uiFixedH;
          win.size = [WIN_W, newWinH];
          win.layout.layout(true);
          // For\u00E7ar tamanho REAL da listbox (n\u00E3o preferredSize)
          listBox.size = [LIST_W, listH];
          win.layout.layout(true);
        } catch (e) {}
      } else {
        showEmptyState();
        s2Status.text = "Nenhum layer animado encontrado.";
        setTextColor(s2Status, COL_NEGATIVE);
      }
    }

    function toggleItem(idx) {
      if (idx < 0 || idx >= selectedLayers.length) return;
      selectedLayers[idx].checked = !selectedLayers[idx].checked;
      listBox.items[idx].text = selectedLayers[idx].checked ? "\u2713" : " ";
      var hasChecked = false;
      for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i].checked) { hasChecked = true; break; }
      }
      btnExport.enabled = hasChecked;
    }

    function doExport() {
      var comp = app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        s2Status.text = "Nenhuma comp ativa.";
        setTextColor(s2Status, COL_NEGATIVE);
        return;
      }
      var wa = workAreaData;
      if (!wa) {
        var waComp = comp.workAreaStart;
        var waDur = comp.workAreaDuration;
        wa = {
          startMs: round(waComp * 1000, 0),
          endMs: round((waComp + waDur) * 1000, 0),
          durationMs: round(waDur * 1000, 0)
        };
      }
      var waStartMs = wa.startMs;
      var waEndMs = wa.endMs;
      var waDurationMs = wa.durationMs;
      var layers = [];
      var colorIdx = 0;
      for (var i = 0; i < selectedLayers.length; i++) {
        if (!selectedLayers[i].checked) continue;
        var layer = selectedLayers[i].layer;
        var anims = selectedLayers[i].anims;
        var filteredAnims = filterAnimsByWorkArea(anims, waStartMs, waEndMs);
        var parentInfo = null;
        if (layer.parent) {
          parentInfo = { name: layer.parent.name, index: layer.parent.index, isNull: isNullObject(layer.parent) };
        }
        var layerLabel = 0;
        try { layerLabel = layer.label; } catch (e) {}
        var parentLabel = 0;
        if (layer.parent) { try { parentLabel = layer.parent.label; } catch (e) {} }
        layers.push({
          name: layer.name,
          color: TRACK_COLORS[colorIdx % TRACK_COLORS.length],
          labelIndex: layerLabel, labelColor: labelColorName(layerLabel),
          labelEasing: labelToEasing(layerLabel) || "fallback:bezier",
          parentLabelIndex: layer.parent ? parentLabel : null,
          parentLabelColor: layer.parent ? labelColorName(parentLabel) : null,
          parentLabelEasing: layer.parent ? (labelToEasing(parentLabel) || "fallback:bezier") : null,
          inPoint: round(Math.max(0, layer.inPoint * 1000 - waStartMs), 0),
          outPoint: round(Math.min(waDurationMs, layer.outPoint * 1000 - waStartMs), 0),
          parent: parentInfo,
          animations: filteredAnims
        });
        colorIdx++;
      }
      if (layers.length === 0) {
        s2Status.text = "Nenhum componente marcado para exportar.";
        setTextColor(s2Status, COL_NEGATIVE);
        return;
      }
      var totalAnims = 0;
      for (var i = 0; i < layers.length; i++) totalAnims += layers[i].animations.length;
      var json = {
        source: "after-effects", version: "1.0", exportedAt: dateToISO(),
        composition: {
          name: comp.name, duration: waDurationMs, frameRate: comp.frameRate,
          width: comp.width, height: comp.height,
          workArea: { start: waStartMs, end: waEndMs, duration: waDurationMs }
        },
        trigger: { type: "tap", target: "" },
        layers: layers,
        metadata: { totalLayers: comp.numLayers, animatedLayers: layers.length,
          totalAnimations: totalAnims, scriptVersion: "3.0.0" }
      };
      var jsonStr = jsonStringify(json);
      var file = File.saveDialog("Salvar JSON para Figma Plugin", "JSON:*.json");
      if (!file) {
        s2Status.text = "Exporta\u00E7\u00E3o cancelada.";
        setTextColor(s2Status, COL_TEXT_SEC);
        return;
      }
      file.encoding = "UTF-8";
      file.open("w");
      file.write(jsonStr);
      file.close();
      var easingSummary = {};
      for (var es = 0; es < layers.length; es++) {
        for (var ea = 0; ea < layers[es].animations.length; ea++) {
          var eKey = (layers[es].animations[ea].easing || "?").replace("motion.ease.", "");
          easingSummary[eKey] = (easingSummary[eKey] || 0) + 1;
        }
      }
      var esParts = [];
      for (var ek in easingSummary) {
        if (easingSummary.hasOwnProperty(ek)) esParts.push(easingSummary[ek] + "x " + ek);
      }
      s2Status.text = "\u2705 Exportado! " + layers.length + " layers, " + totalAnims + " anims.\nCurvas: " + esParts.join(", ");
      setTextColor(s2Status, COL_POSITIVE);
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================
    btnBack.onClick = function () { goToStep(1); };
    btnRefreshWA.onClick = function () { refreshWorkArea(); };
    btnNextStep.onClick = function () { goToStep(2); };
    btnLoadLayers.onClick = loadSelection;
    btnReloadLayers.onClick = loadSelection;
    listBox.onChange = function () {
      if (listBox.selection !== null) toggleItem(listBox.selection.index);
    };
    btnExport.onClick = doExport;

    // ── Resize handler ──
    win.onResizing = win.onResize = function () {
      try { this.layout.layout(true); } catch (e) {}
    };

    // ── Inicializa\u00E7\u00E3o ──
    refreshWorkArea();
    win.layout.layout(true);
    win.center();
    win.show();
    return win;
  }

  // =========================================================================
  // ENTRY POINT
  // =========================================================================
  buildUI(this);

})();
