// Chunky 16-bit Isometric Sprite-Stacking Renderer — Arcane Lighting & VFX Edition
// Features:
// - True zero-interpolation pixel-art sprite stacking with layer lag, wobble & peeling armor
// - Fast pre-baked additive dynamic light stamps for braziers, wall torches, arrows, spells & flashes
// - Multi-layered 16-bit arcane VFX: spinning runic circles, spectral tether chains, tapered energy ribbons,
//   forked dual-layer thunderbolts, 4-point crit starbursts, bow charge glint & cooling scorch craters
// - Rich medieval dungeon stonework with arched alcoves, heraldic banners, wall torches & twilight vignette

export const VIEW_W = 270;
export const VIEW_H = 402;

export class GameRenderer {
  constructor(canvas, sprites) {
    this.canvas = canvas;
    this.viewW = VIEW_W;
    this.viewH = VIEW_H;
    this.canvas.width = this.viewW;
    this.canvas.height = this.viewH;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = sprites;

    this.floorCanvas = null;
    this.floorBiomeKey = null;
    this.wallTorches = [];
    this.dustMotes = [];
    for (let i = 0; i < 28; i++) {
      this.dustMotes.push({
        x: Math.random() * 360,
        y: Math.random() * 490,
        phase: Math.random() * Math.PI * 2,
        speed: 4 + Math.random() * 7,
        warm: Math.random() < 0.6,
      });
    }

    this.lights = this._bakeLightStamps();
    this.vignette = this._bakeVignette();
  }

  // Match logical pixel height to container aspect ratio (1:1 crisp pixels on iPhone 17 & desktop!)
  resize(stageW, stageH) {
    if (!stageW || !stageH) return;
    const nextW = VIEW_W;
    const nextH = Math.max(320, Math.min(540, Math.round(nextW * (stageH / stageW))));
    if (nextW === this.viewW && nextH === this.viewH) return;
    this.viewW = nextW;
    this.viewH = nextH;
    this.canvas.width = nextW;
    this.canvas.height = nextH;
    this.ctx.imageSmoothingEnabled = false;
    this.vignette = this._bakeVignette();
  }

  // Pre-baked soft pixel-stepped additive glow stamps (ultra-fast 60fps dynamic lighting!)
  _bakeLightStamps() {
    const makeStamp = (inner, mid, outer, size = 64) => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      const r = size / 2;
      const g = ctx.createRadialGradient(r, r, 1, r, r, r);
      g.addColorStop(0, inner);
      g.addColorStop(0.42, mid);
      g.addColorStop(1, outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      return c;
    };

    return {
      amber: makeStamp('rgba(255, 200, 90, 0.42)', 'rgba(255, 118, 32, 0.16)', 'rgba(0,0,0,0)'),
      cyan: makeStamp('rgba(165, 243, 252, 0.42)', 'rgba(56, 189, 248, 0.16)', 'rgba(0,0,0,0)'),
      gold: makeStamp('rgba(254, 240, 138, 0.48)', 'rgba(250, 204, 21, 0.18)', 'rgba(0,0,0,0)'),
      violet: makeStamp('rgba(233, 213, 255, 0.42)', 'rgba(168, 85, 247, 0.17)', 'rgba(0,0,0,0)'),
      crimson: makeStamp('rgba(254, 205, 211, 0.40)', 'rgba(244, 63, 94, 0.16)', 'rgba(0,0,0,0)'),
      emerald: makeStamp('rgba(167, 243, 208, 0.40)', 'rgba(16, 185, 129, 0.15)', 'rgba(0,0,0,0)'),
      white: makeStamp('rgba(255, 255, 255, 0.65)', 'rgba(224, 242, 254, 0.22)', 'rgba(0,0,0,0)'),
    };
  }

  _bakeVignette() {
    const c = document.createElement('canvas');
    c.width = this.viewW;
    c.height = this.viewH;
    const ctx = c.getContext('2d');
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    const g = ctx.createRadialGradient(cx, cy, this.viewW * 0.28, cx, cy, this.viewH * 0.66);
    g.addColorStop(0, 'rgba(10, 6, 18, 0)');
    g.addColorStop(0.7, 'rgba(12, 6, 24, 0.22)');
    g.addColorStop(1, 'rgba(7, 3, 15, 0.56)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    return c;
  }

  _stampLight(ctx, colorKey, x, y, radius, alpha = 1) {
    const img = this.lights[colorKey] || this.lights.amber;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(x - radius), Math.round(y - radius * 0.78), Math.round(radius * 2), Math.round(radius * 1.56));
  }

  _colorToLightKey(hex) {
    if (!hex) return 'cyan';
    const h = hex.toLowerCase();
    if (h.includes('fb92') || h.includes('f973') || h.includes('ff')) return 'amber';
    if (h.includes('fde0') || h.includes('facc') || h.includes('fbbf')) return 'gold';
    if (h.includes('c084') || h.includes('e879') || h.includes('d8b4') || h.includes('a78b')) return 'violet';
    if (h.includes('f43f') || h.includes('fb71') || h.includes('ef44')) return 'crimson';
    if (h.includes('34d3') || h.includes('4ade') || h.includes('84cc')) return 'emerald';
    return 'cyan';
  }

