// Procedural Sprite-Stacking Voxel Slice Baker
// Every entity is built as a stack of 2D horizontal pixel slices (z=0..N-1).
// Each slice automatically receives crisp dark pixel outlines around its boundary
// plus subtle vertical shading so 3/4 isometric extrusion looks genuinely 3D!

import { ARMORS, WEAPONS } from './data.js';

const OUTLINE = '#0c0714';

function createSliceCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Helper: rasterize a slice from a draw callback into an offscreen pixel buffer
// and automatically wrap non-transparent pixels in a crisp 1px dark outline!
function bakeSlice(size, drawFn, zNorm = 0.5) {
  // Draw onto raw grid (padded by 2px on each side for outline)
  const dim = size + 4;
  const grid = new Array(dim * dim).fill(null);

  const px = (x, y, color) => {
    const gx = Math.round(x) + 2;
    const gy = Math.round(y) + 2;
    if (gx >= 1 && gx < dim - 1 && gy >= 1 && gy < dim - 1) {
      grid[gy * dim + gx] = color;
    }
  };

  const rect = (x, y, w, h, color) => {
    for (let yy = Math.floor(y); yy < Math.floor(y + h); yy++) {
      for (let xx = Math.floor(x); xx < Math.floor(x + w); xx++) {
        px(xx, yy, color);
      }
    }
  };

  const disc = (cx, cy, r, color) => {
    const r2 = r * r;
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r2) px(xx, yy, color);
      }
    }
  };

  const ring = (cx, cy, rOuter, rInner, color) => {
    const ro2 = rOuter * rOuter;
    const ri2 = rInner * rInner;
    for (let yy = Math.floor(cy - rOuter); yy <= Math.ceil(cy + rOuter); yy++) {
      for (let xx = Math.floor(cx - rOuter); xx <= Math.ceil(cx + rOuter); xx++) {
        const d2 = (xx - cx) ** 2 + (yy - cy) ** 2;
        if (d2 <= ro2 && d2 >= ri2) px(xx, yy, color);
      }
    }
  };

  drawFn({ px, rect, disc, ring, c: (size - 1) / 2, size });

  // Outline pass: any empty pixel with a 4-connected filled neighbor becomes OUTLINE
  const canvas = createSliceCanvas(dim, dim);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const col = grid[y * dim + x];
      if (col) {
        ctx.fillStyle = shadeHex(col, (zNorm - 0.45) * 26);
        ctx.fillRect(x, y, 1, 1);
      } else {
        const hasNeighbor =
          (x > 0 && grid[y * dim + (x - 1)]) ||
          (x < dim - 1 && grid[y * dim + (x + 1)]) ||
          (y > 0 && grid[(y - 1) * dim + x]) ||
          (y < dim - 1 && grid[(y + 1) * dim + x]);
        if (hasNeighbor) {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  return canvas;
}

function shadeHex(hex, delta) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + delta);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + delta);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + delta);
  return `rgb(${r},${g},${b})`;
}

