"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronRight, PanelsTopLeft } from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Liquid Glass Expandable Sidebar. MIT. Troy Lorents / Automate Flows.
 * A glass sidebar that expands from an icon rail into grouped navigation.
 * The link list scrolls between the header and account so both remain reachable in short frames.
 * Supports nested links, light and dark themes, and reduced motion.
 * Set activeId from your current route. Links work without a client router.
 * Omit theme to use your host's semantic colors. Supply glass and accent to tune the material.
 * CSS glass remains available when SVG backdrop displacement is unavailable.
 */
const navigationStyles = `
.gn-scope {
  --gn-card: var(--color-card, Canvas);
  --gn-ink: var(--color-card-foreground, var(--color-foreground, CanvasText));
  --gn-muted: color-mix(in srgb, var(--gn-ink) 78%, var(--gn-card));
  --gn-accent: var(--color-primary, Highlight);
  --gn-ring: color-mix(in srgb, var(--color-ring, Highlight) 30%, var(--gn-ink));
  --gn-line: var(--color-border, color-mix(in srgb, var(--gn-ink) 25%, var(--gn-card)));
  --gn-tint: var(--gn-card);
  --gn-edge-light: var(--color-glass-highlight, light-dark(Canvas, CanvasText));
  --gn-shadow: var(--color-glass-shadow, light-dark(CanvasText, Canvas));
  --gn-selection: color-mix(in srgb, var(--gn-accent) 15%, var(--gn-card));
  color: var(--gn-ink);
  font: inherit;
  min-inline-size: 0;
  max-inline-size: 100%;
}

.gn-scope[data-gn-theme="light"] { color-scheme: light; }
.gn-scope[data-gn-theme="dark"] { color-scheme: dark; }
.gn-scope[data-gn-theme] { --gn-card: Canvas; --gn-ink: CanvasText; --gn-ring: Highlight; }
.gn-scope *, .gn-scope *::before, .gn-scope *::after { box-sizing: border-box; }
.gn-scope [hidden] { display: none !important; }
.gn-scope a { color: inherit; text-decoration: none; }
.gn-scope button, .gn-scope input { font: inherit; color: inherit; }
.gn-scope button { cursor: pointer; }
.gn-scope :focus-visible {
  outline: 2px solid var(--gn-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--gn-card);
}
.gn-scope ::selection { background: var(--gn-accent); color: var(--color-primary-foreground, HighlightText); }

.gn-material {
  --gn-scrim: 54%;
  --gn-face-light: 7%;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--gn-edge-light) var(--gn-face-light), transparent), transparent 44%),
    linear-gradient(color-mix(in srgb, var(--gn-card) var(--gn-scrim), transparent), color-mix(in srgb, var(--gn-card) var(--gn-scrim), transparent)),
    color-mix(in srgb, var(--gn-tint) calc(var(--gn-opacity) * 100%), transparent);
  -webkit-backdrop-filter: blur(var(--gn-blur)) saturate(var(--gn-saturation));
  backdrop-filter: blur(var(--gn-blur)) saturate(var(--gn-saturation)) var(--gn-displacement, blur(0px));
  mask-image: var(--gn-lens-mask, none);
  box-shadow:
    inset 0 0 0 .75px color-mix(in srgb, var(--gn-edge-light) calc(var(--gn-edge) * 48%), transparent),
    inset 0 1px 1px color-mix(in srgb, var(--gn-edge-light) calc(var(--gn-edge) * 92%), transparent),
    inset 0 -1px 1px color-mix(in srgb, var(--gn-edge-light) calc(var(--gn-edge) * 60%), transparent),
    inset 0 7px 10px -7px color-mix(in srgb, var(--gn-edge-light) calc(var(--gn-bend) * 60%), transparent),
    inset 0 -7px 10px -7px color-mix(in srgb, CanvasText calc(var(--gn-bend) * 24%), transparent),
    0 12px 24px -15px color-mix(in srgb, var(--gn-shadow) 50%, transparent);
}

.gn-filter-defs { position: absolute; pointer-events: none; }

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .gn-material { background: var(--gn-card); }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active) {
  .gn-material {
    background: var(--gn-card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
@media (forced-colors: active) {
  .gn-material { border: 1px solid CanvasText; box-shadow: none; }
  .gn-scope :focus-visible { outline-color: Highlight; }
}

.gn-sidebar {
  --gn-muted: color-mix(in srgb, var(--gn-ink) 96%, var(--gn-card));
  --gn-sidebar-limit: max(212px, calc(100svh - var(--gn-sidebar-inset, 56px)));
  position: relative;
  inline-size: 260px;
  max-inline-size: 100%;
  min-block-size: min(480px, var(--gn-sidebar-limit));
  max-block-size: var(--gn-sidebar-limit);
  padding: 12px;
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  overflow: clip;
  transition:
    inline-size var(--rail-dur, 320ms) var(--rail-ease, cubic-bezier(.32, .72, 0, 1)),
    padding-inline var(--rail-dur, 320ms) var(--rail-ease, cubic-bezier(.32, .72, 0, 1)),
    border-radius var(--rail-dur, 320ms) var(--rail-ease, cubic-bezier(.32, .72, 0, 1));
}
.gn-sidebar-surface {
  --gn-scrim: 66%;
  --gn-face-light: 4%;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.gn-sidebar > :not(.gn-sidebar-surface) { position: relative; }
.gn-sidebar[data-expanded="false"] { inline-size: 68px; padding-inline: 8px; border-radius: 32px; }
.gn-sidebar :is(button, input, a) { min-block-size: 44px; }
.gn-sidebar :is(button, a) { min-inline-size: 44px; touch-action: manipulation; }
.gn-sidebar button {
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  inline-size: 44px;
  padding: 0;
  flex: 0 0 44px;
}
.gn-sidebar :is(button, a):hover { background: color-mix(in srgb, var(--gn-card) 20%, transparent); }
.gn-sidebar :is(a, button, input):focus-visible { position: relative; z-index: 1; outline-offset: -2px; box-shadow: none; }
.gn-sidebar svg { inline-size: 17px; block-size: 17px; stroke-width: 1.8; flex: none; }

.gn-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-block-end: 12px;
}
.gn-sidebar-mark, .gn-sidebar-avatar {
  display: grid;
  place-items: center;
  flex: none;
  inline-size: 34px;
  block-size: 34px;
  border-radius: 11px;
  background: var(--gn-selection);
  color: var(--gn-ink);
  box-shadow: inset 0 1px 1px color-mix(in srgb, var(--gn-edge-light) 60%, transparent);
}
.gn-sidebar-mark img { inline-size: 26px; block-size: 26px; object-fit: contain; }
.gn-sidebar-brand-copy, .gn-sidebar-label { min-inline-size: 0; }
.gn-sidebar-brand-copy { line-height: 1.15; }
.gn-sidebar-brand-copy strong, .gn-sidebar-label strong {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: .875rem;
  font-weight: 700;
}
.gn-sidebar-brand-copy small, .gn-sidebar-account small {
  display: block;
  margin-block-start: 2px;
  color: var(--gn-muted);
  font-size: .6875rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.gn-sidebar-body {
  position: relative;
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.gn-sidebar-body::-webkit-scrollbar { display: none; }
.gn-sidebar-brand, .gn-sidebar-account, .gn-sidebar-footer { flex-shrink: 0; }
.gn-sidebar-selection {
  position: absolute;
  inset: 0 0 auto;
  height: 44px;
  opacity: 0;
  border-radius: 17px;
  pointer-events: none;
  background: color-mix(in srgb, var(--gn-selection) calc(var(--gn-strength) * 68%), transparent);
  box-shadow:
    inset 0 1px 1px color-mix(in srgb, var(--gn-edge-light) calc(var(--gn-strength) * 60%), transparent),
    inset 0 -1px 1px color-mix(in srgb, var(--gn-line) calc(var(--gn-strength) * 60%), transparent);
}
.gn-sidebar-group + .gn-sidebar-group {
  margin-block-start: 9px;
  padding-block-start: 9px;
  border-block-start: 1px solid var(--gn-line);
}
.gn-sidebar-group > p {
  margin: 0 9px 3px;
  color: var(--gn-muted);
  font-size: .6875rem;
  font-weight: 650;
  overflow: hidden;
  opacity: 1;
  transition: opacity 160ms linear;
}
.gn-sidebar[data-expanded="false"] .gn-sidebar-group > p {
  opacity: 0;
  visibility: hidden;
}
.gn-sidebar-group ul { list-style: none; margin: 0; padding: 0; }
.gn-sidebar-row { display: flex; align-items: center; }
.gn-sidebar-row a, .gn-sidebar-children a, .gn-sidebar-account {
  display: flex;
  align-items: center;
  position: relative;
  gap: 9px;
  padding-inline: 10px;
  border-radius: 15px;
  min-inline-size: 0;
}
.gn-sidebar-row a { flex: 1; }
.gn-sidebar-icon { display: grid; place-items: center; flex: 0 0 18px; }
.gn-sidebar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .8125rem;
}
.gn-sidebar a[data-selected="true"] { font-weight: 750; }
.gn-sidebar a[data-selected="true"]::after {
  content: "";
  margin-inline-start: auto;
  flex: 0 0 4px;
  block-size: 4px;
  border-radius: 50%;
  background: var(--gn-ink);
}
.gn-sidebar-disclosure[aria-expanded="false"] svg { transform: rotate(-90deg); }
.gn-sidebar-group .gn-sidebar-children {
  margin-inline-start: 18px;
  border-inline-start: 1px solid var(--gn-line);
  padding-inline-start: 5px;
}
.gn-sidebar-children a { padding-inline-start: 8px; }
.gn-sidebar-children svg { inline-size: 14px; block-size: 14px; }
.gn-sidebar-badge { inline-size: 6px; block-size: 6px; flex: none; border-radius: 50%; background: var(--gn-accent); }
.gn-sidebar-count {
  margin-inline-start: auto;
  flex: none;
  min-inline-size: 19px;
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--gn-accent);
  color: var(--color-primary-foreground, HighlightText);
  font-size: .625rem;
  font-weight: 750;
  line-height: 1.4;
  text-align: center;
}
.gn-sidebar-account {
  min-block-size: 54px;
  margin-block-start: 12px;
  padding: 8px 2px 0;
  border-block-start: 1px solid var(--gn-line);
  border-radius: 0 0 14px 14px;
}
.gn-sidebar-account[aria-current] { background: var(--gn-selection); }
.gn-sidebar-avatar { border-radius: 50%; font-size: .6875rem; font-weight: 750; }
.gn-sidebar-account > svg { margin-inline-start: auto; }
.gn-sidebar[data-expanded="false"] :is(.gn-sidebar-row a, .gn-sidebar-account) { justify-content: center; padding-inline: 0; }
.gn-sidebar[data-expanded="false"] .gn-sidebar-row a[data-selected="true"]::after { position: absolute; inset-inline-end: 5px; }
.gn-sidebar[data-expanded="false"] .gn-sidebar-label { display: none; }

@media (prefers-reduced-motion: reduce) {
  .gn-sidebar { transition: none; }
}

@media (forced-colors: active) {
  .gn-sidebar a { color: LinkText; }
  .gn-sidebar a[data-selected="true"], .gn-sidebar-account[aria-current] { border: 1px solid Highlight; }
}
`;