  _ensureFloorTile(arenaW, arenaH, biome) {
    const key = `${biome.name}_${arenaW}_${arenaH}`;
    if (this.floorBiomeKey === key && this.floorCanvas) return;
    this.floorBiomeKey = key;

    const c = document.createElement('canvas');
    c.width = arenaW;
    c.height = arenaH;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const tile = 18;
    ctx.fillStyle = biome.grout;
    ctx.fillRect(0, 0, arenaW, arenaH);

    let seed = 1337 + biome.minFloor * 91;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let y = 0; y < arenaH; y += tile) {
      const stagger = ((y / tile) % 2) * (tile / 2);
      for (let x = -tile; x < arenaW + tile; x += tile) {
        const tx = x + stagger;
        const r = rand();
        ctx.fillStyle = r > 0.5 ? biome.floorA : biome.floorB;
        ctx.fillRect(tx + 1, y + 1, tile - 2, tile - 2);

        // Crisp bevel highlights & inner stone depth
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(tx + 1, y + 1, tile - 2, 1);
        ctx.fillRect(tx + 1, y + 1, 1, tile - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(tx + 1, y + tile - 2, tile - 2, 1);

        // Cracks, moss tufts, and scattered dungeon bone chips
        if (r > 0.85) {
          ctx.fillStyle = biome.grout;
          ctx.fillRect(tx + 4, y + 6, 5, 1);
          ctx.fillRect(tx + 8, y + 7, 1, 4);
        } else if (r < 0.08) {
          ctx.fillStyle = biome.minFloor === 4 ? '#1f4d3b' : biome.minFloor === 7 ? '#4a1d1f' : '#2e2342';
          ctx.fillRect(tx + 2, y + 2, 4, 2);
          ctx.fillRect(tx + 3, y + 4, 2, 1);
        } else if (r > 0.48 && r < 0.505 && y > 45 && y < arenaH - 45) {
          // Tiny dungeon pebble / bone sliver
          ctx.fillStyle = '#645c78';
          ctx.fillRect(tx + 7, y + 9, 3, 1);
          ctx.fillRect(tx + 8, y + 8, 1, 2);
        }
      }
    }

    // Carved glowing runic floor medallion in arena center
    const cx = arenaW / 2;
    const cy = arenaH / 2;
    ctx.strokeStyle = 'rgba(196, 165, 245, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 36, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.11)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 34, 23, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 8 carved compass rune pips around medallion
    ctx.fillStyle = 'rgba(216, 180, 254, 0.22)';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * 43) - 1, Math.round(cy + Math.sin(a) * 29) - 1, 3, 3);
    }

    // Thick extruded medieval stone walls
    const wall = 14;
    ctx.fillStyle = biome.wallTop;
    ctx.fillRect(0, 0, arenaW, wall);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, wall - 2, arenaW, 2);

    ctx.fillStyle = biome.wallSide;
    ctx.fillRect(0, wall, arenaW, 14);
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(0, wall + 14, arenaW, 2);

    // Battlement masonry seams + gothic recessed wall alcoves
    for (let x = 16; x < arenaW - 16; x += 28) {
      ctx.fillStyle = biome.grout;
      ctx.fillRect(x, wall, 2, 14);
    }

    // Hanging tattered medieval banners along North wall
    const bannerColor = biome.bannerColor || '#581c87';
    const bannerTrim = '#eab308';
    const bannerXs = [68, 126, arenaW - 126, arenaW - 68];
    for (const bx of bannerXs) {
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(bx - 6, wall - 1, 12, 16);
      ctx.fillStyle = bannerColor;
      ctx.fillRect(bx - 5, wall, 10, 13);
      ctx.fillStyle = bannerTrim;
      ctx.fillRect(bx - 5, wall, 10, 2);
      ctx.fillRect(bx - 1, wall + 4, 2, 5);
      // Swallowtail notch
      ctx.fillStyle = biome.wallSide;
      ctx.fillRect(bx - 1, wall + 12, 2, 3);
    }

    // Left, right & south extruded walls
    ctx.fillStyle = biome.wallTop;
    ctx.fillRect(0, 0, wall, arenaH);
    ctx.fillRect(arenaW - wall, 0, wall, arenaH);
    ctx.fillStyle = biome.wallSide;
    ctx.fillRect(wall - 3, 0, 3, arenaH);
    ctx.fillRect(arenaW - wall, 0, 3, arenaH);
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(wall, wall + 14, 2, arenaH - wall * 2 - 14);
    ctx.fillRect(arenaW - wall - 2, wall + 14, 2, arenaH - wall * 2 - 14);

    ctx.fillStyle = biome.wallTop;
    ctx.fillRect(0, arenaH - wall, arenaW, wall);
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(0, arenaH - wall, arenaW, 2);

    // Wall-mounted iron torch sconces (animated flames drawn each frame!)
    this.wallTorches = [
      { x: 40, y: wall + 9 },
      { x: arenaW / 2 - 42, y: wall + 9 },
      { x: arenaW / 2 + 42, y: wall + 9 },
      { x: arenaW - 40, y: wall + 9 },
      { x: wall + 3, y: arenaH * 0.48 },
      { x: arenaW - wall - 3, y: arenaH * 0.48 },
    ];
    for (const t of this.wallTorches) {
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(Math.round(t.x - 2), Math.round(t.y - 2), 5, 6);
      ctx.fillStyle = '#52525b';
      ctx.fillRect(Math.round(t.x - 1), Math.round(t.y - 1), 3, 4);
    }

    this.floorCanvas = c;
  }

  // Core Sprite-Stacking Drawer
  drawSpriteStack(ctx, stack, x, y, opts = {}) {
    if (!stack) return;
    const {
      angle = 0,
      scale = 1,
      sliceStep = 1.25,
      scaleZ = 1,
      lagX = 0,
      lagY = 0,
      wobbleX = 0,
      flash = false,
      alpha = 1,
      visibleLayers = stack.slices.length,
      shadowRadius = 7,
      spinOffset = 0,
      tintChill = false,
    } = opts;

    const slices = flash ? stack.flash : stack.slices;
    const count = Math.max(1, Math.min(slices.length, Math.round(visibleLayers)));
    const prevAlpha = ctx.globalAlpha;

    // Grounded isometric shadow
    if (shadowRadius > 0) {
      ctx.globalAlpha = 0.46 * alpha;
      ctx.fillStyle = '#07030d';
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y + 1), shadowRadius * scale, shadowRadius * 0.56 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Z-slices bottom-to-top
    ctx.globalAlpha = alpha;
    const total = slices.length;
    for (let z = 0; z < count; z++) {
      const zNorm = z / Math.max(1, total - 1);
      const slice = slices[z];
      const sx = x + lagX * zNorm + wobbleX * zNorm;
      const sy = y - z * sliceStep * scale * scaleZ + lagY * zNorm * 0.5;

      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      ctx.scale(scale, scale * 0.68);
      ctx.rotate(angle + spinOffset * zNorm);
      ctx.drawImage(slice, -slice.width / 2, -slice.height / 2);
      ctx.restore();
    }

    // Icy crystal glaze when chilled
    if (tintChill && !flash) {
      ctx.globalAlpha = 0.28 * alpha;
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.ellipse(x, y - count * sliceStep * 0.5 * scale, shadowRadius * 0.72, count * sliceStep * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = prevAlpha;
  }

  // Spinning 16-bit Arcane Rune Circle helper (used for Snares, Rifts, Skyfall, Portals)
  _drawRuneCircle(ctx, x, y, radius, color, time, speed = 1.6, pips = 6, fillAlpha = 0.14) {
    const ry = radius * 0.64;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = fillAlpha;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner counter-rotating ring
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.7, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting pixel rune glyphs
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < pips; i++) {
      const a = time * speed + (i / pips) * Math.PI * 2;
      const px = Math.round(x + Math.cos(a) * radius * 0.86);
      const py = Math.round(y + Math.sin(a) * ry * 0.86);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, 2, 2);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.restore();
  }

  render(game) {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    const biome = game.biome;
    this._ensureFloorTile(game.arenaW, game.arenaH, biome);

    ctx.fillStyle = '#090410';
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const shakeX = game.shake > 0 ? (Math.random() * 2 - 1) * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() * 2 - 1) * game.shake : 0;
    const camX = Math.round(game.camX + shakeX);
    const camY = Math.round(game.camY + shakeY);

    ctx.save();
    ctx.translate(-camX, -camY);

    // 1. Dungeon Floor Masonry + Persistent Scorch Craters
    ctx.drawImage(this.floorCanvas, 0, 0);
    this._drawWallTorchFlames(ctx, game.time);

    for (const sc of game.scorchMarks) {
      const a = Math.min(0.65, (sc.life / sc.maxLife) * 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#090410';
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y, sc.radius, sc.radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      if (sc.ember && sc.life > sc.maxLife * 0.55) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(Math.round(sc.x - 3), Math.round(sc.y - 1), 6, 1);
        ctx.fillRect(Math.round(sc.x - 1), Math.round(sc.y - 2), 2, 3);
      }
    }
    ctx.globalAlpha = 1;

    // 2. North Exit Portal
    if (game.roomCleared && game.portal) {
      this._drawExitPortal(ctx, game.portal, game.time);
    }

    // 3. Floor Decals (Arcane Snare Circles, Spectral Chains, Fire, Poison, Caltrops)
    for (const d of game.decals) {
      this._drawDecal(ctx, d, game.time, game.enemies);
    }

    for (const rift of game.spawnRifts) {
      this._drawSpawnRift(ctx, rift, game.time);
    }

    for (const strike of game.skyStrikes) {
      this._drawSkyStrikeWarning(ctx, strike, game.time);
    }

    // 4. Target lock reticle
    if (game.aimTarget && game.aimTarget.hp > 0) {
      const t = game.aimTarget;
      const pulse = 1 + Math.sin(game.time * 11) * 0.14;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 1, (t.radius + 4) * pulse, (t.radius + 4) * 0.58 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Player Tension Snap Ring & Converging Charge Sparks
    const p = game.player;
    if (p.hp > 0) {
      if (p.tension > 0.08) {
        const ready = p.tension >= 0.72;
        ctx.strokeStyle = ready ? '#fde047' : '#38bdf8';
        ctx.lineWidth = ready ? 2 : 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 1, 13, 8, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.tension));
        ctx.stroke();

        // Converging arcane charge sparks pulling inward!
        const sparkCount = ready ? 4 : 2;
        for (let s = 0; s < sparkCount; s++) {
          const ang = game.time * 7 + (s / sparkCount) * Math.PI * 2;
          const dist = 16 * (1 - p.tension * 0.55);
          ctx.fillStyle = ready ? '#fef08a' : '#7dd3fc';
          ctx.fillRect(Math.round(p.x + Math.cos(ang) * dist), Math.round(p.y - 8 + Math.sin(ang) * dist * 0.6), 2, 2);
        }
      }
      if (p.stalkerReady) {
        this._drawRuneCircle(ctx, p.x, p.y + 1, 16, '#facc15', game.time, 3.5, 4, 0.08);
      }
    }

    // 6. Pickups (XP Crystals, Gold Coins, Hearts)
    for (const item of game.pickups) {
      const bob = Math.sin(game.time * 6 + item.seed) * 2.2;
      ctx.fillStyle = 'rgba(8, 4, 16, 0.48)';
      ctx.fillRect(Math.round(item.x - 2), Math.round(item.y), 4, 2);

      if (item.type === 'gold') {
        ctx.fillStyle = '#0c0714';
        ctx.fillRect(Math.round(item.x - 3), Math.round(item.y - 6 + bob), 6, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(Math.round(item.x - 2), Math.round(item.y - 5 + bob), 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(item.x - 1), Math.round(item.y - 4 + bob), 2, 1);
      } else if (item.type === 'heart') {
        ctx.fillStyle = '#0c0714';
        ctx.fillRect(Math.round(item.x - 3), Math.round(item.y - 7 + bob), 7, 6);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(Math.round(item.x - 2), Math.round(item.y - 6 + bob), 5, 4);
        ctx.fillStyle = '#ffe4e6';
        ctx.fillRect(Math.round(item.x - 1), Math.round(item.y - 5 + bob), 2, 1);
      } else {
        ctx.fillStyle = '#0c0714';
        ctx.fillRect(Math.round(item.x - 2), Math.round(item.y - 7 + bob), 5, 6);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(Math.round(item.x - 1), Math.round(item.y - 6 + bob), 3, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(item.x), Math.round(item.y - 5 + bob), 1, 2);
      }
    }

    // 7. Y-Sorted Sprite-Stacked Entities
    const renderables = [];
    for (const prop of game.props) if (prop.alive) renderables.push({ y: prop.y, kind: 'prop', obj: prop });
    for (const ghost of game.afterimages) renderables.push({ y: ghost.y, kind: 'ghost', obj: ghost });
    for (const e of game.enemies) renderables.push({ y: e.y, kind: 'enemy', obj: e });
    if (p.hp > 0) renderables.push({ y: p.y, kind: 'player', obj: p });
    for (const orb of game.boneShields) renderables.push({ y: orb.y, kind: 'orb', obj: orb });
    for (const forb of game.fireOrbs) renderables.push({ y: forb.y, kind: 'fireOrb', obj: forb });
    for (const dec of game.decoys) renderables.push({ y: dec.y, kind: 'decoy', obj: dec });

    renderables.sort((a, b) => a.y - b.y);

    for (const item of renderables) {
      if (item.kind === 'prop') this._drawProp(ctx, item.obj, game.time);
      else if (item.kind === 'ghost') {
        const g = item.obj;
        this.drawSpriteStack(ctx, g.stack, g.x, g.y, { angle: g.angle, alpha: (g.life / g.maxLife) * 0.45, flash: true, shadowRadius: 0 });
      } else if (item.kind === 'enemy') this._drawEnemy(ctx, item.obj, game.time);
      else if (item.kind === 'player') this._drawPlayer(ctx, item.obj, game.time);
      else if (item.kind === 'orb') this._drawBoneOrb(ctx, item.obj);
      else if (item.kind === 'fireOrb') this._drawFireOrb(ctx, item.obj, game.time);
      else if (item.kind === 'decoy') this._drawDecoy(ctx, item.obj, game.time);
    }

    // 8. Projectiles with Tapered Energy Ribbons & Ground Shadows
    for (const proj of game.projectiles) {
      this._drawProjectile(ctx, proj);
    }

    // 9. Arcane Launch Beams, Dual-Layer Lightning, Thunderbolts, Nova Rings & Starbursts
    for (const beam of game.launchBeams) this._drawLaunchBeam(ctx, beam);
    for (const arc of game.lightningArcs) this._drawLightning(ctx, arc);
    for (const bolt of game.thunderBolts) this._drawThunderBolt(ctx, bolt);
    for (const ring of game.novaRings) this._drawNovaRing(ctx, ring);
    for (const sb of game.starbursts) this._drawStarburst(ctx, sb);

    // 10. Particles & Floating Dungeon Dust Motes
    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
      if (pt.shadow && pt.z > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), Math.max(1, pt.size - 1), 1);
      }
      const py = Math.round(pt.y - (pt.z || 0));
      if (pt.outlined) {
        ctx.fillStyle = '#0c0714';
        ctx.fillRect(Math.round(pt.x - 1), py - 1, pt.size + 2, pt.size + 2);
      }
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), py, pt.size, pt.size);
    }

    // Ambient floating lantern dust motes
    for (const m of this.dustMotes) {
      const mx = (m.x + Math.sin(game.time * 0.7 + m.phase) * 14 + game.arenaW) % game.arenaW;
      const my = (m.y - game.time * m.speed + game.arenaH * 100) % game.arenaH;
      const twinkle = 0.22 + 0.35 * (0.5 + 0.5 * Math.sin(game.time * 3 + m.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = m.warm ? '#fde68a' : '#c4b5fd';
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    ctx.globalAlpha = 1;

    // 11. DYNAMIC MAGICAL LIGHTING PASS (Braziers, Wall Torches, Arrows, Spells, Flashes!)
    this._drawDynamicLighting(ctx, game);

    // 12. In-World Floating UI (Health Pill-Bars, Nameplates, Crit Numbers)
    for (const e of game.enemies) {
      if (e.isBoss || e.hp < e.maxHp || e.armor > 0) this._drawEnemyBar(ctx, e);
    }
    for (const ft of game.floatingTexts) this._drawFloatingText(ctx, ft);

    ctx.restore();

    // 13. Cozy Twilight Dungeon Vignette (screen-space frame)
    ctx.drawImage(this.vignette, 0, 0);

    // 14. Screen-space Virtual Thumbstick & Banners
    if (game.joy.active) this._drawJoystick(ctx, game.joy);
    if (game.banner && game.banner.timer > 0) this._drawBanner(ctx, game.banner);
  }

  _drawWallTorchFlames(ctx, time) {
    for (const t of this.wallTorches) {
      const f = Math.sin(time * 17 + t.x * 0.3) * 1.1;
      const fx = Math.round(t.x);
      const fy = Math.round(t.y - 3);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(fx - 1 + f * 0.4), fy - 3, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx, fy - 1, 1, 1);
    }
  }

  _drawDynamicLighting(ctx, game) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Wall torches warm lantern pools
    for (const t of this.wallTorches) {
      const flick = Math.sin(game.time * 14 + t.x) * 3;
      this._stampLight(ctx, 'amber', t.x, t.y + 4, 34 + flick, 0.65);
    }

    // Flaming iron braziers + glowing relic chests
    for (const prop of game.props) {
      if (!prop.alive) continue;
      if (prop.type === 'brazier') {
        const flick = Math.sin(game.time * 13 + prop.x) * 5;
        this._stampLight(ctx, 'amber', prop.x, prop.y - 10, 62 + flick, 0.82);
      } else if (prop.type === 'chest') {
        const pulse = Math.sin(game.time * 6) * 6;
        this._stampLight(ctx, 'gold', prop.x, prop.y - 6, 42 + pulse, 0.78);
      }
    }

    // Live colored light pools under EVERY flying magical projectile!
    for (const pr of game.projectiles) {
      const key = pr.ignited ? 'amber' : pr.fromEnemy ? 'crimson' : this._colorToLightKey(pr.color);
      const rad = pr.heavy ? 24 : 15;
      this._stampLight(ctx, key, pr.x, pr.y - 6, rad, pr.heavy ? 0.68 : 0.45);
    }

    // Orbiting Brazier Heart fireballs & Shadow Decoys
    for (const forb of game.fireOrbs) {
      this._stampLight(ctx, 'amber', forb.x, forb.y - 8, 34, 0.85);
    }
    for (const dec of game.decoys) {
      this._stampLight(ctx, 'violet', dec.x, dec.y - 6, 36, 0.72);
    }

    // Glowing floor decals (Snare Trap, Fire patches, Poison)
    for (const d of game.decals) {
      if (d.kind === 'fire') this._stampLight(ctx, 'amber', d.x, d.y, d.radius * 1.45, 0.52);
      else if (d.kind === 'snare') this._stampLight(ctx, 'violet', d.x, d.y, d.radius * 1.35, 0.62);
      else if (d.kind === 'poison') this._stampLight(ctx, 'emerald', d.x, d.y, d.radius * 1.25, 0.4);
    }

    // Demonic Spawn Rifts & Exit Portal
    for (const r of game.spawnRifts) {
      this._stampLight(ctx, r.isBoss ? 'gold' : 'crimson', r.x, r.y, r.isBoss ? 44 : 24, 0.75);
    }
    if (game.roomCleared && game.portal) {
      this._stampLight(ctx, 'violet', game.portal.x, game.portal.y, 48 + Math.sin(game.time * 6) * 5, 0.9);
    }

    // Archer Snap Charge glow
    if (game.player.tension >= 0.65) {
      this._stampLight(ctx, 'gold', game.player.x, game.player.y - 10, 26, 0.6);
    }

    // Transient Impact Light Flashes (Crits, Explosions, Thunderbolts!)
    for (const fl of game.lightFlashes) {
      const a = Math.max(0, fl.life / fl.maxLife);
      this._stampLight(ctx, fl.colorKey, fl.x, fl.y, fl.radius * (0.7 + 0.3 * a), a * 0.95);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawProp(ctx, prop, time) {
    const stack = this.sprites.get(prop.type);
    if (!stack) return;

    let visibleLayers = stack.slices.length;
    if (prop.type === 'pillar' && prop.maxHp) {
      const ratio = Math.max(0.22, prop.hp / prop.maxHp);
      visibleLayers = Math.max(4, Math.ceil(stack.slices.length * ratio));
    }

    const wobbleX = prop.wobble > 0 ? Math.sin(time * 55) * prop.wobble * 2.5 : 0;
    this.drawSpriteStack(ctx, stack, prop.x, prop.y, {
      angle: prop.angle || 0,
      scale: prop.scale || 1,
      sliceStep: prop.type === 'pillar' ? 1.4 : 1.25,
      visibleLayers,
      wobbleX,
      flash: prop.flash > 0,
      shadowRadius: prop.radius + 1,
    });

    if (prop.type === 'brazier') {
      const f = Math.sin(time * 16 + prop.x) * 1.4;
      const topY = prop.y - 17;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(Math.round(prop.x - 4 + f * 0.3), Math.round(topY + 1), 8, 4);
      ctx.fillStyle = '#ff7b24';
      ctx.fillRect(Math.round(prop.x - 3 + f * 0.4), Math.round(topY - 1), 6, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(prop.x - 2 - f * 0.3), Math.round(topY - 3), 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(prop.x - 1), Math.round(topY - 1), 2, 2);
    }

    if (prop.type === 'chest') {
      const pulse = Math.sin(time * 6) * 2;
      this._drawRuneCircle(ctx, prop.x, prop.y + 1, 15 + pulse * 0.4, '#facc15', time, 2.4, 4, 0.16);
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0c0714';
      ctx.fillText('★ RELIC', prop.x + 1, Math.round(prop.y - 19 + pulse * 0.5));
      ctx.fillStyle = '#fde047';
      ctx.fillText('★ RELIC', prop.x, Math.round(prop.y - 20 + pulse * 0.5));
    }
  }

  _drawPlayer(ctx, p, time) {
    const stack = this.sprites.getArcher(p.armorId, p.weaponId);
    const speed = Math.hypot(p.vx, p.vy);
    const bob = speed > 6 ? Math.sin(time * 18) * 0.06 : Math.sin(time * 4) * 0.025;
    const recoilStretch = p.recoil > 0 ? Math.sin(p.recoil * Math.PI * 3) * 0.16 : 0;
    const scaleZ = 1 + bob + recoilStretch - p.tension * 0.08;
    const invulnBlink = p.invuln > 0 && Math.floor(time * 24) % 2 === 0;

    this.drawSpriteStack(ctx, stack, p.x, p.y, {
      angle: p.facing,
      scale: 1.08,
      sliceStep: 1.28,
      scaleZ,
      lagX: -p.vx * 0.032,
      lagY: -p.vy * 0.02,
      wobbleX: p.recoil > 0 ? -Math.cos(p.facing) * p.recoil * 2.2 : 0,
      flash: p.hurtFlash > 0,
      alpha: invulnBlink ? 0.55 : 1,
      shadowRadius: 8.5,
    });

    // Crisp 4-point pixel star glint on the arrowhead when Tension Snap is charged!
    if (p.tension >= 0.72) {
      const gx = Math.round(p.x + Math.cos(p.facing) * 10);
      const gy = Math.round(p.y - 11 + Math.sin(p.facing) * 7);
      const sz = Math.floor(time * 18) % 2 === 0 ? 5 : 3;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(gx - sz, gy, sz * 2 + 1, 1);
      ctx.fillRect(gx, gy - sz, 1, sz * 2 + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - 1, gy - 1, 3, 3);
    }
  }

  _drawEnemy(ctx, e, time) {
    const stack = this.sprites.get(e.sprite);
    if (!stack) return;

    let visibleLayers = stack.slices.length;
    if (e.armorMax > 0 && e.armor <= 0) {
      visibleLayers = Math.max(8, stack.slices.length - 3);
    }

    const walkBob = Math.sin(time * (e.isBoss ? 8 : 14) + e.seed) * 0.06;
    const wobbleX = e.wobble > 0 ? Math.sin(time * 58) * e.wobble * 3.0 : 0;
    const scale = e.isBoss ? 1.32 : e.id === 'hellguard' ? 1.12 : 1.0;

    this.drawSpriteStack(ctx, stack, e.x, e.y, {
      angle: e.facing,
      scale,
      sliceStep: e.isBoss ? 1.42 : 1.22,
      scaleZ: 1 + walkBob,
      lagX: -e.vx * 0.028,
      lagY: -e.vy * 0.018,
      wobbleX,
      flash: e.flash > 0,
      visibleLayers,
      shadowRadius: e.radius + 1,
      tintChill: e.chillTimer > 0,
    });

    if (e.burnTimer > 0) {
      const fy = e.y - visibleLayers * 1.12 * scale;
      const flick = Math.sin(time * 22 + e.seed) * 1.4;
      ctx.fillStyle = '#f97316';
      ctx.fillRect(Math.round(e.x - 3 + flick * 0.4), Math.round(fy), 6, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(e.x - 1), Math.round(fy - 1), 3, 3);
    }
  }

  _drawBoneOrb(ctx, orb) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(orb.x - 2), Math.round(orb.y), 4, 2);
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(Math.round(orb.x - 3), Math.round(orb.y - 11), 7, 7);
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(Math.round(orb.x - 2), Math.round(orb.y - 10), 5, 5);
    ctx.fillStyle = '#d6d3d1';
    ctx.fillRect(Math.round(orb.x - 1), Math.round(orb.y - 9), 3, 2);
  }

  _drawFireOrb(ctx, orb, time) {
    const f = Math.sin(time * 20) * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(orb.x - 2), Math.round(orb.y), 4, 2);
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(Math.round(orb.x - 4), Math.round(orb.y - 12), 8, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(Math.round(orb.x - 3), Math.round(orb.y - 11), 6, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(Math.round(orb.x - 2 + f * 0.3), Math.round(orb.y - 10), 4, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(orb.x - 1), Math.round(orb.y - 9), 2, 2);
  }

  _drawDecoy(ctx, dec, time) {
    this._drawRuneCircle(ctx, dec.x, dec.y + 1, 18, '#c084fc', time, -3.0, 5, 0.14);
    this.drawSpriteStack(ctx, dec.stack, dec.x, dec.y, {
      angle: dec.angle + time * 1.6,
      scale: 1.04,
      alpha: 0.68,
      wobbleX: Math.sin(time * 22) * 1.5,
      shadowRadius: 8,
    });
  }

  // Tapered Glowing Energy Ribbon Trails + Hot White Cores on Projectiles!
  _drawProjectile(ctx, proj) {
    const z = proj.z ?? 10;
    const drawY = proj.y - z;
    const col = proj.ignited ? '#fb923c' : proj.color;

    // Ground shadow
    ctx.fillStyle = 'rgba(8, 4, 16, 0.45)';
    ctx.fillRect(Math.round(proj.x - 2), Math.round(proj.y), 4, 2);

    // Tapered glowing energy ribbon trail
    if (proj.trail && proj.trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 1; i < proj.trail.length; i++) {
        const a = proj.trail[i - 1];
        const b = proj.trail[i];
        const t = i / proj.trail.length;
        ctx.globalAlpha = t * 0.62;
        ctx.strokeStyle = col;
        ctx.lineWidth = (proj.heavy ? 4.5 : 3) * t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - z);
        ctx.lineTo(b.x, b.y - z);
        ctx.stroke();

        // Hot white inner streak
        ctx.globalAlpha = t * 0.78;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, (proj.heavy ? 1.8 : 1) * t);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(Math.round(proj.x), Math.round(drawY));
    ctx.rotate(proj.angle);

    if (proj.kind === 'chakram') {
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = col;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -3, 2, 2);
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (proj.kind === 'wisp' || proj.fromEnemy) {
      const c = proj.fromEnemy ? '#fb7185' : col;
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = c;
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -1, 3, 3);
    } else {
      const len = proj.heavy ? 12 : 8;
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(-len / 2 - 1, -2, len + 3, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-len / 2, -1, len, 2);
      ctx.fillStyle = col;
      ctx.fillRect(len / 2 - 2, -2, 4, 4);
      ctx.fillStyle = proj.heavy ? '#fde047' : col;
      ctx.fillRect(-len / 2 - 1, -2, 2, 4);
    }
    ctx.restore();
  }

  _drawDecal(ctx, d, time, enemies) {
    const alpha = Math.min(1, d.life / Math.min(0.6, d.maxLife));
    ctx.globalAlpha = alpha * 0.78;
    if (d.kind === 'fire') {
      const f = Math.sin(time * 20 + d.x) * 1.5;
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(d.x + f * 0.3, d.y, d.radius * 0.68, d.radius * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(Math.round(d.x - 2 + f * 0.3), Math.round(d.y - 2), 4, 2);
    } else if (d.kind === 'poison') {
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.ellipse(d.x - 1, d.y, d.radius * 0.6, d.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bubbling toxic pips
      const by = Math.sin(time * 8 + d.x) * 2;
      ctx.fillStyle = '#d9f99d';
      ctx.fillRect(Math.round(d.x + 3), Math.round(d.y - 2 + by), 2, 2);
    } else if (d.kind === 'snare') {
      ctx.globalAlpha = alpha;
      this._drawRuneCircle(ctx, d.x, d.y, d.radius, '#c084fc', time, 2.2, 6, 0.16);
      // Spectral energy chains physically tethering snared enemies to the trap center!
      for (const e of enemies) {
        if (Math.hypot(e.x - d.x, e.y - d.y) < d.radius + 6) {
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - 2);
          ctx.lineTo(e.x, e.y - 8);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    } else if (d.kind === 'caltrop') {
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(Math.round(d.x - 3), Math.round(d.y - 3), 6, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(Math.round(d.x - 2), Math.round(d.y - 2), 4, 4);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(Math.round(d.x - 1), Math.round(d.y - 1), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  _drawSpawnRift(ctx, r, time) {
    const p = 1 - r.timer / r.duration;
    const rad = 7 + p * (r.isBoss ? 15 : 8);
    const col = r.isBoss ? '#fde047' : '#f43f5e';
    this._drawRuneCircle(ctx, r.x, r.y, rad, col, time, r.isBoss ? 4.2 : 3.2, r.isBoss ? 8 : 5, 0.25);

    // Rising demonic beam crack
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.45 * p;
    ctx.fillRect(Math.round(r.x - 2), Math.round(r.y - 28 * p), 4, Math.round(28 * p));
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7 * p;
    ctx.fillRect(Math.round(r.x), Math.round(r.y - 22 * p), 1, Math.round(22 * p));
    ctx.globalAlpha = 1;
  }

  _drawSkyStrikeWarning(ctx, s, time) {
    const p = 1 - s.timer / s.duration;
    this._drawRuneCircle(ctx, s.x, s.y, s.radius, '#38bdf8', time, 4.5, 4, 0.14 + p * 0.14);

    if (p > 0.48) {
      const h = (1 - p) * 280;
      // Glowing cyan-white vertical rain streaks!
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(Math.round(s.x - 2), Math.round(s.y - h - 22), 4, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - h - 18), 2, 18);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(Math.round(s.x - 7), Math.round(s.y - h - 30), 2, 15);
      ctx.fillRect(Math.round(s.x + 6), Math.round(s.y - h - 26), 2, 15);
    }
  }

  _drawExitPortal(ctx, portal, time) {
    this._drawRuneCircle(ctx, portal.x, portal.y + 4, 24, '#c084fc', time, 2.8, 8, 0.25);
    const pulse = Math.sin(time * 6) * 2;
    ctx.fillStyle = '#0c0714';
    ctx.fillRect(Math.round(portal.x - 18), Math.round(portal.y - 12), 36, 20);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(Math.round(portal.x - 16), Math.round(portal.y - 10), 32, 16);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(Math.round(portal.x - 11), Math.round(portal.y - 7), 22, 11);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(portal.x - 6 + pulse * 0.4), Math.round(portal.y - 4), 12, 5);

    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0c0714';
    ctx.fillText('NEXT FLOOR ▲', portal.x + 1, portal.y - 17);
    ctx.fillStyle = '#fde047';
    ctx.fillText('NEXT FLOOR ▲', portal.x, portal.y - 18);
  }

  _drawLaunchBeam(ctx, beam) {
    const a = Math.max(0, beam.life / beam.maxLife);
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = beam.color;
    ctx.fillRect(Math.round(beam.x - 3), Math.round(beam.y - 210), 6, 200);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(beam.x - 1), Math.round(beam.y - 210), 2, 200);
    ctx.restore();
  }

  // Dual-layer forked jagged lightning arc
  _drawLightning(ctx, arc) {
    const a = Math.max(0, arc.life / 0.16);
    const mx1 = arc.x1 + (arc.x2 - arc.x1) * 0.35 + (arc.j1 || 0);
    const my1 = arc.y1 + (arc.y2 - arc.y1) * 0.35 - 10 + (arc.j2 || 0);
    const mx2 = arc.x1 + (arc.x2 - arc.x1) * 0.7 + (arc.j3 || 0);
    const my2 = arc.y1 + (arc.y2 - arc.y1) * 0.7 - 10 - (arc.j2 || 0);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1 - 10);
    ctx.lineTo(mx1, my1);
    ctx.lineTo(mx2, my2);
    ctx.lineTo(arc.x2, arc.y2 - 10);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  _drawThunderBolt(ctx, bolt) {
    const a = Math.max(0, bolt.life / bolt.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bolt.x, bolt.y - 190);
    ctx.lineTo(bolt.x - 7, bolt.y - 120);
    ctx.lineTo(bolt.x + 8, bolt.y - 60);
    ctx.lineTo(bolt.x, bolt.y - 5);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Forked side branch!
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bolt.x + 8, bolt.y - 60);
    ctx.lineTo(bolt.x + 20, bolt.y - 26);
    ctx.stroke();

    ctx.fillStyle = 'rgba(233, 213, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(bolt.x, bolt.y, 20 * a, 12 * a, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawNovaRing(ctx, ring) {
    const p = 1 - ring.life / ring.maxLife;
    const rad = ring.maxRadius * p;
    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - p) * 0.9);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(ring.x, ring.y, rad, rad * 0.64, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ring.x, ring.y, rad * 0.88, rad * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Crisp 4-point & 8-point pixel impact starburst!
  _drawStarburst(ctx, sb) {
    const t = Math.max(0, sb.life / sb.maxLife);
    const r = Math.round(sb.size * (0.4 + 0.7 * (1 - t)));
    const x = Math.round(sb.x);
    const y = Math.round(sb.y);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = sb.color;
    ctx.fillRect(x - r, y - 1, r * 2 + 1, 2);
    ctx.fillRect(x - 1, y - r, 2, r * 2 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - Math.floor(r * 0.5), y, r + 1, 1);
    ctx.fillRect(x, y - Math.floor(r * 0.5), 1, r + 1);
    ctx.restore();
  }

  _drawEnemyBar(ctx, e) {
    const w = e.isBoss ? 48 : e.armorMax > 0 ? 24 : 18;
    const h = e.isBoss ? 4 : 3;
    const topOffset = e.isBoss ? 42 : e.id === 'hellguard' ? 28 : 21;
    const bx = Math.round(e.x - w / 2);
    const by = Math.round(e.y - topOffset);

    if (e.isBoss) {
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0c0714';
      ctx.fillText(e.name, e.x + 1, by - 3);
      ctx.fillStyle = '#fde047';
      ctx.fillText(e.name, e.x, by - 4);
    }

    ctx.fillStyle = '#0c0714';
    ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = '#2d1a2e';
    ctx.fillRect(bx, by, w, h);

    const hpW = Math.max(0, Math.round((e.hp / e.maxHp) * w));
    ctx.fillStyle = e.isBoss ? '#f43f5e' : '#ef4444';
    ctx.fillRect(bx, by, hpW, h);

    if (e.armor > 0 && e.armorMax > 0) {
      const aw = Math.max(0, Math.round((e.armor / e.armorMax) * w));
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(bx - 1, by + h + 1, w + 2, 3);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx, by + h + 2, aw, 1);
    }
  }

  _drawFloatingText(ctx, ft) {
    const alpha = Math.min(1, ft.life / 0.35);
    ctx.globalAlpha = alpha;
    ctx.font = ft.big ? 'bold 9px monospace' : 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0c0714';
    ctx.fillText(ft.text, Math.round(ft.x + 1), Math.round(ft.y + 1));
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.globalAlpha = 1;
  }

  _drawJoystick(ctx, joy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(216, 180, 254, 0.45)';
    ctx.fillStyle = 'rgba(26, 16, 40, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(joy.startX, joy.startY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
    ctx.beginPath();
    ctx.arc(joy.currX, joy.currY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawBanner(ctx, banner) {
    const a = Math.min(1, banner.timer * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(18, 10, 28, 0.88)';
    ctx.fillRect(14, 34, this.viewW - 28, 28);
    ctx.strokeStyle = banner.color || '#d4a34f';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 34, this.viewW - 28, 28);

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = banner.color || '#fde047';
    ctx.fillText(banner.title, this.viewW / 2, 46);
    if (banner.sub) {
      ctx.font = '7px monospace';
      ctx.fillStyle = '#e2d9f3';
      ctx.fillText(banner.sub, this.viewW / 2, 57);
    }
    ctx.restore();
  }
}
