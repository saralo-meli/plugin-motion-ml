/// <reference types="@figma/plugin-typings" />
// Motion Handoff Timeline Builder - Plugin Code (sandbox)
// Etapa 8: Refinamento visual — Tick columns, Delay, Trigger Panel

figma.showUI(__html__, { width: 520, height: 860 });

// ============================================================
// CONSTANTES DE ESCALA PADRÃO (extraídas do template Figma)
// ============================================================
const DEFAULT_TICK_WIDTH_PX = 100;
const DEFAULT_TICK_GAP_PX = 48;
const DEFAULT_MS_PER_TICK = 25;

// Layout
const LABEL_AREA_WIDTH = 262;     // Largura do Name-component (library)
const LABEL_GAP = 74;             // Gap entre name e timelines (model 9:517)
const TICK_LINE_OFFSET = DEFAULT_TICK_WIDTH_PX / 2;  // 50px — offset da borda do tick element até a linha central (0ms)
const TRACK_GAP = 0;              // Gap vertical entre tracks (sem gap, usando separators)
const ANIM_ROW_HEIGHT = 60;       // Altura de cada barra de animação
const ANIM_ROW_GAP = 16;          // Gap entre barras dentro de um track
const TRACK_PADDING_TOP = 32;     // Padding top do track
const TRACK_PADDING_BOTTOM = 32;  // Padding bottom do track
const RULER_HEIGHT = 40;          // Altura da régua (texto)
const CONTAINER_PADDING = 40;     // Padding do container principal
const STEP_TITLE_HEIGHT = 48;     // Altura do título do step (quando presente)

// Trigger panel layout (referência Pagos: 429×1192, trigger natural 347×146)
const TRIGGER_PANEL_WIDTH = 429;  // Largura do painel de trigger (igual referência Pagos)
const TRIGGER_PANEL_GAP = 72;     // Gap entre trigger panel e content area
                                   // = COMP_CONTAINER_PADDING_H(24) + CARDS_PADDING(24) + visual gap(24)
                                   // Garante que o Cards container não sobrepõe o Trigger Panel

// Cores
const TICK_LINE_COLOR: RGB = { r: 0.710, g: 0.725, b: 0.831 };  // #b5b9d4
const TICK_TEXT_COLOR: RGB = { r: 0.392, g: 0.396, b: 0.529 };   // #646587
const WHITE: RGB = { r: 1, g: 1, b: 1 };
const DARK_TEXT: RGB = { r: 0.157, g: 0.157, b: 0.204 };         // #282834
const CONTAINER_BG: RGB = { r: 1, g: 1, b: 1 };                  // branco
const EASING_PILL_BG: RGB = { r: 0.263, g: 0.271, b: 0.396 };   // #434565
const TRIGGER_BG: RGB = { r: 0.945, g: 0.957, b: 1.0 };          // #f1f4ff (atualizado p/ referência)
const TRIGGER_BTN_BG: RGB = { r: 0.157, g: 0.157, b: 0.204 };    // #282834
const DELAY_LINE_COLOR: RGB = { r: 0.557, g: 0.569, b: 0.659 };  // #8e91a8
const COMP_CONTAINER_BG: RGB = { r: 189 / 255, g: 194 / 255, b: 218 / 255 }; // #BDC2DA (20% opacidade)
const COMP_CONTAINER_PADDING_H = 24;  // Padding horizontal do container de componente
const COMP_CONTAINER_RADIUS = 24;     // Border radius do container de componente
const COMPONENT_GAP = 24;             // Gap entre containers de componentes

// "Cards" container — agrupa visualmente os tracks (referência Pagos: node 6:104402)
const CARDS_BG: RGB = { r: 0.824, g: 0.862, b: 1.0 };      // #D2DBFF (30% opacidade)
const CARDS_BG_OPACITY = 0.3;
const CARDS_CORNER_RADIUS = 50;
const CARDS_PADDING = 24;             // Padding interno do "Cards" container em volta dos tracks

// Constante nome da timeline para re-geração
const TIMELINE_NAME = "Motion Timeline";

// ============================================================
// LIBRARY COMPONENT KEYS (Library HO components)
// ============================================================
const LIBRARY_KEYS = {
  nameComponent: 'b0a8d37d1fa28de3f36725d2c4ac881fcbccbd17',
  delayComponent: 'c5fc7c2487defff8cabf325c1f7cfd003c10a686',
  timeContainer: '601e1b55747a4dcbb590599f7b0d3d278ff38209',
  trigger: {
    tap: '48a496fbac7f436ec0f275c3353fdfe26b887866',
    automatic: '643477281fdfff7eeeb167f1503912180a5630f8',
    swipe: '8df5ab44b60d8f2705f3be0897452913b0802866',
    scroll: '86d8a3ea1d10bdd095221c01a6810ec8ff700ae0',
  } as Record<string, string>,
  timeline: {
    opacity: 'e4e5b35acbd2c83b835fc9f5effc1666338077ad',
    position: '86362f42dd6ff9aa573358110284288553bd2de9',
    color: 'f0d6f4cba60e2121e249716a503c70bbe28a4115',
    rotation: 'c3ed31c07d7db85db5e33261689260987b841360',
    scale: '61679927694c8daba08a212e26b5311888d69d0b',
    other: 'db10c381c25bd297a9a90998200bd894034c2f91',
    state: 'e0d8726dc446a7f0064d7ebb22a8051b019f0748',
  } as Record<string, string>,
};

/** Mapeia tipo de propriedade para chave da variante do Timeline-container */
function mapPropertyToVariant(propType: string): string {
  switch (propType.toLowerCase()) {
    case 'opacity': return 'opacity';
    case 'position': return 'position';
    case 'color': return 'color';
    case 'rotation': return 'rotation';
    case 'scale': return 'scale';
    case 'state': return 'state';
    default: return 'other';
  }
}

/** Retorna as property keys de From/To para cada tipo de variante */
function getFromToPropertyKeys(variant: string): { fromKey: string; toKey: string } {
  switch (variant) {
    case 'opacity': return { fromKey: 'Opacity From#313:6', toKey: 'Opacity To#313:12' };
    case 'position': return { fromKey: 'Position From#313:18', toKey: 'Position To#313:24' };
    case 'color': return { fromKey: 'Color From#313:30', toKey: 'Color To#313:36' };
    case 'rotation': return { fromKey: 'Rotation From#313:42', toKey: 'Rotation To#313:48' };
    case 'scale': return { fromKey: 'Scale From#313:54', toKey: 'Scale To#313:60' };
    case 'state': return { fromKey: 'State From#363:0', toKey: 'State To#363:8' };
    default: return { fromKey: 'Other From#323:6', toKey: 'Other To#323:13' };
  }
}