// Bake a white silhouette version of a stack for crisp hit flashes
function makeFlashStack(slices) {
  return slices.map((s) => {
    const c = createSliceCanvas(s.width, s.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(s, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s.width, s.height);
    return c;
  });
}

// ======================================================
// ARCHER STACK GENERATOR (Dynamic Armor Layers + Back Quiver!)
// Facing +X (right) in local slice space; live animated weapon rig is
// rendered dynamically in renderer.js so bow limbs flex & strings pull!
// ======================================================
export function buildArcherStack(armorId = 'ranger', weaponId = 'recurve') {
  const armor = ARMORS[armorId] || ARMORS.ranger;
  const weapon = WEAPONS[weaponId] || WEAPONS.recurve;
  const size = 20;
  const totalLayers = 15;
  const slices = [];

  for (let z = 0; z < totalLayers; z++) {
    const zNorm = z / (totalLayers - 1);
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          // Athletic staggered archer boots & greaves (z 0..3)
          if (z <= 2) {
            // Lead bow-side foot braced forward (-Y), rear foot planted back (+Y)
            rect(c + 0.2, c - 3.6, 3.0, 2.0, '#291a16');
            rect(c - 2.0, c + 1.5, 3.0, 2.0, '#291a16');
            if (z === 2) {
              rect(c - 0.2, c - 3.2, 2.8, 1.8, '#4a3228');
              rect(c - 1.8, c + 1.3, 2.8, 1.8, '#4a3228');
            }
          }
          if (z === 3) {
            // Fitted ranger trousers (sleek stance, no bulky wizard robe!)
            rect(c - 0.4, c - 2.9, 2.6, 2.0, armor.cloakDark);
            rect(c - 1.5, c + 0.9, 2.6, 2.0, armor.cloakDark);
            rect(c - 1.2, c - 1.4, 2.8, 2.8, armor.cloakDark);
          }

          // Sleek belted ranger tunic & short split half-cape (z 4..6)
          if (z >= 4 && z <= 6) {
            const waistR = 3.4 - (z - 4) * 0.22;
            disc(c - 0.1, c, waistR, armor.cloakDark);
            disc(c + 0.4, c, waistR - 0.9, armor.cloakMid);
            // Narrow short scout half-cape fluttering behind (-X)
            rect(c - 4.7 + (z - 4) * 0.35, c - 1.6, 2.2, 3.4, armor.cloakDark);
            // Distinct leather ranger belt + brass buckle + hip pouch at z=5
            if (z === 5) {
              disc(c + 0.2, c, 3.3, '#472a18');
              rect(c + 2.6, c - 0.8, 1.2, 1.6, armor.trim);
              rect(c - 1.0, c + 2.3, 1.8, 1.4, '#6b3e26');
            }
            // Frostweave lower frost trim / Ashwalker ember edge on tunic hem
            if (z === 4 && armorId === 'ashwalker') {
              px(c - 4.5, c - 0.8, '#fb923c');
              px(c - 4.5, c + 0.8, '#fb923c');
            }
          }

          // Upper torso, diagonal quiver strap, asymmetric bow-arm pauldron & bracer (z 7..10)
          if (z >= 7 && z <= 10) {
            disc(c, c, 3.25, armor.cloakMid);
            // Chest armor highlight / leather jerkin front
            rect(c + 0.8, c - 1.6, 2.1, 3.2, armor.cloakLight);
            // Diagonal leather quiver chest-strap across torso
            if (z === 8 || z === 9) {
              px(c + 2.4, c - 1.2, '#5c341d');
              px(c + 2.5, c, '#5c341d');
              px(c + 2.2, c + 1.1, armor.trim);
            }
            // Asymmetric archer shoulders:
            // Lead bow-arm shoulder (-Y): reinforced archer pauldron + leather bracer
            disc(c + 0.6, c - 3.1, 2.05, armor.cloakLight);
            if (z === 9 || z === 10) {
              px(c + 1.1, c - 3.4, armor.trim);
              px(c + 0.2, c - 3.8, armor.trim);
            }
            // Extended bow-arm forearm & leather armguard reaching forward (+X, -Y)
            if (z === 8 || z === 9) {
              rect(c + 2.1, c - 2.6, 2.4, 1.6, '#6b3e26');
              px(c + 4.4, c - 1.9, '#e6c3a5');
            }
            // Rear drawing-arm shoulder (+Y): sleeker, unencumbered for bow draw
            disc(c - 0.4, c + 2.8, 1.65, armor.cloakMid);
            if (z === 9) {
              px(c - 0.2, c + 3.1, armor.trim);
            }
          }

          // Prominent angled leather back-quiver (z 7..10) + feathered arrow fletchings (z 9..13)!
          if (z >= 7 && z <= 10) {
            const qx = c - 3.9 - (z - 7) * 0.35;
            const qy = c - 1.1 - (z - 7) * 0.35;
            rect(qx - 1.1, qy - 1.1, 2.4, 2.4, '#6b3e26');
            px(qx + 0.4, qy - 0.4, '#9a5833');
            if (z === 10) {
              // Brass quiver mouth rim
              px(qx + 0.8, qy - 0.8, armor.trim);
              px(qx - 0.8, qy + 0.8, armor.trim);
            }
          }
          if (z >= 9 && z <= 13) {
            // 3 angled arrow shafts & bright feathered fletchings rising cleanly behind shoulder!
            const step = z - 9;
            const fx = c - 4.7 - step * 0.42;
            const fy = c - 2.0 - step * 0.32;
            // Shafts at z 9..10, bright feathered fletchings fanning out at z 10..13
            if (z <= 10) {
              px(fx + 0.4, fy + 0.5, '#cbd5e1');
              px(fx - 0.5, fy + 1.6, '#e2e8f0');
              px(fx + 1.1, fy - 0.4, '#cbd5e1');
            }
            if (z >= 10) {
              const featherMain = weapon.color || '#67e8f9';
              const featherAlt = z % 2 === 0 ? '#f8fafc' : weapon.accentColor || '#fde047';
              // Primary outer fletching
              px(fx, fy, featherMain);
              px(fx - 0.9, fy + 0.6, featherAlt);
              // Second arrow fletching
              px(fx - 0.7, fy + 1.7, featherMain);
              if (z <= 12) px(fx + 0.2, fy + 1.3, '#f8fafc');
              // Third arrow fletching
              if (z >= 11) {
                px(fx + 1.0, fy - 0.6, featherAlt);
                px(fx + 0.3, fy - 0.9, featherMain);
              }
            }
          }

          // Hooded Ranger Head, Glowing Eyes & Armor Set Landmarks (z 11..14)
          if (z >= 11) {
            const hr = 3.35 - (z - 11) * 0.52;
            disc(c - 0.1, c, hr, armor.hood);
            if (z === 11 || z === 12) {
              rect(c + 1.1, c - 1.7, 2.0, 3.4, '#0d0714');
              if (z === 12) {
                px(c + 2.5, c - 0.9, armor.trim);
                px(c + 2.5, c + 0.9, armor.trim);
              }
            }
            // Ranger cowl gold brow trim & hood point
            if (armorId === 'ranger' && z === 13) {
              px(c + 1.6, c, armor.trim);
            }
            // Ashwalker smoldering hood crest
            if (armorId === 'ashwalker' && z === 14) {
              px(c + 0.6, c, '#fb923c');
              px(c - 1.2, c, '#f97316');
            }
            // Nightstalker stealth cowl visor & headband crest
            if (armorId === 'nightstalker' && z === 13) {
              rect(c + 1.2, c - 1.4, 1.0, 2.8, '#38bdf8');
            }
            // Ossuary bone horns
            if (armorId === 'ossuary' && z >= 13) {
              px(c + 0.5, c - 3.5, '#f5f5f4');
              px(c + 0.5, c + 3.5, '#f5f5f4');
              if (z === 14) {
                px(c + 1.4, c - 4.1, '#e7e5e4');
                px(c + 1.4, c + 4.1, '#e7e5e4');
              }
            }
            // Bloodplate vampire bat-wings on helm!
            if (armorId === 'bloodplate' && z >= 12) {
              rect(c - 1.2, c - 4.7, 2.2, 1.5, '#f43f5e');
              rect(c - 1.2, c + 3.2, 2.2, 1.5, '#f43f5e');
              if (z === 14) {
                px(c - 2.0, c - 5.1, '#fbbf24');
                px(c - 2.0, c + 5.1, '#fbbf24');
              }
            }
            // Seraphim floating golden halo!
            if (armorId === 'seraphim' && z === 14) {
              ring(c, c, 4.1, 2.9, '#fde047');
            }
            // Stormcaller golden lightning crest
            if (armorId === 'stormcaller' && z === 14) {
              rect(c - 2.2, c - 0.6, 4.4, 1.2, '#fde047');
            }
            // Frostweave snowy fur collar trim
            if (armorId === 'frostweave' && z === 11) {
              ring(c, c, 3.6, 2.5, '#f0f9ff');
            }
            // Pointed ranger hood tail (-X)
            if (z >= 13 && armorId !== 'seraphim') {
              rect(c - 3.3, c - 1.0, 2.2, 2.0, armor.cloakLight);
            }
          }
        },
        zNorm
      )
    );
  }

  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