/** Shared geometry keeps the clipped glass, specular light and refraction aligned. */
const notchGeometry = { top: 24, bottom: 78, middle: 51, radius: 27 };
const clampEffect = (value = 1) => Number.isFinite(value) ? Math.max(0, Math.min(1.5, value)) : 1;
const notchDepth = (intensity = 1) => 26 + clampEffect(intensity) * 6;
function notchScoop(width, count, center) {
  return Math.max(1, Math.min(48, (width - 24) / Math.max(1, count) * 0.72, center - 4, width - center - 4));
}
function notchedPath(width, count, center, depth) {
  const { top, bottom, middle, radius } = notchGeometry;
  const scoop = notchScoop(width, count, center);
  const start = Math.min(radius, center - scoop), end = Math.max(width - radius, center + scoop);
  let path = `M${start} ${top} H${center - scoop}`;
  for (let step = 1; step <= 48; step++) {
    const t = step / 24 - 1;
    path += ` L${(center + t * scoop).toFixed(2)} ${(top + depth * (1 - t * t) ** 2).toFixed(2)}`;
  }
  return `${path} H${end} Q${width} ${top} ${width} ${middle} Q${width} ${bottom} ${width - radius} ${bottom} H${radius} Q0 ${bottom} 0 ${middle} Q0 ${top} ${start} ${top} Z`;
}