/** Mapeia string de easing para valor da variante Token/Curves */
function easingToVariant(easing: string): string {
  const e = (easing || '').toLowerCase();
  if (e.includes('enter')) return 'Enter';
  if (e.includes('exit')) return 'Exit';
  if (e.includes('linear')) return 'Linear';
  if (e.includes('onscreen') || e.includes('on screen') || e.includes('on_screen')) return 'On screen';
  if (e.includes('instante') || e.includes('instant')) return 'Instante';
  return 'On screen';
}

// ============================================================
// INTERFACES
// ============================================================
interface AnimProperty {
  type: string;
  from?: string;
  to?: string;
  fromX?: string;
  fromY?: string;
  toX?: string;
  toY?: string;
  axis?: string;         // position: "X" | "Y"
  dimension?: string;    // scale: "W" | "H"
  fromPercent?: string;  // scale: porcentagem do from
  toPercent?: string;    // scale: porcentagem do to
}

interface Animation {
  id: string;
  preset: string;
  properties: AnimProperty[];
  duration: number;
  delay: number;
  easing: string;
}

interface Track {
  id: string;
  name: string;
  color: string;
  animations: Animation[];
}

interface GenerateMessage {
  type: "generate-timeline";
  targetNodeId: string;
  tracks: Track[];
  msPerTick?: number;
  triggerType?: string;
  triggerLabel?: string;
  triggerAction?: string;
  triggerComponentName?: string;
  stepTitle?: string;
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/** Converte cor hex (#RRGGBB) para RGB Figma (0-1) */
function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/** Cria um texto no Figma com fonte já carregada */
function createLabel(
  text: string,
  fontSize: number,
  color: RGB,
  fontStyle: string = "Medium",
  fontFamily: string = "Inter"
): TextNode {
  const t = figma.createText();
  t.fontName = { family: fontFamily, style: fontStyle };
  t.characters = text;
  t.fontSize = fontSize;
  t.fills = [{ type: "SOLID", color }];
  return t;
}

/** Calcula cor de contraste (branco ou escuro) baseado na luminância */
function getContrastColor(rgb: RGB): RGB {
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 0.55 ? DARK_TEXT : WHITE;
}

/** Retorna o valor formatado do "From" de uma propriedade */
function getFormattedFromValue(prop: AnimProperty): string {
  switch (prop.type) {
    case "position": {
      const axis = prop.axis || "Y";
      const val = prop.axis === "X"
        ? (prop.fromX || prop.from || "0")
        : (prop.fromY || prop.from || "0");
      return `${axis}: ${val}px`;
    }
    case "opacity":
      return `${prop.from || "0"}%`;
    case "scale": {
      const dim = prop.dimension || "W";
      const pct = prop.fromPercent ? ` (${prop.fromPercent}%)` : "";
      return `${dim}: ${prop.from || "0"}${pct}`;
    }
    case "rotation":
      return `${prop.from || "0"}°`;
    case "color":
      return prop.from || "color.token";
    case "state":
      return prop.from || "Initial state";
    default:
      return prop.from || "0";
  }
}

/** Retorna o valor formatado do "To" de uma propriedade */
function getFormattedToValue(prop: AnimProperty): string {
  switch (prop.type) {
    case "position": {
      const axis = prop.axis || "Y";
      const val = prop.axis === "X"
        ? (prop.toX || prop.to || "0")
        : (prop.toY || prop.to || "0");
      return `${axis}: ${val}px`;
    }
    case "opacity":
      return `${prop.to || "0"}%`;
    case "scale": {
      const dim = prop.dimension || "W";
      const pct = prop.toPercent ? ` (${prop.toPercent}%)` : "";
      return `${dim}: ${prop.to || "0"}${pct}`;
    }
    case "rotation":
      return `${prop.to || "0"}°`;
    case "color":
      return prop.to || "color.token";
    case "state":
      return prop.to || "Final state";
    default:
      return prop.to || "0";
  }
}

// createPropertyRow() removido — substituído por instâncias de componente da biblioteca

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Remove timeline existente (para re-geração) */
function removeExistingTimeline(parent: FrameNode | SectionNode): boolean {
  const existing: SceneNode[] = [];
  for (const child of parent.children) {
    if (child.name === TIMELINE_NAME) {
      existing.push(child);
    }
  }
  for (const node of existing) {
    node.remove();
  }
  return existing.length > 0;
}

// ============================================================
// TRIGGER PANEL (painel lateral — referência Figma node 1:539)
// ============================================================

// ---------- Ícones de Trigger (SVG → Vector, 28×28, branco) ----------

/** Helper — cria frame de ícone a partir de SVG e normaliza para auto-layout */
function svgIcon(svgString: string, name: string): FrameNode {
  const icon = figma.createNodeFromSvg(svgString);
  icon.name = name;
  icon.resize(28, 28);
  icon.fills = [];
  icon.layoutSizingHorizontal = "FIXED";
  icon.layoutSizingVertical = "FIXED";
  return icon;
}

function createTapIcon(): FrameNode {
  // Arcos concêntricos (WiFi) abrindo para cima-direita + cursor ponteiro
  return svgIcon(`<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 18C8.87 18 12 21.13 12 25" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 13C11.08 13 16 17.92 16 25" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 8C13.28 8 21 15.72 21 25" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M19 3L19 13L21.5 10.5L24 15L26 14L23.5 9L26 9Z" fill="white"/>
  </svg>`, "Tap Icon");
}

function createAutomaticIcon(): FrameNode {
  // Círculo central (stroke) + 6 bolinhas ao redor (fill) — padrão flor/timer
  return svgIcon(`<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="5" stroke="white" stroke-width="2" fill="none"/>
    <circle cx="14" cy="2.5" r="2.5" fill="white"/>
    <circle cx="23.95" cy="8.25" r="2.5" fill="white"/>
    <circle cx="23.95" cy="19.75" r="2.5" fill="white"/>
    <circle cx="14" cy="25.5" r="2.5" fill="white"/>
    <circle cx="4.05" cy="19.75" r="2.5" fill="white"/>
    <circle cx="4.05" cy="8.25" r="2.5" fill="white"/>
  </svg>`, "Automatic Icon");
}

function createSwipeIcon(): FrameNode {
  // Mão/dedo com setas horizontais — gesto de swipe
  return svgIcon(`<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10H21" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 6L22 10L18 14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M25 18H7" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <path d="M10 14L6 18L10 22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`, "Swipe Icon");
}

function createScrollIcon(): FrameNode {
  // Mouse com scroll wheel + seta para cima
  return svgIcon(`<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="5" width="14" height="22" rx="7" stroke="white" stroke-width="2" fill="none"/>
    <rect x="12" y="9" width="4" height="6" rx="2" stroke="white" stroke-width="1.5" fill="none"/>
    <path d="M14 1.5L14 3.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M11.5 3.5L14 1L16.5 3.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`, "Scroll Icon");
}

/** Cria o ícone correto baseado no triggerType */
function createTriggerIcon(triggerType: string): FrameNode {
  switch (triggerType) {
    case "tap":       return createTapIcon();
    case "automatic": return createAutomaticIcon();
    case "swipe":     return createSwipeIcon();
    case "scroll":    return createScrollIcon();
    default:          return createTapIcon();
  }
}

// ---------- Trigger Panel completo ----------

function createTriggerPanel(
  triggerAction: string,
  triggerType: string,
  panelHeight: number
): FrameNode {
  const panel = figma.createFrame();
  panel.name = "Trigger Panel";
  panel.resize(TRIGGER_PANEL_WIDTH, panelHeight);
  panel.fills = [{ type: "SOLID", color: TRIGGER_BG }];
  panel.cornerRadius = 19;
  panel.clipsContent = false; // Não cortar conteúdo!

  // Auto layout vertical
  panel.layoutMode = "VERTICAL";
  panel.primaryAxisSizingMode = "FIXED";
  panel.counterAxisSizingMode = "FIXED";
  panel.paddingLeft = 20;
  panel.paddingRight = 20;
  panel.paddingTop = 32;
  panel.paddingBottom = 32;
  panel.itemSpacing = 20;
  panel.primaryAxisAlignItems = "MIN";
  panel.counterAxisAlignItems = "CENTER";

  // Description text: "The animation of Step 1 begins when:"
  const descText = createLabel(
    "The animation of Step 1\nbegins when:",
    16, TICK_TEXT_COLOR, "Regular"
  );
  descText.name = "Trigger Description";
  descText.textAlignHorizontal = "CENTER";
  descText.layoutAlign = "STRETCH";
  descText.textAutoResize = "HEIGHT";
  panel.appendChild(descText);

  // Action button (dark pill — #282834, border-radius 20px)
  if (triggerAction) {
    const actionBtn = figma.createFrame();
    actionBtn.name = "Trigger-Flow";
    actionBtn.layoutMode = "HORIZONTAL";
    actionBtn.counterAxisSizingMode = "AUTO";  // Altura ajusta ao conteúdo
    actionBtn.primaryAxisSizingMode = "FIXED"; // Largura vem do parent (stretch)
    actionBtn.paddingLeft = 20;
    actionBtn.paddingRight = 16;
    actionBtn.paddingTop = 16;
    actionBtn.paddingBottom = 16;
    actionBtn.itemSpacing = 12;
    actionBtn.fills = [{ type: "SOLID", color: TRIGGER_BTN_BG }];
    actionBtn.cornerRadius = 20;
    actionBtn.layoutAlign = "STRETCH"; // Preenche largura do panel
    actionBtn.primaryAxisAlignItems = "CENTER";
    actionBtn.counterAxisAlignItems = "CENTER";

    // Action text (wraps dentro do botão)
    const actionText = createLabel(triggerAction, 16, WHITE, "Semi Bold");
    actionText.name = "Action Text";
    actionText.textAlignHorizontal = "CENTER";
    actionText.textAutoResize = "HEIGHT";
    actionText.layoutGrow = 1;
    actionBtn.appendChild(actionText);

    // Ícone correspondente ao tipo de trigger
    const iconFrame = createTriggerIcon(triggerType);
    iconFrame.layoutSizingHorizontal = "FIXED";
    iconFrame.layoutSizingVertical = "FIXED";
    actionBtn.appendChild(iconFrame);

    panel.appendChild(actionBtn);
  }

  return panel;
}

/** Fallback: cria delay visualmente caso o componente da biblioteca não esteja publicado */
function createDelayFallback(delayMs: number, width: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = "Delay";
  frame.resize(width, 61);
  frame.fills = [];
  frame.clipsContent = false;

  // Linha pontilhada
  const line = figma.createRectangle();
  line.name = "Delay Line";
  line.resize(width, 1);
  line.y = 30;
  line.fills = [{ type: "SOLID", color: DELAY_LINE_COLOR }];
  line.dashPattern = [4, 4];
  frame.appendChild(line);

  // Texto com o valor do delay
  const label = createLabel(`${delayMs}MS`, 10, DELAY_LINE_COLOR, "Medium");
  label.name = "Delay Text";
  label.x = Math.max(0, width - 40);
  label.y = 34;
  frame.appendChild(label);

  return frame;
}

// ============================================================
// GERAÇÃO DA TIMELINE
// ============================================================

async function generateTimeline(
  targetNodeId: string,
  tracks: Track[],
  msPerTick: number = DEFAULT_MS_PER_TICK,
  triggerLabel: string = "",
  triggerAction: string = "",
  triggerType: string = "tap",
  triggerComponentName: string = "",
  stepTitle: string = ""
) {
  // --- Carregar fontes necessárias ---
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch (fontErr: any) {
    throw new Error(`Falha ao carregar fontes Inter: ${fontErr?.message || fontErr}`);
  }

  // Tentar carregar JetBrains Mono (fallback para Inter se não disponível)
  let tickFontFamily = "Inter";
  let tickFontStyle = "Medium";
  try {
    await figma.loadFontAsync({ family: "JetBrains Mono", style: "Medium" });
    tickFontFamily = "JetBrains Mono";
    tickFontStyle = "Medium";
  } catch {
    // fallback: usar Inter
  }

  // Pre-compute hasTrigger (needed during component import)
  const hasTrigger = !!(triggerLabel || triggerAction);

  // --- Importar componentes da biblioteca Library HO components ---
  let nameComp: ComponentNode;
  let delayComp: ComponentNode | null = null;
  let timeContainerComp: ComponentNode | null = null;
  let triggerFlowComp: ComponentNode | null = null;
  const timelineComps: Record<string, ComponentNode> = {};
  try {
    nameComp = await figma.importComponentByKeyAsync(LIBRARY_KEYS.nameComponent);
  } catch (err: any) {
    figma.ui.postMessage({
      type: "generate-result",
      success: false,
      error: `Erro ao importar Name-component da biblioteca "Library HO components". Verifique se a biblioteca está habilitada neste arquivo. (${err?.message || err})`,
    });
    return;
  }

  // Importar apenas as variantes necessárias do Timeline-container
  const neededVariants = new Set<string>();
  for (const track of tracks) {
    for (const anim of track.animations) {
      for (const prop of anim.properties) {
        neededVariants.add(mapPropertyToVariant(prop.type));
      }
      if (anim.properties.length === 0) {
        neededVariants.add('other');
      }
    }
  }
  for (const variant of neededVariants) {
    const key = LIBRARY_KEYS.timeline[variant] || LIBRARY_KEYS.timeline.other;
    try {
      timelineComps[variant] = await figma.importComponentByKeyAsync(key);
    } catch (err: any) {
      figma.ui.postMessage({
        type: "generate-result",
        success: false,
        error: `Erro ao importar Timeline-container variante "${variant}" da biblioteca. (${err?.message || err})`,
      });
      return;
    }
  }

  // Delay component — tentar importar; fallback manual se não estiver publicado
  try {
    delayComp = await figma.importComponentByKeyAsync(LIBRARY_KEYS.delayComponent);
  } catch {
    console.log("[Motion Timeline] Timeline-delay não publicado na biblioteca; usando fallback local.");
  }

  // Time-container — tentar importar; fallback manual se não estiver publicado
  try {
    timeContainerComp = await figma.importComponentByKeyAsync(LIBRARY_KEYS.timeContainer);
  } catch {
    console.log("[Motion Timeline] Time-container não publicado na biblioteca; usando fallback local.");
  }

  // Trigger-Flow — importar a variante correspondente ao tipo de trigger
  if (hasTrigger) {
    const triggerKey = LIBRARY_KEYS.trigger[triggerType] || LIBRARY_KEYS.trigger.tap;
    try {
      triggerFlowComp = await figma.importComponentByKeyAsync(triggerKey);
    } catch {
      console.log("[Motion Timeline] Trigger-Flow não publicado na biblioteca; usando fallback local.");
    }
  }

  // --- Encontrar o nó target ---
  const targetNode = figma.getNodeById(targetNodeId);
  if (!targetNode || (targetNode.type !== "FRAME" && targetNode.type !== "SECTION")) {
    figma.ui.postMessage({
      type: "generate-result",
      success: false,
      error: "Frame target não encontrado. Selecione novamente.",
    });
    return;
  }

  // --- Re-geração: remover timeline anterior ---
  const hadExisting = removeExistingTimeline(targetNode as FrameNode | SectionNode);
  if (hadExisting) {
    figma.notify("🔄 Timeline anterior removida. Gerando nova...", { timeout: 1500 });
  }

  // --- Calcular escala ---
  const tickWidthPx = DEFAULT_TICK_WIDTH_PX;
  const tickGapPx = DEFAULT_TICK_GAP_PX;
  const tickSpacingPx = tickWidthPx + tickGapPx; // 148px
  const pxPerMs = tickSpacingPx / msPerTick;

  // --- Calcular dimensões ---
  let maxEndMs = 0;
  for (const track of tracks) {
    for (const anim of track.animations) {
      const end = (anim.delay || 0) + (anim.duration || 0);
      if (end > maxEndMs) maxEndMs = end;
    }
  }

  // Arredondar para o próximo múltiplo de msPerTick + margem
  maxEndMs = Math.ceil(maxEndMs / msPerTick) * msPerTick + msPerTick * 2;
  const numTicks = Math.floor(maxEndMs / msPerTick) + 1;

  const timelineAreaWidth = (numTicks - 1) * tickSpacingPx + tickWidthPx;

  // Trigger panel dimensions
  const triggerContentWidth = hasTrigger ? TRIGGER_PANEL_WIDTH + TRIGGER_PANEL_GAP : 0;

  // Layout X positions
  const contentX0 = CONTAINER_PADDING + triggerContentWidth;
  const timelineX0 = contentX0 + LABEL_AREA_WIDTH + LABEL_GAP;

  const totalWidth = timelineX0 + timelineAreaWidth + TICK_LINE_OFFSET + CONTAINER_PADDING;

  // Altura total: régua top + tracks + separators + régua bottom
  // Conta property rows: cada propriedade de cada animação = 1 row
  let tracksHeight = 0;
  for (const track of tracks) {
    let propCount = 0;
    for (const anim of track.animations) {
      propCount += Math.max(anim.properties.length, 1);
    }
    propCount = Math.max(propCount, 1);
    tracksHeight +=
      TRACK_PADDING_TOP +
      propCount * ANIM_ROW_HEIGHT +
      (propCount - 1) * ANIM_ROW_GAP +
      TRACK_PADDING_BOTTOM;
  }
  const componentGapsHeight = Math.max(0, tracks.length - 1) * COMPONENT_GAP;
  tracksHeight += componentGapsHeight;

  const hasStepTitle = !!stepTitle;
  const stepTitleOffset = hasStepTitle ? STEP_TITLE_HEIGHT + 16 : 0;

  const totalHeight =
    CONTAINER_PADDING + stepTitleOffset + RULER_HEIGHT + 24 + tracksHeight + 24 + RULER_HEIGHT + CONTAINER_PADDING;

  // --- Criar container principal ---
  const container = figma.createFrame();
  container.name = TIMELINE_NAME;
  container.resize(totalWidth, totalHeight);
  container.fills = [{ type: "SOLID", color: CONTAINER_BG }];
  container.clipsContent = true;
  container.cornerRadius = 16;
  container.strokes = [{ type: "SOLID", color: WHITE, opacity: 0.1 }];
  container.strokeWeight = 1;

  // Posicionar no target — centralizado (centro-centro)
  if (targetNode.type === "FRAME" || targetNode.type === "SECTION") {
    targetNode.appendChild(container);
    container.x = Math.round((targetNode.width - totalWidth) / 2);
    container.y = Math.round((targetNode.height - totalHeight) / 2);
  }

  // =================== Offset de conteúdo (step title) ===================
  const contentY0 = CONTAINER_PADDING + stepTitleOffset;

  // =================== STEP TITLE (se existir) ===================
  if (hasStepTitle) {
    const titleText = createLabel(stepTitle, 24, DARK_TEXT, "Bold");
    titleText.name = "Step Title";
    titleText.x = contentX0;
    titleText.y = CONTAINER_PADDING + 8;
    titleText.textAutoResize = "WIDTH_AND_HEIGHT";
    container.appendChild(titleText);
  }

  // =================== TRIGGER PANEL (se existir) ===================
  // Altura compartilhada = mesma do "Cards" container (referência Pagos)
  const cardsContainerHeight = tracksHeight + CARDS_PADDING * 2;
  const triggerYStart = contentY0 + RULER_HEIGHT + 24 - CARDS_PADDING; // mesmo Y que o Cards container

  if (hasTrigger) {
    if (triggerFlowComp) {
      // --- Usar Trigger-Flow da biblioteca (linked) ---
      // Referência Pagos: frame "Acess to prototype" 429×1192, layoutMode NONE,
      // contém Rectangle BG, texto descritivo e Trigger-Flow em tamanho natural.

      const panel = figma.createFrame();
      panel.name = "Trigger Panel";
      panel.resize(TRIGGER_PANEL_WIDTH, cardsContainerHeight); // mesma altura que Cards
      panel.fills = [{ type: "SOLID", color: TRIGGER_BG }];
      panel.cornerRadius = 19;
      panel.clipsContent = false;
      panel.layoutMode = "NONE"; // Sem auto-layout (como na referência Pagos)

      // Description text — posicionado no topo centralizado (ref: x=57, y=67)
      const descText = createLabel(
        "The animation of Step 1\nbegins when:",
        16, TICK_TEXT_COLOR, "Regular"
      );
      descText.name = "Trigger Description";
      descText.textAlignHorizontal = "CENTER";
      descText.textAutoResize = "WIDTH_AND_HEIGHT";
      descText.x = Math.round((TRIGGER_PANEL_WIDTH - descText.width) / 2); // centralizar
      descText.y = 40;
      panel.appendChild(descText);
      // Ajustar x novamente depois de appendChild (width pode mudar com textAutoResize)
      descText.x = Math.round((TRIGGER_PANEL_WIDTH - descText.width) / 2);

      // Trigger-Flow instance (library linked) — tamanho NATURAL, sem stretching
      const triggerInstance = triggerFlowComp.createInstance();
      triggerInstance.name = "Trigger-Flow";
      // Component#317:2 = nome do componente trigger (vindo da UI)
      // Para "automatic" o campo é escondido na UI, então o nome vem vazio
      const compNameForTrigger = (triggerType === "automatic") ? "" : (triggerComponentName || "");
      try {
        triggerInstance.setProperties({ "Component#317:2": compNameForTrigger });
      } catch (propErr: any) {
        console.warn(`[Motion Timeline] Falha ao definir props do Trigger-Flow: ${propErr?.message}`);
      }
      // Centralizar horizontalmente e posicionar abaixo do texto (ref: x=41, y=160)
      triggerInstance.x = Math.round((TRIGGER_PANEL_WIDTH - triggerInstance.width) / 2);
      triggerInstance.y = descText.y + descText.height + 24;
      panel.appendChild(triggerInstance);

      // Posicionar panel — mesma posição Y que o Cards container
      panel.x = CONTAINER_PADDING;
      panel.y = triggerYStart;
      container.appendChild(panel);
    } else {
      // Fallback: criar trigger panel manualmente
      const triggerPanel = createTriggerPanel(triggerAction, triggerType, cardsContainerHeight);
      triggerPanel.x = CONTAINER_PADDING;
      triggerPanel.y = triggerYStart;
      container.appendChild(triggerPanel);
    }
  }

  // =================== TICK LINES (Time-container da biblioteca ou fallback manual) ===================
  const tickLineTop = contentY0;
  const tickLineBottom = totalHeight - CONTAINER_PADDING;
  const tickLineFullHeight = tickLineBottom - tickLineTop;

  if (timeContainerComp) {
    // --- Usar Time-container da biblioteca (linked) ---
    const timeContainerInst = timeContainerComp.createInstance();
    timeContainerInst.name = "Time-container";
    timeContainerInst.resize(timelineAreaWidth, tickLineFullHeight);
    timeContainerInst.x = timelineX0;
    timeContainerInst.y = contentY0;
    timeContainerInst.clipsContent = true;
    container.appendChild(timeContainerInst);

    // Atualizar labels dos ticks se msPerTick ≠ 25 (padrão do componente)
    if (msPerTick !== 25) {
      try {
        const textNodes = timeContainerInst.findAll(
          (n: SceneNode) => n.type === "TEXT" && n.name === "{Milisecond}"
        ) as TextNode[];
        for (let i = 0; i < textNodes.length; i++) {
          const tickIndex = Math.floor(i / 2);
          const msValue = tickIndex * msPerTick;
          await figma.loadFontAsync(textNodes[i].fontName as FontName);
          textNodes[i].characters = `${msValue} ms`;
        }
      } catch (tickErr: any) {
        console.warn(`[Motion Timeline] Falha ao atualizar labels dos ticks: ${tickErr?.message}`);
      }
    }
  } else {
    // --- Fallback manual: criar tick lines individualmente ---
    const textAreaWidth = 80;
    for (let i = 0; i < numTicks; i++) {
      const ms = i * msPerTick;
      const lineX = timelineX0 + i * tickSpacingPx;
      const lineOpacity = i % 2 === 0 ? 0.5 : 0.22;

      const tickLine = figma.createRectangle();
      tickLine.name = `Tick-line-${ms}ms`;
      tickLine.resize(1, tickLineFullHeight);
      tickLine.x = lineX;
      tickLine.y = tickLineTop;
      tickLine.fills = [{ type: "SOLID", color: TICK_LINE_COLOR, opacity: lineOpacity }];
      container.appendChild(tickLine);

      const topLabel = createLabel(`${ms} ms`, 14, TICK_TEXT_COLOR, tickFontStyle, tickFontFamily);
      topLabel.name = `Tick-top-${ms}ms`;
      topLabel.textAlignHorizontal = "CENTER";
      topLabel.resize(textAreaWidth, 20);
      topLabel.x = lineX - textAreaWidth / 2;
      topLabel.y = contentY0 + 8;
      container.appendChild(topLabel);

      const bottomLabel = createLabel(`${ms} ms`, 14, TICK_TEXT_COLOR, tickFontStyle, tickFontFamily);
      bottomLabel.name = `Tick-bot-${ms}ms`;
      bottomLabel.textAlignHorizontal = "CENTER";
      bottomLabel.resize(textAreaWidth, 20);
      bottomLabel.x = lineX - textAreaWidth / 2;
      bottomLabel.y = totalHeight - CONTAINER_PADDING - RULER_HEIGHT + 8;
      container.appendChild(bottomLabel);
    }
  }

  // =================== "CARDS" BACKGROUND CONTAINER (agrupa tracks visualmente) ===================
  const tracksYStart = contentY0 + RULER_HEIGHT + 24;
  const cardsFrame = figma.createFrame();
  cardsFrame.name = "Cards";
  // Posição: NÃO pode sobrepor o Trigger Panel — começa depois dele
  const triggerRightEdge = hasTrigger ? CONTAINER_PADDING + TRIGGER_PANEL_WIDTH : CONTAINER_PADDING;
  const cardsIdealX = contentX0 - COMP_CONTAINER_PADDING_H - CARDS_PADDING;
  // Com trigger: gap visual de 24px entre trigger panel e cards container
  // Sem trigger: cards começa rente ao padding do container principal
  const minCardsGap = hasTrigger ? 24 : 0;
  const cardsLeftX = Math.max(cardsIdealX, triggerRightEdge + minCardsGap);
  cardsFrame.x = cardsLeftX;
  cardsFrame.y = triggerYStart;  // Mesma posição Y que o Trigger Panel
  cardsFrame.resize(
    totalWidth - cardsLeftX - CONTAINER_PADDING + CARDS_PADDING,
    cardsContainerHeight  // Mesma altura que o Trigger Panel
  );
  cardsFrame.fills = [{ type: "SOLID", color: CARDS_BG, opacity: CARDS_BG_OPACITY }];
  cardsFrame.cornerRadius = CARDS_CORNER_RADIUS;
  cardsFrame.clipsContent = false;
  cardsFrame.layoutMode = "NONE";
  container.appendChild(cardsFrame);

  // =================== TRACK ROWS (Auto-layout + Library Components) ===================
  let currentY = contentY0 + RULER_HEIGHT + 24;

  for (let ti = 0; ti < tracks.length; ti++) {
    const track = tracks[ti];
    let trackColor: RGB;
    try {
      trackColor = hexToRgb(track.color);
    } catch {
      trackColor = { r: 0.5, g: 0.5, b: 0.8 }; // fallback seguro
    }

    // --- Model Timeline frame (auto-layout, matching model 9:517) ---
    const trackContentWidth = totalWidth - (contentX0 - COMP_CONTAINER_PADDING_H) - CONTAINER_PADDING;

    const modelFrame = figma.createFrame();
    modelFrame.name = `Track: ${track.name}`;
    modelFrame.layoutMode = "VERTICAL";
    modelFrame.primaryAxisSizingMode = "AUTO";
    modelFrame.counterAxisSizingMode = "FIXED";
    modelFrame.resize(trackContentWidth, 100); // Height auto-adjusts via auto-layout
    modelFrame.itemSpacing = 10;
    modelFrame.paddingLeft = COMP_CONTAINER_PADDING_H;
    modelFrame.paddingRight = COMP_CONTAINER_PADDING_H;
    modelFrame.paddingTop = TRACK_PADDING_TOP;
    modelFrame.paddingBottom = TRACK_PADDING_BOTTOM;
    modelFrame.cornerRadius = COMP_CONTAINER_RADIUS;
    modelFrame.fills = [{ type: "SOLID", color: COMP_CONTAINER_BG, opacity: 0.2 }];  // Cor lavanda padrão (mesma do trigger)
    modelFrame.clipsContent = false;
    modelFrame.x = contentX0 - COMP_CONTAINER_PADDING_H;
    modelFrame.y = currentY;
    container.appendChild(modelFrame);

    // --- Container - Name and timelines (horizontal) ---
    const nameTimelineContainer = figma.createFrame();
    nameTimelineContainer.name = "Container - Name and timelines";
    nameTimelineContainer.layoutMode = "HORIZONTAL";
    nameTimelineContainer.primaryAxisSizingMode = "FIXED";
    nameTimelineContainer.counterAxisSizingMode = "AUTO";
    nameTimelineContainer.itemSpacing = LABEL_GAP;
    nameTimelineContainer.fills = [];
    nameTimelineContainer.clipsContent = false;
    nameTimelineContainer.layoutAlign = "STRETCH";
    modelFrame.appendChild(nameTimelineContainer);

    // --- Name-component instance (linked to library) ---
    const nameInstance = nameComp.createInstance();
    nameInstance.name = "Name-component";
    // Forçar largura fixa de 262px — impedir que auto-layout interno recalcule
    nameInstance.resize(LABEL_AREA_WIDTH, nameInstance.height);
    nameInstance.layoutSizingHorizontal = "FIXED";  // Sizing dentro do parent auto-layout
    // Impedir que o auto-layout INTERNO do componente mude a largura (HUG → FIXED)
    if (nameInstance.layoutMode === "HORIZONTAL") {
      nameInstance.primaryAxisSizingMode = "FIXED";
    } else if (nameInstance.layoutMode === "VERTICAL") {
      nameInstance.counterAxisSizingMode = "FIXED";
    }
    nameInstance.fills = [{ type: "SOLID", color: trackColor }];
    try {
      nameInstance.setProperties({ "Component Name#313:66": track.name });
    } catch (propErr: any) {
      console.warn(`[Motion Timeline] Falha ao definir props de Name-component: ${propErr?.message}`);
    }

    // Auto-contrast: texto branco em backgrounds escuros, preto em claros
    const contrastColor = getContrastColor(trackColor);
    const letraNode = nameInstance.findOne(
      (n: SceneNode) => n.name === "Letra" && n.type === "TEXT"
    ) as TextNode | null;
    if (letraNode) {
      letraNode.fills = [{ type: "SOLID", color: contrastColor }];
    }
    // Também ajustar ícone de link (quando visível)
    const linkVector = nameInstance.findOne(
      (n: SceneNode) => n.name === "Vector" && n.type === "VECTOR"
    ) as VectorNode | null;
    if (linkVector) {
      linkVector.fills = [{ type: "SOLID", color: contrastColor }];
    }

    nameTimelineContainer.appendChild(nameInstance);

    // --- Container - Timelines (vertical stack of animation rows) ---
    const timelinesContainer = figma.createFrame();
    timelinesContainer.name = "Container - Timelines";
    timelinesContainer.layoutMode = "VERTICAL";
    timelinesContainer.primaryAxisSizingMode = "AUTO";
    timelinesContainer.counterAxisSizingMode = "FIXED";
    timelinesContainer.itemSpacing = ANIM_ROW_GAP;
    timelinesContainer.paddingLeft = TICK_LINE_OFFSET;  // 50px offset para alinhar bars com a linha central do 0ms
    timelinesContainer.fills = [];
    timelinesContainer.clipsContent = false;
    timelinesContainer.layoutGrow = 1;
    nameTimelineContainer.appendChild(timelinesContainer);

    // --- Animation rows (1 row per property per animation) ---
    for (const anim of track.animations) {
      const delayMs = anim.delay || 0;
      const durationMs = anim.duration || 0;
      const delayWidthPx = Math.round(delayMs * pxPerMs);
      const barWidth = Math.max(Math.round(durationMs * pxPerMs), 120);

      // Se a animação não tem properties, criar uma row genérica "Other"
      const propsToRender = anim.properties.length > 0
        ? anim.properties
        : [{ type: "other" } as AnimProperty];

      for (const prop of propsToRender) {
        // Row frame (horizontal: delay + timeline bar)
        const rowFrame = figma.createFrame();
        rowFrame.name = "Container - Delay + Timeline";
        rowFrame.layoutMode = "HORIZONTAL";
        rowFrame.primaryAxisSizingMode = "FIXED";
        rowFrame.counterAxisSizingMode = "AUTO";
        rowFrame.itemSpacing = 0;
        rowFrame.fills = [];
        rowFrame.clipsContent = false;
        rowFrame.layoutAlign = "STRETCH";
        timelinesContainer.appendChild(rowFrame);

        // --- Delay (library instance ou fallback) ---
        if (delayWidthPx > 0) {
          let delayNode: SceneNode;
          if (delayComp) {
            const delayInstance = delayComp.createInstance();
            delayInstance.name = "Delay";
            delayInstance.resize(delayWidthPx, 61);
            delayInstance.layoutSizingHorizontal = "FIXED";
            try {
              delayInstance.setProperties({ "Delay#314:0": `${delayMs}MS` });
            } catch (propErr: any) {
              console.warn(`[Motion Timeline] Falha ao definir delay prop: ${propErr?.message}`);
            }
            delayNode = delayInstance;
          } else {
            delayNode = createDelayFallback(delayMs, delayWidthPx);
            delayNode.layoutSizingHorizontal = "FIXED";
          }
          rowFrame.appendChild(delayNode);
        }

        // --- Timeline-container instance (linked to library, correct variant) ---
        const variant = mapPropertyToVariant(prop.type);
        const comp = timelineComps[variant] || timelineComps.other;
        if (comp) {
          const timelineInstance = comp.createInstance();
          timelineInstance.name = "Timeline-container";
          timelineInstance.resize(barWidth, 60);
          timelineInstance.layoutSizingHorizontal = "FIXED";

          // Set from/to text properties
          const keys = getFromToPropertyKeys(variant);
          const fromVal = getFormattedFromValue(prop);
          const toVal = getFormattedToValue(prop);
          const instanceProps: Record<string, string | boolean> = {};
          instanceProps[keys.fromKey] = fromVal;
          instanceProps[keys.toKey] = toVal;
          instanceProps["/ms#313:68"] = `${durationMs}ms`;
          try {
            timelineInstance.setProperties(instanceProps);
          } catch (propErr: any) {
            console.warn(`[Motion Timeline] Falha ao definir props de Timeline-container (${variant}): ${propErr?.message}. Props tentadas: ${JSON.stringify(Object.keys(instanceProps))}`);
          }

          // Set easing on nested Token/Curves instance
          const easingVariantValue = easingToVariant(anim.easing);
          const tokenInst = timelineInstance.findOne(
            (n: SceneNode) => n.name === "Token/Curves/Timeline-container" && n.type === "INSTANCE"
          ) as InstanceNode | null;
          if (tokenInst) {
            try {
              tokenInst.setProperties({ "Curves token": easingVariantValue });
            } catch (propErr: any) {
              console.warn(`[Motion Timeline] Falha ao definir easing: ${propErr?.message}`);
            }
          }

          // Aplicar a mesma cor do Name-component em todos os elementos visuais do Timeline-container
          const contrastText = getContrastColor(trackColor);

          // 1. Frames "Text properties" e "Text time" → fill = trackColor
          const colorTargets = timelineInstance.findAll(
            (n: SceneNode) => (n.name === "Text properties" || n.name === "Text time") && n.type === "FRAME"
          ) as FrameNode[];
          for (const target of colorTargets) {
            target.fills = [{ type: "SOLID", color: trackColor }];
          }

          // 2. Linha "Right" (vector) → stroke = trackColor
          const lineVector = timelineInstance.findOne(
            (n: SceneNode) => n.name === "Right" && n.type === "VECTOR"
          ) as VectorNode | null;
          if (lineVector) {
            lineVector.strokes = [{ type: "SOLID", color: trackColor }];
          }

          // 3. Textos "Description" e "Duration Text" → cor de contraste (branco ou preto)
          //    (mas NÃO o "Label" do easing pill que deve permanecer branco)
          const descTexts = timelineInstance.findAll(
            (n: SceneNode) => n.type === "TEXT" && (n.name === "Description" || n.name === "Duration Text")
          ) as TextNode[];
          for (const txt of descTexts) {
            txt.fills = [{ type: "SOLID", color: contrastText }];
          }

          rowFrame.appendChild(timelineInstance);
        }
      }
    }

    // Track height is determined by auto-layout
    currentY += modelFrame.height;

    // --- Gap entre containers de componentes (24px) ---
    if (ti < tracks.length - 1) {
      currentY += COMPONENT_GAP;
    }
  }

  // =================== TOTAL DURATION BADGE ===================
  const totalAnims = tracks.reduce((sum, t) => sum + t.animations.length, 0);
  const actualMaxMs = tracks.reduce((max, t) => {
    return t.animations.reduce((m, a) => Math.max(m, (a.delay || 0) + (a.duration || 0)), max);
  }, 0);

  // Badge no canto inferior direito com duração total
  const totalBadge = figma.createFrame();
  totalBadge.name = "Total Duration Badge";
  totalBadge.layoutMode = "HORIZONTAL";
  totalBadge.primaryAxisSizingMode = "AUTO";
  totalBadge.counterAxisSizingMode = "AUTO";
  totalBadge.paddingLeft = 12;
  totalBadge.paddingRight = 12;
  totalBadge.paddingTop = 6;
  totalBadge.paddingBottom = 6;
  totalBadge.itemSpacing = 6;
  totalBadge.cornerRadius = 8;
  totalBadge.fills = [{ type: "SOLID", color: EASING_PILL_BG }];

  const totalIcon = createLabel("⏱", 11, WHITE, "Regular");
  totalBadge.appendChild(totalIcon);

  const totalText = createLabel(
    `Total: ${actualMaxMs}ms · ${totalAnims} anim · ${tracks.length} tracks`,
    11, WHITE, "Medium"
  );
  totalText.name = "Total Text";
  totalBadge.appendChild(totalText);

  // Posicionar no canto inferior direito do container
  container.appendChild(totalBadge);
  totalBadge.x = totalWidth - totalBadge.width - CONTAINER_PADDING;
  totalBadge.y = totalHeight - CONTAINER_PADDING - 4;

  // =================== FOCAR NO RESULTADO ===================
  figma.viewport.scrollAndZoomIntoView([container]);

  // =================== NOTIFICAR SUCESSO ===================
  figma.notify(
    `✅ Timeline gerada: ${tracks.length} track(s), ${totalAnims} animação(ões), ${actualMaxMs}ms total`,
    { timeout: 4000 }
  );

  figma.ui.postMessage({
    type: "generate-result",
    success: true,
    data: {
      trackCount: tracks.length,
      animCount: totalAnims,
      maxMs: actualMaxMs,
      rulerMs: maxEndMs,
      width: totalWidth,
      height: totalHeight,
      regenerated: hadExisting,
    },
  });
}

// ============================================================
// HANDLER DE MENSAGENS DA UI
// ============================================================
figma.ui.onmessage = (msg: { type: string; [key: string]: any }) => {
  switch (msg.type) {
    case "get-selection": {
      const selection = figma.currentPage.selection;

      if (selection.length === 0) {
        figma.ui.postMessage({
          type: "selection-result",
          success: false,
          error:
            "Nenhum elemento selecionado. Selecione um Frame ou Section no canvas.",
        });
        figma.notify("⚠️ Selecione um Frame ou Section primeiro.", {
          timeout: 3000,
        });
        return;
      }

      const node = selection[0];

      if (node.type !== "FRAME" && node.type !== "SECTION") {
        figma.ui.postMessage({
          type: "selection-result",
          success: false,
          error: `O elemento selecionado é "${node.type}" ("${node.name}"). Selecione um Frame ou Section.`,
        });
        figma.notify(`⚠️ "${node.name}" não é um Frame/Section.`, {
          timeout: 3000,
        });
        return;
      }

      figma.ui.postMessage({
        type: "selection-result",
        success: true,
        data: {
          id: node.id,
          name: node.name,
          nodeType: node.type,
          width: node.width,
          height: node.height,
        },
      });

      figma.notify(`✅ Frame "${node.name}" definido como target.`, {
        timeout: 2000,
      });
      break;
    }

    case "generate-timeline": {
      const genMsg = msg as unknown as GenerateMessage;

      // Validações
      if (!genMsg.targetNodeId) {
        figma.ui.postMessage({
          type: "generate-result",
          success: false,
          error: "Nenhum frame target definido. Selecione um frame primeiro.",
        });
        figma.notify("⚠️ Defina um frame target antes de gerar.", {
          timeout: 3000,
        });
        return;
      }

      if (!genMsg.tracks || genMsg.tracks.length === 0) {
        figma.ui.postMessage({
          type: "generate-result",
          success: false,
          error: "Nenhuma track definida. Adicione pelo menos uma track.",
        });
        figma.notify("⚠️ Adicione pelo menos uma track.", { timeout: 3000 });
        return;
      }

      const hasAnims = genMsg.tracks.some((t) => t.animations.length > 0);
      if (!hasAnims) {
        figma.ui.postMessage({
          type: "generate-result",
          success: false,
          error:
            "Nenhuma animação definida. Adicione animações às suas tracks.",
        });
        figma.notify("⚠️ Adicione animações antes de gerar.", {
          timeout: 3000,
        });
        return;
      }

      // Gerar!
      const msPerTick = genMsg.msPerTick || DEFAULT_MS_PER_TICK;
      const trigLabel = genMsg.triggerLabel || "";
      const trigAction = genMsg.triggerAction || "";
      const trigType = genMsg.triggerType || "tap";
      const trigCompName = genMsg.triggerComponentName || "";
      const stepTitleVal = genMsg.stepTitle || "";
      figma.notify("⏳ Gerando timeline...", { timeout: 1500 });
      generateTimeline(genMsg.targetNodeId, genMsg.tracks, msPerTick, trigLabel, trigAction, trigType, trigCompName, stepTitleVal).catch((err) => {
        const errorDetail = err?.message || err?.toString?.() || String(err);
        console.error("[Motion Timeline] Erro detalhado:", errorDetail, err?.stack || "");
        figma.ui.postMessage({
          type: "generate-result",
          success: false,
          error: `Erro ao gerar timeline: ${errorDetail}`,
        });
        figma.notify(`❌ ${errorDetail}`, { timeout: 5000, error: true });
      });
      break;
    }

    case "close-plugin": {
      figma.closePlugin();
      break;
    }

    default:
      console.log("[Motion Timeline] Mensagem desconhecida:", msg.type);
  }
};

// ============================================================
// SELECTION CHANGE LISTENER (auto-detect frame)
// ============================================================
figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  if (selection.length === 1) {
    const node = selection[0];
    if (node.type === "FRAME" || node.type === "SECTION") {
      figma.ui.postMessage({
        type: "selection-changed",
        data: {
          id: node.id,
          name: node.name,
          nodeType: node.type,
          width: node.width,
          height: node.height,
        },
      });
    }
  }
});

// Log inicial
console.log("[Motion Timeline] Plugin carregado (v2.1 — Library Components + Time-container + Trigger-Flow).");
