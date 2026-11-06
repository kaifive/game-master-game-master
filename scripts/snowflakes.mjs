// Regenerates the snowflake tiles in judges-table.css:
//   node scripts/snowflakes.mjs components/packs/judges-table/judges-table.css
import fs from "node:fs";
let s = 11;
const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
// One arm of a stellar flake: spine plus two pairs of branches.
const arm = "M0 0V-10M0-4.2l-2.8-2.8M0-4.2l2.8-2.8M0-7.2l-1.8-1.8M0-7.2l1.8-1.8";
const plate = "M0 0V-10M0-5.5l-2-2M0-5.5l2-2"; // simpler flake for the far layer
const defs = (id, d) =>
  `<g id="${id}" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round">` +
  [0, 60, 120, 180, 240, 300].map((a) => `<path d="${d}" transform="rotate(${a})"/>`).join("") +
  `<circle r="1.4" fill="#fff" stroke="none"/></g>`;
function tile(size, n, min, max, d) {
  let uses = "";
  const placed = [];
  while (placed.length < n) {
    const k = min + r() * (max - min); // flake radius in px
    const x = k + r() * (size - 2 * k),
      y = k + r() * (size - 2 * k);
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.k + k + 18)) continue;
    placed.push({ x, y, k });
    const o = (0.45 + r() * 0.55).toFixed(2);
    uses += `<use href="#f" opacity="${o}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(r() * 60)}) scale(${(k / 10).toFixed(2)})"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs>${defs("f", d)}</defs>${uses}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const near = tile(440, 10, 9, 14, arm);
const far = tile(330, 18, 4.5, 7, plate);
const css = `/* Winter night: a warm glow under the band, a snowbank glow at the foot,
   and two layers of falling snowflakes. Each layer is a tall strip that slides
   down exactly one tile, so the loop is seamless; transforms keep it cheap. */
.jt-snow {
  position: relative;
  isolation: isolate;
  overflow: clip;
  background-color: var(--gm-bg);
  background-image:
    radial-gradient(
      120% 45% at 50% 0%,
      color-mix(in srgb, var(--gm-band) 16%, transparent),
      transparent 70%
    ),
    radial-gradient(
      160% 35% at 50% 100%,
      color-mix(in srgb, var(--gm-snow) 45%, transparent),
      transparent 75%
    );
}

.jt-snow::before,
.jt-snow::after {
  content: "";
  position: absolute;
  inset: calc(-1 * var(--jt-tile)) 0 0;
  z-index: -1;
  pointer-events: none;
  background-color: var(--gm-snow);
  mask-image: var(--jt-flakes);
  mask-size: var(--jt-tile) var(--jt-tile);
  will-change: transform;
}

/* Near: bigger flakes, faster. Far: small flakes, slower, dimmer. */
.jt-snow::before {
  --jt-tile: 440px;
  --jt-flakes: var(--jt-flakes-near);
  animation: jt-fall 26s linear infinite;
}

.jt-snow::after {
  --jt-tile: 330px;
  --jt-flakes: var(--jt-flakes-far);
  mask-position: 151px 0;
  opacity: 0.6;
  animation: jt-fall 40s linear infinite;
}

@keyframes jt-fall {
  to {
    transform: translateY(var(--jt-tile));
  }
}

@media (prefers-reduced-motion: reduce) {
  .jt-snow::before,
  .jt-snow::after {
    animation: none;
  }
}

:root {
  --jt-flakes-near: ${near};
  --jt-flakes-far: ${far};
}
`;
const f = process.argv[2];
const old = fs.readFileSync(f, "utf8");
const a = old.indexOf("/* Winter night");
const b = old.indexOf(".jt-band");
fs.writeFileSync(f, old.slice(0, a) + css + "\n" + old.slice(b));