const clearNavigationGlass = {
  blur: 2,
  opacity: 0.08,
  saturation: 1.3,
  edge: 0.85,
  distortion: 28,
};

function isPlainNavigation(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
    event.currentTarget.target !== "_blank";
}

const range = (value, fallback, min, max) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const navigationSpeed = (speed) => range(speed, 1, 0.5, 2);

function useNavigationReducedMotion(motion) {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced || !motion;
}

const svgNamespace = "http://www.w3.org/2000/svg";

function roundedDistance(x, y, halfWidth, halfHeight, radius) {
  const dx = Math.abs(x) - halfWidth + radius;
  const dy = Math.abs(y) - halfHeight + radius;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * Build an edge displacement map from the measured glass shape. The map is
 * regenerated after resize, a material edit, or a completed notch transition.
 * CSS blur and highlights provide the material when SVG backdrop filters are unavailable.
 */
function useNavigationRefraction(scope, distortion) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    const root = scope.current;
    const svgBackdrop = /Chrome|Chromium|Edg/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
    if (!root || distortion === 0 || !svgBackdrop || !CSS.supports("backdrop-filter", "url(#lens)")) return undefined;

    const preference = window.matchMedia("(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)");
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("class", "gn-filter-defs");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    const definitions = document.createElementNS(svgNamespace, "defs");
    svg.append(definitions);
    root.append(svg);

    let frame = 0;
    const surfaces = Array.from(root.querySelectorAll("[data-gn-lens]"));
    const signatures = new Map();
    const clear = (surface) => {
      surface.style.removeProperty("--gn-displacement");
      surface.style.removeProperty("--gn-lens-mask");
      signatures.delete(surface);
    };

    function build() {
      frame = 0;
      for (const [index, surface] of surfaces.entries()) {
        if (preference.matches || !surface.offsetWidth || !surface.offsetHeight) {
          clear(surface);
          continue;
        }
        const width = surface.offsetWidth;
        const height = surface.offsetHeight;
        const rail = surface.closest('[data-variant="notched"][data-shaped="true"]');
        const notched = rail && surface.dataset.gnLens === "rail";
        const center = Number(rail?.dataset.center ?? width / 2);
        const depth = Number(rail?.dataset.notchDepth ?? 32);
        const scoop = notchScoop(width, rail?.querySelectorAll(".gn-rail-link").length ?? 1, center);
        const radius = Math.min(parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 26, width / 2, height / 2);
        const signature = [width, height, radius, notched ? center : 0, notched ? depth : 0].join(":");
        if (signatures.get(surface) === signature) continue;

        const map = document.createElement("canvas");
        map.width = Math.min(224, Math.ceil(width / 2));
        map.height = Math.min(256, Math.ceil(height / 2));
        const ctx = map.getContext("2d");
        if (!ctx) continue;
        const image = ctx.createImageData(map.width, map.height);
        const bevel = Math.min(18, height / 4);
        const distance = notched
          ? (x, y) => {
              const offset = Math.min(Math.abs(x - center) / scoop, 1);
              const bowl = (1 - offset * offset) ** 2;
              const { middle, radius: edge, top } = notchGeometry;
              return Math.max(roundedDistance(x - width / 2, y - middle, width / 2, edge, edge), top + depth * bowl - y);
            }
          : (x, y) => roundedDistance(x - width / 2, y - height / 2, width / 2, height / 2, radius);

        for (let row = 0; row < map.height; row++) {
          for (let column = 0; column < map.width; column++) {
            const x = (column + 0.5) * width / map.width;
            const y = (row + 0.5) * height / map.height;
            const d = distance(x, y);
            const bend = d < 0 ? Math.sin(Math.min(1, -d / bevel) * Math.PI) : 0;
            const dx = distance(x + 1, y) - distance(x - 1, y);
            const dy = distance(x, y + 1) - distance(x, y - 1);
            const length = Math.hypot(dx, dy) || 1;
            const pixel = (row * map.width + column) * 4;
            image.data[pixel] = 128 + dx / length * bend * 110;
            image.data[pixel + 1] = 128 + dy / length * bend * 110;
            image.data[pixel + 2] = 128;
            image.data[pixel + 3] = 255;
          }
        }

        ctx.putImageData(image, 0, 0);
        const filterId = `gn-optics-${id}-${index}`;
        const maskId = `${filterId}-boundary`;
        const filter = document.createElementNS(svgNamespace, "filter");
        const lens = document.createElementNS(svgNamespace, "feImage");
        const displacement = document.createElementNS(svgNamespace, "feDisplacementMap");
        const attributes = (element, values) => {
          for (const [key, value] of Object.entries(values)) element.setAttribute(key, value);
        };
        attributes(filter, { id: filterId, x: "0", y: "0", width: "100%", height: "100%", "color-interpolation-filters": "sRGB" });
        attributes(lens, { href: map.toDataURL(), width: "100%", height: "100%", preserveAspectRatio: "none", result: "lens" });
        attributes(displacement, { in: "SourceGraphic", in2: "lens", scale: String(distortion), xChannelSelector: "R", yChannelSelector: "G" });
        filter.append(lens, displacement);
        definitions.querySelector(`#${filterId}`)?.remove();
        definitions.append(filter);

        // Mask the composite result, including pixels displaced past a rounded corner.
        // The animated notch already owns its mask so its glass follows the live path.
        definitions.querySelector(`#${maskId}`)?.remove();
        if (notched) {
          surface.style.removeProperty("--gn-lens-mask");
        } else {
          const bounds = document.createElementNS(svgNamespace, "mask");
          const shape = document.createElementNS(svgNamespace, "rect");
          attributes(bounds, {
            id: maskId, maskUnits: "userSpaceOnUse", maskContentUnits: "userSpaceOnUse",
            x: "0", y: "0", width: String(width), height: String(height),
          });
          attributes(shape, { width: String(width), height: String(height), rx: String(radius), fill: "white" });
          bounds.append(shape);
          definitions.append(bounds);
          surface.style.setProperty("--gn-lens-mask", `url(#${maskId})`);
        }

        surface.style.setProperty("--gn-displacement", `url(#${filterId})`);
        signatures.set(surface, signature);
      }
    }

    // Rebuilding the displacement map is expensive, so wait for the rail to
    // stop resizing instead of regenerating it on every animation frame.
    let settle = 0;
    const schedule = () => {
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (!frame) frame = requestAnimationFrame(build);
      }, 120);
    };
    const observer = new ResizeObserver(schedule);
    surfaces.forEach(surface => observer.observe(surface));
    preference.addEventListener("change", schedule);
    root.addEventListener("glass:settled", schedule);
    schedule();
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(frame);
      observer.disconnect();
      preference.removeEventListener("change", schedule);
      root.removeEventListener("glass:settled", schedule);
      surfaces.forEach(clear);
      svg.remove();
    };
  }, [scope, id, distortion]);
}