// ======================================================
// ENEMIES & BOSSES
// ======================================================
function buildSkeletonStack(isArcher = false) {
  const size = 16;
  const totalLayers = isArcher ? 13 : 12;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 2) {
            rect(c - 0.8, c - 2.6, 2, 1.5, '#cbd5e1');
            rect(c - 0.8, c + 1.1, 2, 1.5, '#cbd5e1');
          } else if (z <= 5) {
            // Tattered loincloth / ribs
            disc(c, c, 2.7, isArcher ? '#4c1d95' : '#475569');
            rect(c - 1, c - 2, 2.2, 4, '#e2e8f0');
          } else if (z <= 8) {
            // Ribcage + shoulders
            disc(c, c, 3.0, '#e2e8f0');
            disc(c, c, 1.4, '#334155');
            disc(c, c - 3, 1.5, '#cbd5e1');
            disc(c, c + 3, 1.5, '#cbd5e1');
            if (isArcher) {
              // Bone bow held forward
              for (let a = -3.4; a <= 3.4; a += 0.9) {
                px(c + 4.5 - (a * a) * 0.16, c + a, '#f87171');
              }
            } else if (z >= 7) {
              // Rusty sword forward
              rect(c + 2.5, c + 1.8, 4.2, 1.3, '#94a3b8');
            }
          } else {
            // Skull!
            const sr = 2.9 - (z - 9) * 0.45;
            disc(c, c, sr, '#f1f5f9');
            if (z === 10) {
              px(c + 2.2, c - 1, isArcher ? '#f43f5e' : '#ef4444');
              px(c + 2.2, c + 1, isArcher ? '#f43f5e' : '#ef4444');
            }
            if (isArcher && z === 12) {
              // Dark hood cap
              disc(c - 0.3, c, 2.2, '#581c87');
            }
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildImpStack() {
  const size = 14;
  const totalLayers = 10;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 1) {
            px(c, c - 2, '#7f1d1d');
            px(c, c + 2, '#7f1d1d');
          } else if (z <= 5) {
            disc(c, c, 2.8, '#b91c1c');
            // Tail
            rect(c - 4.2, c - 0.5, 2.2, 1, '#991b1b');
            // Little wings on z 4..5
            if (z >= 4) {
              rect(c - 2.6, c - 4.2, 2.2, 2, '#7f1d1d');
              rect(c - 2.6, c + 2.2, 2.2, 2, '#7f1d1d');
            }
          } else if (z <= 8) {
            disc(c + 0.3, c, 2.6, '#dc2626');
            if (z === 7) {
              px(c + 2.4, c - 0.9, '#fde047');
              px(c + 2.4, c + 0.9, '#fde047');
            }
          } else {
            // Devil horns!
            px(c, c - 2.2, '#fef08a');
            px(c, c + 2.2, '#fef08a');
            px(c + 0.8, c - 2.7, '#facc15');
            px(c + 0.8, c + 2.7, '#facc15');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildGhoulStack() {
  const size = 16;
  const totalLayers = 11;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 2) {
            rect(c - 2, c - 2.5, 3, 1.5, '#365314');
            rect(c - 2, c + 1, 3, 1.5, '#365314');
          } else if (z <= 6) {
            // Hunched bloated toxic torso
            disc(c - 0.4, c, 3.6, '#3f6212');
            disc(c - 1.2, c + 0.8, 1.8, '#84cc16'); // glowing plague pustule
            // Clawed forward arms
            if (z >= 4) {
              rect(c + 2, c - 3.2, 3, 1.4, '#4d7c0f');
              rect(c + 2, c + 1.8, 3, 1.4, '#4d7c0f');
            }
          } else {
            // Hunched head leaning forward (+X)
            const r = 2.7 - (z - 7) * 0.4;
            disc(c + 1.2, c, r, '#4d7c0f');
            if (z === 8) {
              px(c + 3.4, c - 0.9, '#bef264');
              px(c + 3.4, c + 0.9, '#bef264');
            }
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildHellguardStack() {
  const size = 20;
  const totalLayers = 16;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 3) {
            rect(c - 1.5, c - 3.5, 3.5, 2.5, '#27272a');
            rect(c - 1.5, c + 1, 3.5, 2.5, '#27272a');
          } else if (z <= 10) {
            // Heavy demon plate armor
            disc(c, c, 4.4, '#3f3f46');
            disc(c, c, 3.2, '#52525b');
            // Broad spiked pauldrons
            if (z >= 7) {
              disc(c, c - 4.4, 2.3, '#7f1d1d');
              disc(c, c + 4.4, 2.3, '#7f1d1d');
            }
            // Massive Tower Shield on front (+X)
            if (z >= 4 && z <= 11) {
              rect(c + 4.2, c - 4.2, 2.2, 8.4, '#18181b');
              rect(c + 5.2, c - 3.2, 1.4, 6.4, '#991b1b');
              if (z === 7 || z === 8) px(c + 6.0, c, '#fbbf24');
            }
          } else if (z <= 13) {
            // Greathelm
            disc(c, c, 3.3, '#27272a');
            if (z === 12) {
              rect(c + 2.2, c - 1.8, 1.2, 3.6, '#f97316');
            }
          } else {
            // Peeling crown / horns (layers 14-15 vanish when armor breaks!)
            rect(c - 0.5, c - 4.4, 2, 2, '#f59e0b');
            rect(c - 0.5, c + 2.4, 2, 2, '#f59e0b');
            if (z === 15) {
              px(c + 1, c - 5.2, '#fde047');
              px(c + 1, c + 5.2, '#fde047');
            }
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildCultistStack() {
  const size = 16;
  const totalLayers = 14;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 5) {
            // Wide dark necromancer robes
            const r = 4.2 - z * 0.2;
            disc(c, c, r, '#3b0764');
            disc(c + 0.4, c, r - 1.2, '#581c87');
          } else if (z <= 9) {
            disc(c, c, 3.1, '#6b21a8');
            // Golden ritual shoulder trim
            if (z === 9) {
              disc(c, c - 3, 1.5, '#eab308');
              disc(c, c + 3, 1.5, '#eab308');
            }
            // Glowing necromancer staff (+X, +Y)
            rect(c + 3.2, c + 2.2, 1.8, 1.8, '#78350f');
            if (z === 9) disc(c + 4.2, c + 3.0, 1.6, '#e879f9');
          } else {
            const hr = 2.8 - (z - 10) * 0.5;
            disc(c, c, hr, '#4c1d95');
            if (z === 11) {
              px(c + 2.1, c - 0.9, '#f0abfc');
              px(c + 2.1, c + 0.9, '#f0abfc');
            }
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildBomberStack() {
  const size = 15;
  const totalLayers = 11;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, disc, c }) => {
          if (z <= 1) {
            px(c, c - 2.2, '#451a03');
            px(c, c + 2.2, '#451a03');
          } else if (z <= 8) {
            // Swollen glowing magma belly
            const r = 3.2 + Math.sin(((z - 2) / 6) * Math.PI) * 1.4;
            disc(c, c, r, '#9a3412');
            disc(c + 0.4, c, r - 1.1, '#f97316');
            if (z === 5 || z === 6) disc(c + 1.2, c, 1.6, '#fde047');
            if (z === 7) {
              px(c + 2.8, c - 1, '#ffffff');
              px(c + 2.8, c + 1, '#ffffff');
            }
          } else {
            // Burning fuse spark on top!
            disc(c, c, z === 9 ? 1.8 : 1.1, z === 9 ? '#facc15' : '#ffffff');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildWraithStack() {
  const size = 16;
  const totalLayers = 14;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 2) {
            // Floating icy wisps instead of boots!
            disc(c - 0.5, c, 1.4 + z * 0.4, '#0284c7');
          } else if (z <= 8) {
            const r = 3.5 - Math.abs(z - 5) * 0.25;
            disc(c, c, r, '#0369a1');
            disc(c + 0.3, c, r - 1.0, '#38bdf8');
            if (z >= 6) {
              rect(c + 2.2, c - 3.2, 2.8, 1.3, '#7dd3fc');
              rect(c + 2.2, c + 1.9, 2.8, 1.3, '#7dd3fc');
            }
          } else if (z <= 12) {
            disc(c, c, 2.9 - (z - 9) * 0.4, '#bae6fd');
            if (z === 10) {
              px(c + 2.3, c - 1, '#ffffff');
              px(c + 2.3, c + 1, '#ffffff');
            }
          } else {
            // Jagged ice crystal crown!
            px(c, c - 2.4, '#e0f2fe');
            px(c, c + 2.4, '#e0f2fe');
            px(c + 1, c, '#ffffff');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildBossStack(variant = 'warden') {
  const palettes = {
    warden:     { layers: 20, dark: '#1e1b4b', mid: '#312e81', trim: '#e2e8f0', glow: '#38bdf8', horn: '#f1f5f9' },
    matriarch:  { layers: 21, dark: '#14532d', mid: '#166534', trim: '#bef264', glow: '#4ade80', horn: '#a3e635' },
    inquisitor: { layers: 21, dark: '#450a0a', mid: '#7f1d1d', trim: '#fb923c', glow: '#fde047', horn: '#f97316' },
    lich:       { layers: 21, dark: '#0c4a6e', mid: '#0369a1', trim: '#bae6fd', glow: '#e0f2fe', horn: '#7dd3fc' },
    overlord:   { layers: 22, dark: '#2e1065', mid: '#581c87', trim: '#f43f5e', glow: '#fde047', horn: '#e879f9' },
  };
  const pal = palettes[variant] || palettes.warden;
  const size = 28;
  const totalLayers = pal.layers;
  const bodyDark = pal.dark;
  const bodyMid = pal.mid;
  const trim = pal.trim;
  const glow = pal.glow;

  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ px, rect, disc, ring, c }) => {
          if (z <= 3) {
            disc(c, c, 7.2 - z * 0.25, bodyDark);
            rect(c - 2, c - 5.5, 4.5, 3, '#18181b');
            rect(c - 2, c + 2.5, 4.5, 3, '#18181b');
          } else if (z <= 13) {
            disc(c, c, 6.8, bodyMid);
            disc(c + 1.2, c, 4.5, bodyDark);
            if (z % 2 === 0) rect(c + 4.5, c - 3.2, 2, 6.4, trim);
            if (z >= 9) {
              disc(c, c - 6.8, 3.4, trim);
              disc(c, c + 6.8, 3.4, trim);
              disc(c, c - 6.8, 2.0, bodyMid);
              disc(c, c + 6.8, 2.0, bodyMid);
            }
            if (z >= 8 && z <= 12) {
              rect(c + 5, c + 4.5, 7.5, 2.0, '#78716c');
              if (z >= 9 && z <= 11) rect(c + 9.5, c + 1.5, 3.5, 6.5, glow);
            }
          } else if (z <= 17) {
            const r = 4.6 - (z - 14) * 0.45;
            disc(c + 0.5, c, r, trim);
            if (z === 15 || z === 16) {
              rect(c + 3.4, c - 2.4, 1.8, 1.6, glow);
              rect(c + 3.4, c + 0.8, 1.8, 1.6, glow);
            }
          } else {
            for (const dir of [-1, 1]) {
              const offset = (z - 17) * 1.4;
              disc(c - 0.5 + offset * 0.4, c + dir * (3.6 + offset), 1.5, pal.horn);
            }
            if (z === 18) disc(c + 0.5, c, 2.8, glow);
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

// ======================================================
// ENVIRONMENT PROPS (Height-Extruded Sprite Stacks!)
// ======================================================
function buildPillarStack() {
  const size = 18;
  const totalLayers = 18;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ rect, disc, c }) => {
          if (z <= 2 || z >= 15) {
            // Wide beveled plinth & capital
            rect(c - 6.5, c - 6.5, 13, 13, '#524569');
            rect(c - 5.2, c - 5.2, 10.4, 10.4, '#6d5c8a');
          } else {
            // Fluted cylindrical stone column with moss/cracks
            disc(c, c, 5.2, '#473c5c');
            disc(c - 0.5, c - 0.5, 4.0, '#62547d');
            if (z === 7 || z === 11) {
              rect(c + 1, c - 4.8, 2, 2, '#1e162b'); // crack notch
            }
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildBrazierStack() {
  const size = 16;
  const totalLayers = 13;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ disc, ring, c }) => {
          if (z <= 2) {
            disc(c, c, 4.6, '#27272a');
          } else if (z <= 6) {
            disc(c, c, 2.8, '#3f3f46');
          } else if (z <= 9) {
            // Flared iron fire bowl
            const r = 3.2 + (z - 6) * 0.8;
            disc(c, c, r, '#27272a');
            ring(c, c, r, r - 1.2, '#52525b');
            if (z === 9) disc(c, c, r - 1.4, '#dc2626');
          } else {
            // Glowing coals & core flame slices
            const r = 4.2 - (z - 9) * 1.0;
            disc(c, c, r, z === 10 ? '#f97316' : z === 11 ? '#facc15' : '#fef08a');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildBarrelStack() {
  const size = 14;
  const totalLayers = 11;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ disc, ring, c }) => {
          const bulge = Math.sin((z / (totalLayers - 1)) * Math.PI) * 1.1;
          const r = 3.9 + bulge;
          const isBand = z === 2 || z === 8;
          disc(c, c, r, isBand ? '#3f3f46' : '#7c3f1d');
          if (!isBand) {
            disc(c - 0.5, c - 0.5, r - 1.1, '#9a4f25');
          }
          if (z === totalLayers - 1) {
            // Explosive oil warning symbol on top!
            ring(c, c, r, r - 1.1, '#522811');
            disc(c, c, 2.0, '#ef4444');
            disc(c, c, 1.0, '#fde047');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

function buildChestStack() {
  const size = 16;
  const totalLayers = 10;
  const slices = [];
  for (let z = 0; z < totalLayers; z++) {
    slices.push(
      bakeSlice(
        size,
        ({ rect, px, c }) => {
          const w = 10;
          const h = 7 - (z > 6 ? (z - 6) * 1.2 : 0);
          rect(c - w / 2, c - h / 2, w, h, z === 5 ? '#eab308' : '#78350f');
          // Iron bands
          rect(c - w / 2, c - h / 2, 1.8, h, '#3f3f46');
          rect(c + w / 2 - 1.8, c - h / 2, 1.8, h, '#3f3f46');
          if (z === 4 || z === 5) {
            px(c, c + h / 2 - 0.5, '#fde047');
          }
        },
        z / (totalLayers - 1)
      )
    );
  }
  return { slices, flash: makeFlashStack(slices), size: size + 4 };
}

// Master Sprite Cache
export class SpriteBank {
  constructor() {
    this.cache = new Map();
    this.archerCache = new Map();
    this.init();
  }

  init() {
    this.cache.set('skeleton', buildSkeletonStack(false));
    this.cache.set('bone_archer', buildSkeletonStack(true));
    this.cache.set('imp', buildImpStack());
    this.cache.set('ghoul', buildGhoulStack());
    this.cache.set('cultist', buildCultistStack());
    this.cache.set('bomber', buildBomberStack());
    this.cache.set('wraith', buildWraithStack());
    this.cache.set('hellguard', buildHellguardStack());
    this.cache.set('boss_warden', buildBossStack('warden'));
    this.cache.set('boss_matriarch', buildBossStack('matriarch'));
    this.cache.set('boss_inquisitor', buildBossStack('inquisitor'));
    this.cache.set('boss_lich', buildBossStack('lich'));
    this.cache.set('boss_overlord', buildBossStack('overlord'));
    this.cache.set('pillar', buildPillarStack());
    this.cache.set('brazier', buildBrazierStack());
    this.cache.set('barrel', buildBarrelStack());
    this.cache.set('chest', buildChestStack());
  }

  get(key) {
    return this.cache.get(key);
  }

  getArcher(armorId, weaponId) {
    const key = `${armorId}_${weaponId}`;
    if (!this.archerCache.has(key)) {
      this.archerCache.set(key, buildArcherStack(armorId, weaponId));
    }
    return this.archerCache.get(key);
  }
}
