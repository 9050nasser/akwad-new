/**
 * html2canvas 1.x cannot parse modern CSS color functions (oklab/oklch/color()).
 * Tailwind v4 emits those in computed styles. We normalize them on the cloned DOM
 * via Canvas, which the browser resolves to rgb/rgba strings html2canvas accepts.
 */

const MODERN_COLOR_RE = /oklab|oklch|color\(/i;

const LONGHAND_COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "column-rule-color",
  "caret-color",
  "accent-color",
  "fill",
  "stroke",
] as const;

function makeColorNormalizer(): (value: string) => string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => null;

  return (value: string) => {
    const v = value.trim();
    if (!v || v === "transparent" || v === "inherit" || v === "initial" || v === "unset") {
      return null;
    }
    if (!MODERN_COLOR_RE.test(v)) return null;
    try {
      ctx.fillStyle = v;
      const out = ctx.fillStyle;
      return typeof out === "string" && out ? out : null;
    } catch {
      return null;
    }
  };
}

function applyLonghandColors(orig: Element, clone: Element, normalize: (v: string) => string | null) {
  const cs = window.getComputedStyle(orig);

  if (orig instanceof HTMLElement && clone instanceof HTMLElement) {
    for (const prop of LONGHAND_COLOR_PROPS) {
      const raw = cs.getPropertyValue(prop);
      if (!raw || !MODERN_COLOR_RE.test(raw)) continue;
      const rgb = normalize(raw);
      if (rgb) clone.style.setProperty(prop, rgb);
    }

    const shadow = cs.getPropertyValue("box-shadow");
    if (shadow && shadow !== "none" && MODERN_COLOR_RE.test(shadow)) {
      clone.style.setProperty("box-shadow", "none");
    }
    const tshadow = cs.getPropertyValue("text-shadow");
    if (tshadow && tshadow !== "none" && MODERN_COLOR_RE.test(tshadow)) {
      clone.style.setProperty("text-shadow", "none");
    }
    return;
  }

  if (orig instanceof SVGElement && clone instanceof SVGElement) {
    for (const prop of ["fill", "stroke"] as const) {
      const raw = cs.getPropertyValue(prop);
      if (!raw || !MODERN_COLOR_RE.test(raw)) continue;
      const rgb = normalize(raw);
      if (rgb) clone.style.setProperty(prop, rgb);
    }
  }
}

function walk(orig: Node, clone: Node, normalize: (v: string) => string | null): void {
  if (orig instanceof Element && clone instanceof Element) {
    applyLonghandColors(orig, clone, normalize);
  }

  let on = orig.firstChild;
  let cn = clone.firstChild;
  while (on && cn) {
    if (on.nodeType !== cn.nodeType) {
      break;
    }
    walk(on, cn, normalize);
    on = on.nextSibling;
    cn = cn.nextSibling;
  }
}

/**
 * Call from html2canvas `onclone` with the original element and the cloned root (`element`).
 */
export function normalizeClonedSubtreeColorsForHtml2Canvas(original: HTMLElement, cloned: HTMLElement): void {
  const normalize = makeColorNormalizer();
  walk(original, cloned, normalize);
}