function NavigationGlass({
  glass, theme, accent, motion = true, className = "", style, children,
}) {
  const root = useRef(null);
  const material = clearNavigationGlass;
  const distortion = range(glass?.distortion, material.distortion, 0, 60);
  useNavigationRefraction(root, distortion);
  const materialStyle = {
    "--gn-blur": `${range(glass?.blur, material.blur, 0, 40)}px`,
    "--gn-opacity": range(glass?.opacity, material.opacity, 0.04, 0.95),
    "--gn-saturation": range(glass?.saturation, material.saturation, 0.5, 2),
    "--gn-edge": range(glass?.edge, material.edge, 0, 1),
    "--gn-bend": distortion / 60,
    ...(glass?.tint ? { "--gn-tint": glass.tint } : {}),
    ...(accent ? { "--gn-accent": accent } : {}),
    ...style,
  };
  return (
    <div ref={root} className={`gn-scope ${className}`} data-gn-theme={theme} data-motion={motion ? "on" : "off"} style={materialStyle}>
      <style>{navigationStyles}</style>
      {children}
    </div>
  );
}

gsap.registerPlugin(useGSAP);

function LiquidGlassExpandableSidebar({
  groups, activeId, brand = "Workspace", brandDetail, brandIcon, account, expanded: controlled,
  defaultExpanded = false, onNavigate, motion = true, selectionLight = 1, effects, footer, ...material
}) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const [closedGroups, setClosedGroups] = useState(() => new Set());
  const expanded = controlled ?? localExpanded;
  const root = useRef(null);
  const body = useRef(null);
  const marker = useRef(null);
  const bodyId = useId();
  const reduced = useNavigationReducedMotion(motion);
  const speed = navigationSpeed(effects?.speed);

  const toggleGroup = (id) => {
    setClosedGroups(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const navigate = (item, event) => {
    if (isPlainNavigation(event)) onNavigate?.(item, event);
  };

  useGSAP(context => {
    const list = body.current;
    const light = marker.current;
    if (!list || !light) return;
    let tween;
    const update = () => {
      const selected = list.querySelector('[data-selected="true"]');
      tween?.kill();
      if (!selected) {
        light.style.opacity = "0";
        return;
      }
      // Offset coordinates stay in the list's space while the rail animates.
      let top = 0;
      for (let node = selected; node && node !== list; node = node.offsetParent) {
        top += node.offsetTop;
      }
      const animate = !reduced && light.style.opacity === "1";
      context.ignore(() => {
        tween = gsap.to(light, { y: top, height: selected.offsetHeight, opacity: 1, duration: animate ? .4 / speed : 0, ease: "power2.out" });
      });
    };
    update();
    const resize = new ResizeObserver(() => update());
    resize.observe(list);
    return () => {
      resize.disconnect();
      tween?.kill();
    };
  }, { scope: root, dependencies: [activeId, expanded, closedGroups, groups, reduced, speed], revertOnUpdate: true });

  const currentAccount = account?.id !== undefined && account.id === activeId;
  return (
    <NavigationGlass {...material} motion={motion}>
      <nav className="gn-sidebar" ref={root} data-expanded={expanded}
        aria-label={`${brand} navigation`} style={{ "--gn-strength": clampEffect(selectionLight) }}>
        <div className="gn-sidebar-surface gn-material" data-gn-lens="sidebar" aria-hidden="true" />
        <div className="gn-sidebar-brand">
          <span className="gn-sidebar-mark" aria-hidden="true">{brandIcon ?? <PanelsTopLeft />}</span>
          {expanded && <div className="gn-sidebar-brand-copy"><strong>{brand}</strong>{brandDetail && <small>{brandDetail}</small>}</div>}
        </div>
        <div className="gn-sidebar-body" ref={body} id={bodyId}>
          <div className="gn-sidebar-selection" ref={marker} aria-hidden="true" />
          {groups.map(group => (
            <div className="gn-sidebar-group" key={group.label}>
              <p>{group.label}</p>
              <ul aria-label={group.label}>
                {group.items.map(item => {
                  const children = item.children;
                  const open = expanded && !closedGroups.has(item.id);
                  const childIsCurrent = item.children?.some(child => child.id === activeId);
                  const current = item.id === activeId;
                  const currentBranch = childIsCurrent && !open;
                  const panelId = `${bodyId}-${encodeURIComponent(item.id)}`;
                  return (
                    <li key={item.id}>
                      <div className="gn-sidebar-row">
                        <a href={item.href} data-selected={current || !!currentBranch}
                          aria-label={item.badge ? `${item.label}, ${item.badge}` : item.label}
                          aria-current={current ? "page" : currentBranch ? "location" : undefined}
                          onClick={event => navigate(item, event)}>
                          <span className="gn-sidebar-icon" aria-hidden="true">{item.icon}</span>
                          <span className="gn-sidebar-label" aria-hidden="true">{item.label}</span>
                          {expanded && item.badgeCount > 0 ? (
                            <span className="gn-sidebar-count" aria-hidden="true">{item.badgeCount > 9 ? "9+" : item.badgeCount}</span>
                          ) : expanded && item.badge ? (
                            <span className="gn-sidebar-badge" aria-hidden="true" />
                          ) : null}
                        </a>
                        {expanded && !!children?.length && (
                          <button type="button" className="gn-sidebar-disclosure" aria-label={`${item.label} subpages`}
                            aria-expanded={open} aria-controls={panelId} onClick={() => toggleGroup(item.id)}>
                            <ChevronDown aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {!!children?.length && (
                        <ul className="gn-sidebar-children" id={panelId} hidden={!open}>
                          {children.map(child => (
                            <li key={child.id}>
                              <a href={child.href} aria-current={child.id === activeId ? "page" : undefined} data-selected={child.id === activeId}
                                onClick={event => navigate(child, event)}>
                                <span className="gn-sidebar-icon" aria-hidden="true">{child.icon}</span>
                                <span className="gn-sidebar-label">{child.label}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {account && (
          <a className="gn-sidebar-account" href={account.href} aria-label={expanded ? undefined : account.name}
            aria-current={currentAccount ? "page" : undefined}
            onClick={event => { if (account.id) navigate({ id: account.id, label: account.name, href: account.href, icon: null }, event); }}>
            <span className="gn-sidebar-avatar" aria-hidden="true">{account.initials}</span>
            <span className="gn-sidebar-label" aria-hidden={!expanded || undefined}><strong>{account.name}</strong>{" "}<small>{account.detail}</small></span>
            {expanded && <ChevronRight aria-hidden="true" />}
          </a>
        )}
        {footer}
      </nav>
    </NavigationGlass>
  );
}

export default LiquidGlassExpandableSidebar;
export { LiquidGlassExpandableSidebar };
