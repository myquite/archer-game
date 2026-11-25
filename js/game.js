// ARCHER — Core Isometric Sprite-Stacking ARPG Engine
// Handles movement (WASD + One-Thumb Touch/Mouse Joystick), Kite & Snap Tension Shooting,
// Interactive Braziers/Barrels/Pillars/Relic Chests, Synergy Evolutions, Boss Relics,
// Level-Up Rerolls, Active Skills, Escalating Swarms, Bosses & Branching Rooms.

import {
  ARMORS,
  WEAPONS,
  UPGRADES,
  EVOLUTIONS,
  RELICS,
  BIOMES,
  ENEMY_DEFS,
  CURSED_PACTS,
  getBiomeForFloor,
  isEvolutionUnlocked,
} from './data.js';
import { GameRenderer, VIEW_W, VIEW_H } from './renderer.js';
import { SpriteBank } from './sprites.js';
import { sfx } from './audio.js';

export class ArcherGame {
  constructor(canvas, uiCallbacks) {
    this.canvas = canvas;
    this.ui = uiCallbacks;
    this.sprites = new SpriteBank();
    this.renderer = new GameRenderer(canvas, this.sprites);

    this.arenaW = 360;
    this.arenaH = 490;
    this.wallPad = 24;

    this.state = 'title'; // title | playing | modal | gameover
    this.time = 0;
    this.lastFrame = 0;
    this.rafId = null;

    this.keys = new Set();
    this.joy = { active: false, pointerId: null, startX: 0, startY: 0, currX: 0, currY: 0, dx: 0, dy: 0 };

    this.resetRun();
    this._bindResize();
    this._bindInputs();
    this._loop = this._loop.bind(this);
    this.rafId = requestAnimationFrame(this._loop);
  }

  _bindResize() {
    const syncSize = () => {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      this.renderer.resize(rect.width, rect.height);
    };
    syncSize();
    window.addEventListener('resize', syncSize);
    if (window.ResizeObserver && this.canvas.parentElement) {
      new ResizeObserver(syncSize).observe(this.canvas.parentElement);
    }
  }

  resetRun() {
    this.floor = 1;
    this.roomType = 'combat';
    this.biome = getBiomeForFloor(1);
    this.gold = 25;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 62;
    this.pendingLevelUps = 0;
    this.ownedWeapons = new Set(['recurve']);
    this.ownedArmors = new Set(['ranger']);
    this.upgradeRanks = {};
    this.relics = new Set();
    this.rerolls = 2;
    this.curseEnemySpeed = 1.0;
    this.curseSwarmDensity = 1.0;
    this.vampKillCounter = 0;
    this.bloodKillCounter = 0;
    this.vampHealCd = 0;
    this.shotCounter = 0;
    this.vampCritCount = 0;
    this.frenzyTimer = 0;
    this.echoPending = 0;
    this.ambientMortarTimer = 5.0;

    this.player = {
      x: this.arenaW / 2,
      y: this.arenaH - 70,
      vx: 0,
      vy: 0,
      facing: -Math.PI / 2,
      radius: 8,
      hp: 100,
      maxHp: 100,
      mana: 100,
      maxMana: 100,
      weaponId: 'recurve',
      armorId: 'ranger',
      fireTimer: 0,
      tension: 0,
      recoil: 0,
      invuln: 0,
      hurtFlash: 0,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      stillTime: 0,
      stillAnchorX: this.arenaW / 2,
      stillAnchorY: this.arenaH - 70,
      emberTrailTimer: 0,
      stalkerCharge: 0,
      stalkerReady: false,
      evolutions: new Set(),
      mods: {
        extraArrows: 0,
        sideArrows: 0,
        bounce: 0,
        pierce: 0,
        fireLevel: 0,
        frostLevel: 0,
        lightningLevel: 0,
        fireRateAdd: 0,
        damageAdd: 0,
        fireRateMult: 1,
        damageMult: 1,
        knockbackMult: 1,
        critBonus: 0,
        critDmgBonus: 0,
        vampiric: 0,
        speedMult: 1,
        cdrMult: 1,
      },
      skills: {
        roll: { cd: 0, maxCd: 3.6, cost: 15 },
        volley: { cd: 0, maxCd: 7.5, cost: 30 },
        snare: { cd: 0, maxCd: 6.5, cost: 25 },
      },
    };

    this.camX = (this.arenaW - VIEW_W) / 2;
    this.camY = this.arenaH - VIEW_H;
    this.shake = 0;
    this.hitStop = 0;
    this.banner = null;

    this.enemies = [];
    this.props = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.decals = [];
    this.scorchMarks = [];
    this.lightFlashes = [];
    this.starbursts = [];
    this.launchBeams = [];
    this.spawnRifts = [];
    this.skyStrikes = [];
    this.hazardZones = [];
    this.afterimages = [];
    this.lightningArcs = [];
    this.thunderBolts = [];
    this.novaRings = [];
    this.floatingTexts = [];
    this.boneShields = [];
    this.fireOrbs = [];
    this.decoys = [];
    this.aimTarget = null;

    this.waveIndex = 0;
    this.totalWaves = 3;
    this.waveQueue = [];
    this.trickleTimer = 0;
    this.waveCooldown = 0;
    this.hordePulseTimer = 14;
    this.roomCleared = false;
    this.portal = null;

    this._setupFloor(1, 'combat');
  }

  startRun(chapter = 1) {
    sfx.init();
    sfx.doorOpen();
    this.resetRun();
    const biome = BIOMES[Math.max(0, Math.min(BIOMES.length - 1, chapter - 1))];
    this.gold = biome.startGold;
    if (biome.chapter > 1) {
      // Scale starter power cleanly when jumping straight into higher chapters!
      const boost = biome.chapter - 1;
      this.player.mods.damageAdd += boost * 0.45;
      this.player.mods.fireRateAdd += boost * 0.14;
      this._syncAdditiveMods();
      this.player.maxHp += boost * 20;
      this.player.hp = this.player.maxHp;
      this.rerolls += 1;
      this._setupFloor(biome.minFloor, 'combat');
      this.state = 'playing';
      this._openUpgradeDraft(); // 1 immediate draft to kickstart your build!
    } else {
      this.state = 'playing';
    }
    this.ui.syncHud(this);
  }

  _recordBestFloor(floor) {
    try {
      const prev = parseInt(localStorage.getItem('archer_best_floor') || '1', 10);
      if (floor > prev) localStorage.setItem('archer_best_floor', String(floor));
    } catch (_) {}
  }

  getBestFloor() {
    try {
      return parseInt(localStorage.getItem('archer_best_floor') || '1', 10);
    } catch (_) {
      return 1;
    }
  }

  // ======================================================
  // FLOOR & ROOM SETUP
  // ======================================================
  _setupFloor(floor, roomType = 'combat') {
    this.floor = floor;
    this._recordBestFloor(floor);
    this.roomType = roomType;
    this.biome = getBiomeForFloor(floor);

    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.decals = [];
    this.scorchMarks = [];
    this.lightFlashes = [];
    this.starbursts = [];
    this.launchBeams = [];
    this.spawnRifts = [];
    this.skyStrikes = [];
    this.hazardZones = [];
    this.ambientMortarTimer = Math.max(3.2, 6.2 - floor * 0.25);
    this.afterimages = [];
    this.lightningArcs = [];
    this.thunderBolts = [];
    this.novaRings = [];
    this.decoys = [];
    this.floatingTexts = [];
    this.roomCleared = false;
    this.portal = null;

    this.player.x = this.arenaW / 2;
    this.player.y = this.arenaH - 68;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing = -Math.PI / 2;
    this.player.tension = 0;
    this.player.stillTime = 0;
    this.player.stillAnchorX = this.player.x;
    this.player.stillAnchorY = this.player.y;
    this.player.mana = Math.min(this.player.maxMana, this.player.mana + 30);

    this._generateProps();

    const isBossFloor = roomType === 'boss' || floor % 3 === 0;
    this.waveIndex = 0;
    this.waveQueue = [];
    this.trickleTimer = 0;
    this.totalWaves = isBossFloor ? 2 : roomType === 'swarm' ? 5 : 3 + Math.min(2, Math.floor(floor / 2));
    this.waveCooldown = 0.55;
    this.hordePulseTimer = Math.max(7.0, 12.5 - floor * 0.5);

    const sub = isBossFloor
      ? 'BOSS CHAMBER — DEFEAT THE WARDEN'
      : roomType === 'swarm'
      ? 'SWARM PIT — 2X XP & RELIC CHEST'
      : `${this.biome.name}`;
    this.showBanner(`FLOOR ${floor}`, sub, isBossFloor ? '#f43f5e' : '#fde047', 2.4);

    if (isBossFloor) sfx.bossRoar();
    sfx.setMusicTheme(this.biome.id);
    this.ui.syncHud(this);
  }

  _generateProps() {
    this.props = [];
    const cx = this.arenaW / 2;
    const cy = this.arenaH / 2;

    // 8 Handcrafted Dungeon Arena Layouts!
    const layoutIdx = (this.floor - 1) % 8;

    const brazierSets = [
      [[cx - 92, cy - 82], [cx + 92, cy - 82], [cx - 92, cy + 78], [cx + 92, cy + 78]],
      [[cx, cy - 115], [cx - 102, cy], [cx + 102, cy], [cx, cy + 105]],
      [[cx - 80, cy - 125], [cx + 80, cy - 125], [cx - 80, cy + 95], [cx + 80, cy + 95]],
      [[cx - 54, cy - 54], [cx + 54, cy - 54], [cx - 54, cy + 54], [cx + 54, cy + 54]],
    ];
    for (const [x, y] of brazierSets[layoutIdx % brazierSets.length]) {
      this.props.push({ type: 'brazier', x, y, radius: 9, alive: true, solid: true, wobble: 0, flash: 0 });
    }

    const pillarLayouts = [
      [[cx - 56, cy - 18], [cx + 56, cy - 18]],
      [[cx - 72, cy - 120], [cx + 72, cy - 120], [cx, cy + 28]],
      [[cx - 64, cy + 12], [cx + 64, cy + 12], [cx - 64, cy - 125], [cx + 64, cy - 125]],
      [[cx, cy - 14], [cx - 96, cy - 84], [cx + 96, cy - 84]],
      [[cx - 48, cy - 92], [cx + 48, cy - 92], [cx - 88, cy + 44], [cx + 88, cy + 44]],
      [[cx - 74, cy - 42], [cx + 74, cy - 42], [cx - 74, cy + 58], [cx + 74, cy + 58]],
      [[cx - 42, cy - 120], [cx + 42, cy - 120], [cx - 104, cy - 12], [cx + 104, cy - 12]],
      [[cx, cy - 96], [cx - 64, cy + 8], [cx + 64, cy + 8], [cx, cy + 92]],
    ];
    for (const [x, y] of pillarLayouts[layoutIdx]) {
      this.props.push({ type: 'pillar', x, y, radius: 10, hp: 115, maxHp: 115, alive: true, solid: true, wobble: 0, flash: 0 });
    }

    const barrelLayouts = [
      [[cx, cy - 82], [cx - 115, cy + 8], [cx + 115, cy + 8]],
      [[cx - 48, cy - 35], [cx + 48, cy - 35], [cx, cy + 72], [cx, cy - 135]],
      [[cx - 108, cy - 90], [cx + 108, cy - 90], [cx - 108, cy + 70], [cx + 108, cy + 70]],
      [[cx - 32, cy - 88], [cx + 32, cy - 88], [cx - 72, cy + 44], [cx + 72, cy + 44]],
    ];
    for (const [x, y] of barrelLayouts[layoutIdx % barrelLayouts.length]) {
      this.props.push({
        type: 'barrel',
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        radius: 8,
        hp: 20,
        maxHp: 20,
        alive: true,
        solid: true,
        wobble: 0,
        flash: 0,
      });
    }
  }

  // ======================================================
  // SWARM & WAVE DIRECTOR (Continuous Escalating Hordes!)
  // ======================================================
  _spawnNextWave() {
    const isBossFloor = this.roomType === 'boss' || this.floor % 3 === 0;
    this.waveIndex += 1;

    if (isBossFloor) {
      if (this.waveIndex === 1) {
        // Opening vanguard before the Boss arrives!
        const vanguard = 10 + this.floor * 2;
        const pool = ['skeleton', 'imp', 'bone_archer', 'ghoul'];
        for (let i = 0; i < vanguard; i++) {
          this.waveQueue.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        this._flushWaveBatch(5);
        this.trickleTimer = 1.4;
        return;
      }
      // Wave 2: Chapter Boss + continuous flanking swarm!
      const bossId = this.biome.bossId || 'boss_warden';
      const bossDef = ENEMY_DEFS[bossId] || ENEMY_DEFS.boss_warden;
      this._queueRift(this.arenaW / 2, 118, bossId, true);
      sfx.bossRoar();
      sfx.setMusicTheme('boss');
      this.showBanner(bossDef.name, 'CHAPTER BOSS HAS AWAKENED!', '#f43f5e', 2.0);
      const flankCount = 6 + this.floor * 2;
      for (let i = 0; i < flankCount; i++) {
        this.waveQueue.push(i % 3 === 0 ? 'bone_archer' : i % 2 === 0 ? 'skeleton' : 'imp');
      }
      this._flushWaveBatch(4);
      this.trickleTimer = 1.9;
      return;
    }

    // Thick, escalating wave budget tuned per biome chapter!
    const baseCount = Math.round((10 + this.floor * 3.4 + this.waveIndex * 3.2) * this.curseSwarmDensity);
    const count = this.roomType === 'swarm' ? Math.round(baseCount * 1.4) : baseCount;

    const pool = ['skeleton', 'skeleton', 'imp'];
    if (this.floor >= 1 && this.waveIndex >= 2) pool.push('bone_archer');
    if (this.floor >= 3) pool.push('ghoul');
    if (this.floor >= 4) pool.push('ghoul', 'cultist');
    if (this.floor >= 7) pool.push('bomber', 'hellguard', 'cultist');
    if (this.floor >= 10) pool.push('wraith', 'wraith', 'hellguard', 'bomber');
    if (this.floor >= 13) pool.push('wraith', 'cultist', 'bomber', 'hellguard');

    for (let i = 0; i < count; i++) {
      this.waveQueue.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    // Final wave of every floor spawns 1+ Armored Hellguard Wave Captains!
    if (this.waveIndex === this.totalWaves) {
      const captains = 1 + Math.floor(this.floor / 3);
      for (let c = 0; c < captains; c++) {
        this.waveQueue.push('hellguard');
      }
    }

    // Immediate opening cluster + continuous trickle for the rest of the wave
    const opener = Math.min(this.waveQueue.length, 5 + Math.floor(this.floor * 0.7));
    this._flushWaveBatch(opener);
    this.trickleTimer = Math.max(0.85, 1.85 - this.floor * 0.08);
  }

  _flushWaveBatch(count) {
    for (let i = 0; i < count && this.waveQueue.length > 0; i++) {
      const type = this.waveQueue.shift();
      const pt = this._pickSafeSpawnPoint();
      this._queueRift(pt.x, pt.y, type, false);
    }
  }

  getRemainingFoes() {
    return this.enemies.length + this.spawnRifts.length + this.waveQueue.length;
  }

  _pickSafeSpawnPoint() {
    for (let tries = 0; tries < 20; tries++) {
      const x = this.wallPad + 18 + Math.random() * (this.arenaW - (this.wallPad + 18) * 2);
      const y = this.wallPad + 28 + Math.random() * (this.arenaH - (this.wallPad + 48) * 2);
      if (Math.hypot(x - this.player.x, y - this.player.y) > 88) return { x, y };
    }
    return { x: this.arenaW / 2, y: 80 };
  }

  _queueRift(x, y, enemyId, isBoss = false) {
    this.spawnRifts.push({
      x,
      y,
      enemyId,
      isBoss,
      duration: isBoss ? 1.25 : 0.95,
      timer: isBoss ? 1.25 : 0.95,
    });
  }

  _spawnEnemy(enemyId, x, y) {
    const def = ENEMY_DEFS[enemyId];
    if (!def) return;
    // Steeper deep-floor scaling + Elite Dash-Chargers on Floor 3+!
    const hpScale = (1 + (this.floor - 1) * 0.45) * Math.pow(1.11, Math.max(0, this.floor - 2));
    const spdScale = Math.min(1.85, (1 + (this.floor - 1) * 0.07) * this.curseEnemySpeed);
    const isElite =
      !def.isBoss &&
      this.floor >= 3 &&
      (def.behavior === 'chase' || def.behavior === 'toxic_chase' || def.behavior === 'armored') &&
      Math.random() < Math.min(0.26, 0.09 + this.floor * 0.02);

    const maxHp = Math.round(def.hp * hpScale * (isElite ? 1.85 : 1));
    const armorMax = def.armorMax
      ? Math.round(def.armorMax * hpScale)
      : isElite
      ? Math.round(45 * hpScale)
      : 0;

    this.enemies.push({
      ...def,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: Math.PI / 2,
      hp: maxHp,
      maxHp,
      armor: armorMax,
      armorMax,
      isElite,
      speed: def.speed * spdScale * (isElite ? 1.1 : 1),
      flash: 0,
      wobble: 0,
      poiseTimer: 0,
      fireTimer: (def.fireCooldown || 2.2) * (0.6 + Math.random() * 0.6),
      hazardCd: 2.8 + Math.random() * 1.8,
      chargeCooldown: isElite ? 2.4 + Math.random() * 1.5 : def.isBoss ? 4.2 : 99,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeAngle: 0,
      bossSkillTimer: 2.8,
      chillTimer: 0,
      burnTimer: 0,
      burnTick: 0,
      snareTimer: 0,
      seed: Math.random() * 100,
    });
  }

  // ======================================================
  // ACTIVE SKILLS, GEAR, EVOLUTIONS, RELICS & REROLLS
  // ======================================================
  castSkill(slot) {
    if (this.state !== 'playing') return;
    const p = this.player;
    const sk = p.skills[slot];
    if (!sk || sk.cd > 0 || p.mana < sk.cost) return;

    p.mana -= sk.cost;
    sk.cd = sk.maxCd * p.mods.cdrMult;

    if (slot === 'roll') {
      sfx.dash();
      let dx = this._moveInput().x;
      let dy = this._moveInput().y;
      if (Math.hypot(dx, dy) < 0.1) {
        dx = Math.cos(p.facing);
        dy = Math.sin(p.facing);
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashVx = (dx / len) * 260;
      p.dashVy = (dy / len) * 260;
      p.dashTimer = 0.22;
      p.invuln = 0.38;

      for (let i = 0; i < 3; i++) {
        this.decals.push({
          kind: 'caltrop',
          x: p.x + (Math.random() - 0.5) * 16,
          y: p.y + (Math.random() - 0.5) * 12,
          radius: 9,
          life: 6.5,
          maxLife: 6.5,
          damage: Math.round(20 * p.mods.damageMult),
        });
      }

      if (this.relics.has('mirror_shadow')) {
        this.decoys.push({
          x: p.x,
          y: p.y,
          angle: p.facing,
          stack: this.sprites.getArcher(p.armorId, p.weaponId),
          life: 3.6,
          maxLife: 3.6,
        });
        this._spawnText(p.x, p.y - 24, 'DECOY!', '#c084fc', false);
      }

      // Armor Passive: Stormcaller Shroud zaps nearby enemies with lightning on Shadow Roll!
      if (ARMORS[p.armorId].passive === 'shock_roll') {
        const nearest = this._findNearestEnemy(p.x, p.y);
        if (nearest && Math.hypot(nearest.x - p.x, nearest.y - p.y) < 120) {
          this.lightningArcs.push({ x1: p.x, y1: p.y, x2: nearest.x, y2: nearest.y, j1: 6, j2: -5, j3: 4, life: 0.18 });
          this._damageEnemy(nearest, Math.round(28 * p.mods.damageMult), false, { x: 0, y: 0 }, 0, '#e9d5ff');
          this._triggerChainLightning(nearest, 2);
        }
      }
    } else if (slot === 'volley') {
      sfx.volley();
      this.launchBeams.push({ x: p.x, y: p.y - 10, color: '#38bdf8', life: 0.24, maxLife: 0.24 });
      this.lightFlashes.push({ x: p.x, y: p.y - 10, radius: 52, colorKey: 'cyan', life: 0.22, maxLife: 0.22 });
      const center = this.aimTarget
        ? { x: this.aimTarget.x, y: this.aimTarget.y }
        : { x: p.x + Math.cos(p.facing) * 70, y: p.y + Math.sin(p.facing) * 70 };
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
        const dist = i === 0 ? 0 : 22 + Math.random() * 24;
        this.skyStrikes.push({
          x: Math.max(24, Math.min(this.arenaW - 24, center.x + Math.cos(ang) * dist)),
          y: Math.max(36, Math.min(this.arenaH - 24, center.y + Math.sin(ang) * dist)),
          radius: 26,
          duration: 0.55 + i * 0.08,
          timer: 0.55 + i * 0.08,
          damage: Math.round(36 * p.mods.damageMult),
        });
      }
      this._spawnText(p.x, p.y - 24, 'SKYFALL!', '#38bdf8', true);
    } else if (slot === 'snare') {
      sfx.snare();
      const tx = this.aimTarget ? this.aimTarget.x : p.x + Math.cos(p.facing) * 58;
      const ty = this.aimTarget ? this.aimTarget.y : p.y + Math.sin(p.facing) * 58;
      this.decals.push({ kind: 'snare', x: tx, y: ty, radius: 36, life: 4.5, maxLife: 4.5 });
      this.novaRings.push({ x: tx, y: ty, maxRadius: 38, color: '#c084fc', life: 0.28, maxLife: 0.28 });
      this.lightFlashes.push({ x: tx, y: ty, radius: 48, colorKey: 'violet', life: 0.24, maxLife: 0.24 });
      this._spawnText(tx, ty - 16, 'SNARED!', '#c084fc', false);
    }
    this.ui.syncHud(this);
  }

  equipWeapon(weaponId) {
    if (!WEAPONS[weaponId]) return;
    this.ownedWeapons.add(weaponId);
    this.player.weaponId = weaponId;
    sfx.uiClick();
    this.ui.syncHud(this);
  }

  equipArmor(armorId) {
    const next = ARMORS[armorId];
    if (!next) return;
    const prev = ARMORS[this.player.armorId];
    const hpDiff = next.maxHpBonus - prev.maxHpBonus;
    this.ownedArmors.add(armorId);
    this.player.armorId = armorId;
    this.player.maxHp = Math.max(60, this.player.maxHp + hpDiff);
    this.player.hp = Math.min(this.player.maxHp, Math.max(1, this.player.hp + Math.max(0, hpDiff)));
    sfx.uiClick();
    this.ui.syncHud(this);
  }

  buyOrEquipWeapon(weaponId) {
    const w = WEAPONS[weaponId];
    if (!w) return false;
    if (this.ownedWeapons.has(weaponId)) {
      this.equipWeapon(weaponId);
      return true;
    }
    if (this.gold < w.cost) return false;
    this.gold -= w.cost;
    this.equipWeapon(weaponId);
    return true;
  }

  buyOrEquipArmor(armorId) {
    const a = ARMORS[armorId];
    if (!a) return false;
    if (this.ownedArmors.has(armorId)) {
      this.equipArmor(armorId);
      return true;
    }
    if (this.gold < a.cost) return false;
    this.gold -= a.cost;
    this.equipArmor(armorId);
    return true;
  }

  _syncAdditiveMods() {
    this.player.mods.damageMult = 1 + this.player.mods.damageAdd;
    this.player.mods.fireRateMult = 1 + this.player.mods.fireRateAdd;
  }

  temperWeapon() {
    if (this.gold < 45) return false;
    this.gold -= 45;
    this.player.mods.damageAdd += 0.16;
    this._syncAdditiveMods();
    sfx.levelUp();
    this.ui.syncHud(this);
    return true;
  }

  healAtShrine() {
    if (this.gold < 35 || this.player.hp >= this.player.maxHp) return false;
    this.gold -= 35;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.45));
    sfx.pickup(true);
    this.ui.syncHud(this);
    return true;
  }

  buyRerolls() {
    if (this.gold < 30) return false;
    this.gold -= 30;
    this.rerolls += 2;
    sfx.reroll();
    this.ui.syncHud(this);
    return true;
  }

  applyUpgrade(upgradeId, isEvolution = false) {
    if (isEvolution) {
      const evo = EVOLUTIONS.find((e) => e.id === upgradeId);
      if (!evo) return;
      evo.apply(this.player);
      sfx.evolution();
      this.showBanner(`★ ${evo.name}`, 'SYNERGY EVOLUTION AWAKENED!', evo.color, 2.2);
    } else {
      const up = UPGRADES.find((u) => u.id === upgradeId);
      if (!up) return;
      up.apply(this.player);
      this.upgradeRanks[upgradeId] = (this.upgradeRanks[upgradeId] || 0) + 1;
      sfx.uiClick();
    }

    this._syncAdditiveMods();
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps -= 1;
      this._openUpgradeDraft();
    } else {
      this.state = 'playing';
      this.ui.closeModals();
      this.ui.syncHud(this);
    }
  }

  applyRelic(relicId) {
    const rel = RELICS.find((r) => r.id === relicId);
    if (!rel) return;
    this.relics.add(relicId);
    if (relicId === 'loaded_dice') {
      this.rerolls += 3;
      this.player.mods.critBonus += 0.12;
    }
    sfx.evolution();
    this.showBanner(`★ ${rel.name.toUpperCase()}`, `${rel.tag} RELIC EQUIPPED`, rel.color, 2.0);
    this.state = 'playing';
    this.ui.closeModals();
    this.ui.syncHud(this);
  }

  rerollUpgradeDraft() {
    if (this.rerolls <= 0) return;
    this.rerolls -= 1;
    sfx.reroll();
    this._openUpgradeDraft(true);
    this.ui.syncHud(this);
  }

  rerollRelicDraft() {
    if (this.rerolls <= 0) return;
    this.rerolls -= 1;
    sfx.reroll();
    this._openRelicDraft(true);
    this.ui.syncHud(this);
  }

  _spawnRelicChest(x, y) {
    if (this.relics.size >= RELICS.length) return;
    this.props.push({
      type: 'chest',
      x,
      y,
      radius: 10,
      alive: true,
      solid: false,
      wobble: 0.9,
      flash: 0.12,
    });
    this._burstParticles(x, y - 6, '#fde047', 14, 65, true);
  }

  _openRelicDraft(isReroll = false) {
    const unowned = RELICS.filter((r) => !this.relics.has(r.id));
    if (unowned.length === 0) return;
    this.state = 'modal';
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    if (!isReroll) sfx.relicOpen();
    this.ui.openRelicDraft(this, shuffled.slice(0, 3));
  }

  applyCursedPact(pactId) {
    const pact = CURSED_PACTS.find((c) => c.id === pactId);
    if (pact) {
      pact.apply(this);
      sfx.bossRoar();
    }
    this.ui.closeModals();
    this._syncAdditiveMods();
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps -= 1;
      this._openUpgradeDraft();
    } else {
      this.enterNextFloor('combat');
    }
  }

  enterNextFloor(choiceType) {
    sfx.doorOpen();
    if (choiceType === 'blacksmith') {
      this.state = 'modal';
      this.ui.openBlacksmith(this);
      return;
    }
    if (choiceType === 'cursed') {
      this.state = 'modal';
      this.ui.openCursedAltar(this, CURSED_PACTS);
      return;
    }
    this.ui.closeModals();
    this.state = 'playing';
    this._setupFloor(this.floor + 1, choiceType);
  }

  leaveBlacksmith() {
    this.ui.closeModals();
    this.state = 'playing';
    this._setupFloor(this.floor + 1, 'combat');
  }

  _openUpgradeDraft(isReroll = false) {
    this.state = 'modal';
    const unlockedEvos = EVOLUTIONS.filter((e) =>
      isEvolutionUnlocked(e, this.upgradeRanks, this.player.evolutions)
    );
    const available = UPGRADES.filter((u) => (this.upgradeRanks[u.id] || 0) < u.maxRank);

    const choices = [];
    if (unlockedEvos.length > 0) {
      const evo = unlockedEvos[Math.floor(Math.random() * unlockedEvos.length)];
      choices.push({ ...evo, isEvolution: true });
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    while (choices.length < 3 && shuffled.length > 0) {
      choices.push({ ...shuffled.shift(), isEvolution: false });
    }

    if (choices.length === 0) {
      this.state = 'playing';
      return;
    }
    this.ui.openLevelUp(this, choices, isReroll);
  }

  _openDoorChoice() {
    this.state = 'modal';
    const nextFloor = this.floor + 1;
    if (nextFloor % 3 === 0) {
      this.ui.openDoorPicker(this, [
        { type: 'blacksmith', title: 'MASTER BLACKSMITH', tag: 'FORGE & DICE', desc: 'Buy stacked Gear, Reroll Dice, or Temper Bow before the Boss.', color: '#fbbf24' },
        { type: 'boss', title: `BOSS GATE (FLOOR ${nextFloor})`, tag: 'RELIC DROP', desc: 'Slay the Floor Warden for a guaranteed Relic Chest + Reroll Die.', color: '#f43f5e' },
      ]);
      return;
    }
    const doors = [
      { type: 'swarm', title: 'THE SWARM PIT', tag: '2X XP + RELIC', desc: 'Thicker hordes, double XP, bonus Upgrade & a Relic Chest.', color: '#f97316' },
      { type: 'blacksmith', title: 'MASTER BLACKSMITH', tag: 'NEW GEAR', desc: 'Unlock stacked Bows, Armor Layers & buy extra Reroll Dice.', color: '#fbbf24' },
      { type: 'cursed', title: 'CURSED ALTAR', tag: 'HIGH RISK', desc: 'Accept a demonic pact for huge power at a dark price.', color: '#c084fc' },
    ];
    this.ui.openDoorPicker(this, doors);
  }

  // ======================================================
  // MAIN SIMULATION LOOP
  // ======================================================
  _loop(ts) {
    this.rafId = requestAnimationFrame(this._loop);
    if (!this.lastFrame) this.lastFrame = ts;
    const dt = Math.min(0.05, (ts - this.lastFrame) / 1000);
    this.lastFrame = ts;

    if (this.state === 'playing') {
      sfx.setMusicDucked(false);
      this._update(dt);
    } else {
      sfx.setMusicDucked(true);
      this.time += dt;
    }

    this.renderer.render(this);
  }

  _update(dt) {
    this.time += dt;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 16);
    if (this.banner && this.banner.timer > 0) this.banner.timer -= dt;

    this._updatePlayer(dt);
    this._updateWaveDirector(dt);
    this._updateSpawnRifts(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._updateSkyStrikes(dt);
    this._updateHazardZones(dt);
    this._updateDecals(dt);
    this._updatePickups(dt);
    this._updateParticles(dt);
    this._updateCamera(dt);

    if (Math.floor(this.time * 12) !== Math.floor((this.time - dt) * 12)) {
      this.ui.syncHud(this);
    }
  }

  _moveInput() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;

    if (this.joy.active && (Math.abs(this.joy.dx) > 0.05 || Math.abs(this.joy.dy) > 0.05)) {
      x = this.joy.dx;
      y = this.joy.dy;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  _updatePlayer(dt) {
    const p = this.player;
    const armor = ARMORS[p.armorId];
    const weapon = WEAPONS[p.weaponId];

    const manaRegen = armor.passive === 'seraph_halo' ? 15.2 : 9.5;
    p.mana = Math.min(p.maxMana, p.mana + dt * manaRegen);
    for (const key of Object.keys(p.skills)) {
      if (p.skills[key].cd > 0) p.skills[key].cd = Math.max(0, p.skills[key].cd - dt);
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 3.8);
    if (this.frenzyTimer > 0) this.frenzyTimer = Math.max(0, this.frenzyTimer - dt);

    const inp = this._moveInput();
    const moving = Math.hypot(inp.x, inp.y) > 0.12;

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashVx;
      p.vy = p.dashVy;
      this.afterimages.push({
        x: p.x,
        y: p.y,
        angle: p.facing,
        stack: this.sprites.getArcher(p.armorId, p.weaponId),
        life: 0.22,
        maxLife: 0.22,
      });
    } else {
      const frenzyMult = this.frenzyTimer > 0 ? 1.3 : 1.0;
      const moveSpeed = 96 * armor.speedMult * p.mods.speedMult * frenzyMult;
      p.vx = inp.x * moveSpeed;
      p.vy = inp.y * moveSpeed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this._resolveArenaAndProps(p);

    if (armor.passive === 'ember_trail' && moving) {
      p.emberTrailTimer -= dt;
      if (p.emberTrailTimer <= 0) {
        p.emberTrailTimer = 0.28;
        this.decals.push({
          kind: 'fire',
          x: p.x,
          y: p.y,
          radius: 13,
          life: 2.2,
          maxLife: 2.2,
          damage: Math.round(9 * p.mods.damageMult),
        });
      }
    }

    if (armor.passive === 'stalker_crit') {
      if (moving) {
        p.stalkerCharge = Math.min(1, p.stalkerCharge + dt * 0.7);
        if (p.stalkerCharge >= 1) p.stalkerReady = true;
      }
    } else {
      p.stalkerReady = false;
    }

    if (armor.passive === 'bone_orbit' || armor.passive === 'seraph_halo') {
      const orbDmg = armor.passive === 'seraph_halo' ? 22 : 14;
      this.boneShields = [0, 1].map((idx) => {
        const ang = this.time * (armor.passive === 'seraph_halo' ? 4.6 : 3.8) + idx * Math.PI;
        return { x: p.x + Math.cos(ang) * 21, y: p.y + Math.sin(ang) * 15, radius: 6 };
      });
      for (const orb of this.boneShields) {
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - orb.x, e.y - orb.y) < e.radius + 7 && e.flash <= 0) {
            this._damageEnemy(e, Math.round(orbDmg * p.mods.damageMult), false, { x: e.x - p.x, y: e.y - p.y }, 24, armor.passive === 'seraph_halo' ? '#fde047' : null);
          }
        }
      }
    } else {
      this.boneShields = [];
    }

    // Relic: Brazier Heart orbiting fireball
    if (this.relics.has('brazier_heart')) {
      const ang = -this.time * 3.4;
      const orb = { x: p.x + Math.cos(ang) * 26, y: p.y + Math.sin(ang) * 18, radius: 7 };
      this.fireOrbs = [orb];
      for (const e of [...this.enemies]) {
        if (Math.hypot(e.x - orb.x, e.y - orb.y) < e.radius + 9 && e.flash <= 0) {
          e.burnTimer = 2.6;
          this._damageEnemy(e, Math.round(16 * p.mods.damageMult), false, { x: e.x - p.x, y: e.y - p.y }, 18, '#fb923c');
        }
      }
    } else {
      this.fireOrbs = [];
    }

    // Update Mirror Shadow Decoys
    for (let di = this.decoys.length - 1; di >= 0; di--) {
      const dec = this.decoys[di];
      dec.life -= dt;
      if (dec.life <= 0) {
        sfx.explode();
        this.novaRings.push({ x: dec.x, y: dec.y, maxRadius: 46, color: '#c084fc', life: 0.3, maxLife: 0.3 });
        this._burstParticles(dec.x, dec.y - 8, '#c084fc', 16, 75, true);
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - dec.x, e.y - dec.y) < 48 + e.radius) {
            this._damageEnemy(e, Math.round(44 * p.mods.damageMult), true, { x: e.x - dec.x, y: e.y - dec.y }, 60, '#c084fc');
          }
        }
        this.decoys.splice(di, 1);
      }
    }

    // Walk into glowing sprite-stacked Relic Chest!
    for (const prop of this.props) {
      if (prop.alive && prop.type === 'chest' && Math.hypot(p.x - prop.x, p.y - prop.y) < 20) {
        prop.alive = false;
        this._burstParticles(prop.x, prop.y - 8, '#fde047', 18, 70, true);
        this._openRelicDraft();
        return;
      }
    }

    this.aimTarget = this._findNearestEnemy(p.x, p.y);
    if (this.aimTarget) {
      const targetAngle = Math.atan2(this.aimTarget.y - p.y, this.aimTarget.x - p.x);
      p.facing = this._lerpAngle(p.facing, targetAngle, Math.min(1, dt * 16));
    } else if (moving) {
      const moveAngle = Math.atan2(p.vy, p.vx);
      p.facing = this._lerpAngle(p.facing, moveAngle, Math.min(1, dt * 12));
    }

    this._syncAdditiveMods();
    if (this.vampHealCd > 0) this.vampHealCd = Math.max(0, this.vampHealCd - dt);

    // Anti-Camp Dungeon Hazards: standing planted in one spot spawns telegraphed red mortars!
    if (this.enemies.length > 0) {
      if (Math.hypot(p.x - p.stillAnchorX, p.y - p.stillAnchorY) > 18) {
        p.stillAnchorX = p.x;
        p.stillAnchorY = p.y;
        p.stillTime = 0;
      } else {
        p.stillTime += dt;
        const campThreshold = this.floor >= 2 ? 1.7 : 2.8;
        if (p.stillTime >= campThreshold) {
          p.stillTime = 0.55;
          this._spawnHazardZone(p.x, p.y, 26, 1.05, Math.round(16 + this.floor * 2.5), '#f43f5e', 'crimson');
        }
      }

      // Floor 4+: periodic ambient dungeon mortars force continuous repositioning
      if (this.floor >= 4) {
        this.ambientMortarTimer -= dt;
        if (this.ambientMortarTimer <= 0) {
          this.ambientMortarTimer = Math.max(2.9, 5.8 - this.floor * 0.22);
          const leadX = Math.max(30, Math.min(this.arenaW - 30, p.x + p.vx * 0.35));
          const leadY = Math.max(40, Math.min(this.arenaH - 30, p.y + p.vy * 0.35));
          this._spawnHazardZone(leadX, leadY, 27, 1.15, Math.round(18 + this.floor * 2.4), '#fb923c', 'amber');
        }
      }
    }

    // MOMENTUM SNAP: Moving charges your Snap gauge; planting your feet unleashes 1 massive Snap Shot!
    if (moving) {
      p.tension = Math.min(1, p.tension + dt * 1.15 * p.mods.fireRateMult);
    } else if (!this.aimTarget) {
      p.tension = Math.max(0, p.tension - dt * 0.65);
    }

    if (this.echoPending > 0) {
      this.echoPending -= dt;
      if (this.echoPending <= 0 && this.aimTarget) {
        this._firePlayerVolley(weapon, false, moving, true);
      }
    }

    p.fireTimer -= dt;
    if (this.aimTarget && p.fireTimer <= 0 && p.dashTimer <= 0) {
      const isSnap = !moving && p.tension >= 0.72;
      this._firePlayerVolley(weapon, isSnap, moving, false);
      const effectiveRate = weapon.fireRate * p.mods.fireRateMult * (isSnap ? 0.85 : 1.0);
      p.fireTimer = 1 / effectiveRate;
      if (isSnap) p.tension = 0; // Consumes Momentum charge — kite again to charge your next Snap!
    }

    if (this.roomCleared && this.portal) {
      if (Math.hypot(p.x - this.portal.x, p.y - this.portal.y) < 22) {
        this._openDoorChoice();
      }
    }
  }

  _firePlayerVolley(weapon, isSnap, isMoving = false, isEcho = false) {
    const p = this.player;
    const baseAngle = p.facing;
    const totalParallel = weapon.count + p.mods.extraArrows;
    const sidePairs = p.mods.sideArrows / 2;
    const hasComet = p.evolutions.has('comet_lance');
    const hasPhantom = p.evolutions.has('phantom_volley');

    sfx.shoot(isSnap, weapon.id);
    p.recoil = isSnap ? 1.0 : 0.55;
    if (isSnap) {
      this.shake = Math.max(this.shake, 1.8);
      const mx = p.x + Math.cos(baseAngle) * 11;
      const my = p.y - 10 + Math.sin(baseAngle) * 8;
      this.starbursts.push({ x: mx, y: my, size: 7, color: '#fde047', life: 0.14, maxLife: 0.14 });
      this.lightFlashes.push({ x: mx, y: my, radius: 34, colorKey: 'gold', life: 0.14, maxLife: 0.14 });
    }

    if (!isEcho && this.relics.has('clockwork_quiver')) {
      this.shotCounter += 1;
      if (this.shotCounter >= 4) {
        this.shotCounter = 0;
        this.echoPending = 0.09;
        this._spawnText(p.x, p.y - 24, 'ECHO!', '#fde047', false);
      }
    }

    const multiScale = 1 / (1 + Math.max(0, totalParallel - weapon.count) * 0.22);

    const spawnArrow = (angle, offsetPerp = 0, spectral = false) => {
      const ox = Math.cos(angle) * 9 - Math.sin(angle) * offsetPerp;
      const oy = Math.sin(angle) * 9 + Math.cos(angle) * offsetPerp;
      const stalkerBoost = isSnap && p.stalkerReady;
      const dmg = Math.round(
        weapon.damage *
          p.mods.damageMult *
          multiScale *
          (isSnap ? weapon.snapMult : 1.0) *
          (stalkerBoost ? 1.75 : 1.0) *
          (spectral ? 0.65 : 1.0)
      );
      const seraphCrit = ARMORS[p.armorId].passive === 'seraph_halo' ? 0.1 : 0;
      const crit = stalkerBoost || Math.random() < weapon.critChance + p.mods.critBonus + seraphCrit + (isSnap ? 0.15 : 0);
      const critMult = 1.65 + p.mods.critDmgBonus;

      this.projectiles.push({
        x: p.x + ox,
        y: p.y + oy,
        vx: Math.cos(angle) * weapon.projSpeed * (isSnap ? 1.18 : 1),
        vy: Math.sin(angle) * weapon.projSpeed * (isSnap ? 1.18 : 1),
        angle,
        z: 10,
        damage: crit ? Math.round(dmg * critMult) : dmg,
        crit,
        isSnap,
        heavy: isSnap || weapon.id === 'greatbow' || weapon.id === 'dragoncannon' || hasComet,
        isComet: hasComet,
        cometTimer: 0.05,
        pierceLeft: weapon.pierce + p.mods.pierce + (isSnap ? 1 : 0),
        bounceLeft: weapon.bounce + p.mods.bounce,
        knockback: weapon.knockback * p.mods.knockbackMult * (isSnap ? 1.4 : 1),
        color: spectral ? '#c084fc' : hasComet ? '#fb923c' : isSnap ? '#fde047' : weapon.color,
        ignited: p.mods.fireLevel > 0 || hasComet || !!weapon.explosiveRadius,
        innateChill: !!weapon.innateChill,
        innateShock: !!weapon.innateShock,
        explosiveRadius: weapon.explosiveRadius || 0,
        kind: weapon.id === 'chakram' ? 'chakram' : 'arrow',
        fromEnemy: false,
        hitIds: new Set(),
        life: 2.0,
        trail: [],
      });
    };

    for (let i = 0; i < totalParallel; i++) {
      const centerIdx = i - (totalParallel - 1) / 2;
      if (weapon.spread > 0) {
        spawnArrow(baseAngle + centerIdx * weapon.spread, 0);
      } else {
        spawnArrow(baseAngle + centerIdx * 0.045, centerIdx * 4.5);
      }
    }

    for (let s = 1; s <= sidePairs; s++) {
      spawnArrow(baseAngle - 0.34 * s, 0);
      spawnArrow(baseAngle + 0.34 * s, 0);
    }

    if (hasPhantom && isMoving) {
      spawnArrow(baseAngle + (Math.random() - 0.5) * 0.14, 0, true);
    }

    if (isSnap && p.stalkerReady) {
      p.stalkerReady = false;
      p.stalkerCharge = 0;
    }
  }

  _updateWaveDirector(dt) {
    if (this.roomCleared) return;

    // Continuous reinforcement trickle while current wave still has queued monsters
    if (this.waveQueue.length > 0) {
      this.trickleTimer -= dt;
      const activeCount = this.enemies.length + this.spawnRifts.length;
      // Pour faster if player is mowing enemies down quickly!
      if (this.trickleTimer <= 0 || activeCount <= 4) {
        const batchSize = Math.min(this.waveQueue.length, 3 + Math.floor(this.floor * 0.65));
        this._flushWaveBatch(batchSize);
        this.trickleTimer = Math.max(0.8, 1.9 - this.floor * 0.1);
      }
    }

    // Periodic Horde Pulse if floor drags on (keeps pressure rising!)
    if (this.waveIndex > 0 && this.enemies.length > 0 && this.enemies.length < 32) {
      this.hordePulseTimer -= dt;
      if (this.hordePulseTimer <= 0) {
        this.hordePulseTimer = Math.max(6.5, 12.0 - this.floor * 0.5);
        const burst = 3 + Math.floor(this.floor * 0.8);
        for (let i = 0; i < burst; i++) {
          const pt = this._pickSafeSpawnPoint();
          this._queueRift(pt.x, pt.y, i % 2 === 0 ? 'imp' : 'skeleton');
        }
        this.showBanner('HORDE PULSE!', 'REINFORCEMENTS INCOMING', '#f43f5e', 1.4);
      }
    }

    // Advance to next wave seamlessly when queue is empty and almost all foes are slain
    const active = this.enemies.length + this.spawnRifts.length;
    if (this.waveQueue.length === 0) {
      if (this.waveIndex < this.totalWaves) {
        if (active <= (this.waveIndex === 0 ? 0 : 2)) {
          this.waveCooldown -= dt;
          if (this.waveCooldown <= 0) {
            this._spawnNextWave();
            this.waveCooldown = 0.75;
          }
        }
      } else if (active === 0) {
        this.roomCleared = true;
        sfx.doorOpen();
        sfx.setMusicTheme(this.biome.id);
        this.portal = { x: this.arenaW / 2, y: 34 };
        this.showBanner('FLOOR CLEARED!', 'OPEN CHEST OR ENTER NORTH PORTAL ▲', '#4ade80', 2.6);

        if (this.roomType === 'swarm') {
          this.pendingLevelUps += 1;
          this._openUpgradeDraft();
        }
        if (this.floor === 1 || this.roomType === 'swarm') {
          this._spawnRelicChest(this.arenaW / 2, this.arenaH / 2 - 22);
        }
        this.pickups.push({ type: 'heart', x: this.arenaW / 2, y: this.arenaH / 2 + 18, seed: Math.random() * 10 });
      }
    }
  }

  _updateSpawnRifts(dt) {
    for (let i = this.spawnRifts.length - 1; i >= 0; i--) {
      const r = this.spawnRifts[i];
      r.timer -= dt;
      if (r.timer <= 0) {
        this._spawnEnemy(r.enemyId, r.x, r.y);
        this._burstParticles(r.x, r.y, r.isBoss ? '#fde047' : '#f43f5e', r.isBoss ? 18 : 8, 55);
        this.spawnRifts.splice(i, 1);
      }
    }
  }

  _updateEnemies(dt) {
    const p = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      if (e.wobble > 0) e.wobble = Math.max(0, e.wobble - dt * 4.5);
      if (e.poiseTimer > 0) e.poiseTimer = Math.max(0, e.poiseTimer - dt);
      if (e.chillTimer > 0) e.chillTimer -= dt;
      if (e.snareTimer > 0) e.snareTimer -= dt;

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.45;
          const bDmg = Math.round((6 + p.mods.fireLevel * 5) * p.mods.damageMult);
          this._damageEnemy(e, bDmg, false, { x: 0, y: 0 }, 0, '#fb923c');
          if (e.hp <= 0) continue;
        }
      }

      const target = this.decoys.length > 0 ? this.decoys[0] : p;
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.facing = Math.atan2(dy, dx);

      const speedMod = e.snareTimer > 0 ? 0.08 : e.chillTimer > 0 ? 0.62 : 1.0;
      const spd = e.speed * speedMod;

      // Elite Charger & Deep Boss Telegraphed Dash Lunge (unstoppable through arrows!)
      if (e.isElite || (e.isBoss && this.floor >= 6)) {
        if (e.chargeWindup > 0) {
          e.chargeWindup -= dt;
          e.vx *= 0.7;
          e.vy *= 0.7;
          e.facing = e.chargeAngle;
          if (e.chargeWindup <= 0) {
            e.chargeTimer = e.isBoss ? 0.44 : 0.48;
            sfx.dash();
          }
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          this._resolveArenaAndProps(e, false);
          continue;
        } else if (e.chargeTimer > 0) {
          e.chargeTimer -= dt;
          const dashSpd = e.isBoss ? 215 : 235;
          e.vx = Math.cos(e.chargeAngle) * dashSpd;
          e.vy = Math.sin(e.chargeAngle) * dashSpd;
          e.facing = e.chargeAngle;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          this._resolveArenaAndProps(e, false);
          if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
            this._hurtPlayer(e.damage * 1.15, e.x, e.y);
          }
          continue;
        } else {
          e.chargeCooldown -= dt;
          if (e.chargeCooldown <= 0 && dist < 175 && dist > 38 && e.snareTimer <= 0) {
            e.chargeCooldown = e.isBoss ? 4.8 : 3.5;
            e.chargeWindup = 0.65;
            e.chargeAngle = Math.atan2(dy, dx);
            this._spawnText(e.x, e.y - 24, 'CHARGE!', '#f43f5e', false);
          }
        }
      }

      if (e.behavior === 'ranged' || e.behavior === 'summoner' || e.behavior === 'wraith') {
        const keepDist = e.behavior === 'wraith' ? 92 : 118;
        if (dist > keepDist) {
          e.vx = (dx / dist) * spd;
          e.vy = (dy / dist) * spd;
        } else if (dist < 62) {
          e.vx = -(dx / dist) * spd * 0.7;
          e.vy = -(dy / dist) * spd * 0.7;
        } else {
          e.vx *= 0.85;
          e.vy *= 0.85;
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 215) {
          e.fireTimer = Math.max(1.25, (e.fireCooldown || 2.3) - this.floor * 0.05);
          if (e.behavior === 'summoner') {
            this._fireEnemyShot(e, e.facing - 0.14, 128 + this.floor * 3, e.damage);
            this._fireEnemyShot(e, e.facing + 0.14, 128 + this.floor * 3, e.damage);
            if (this.enemies.length < 18 && Math.random() < 0.45) {
              this._queueRift(e.x + (Math.random() - 0.5) * 32, e.y + 12, 'skeleton');
            }
          } else {
            this._fireEnemyShot(e, e.facing, 134 + this.floor * 3, e.damage);
          }
        }
        // Cultists & Wraiths drop telegraphed ground hazards under the player!
        if (e.behavior === 'summoner' || e.behavior === 'wraith') {
          e.hazardCd -= dt;
          if (e.hazardCd <= 0 && dist < 210) {
            e.hazardCd = 3.8 + Math.random() * 1.4;
            const isIce = e.behavior === 'wraith';
            this._spawnHazardZone(
              target.x,
              target.y,
              24,
              1.1,
              Math.round(e.damage * 1.2),
              isIce ? '#38bdf8' : '#e879f9',
              isIce ? 'cyan' : 'violet'
            );
          }
        }
      } else if (e.behavior === 'zigzag' || e.behavior === 'bomber') {
        const perp = Math.sin(this.time * (e.behavior === 'bomber' ? 8 : 6) + e.seed) * 0.55;
        const ang = e.facing + perp;
        e.vx = Math.cos(ang) * spd;
        e.vy = Math.sin(ang) * spd;
      } else if (e.isBoss) {
        e.vx = (dx / dist) * spd;
        e.vy = (dy / dist) * spd;
        e.bossSkillTimer -= dt;
        if (e.bossSkillTimer <= 0) {
          e.bossSkillTimer = e.behavior === 'boss_abyss' ? 2.1 : e.behavior === 'boss_fire' ? 2.35 : 2.8;
          const bolts = e.behavior === 'boss_lich' || e.behavior === 'boss_abyss' ? 12 : e.behavior === 'boss_fire' ? 10 : 8;
          for (let b = 0; b < bolts; b++) {
            const ang = e.facing + (b / bolts) * Math.PI * 2;
            this._fireEnemyShot(e, ang, 118 + this.floor * 3, e.damage * 0.8);
          }
          // Boss drops twin telegraphed slam circles near the player to force active dodging!
          this._spawnHazardZone(p.x, p.y, 28, 1.1, Math.round(e.damage * 1.1), '#f43f5e', 'crimson');
          this._spawnHazardZone(
            Math.max(30, Math.min(this.arenaW - 30, p.x + p.vx * 0.55)),
            Math.max(40, Math.min(this.arenaH - 30, p.y + p.vy * 0.55)),
            24,
            1.3,
            Math.round(e.damage * 1.0),
            '#fb923c',
            'amber'
          );
          if (e.behavior === 'boss_poison') {
            this.decals.push({ kind: 'poison', x: p.x, y: p.y, radius: 24, life: 5.0, maxLife: 5.0 });
          }
          this.shake = Math.max(this.shake, 3.5);
          if (this.enemies.length < 8) {
            const addA = e.behavior === 'boss_frost' ? 'wraith' : e.behavior === 'boss_abyss' ? 'bomber' : 'imp';
            const addB = e.behavior === 'boss_poison' ? 'ghoul' : e.behavior === 'boss_abyss' ? 'cultist' : 'skeleton';
            this._queueRift(e.x + 34, e.y + 12, addA);
            this._queueRift(e.x - 34, e.y + 12, addB);
          }
        }
      } else {
        e.vx = (dx / dist) * spd;
        e.vy = (dy / dist) * spd;
      }

      for (let j = 0; j < this.enemies.length; j++) {
        if (i === j) continue;
        const o = this.enemies[j];
        const sx = e.x - o.x;
        const sy = e.y - o.y;
        const sd = Math.hypot(sx, sy);
        const minD = e.radius + o.radius - 1;
        if (sd > 0 && sd < minD) {
          const push = (minD - sd) * 3.5;
          e.vx += (sx / sd) * push;
          e.vy += (sy / sd) * push;
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Frost Wraiths glide eerily through stone pillars!
      this._resolveArenaAndProps(e, e.behavior === 'wraith');

      if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius - 1) {
        this._hurtPlayer(e.damage, e.x, e.y);
        if (e.behavior === 'bomber') {
          this.novaRings.push({ x: e.x, y: e.y, maxRadius: 42, color: '#f97316', life: 0.28, maxLife: 0.28 });
          this._killEnemy(e, i);
        }
      }
    }
  }

  _fireEnemyShot(e, angle, speed, damage) {
    this.projectiles.push({
      x: e.x + Math.cos(angle) * (e.radius + 3),
      y: e.y + Math.sin(angle) * (e.radius + 3),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      z: 9,
      damage: Math.round(damage),
      color: '#fb7185',
      fromEnemy: true,
      life: 2.6,
      trail: [],
    });
  }

  _updateProjectiles(dt) {
    const p = this.player;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.kind === 'wisp' && !pr.fromEnemy) {
        const t = this._findNearestEnemy(pr.x, pr.y);
        if (t) {
          const want = Math.atan2(t.y - pr.y, t.x - pr.x);
          const spd = Math.hypot(pr.vx, pr.vy);
          const next = this._lerpAngle(pr.angle, want, dt * 9);
          pr.angle = next;
          pr.vx = Math.cos(next) * spd;
          pr.vy = Math.sin(next) * spd;
        }
      }

      pr.trail.push({ x: pr.x, y: pr.y });
      if (pr.trail.length > (pr.heavy ? 6 : 4)) pr.trail.shift();

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.kind === 'chakram') pr.angle += dt * 16;

      // Elemental shedding sparks in flight!
      if (!pr.fromEnemy && Math.random() < dt * (pr.heavy ? 24 : 11)) {
        const sparkCol = pr.ignited
          ? (Math.random() < 0.5 ? '#fde047' : '#f97316')
          : p.mods.frostLevel > 0
          ? '#a5f3fc'
          : p.mods.lightningLevel > 0
          ? '#e9d5ff'
          : pr.color;
        this.particles.push({
          x: pr.x + (Math.random() - 0.5) * 3,
          y: pr.y + (Math.random() - 0.5) * 3,
          z: 9,
          vx: (Math.random() - 0.5) * 18,
          vy: (Math.random() - 0.5) * 14,
          vz: 8 + Math.random() * 12,
          size: pr.heavy ? 2 : 1,
          color: sparkCol,
          life: 0.24,
          maxLife: 0.24,
          gravity: 35,
        });
      }

      // Evolution: Comet Lance fire wake!
      if (!pr.fromEnemy && pr.isComet) {
        pr.cometTimer -= dt;
        if (pr.cometTimer <= 0) {
          pr.cometTimer = 0.08;
          this.decals.push({
            kind: 'fire',
            x: pr.x,
            y: pr.y,
            radius: 10,
            life: 1.4,
            maxLife: 1.4,
            damage: Math.round(10 * p.mods.damageMult),
          });
        }
      }

      // Relic: Brazier Heart ignites arrows flying past the orbiting fireball
      if (!pr.fromEnemy && !pr.ignited && this.fireOrbs.length > 0) {
        const orb = this.fireOrbs[0];
        if (Math.hypot(pr.x - orb.x, pr.y - orb.y) < 14) {
          pr.ignited = true;
          pr.damage = Math.round(pr.damage * 1.4);
          pr.color = '#fb923c';
          sfx.ignite();
          this._burstParticles(orb.x, orb.y - 10, '#fde047', 4, 38);
        }
      }

      // Wall bounce + Shatterstorm Frost Nova
      let hitWall = false;
      if (pr.x < this.wallPad || pr.x > this.arenaW - this.wallPad) {
        if (!pr.fromEnemy && pr.bounceLeft > 0) {
          pr.vx *= -1;
          pr.x = Math.max(this.wallPad, Math.min(this.arenaW - this.wallPad, pr.x));
          pr.angle = Math.atan2(pr.vy, pr.vx);
          pr.bounceLeft -= 1;
          this._burstParticles(pr.x, pr.y, pr.color, 4, 40);
          if (p.evolutions.has('shatterstorm')) this._triggerShatterstorm(pr.x, pr.y);
        } else {
          hitWall = true;
        }
      }
      if (pr.y < this.wallPad + 8 || pr.y > this.arenaH - this.wallPad) {
        if (!pr.fromEnemy && pr.bounceLeft > 0) {
          pr.vy *= -1;
          pr.y = Math.max(this.wallPad + 8, Math.min(this.arenaH - this.wallPad, pr.y));
          pr.angle = Math.atan2(pr.vy, pr.vx);
          pr.bounceLeft -= 1;
          this._burstParticles(pr.x, pr.y, pr.color, 4, 40);
          if (p.evolutions.has('shatterstorm')) this._triggerShatterstorm(pr.x, pr.y);
        } else {
          hitWall = true;
        }
      }
      if (hitWall) {
        this._burstParticles(pr.x, pr.y, '#cbd5e1', 3, 30);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Prop interactions
      let consumed = false;
      for (const prop of this.props) {
        if (!prop.alive || prop.type === 'chest') continue;
        const d = Math.hypot(pr.x - prop.x, pr.y - prop.y);
        if (d < prop.radius + 4) {
          if (prop.type === 'brazier') {
            if (!pr.fromEnemy && !pr.ignited) {
              pr.ignited = true;
              pr.damage = Math.round(pr.damage * 1.45);
              pr.color = '#fb923c';
              sfx.ignite();
              this._spawnText(prop.x, prop.y - 22, 'IGNITED!', '#fb923c', false);
              this._burstParticles(prop.x, prop.y - 12, '#fde047', 6, 45);
            }
          } else if (prop.type === 'barrel' && !pr.fromEnemy) {
            this._detonateBarrel(prop);
            consumed = true;
            break;
          } else if (prop.type === 'pillar') {
            prop.wobble = 0.8;
            prop.flash = 0.08;
            prop.hp -= pr.fromEnemy ? 8 : 14;
            this._burstParticles(prop.x, prop.y - 10, '#94a3b8', 5, 45);
            if (prop.hp <= 0) {
              prop.alive = false;
              sfx.kill();
              this._burstParticles(prop.x, prop.y - 8, '#64748b', 16, 75, true);
            }
            if (!pr.fromEnemy && pr.bounceLeft > 0) {
              const nx = pr.x - prop.x;
              const ny = pr.y - prop.y;
              if (Math.abs(nx) > Math.abs(ny)) pr.vx *= -1;
              else pr.vy *= -1;
              pr.angle = Math.atan2(pr.vy, pr.vx);
              pr.bounceLeft -= 1;
              if (p.evolutions.has('shatterstorm')) this._triggerShatterstorm(pr.x, pr.y);
            } else {
              consumed = true;
            }
            break;
          }
        }
      }
      if (consumed) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.fromEnemy) {
        if (p.invuln <= 0 && Math.hypot(pr.x - p.x, pr.y - p.y) < p.radius + 4) {
          this._hurtPlayer(pr.damage, pr.x, pr.y);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (pr.hitIds && pr.hitIds.has(e)) continue;
        if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.radius + 5) {
          if (pr.hitIds) pr.hitIds.add(e);

          // Hellguard frontal shield blocks 45% damage & all knockback from front hits!
          let hitDmg = pr.innateChill && e.chillTimer > 0 ? Math.round(pr.damage * 1.35) : pr.damage;
          let hitKb = pr.knockback;
          let shielded = false;
          if (e.behavior === 'armored' && e.armor > 0) {
            const shotAng = Math.atan2(pr.vy, pr.vx);
            const dot = Math.cos(shotAng - e.facing);
            if (dot < -0.42) {
              hitDmg = Math.max(1, Math.round(hitDmg * 0.55));
              hitKb = 0;
              shielded = true;
            }
          }
          this._damageEnemy(e, hitDmg, pr.crit && !shielded, { x: pr.vx, y: pr.vy }, hitKb, shielded ? '#94a3b8' : null);

          // Dragon Cannon explosive AoE blast!
          if (pr.explosiveRadius > 0) {
            sfx.explode();
            this.novaRings.push({ x: pr.x, y: pr.y, maxRadius: pr.explosiveRadius + 8, color: '#fb923c', life: 0.24, maxLife: 0.24 });
            this.lightFlashes.push({ x: pr.x, y: pr.y - 6, radius: 52, colorKey: 'amber', life: 0.18, maxLife: 0.18 });
            this._burstParticles(pr.x, pr.y - 6, '#f97316', 10, 62);
            for (const other of [...this.enemies]) {
              if (other === e) continue;
              if (Math.hypot(other.x - pr.x, other.y - pr.y) < pr.explosiveRadius + other.radius) {
                other.burnTimer = 2.4;
                this._damageEnemy(other, Math.round(hitDmg * 0.65), false, { x: other.x - pr.x, y: other.y - pr.y }, 26, '#fb923c');
              }
            }
          }

          if (pr.ignited) e.burnTimer = 2.6 + p.mods.fireLevel * 0.8;
          if (p.mods.frostLevel > 0 || pr.innateChill) e.chillTimer = 2.6 + p.mods.frostLevel * 0.7;
          if (p.mods.lightningLevel > 0 || pr.innateShock) this._triggerChainLightning(e, Math.max(1, p.mods.lightningLevel));
          if (p.evolutions.has('tempest_barrage') && (pr.crit || pr.isSnap)) {
            this._triggerTempestBolt(e);
          }

          if (pr.crit && p.mods.vampiric > 0 && this.vampHealCd <= 0 && Math.random() < 0.35) {
            this.vampHealCd = 1.2;
            const heal = 3 + p.mods.vampiric * 2;
            p.hp = Math.min(p.maxHp, p.hp + heal);
            this._spawnText(p.x, p.y - 22, `+${heal}`, '#4ade80', false);
            if (p.evolutions.has('blood_eclipse')) {
              this.vampCritCount += 1;
              if (this.vampCritCount >= 3) {
                this.vampCritCount = 0;
                this._triggerBloodEclipse();
              }
            }
          }

          if (pr.pierceLeft > 0) {
            pr.pierceLeft -= 1;
          } else if (pr.bounceLeft > 0) {
            if (p.evolutions.has('shatterstorm')) this._triggerShatterstorm(pr.x, pr.y);
            const next = this._findNearestEnemy(e.x, e.y, e);
            if (next) {
              const ang = Math.atan2(next.y - pr.y, next.x - pr.x);
              const spd = Math.hypot(pr.vx, pr.vy);
              pr.vx = Math.cos(ang) * spd;
              pr.vy = Math.sin(ang) * spd;
              pr.angle = ang;
              pr.bounceLeft -= 1;
            } else {
              this.projectiles.splice(i, 1);
              break;
            }
          } else {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  _damageEnemy(e, dmg, crit, dir, knockback, customColor = null) {
    const idx = this.enemies.indexOf(e);
    if (idx === -1) return;

    sfx.hit(crit);
    e.flash = 0.1;
    e.wobble = crit ? 1.0 : 0.65;

    if (e.armor > 0) {
      const before = e.armor;
      e.armor = Math.max(0, e.armor - dmg);
      const spill = Math.max(0, dmg - before);
      e.hp -= spill;
      if (before > 0 && e.armor <= 0) {
        sfx.armorBreak();
        this._spawnText(e.x, e.y - 30, 'ARMOR BROKEN!', '#fbbf24', true);
        this._burstParticles(e.x, e.y - 16, '#fbbf24', 14, 70, true);
        this.starbursts.push({ x: e.x, y: e.y - 14, size: 12, color: '#fde047', life: 0.22, maxLife: 0.22 });
        this.lightFlashes.push({ x: e.x, y: e.y - 12, radius: 55, colorKey: 'gold', life: 0.22, maxLife: 0.22 });
        this.shake = Math.max(this.shake, 4);
        this.hitStop = 0.028;
      }
    } else {
      e.hp -= dmg;
    }

    if (crit) {
      this.starbursts.push({ x: e.x, y: e.y - 11, size: 8, color: customColor || '#fde047', life: 0.14, maxLife: 0.14 });
      this.lightFlashes.push({ x: e.x, y: e.y - 10, radius: 34, colorKey: 'gold', life: 0.12, maxLife: 0.12 });
    }

    // Knockback Poise: prevents permastun turreting on rapid bows & deep floors!
    const kbImmune = e.isBoss || (e.behavior === 'armored' && e.armor > 0) || e.chargeWindup > 0 || e.chargeTimer > 0;
    if (knockback > 0 && !kbImmune && e.poiseTimer <= 0) {
      const floorResist = 1 / (1 + this.floor * 0.12);
      const len = Math.hypot(dir.x, dir.y) || 1;
      e.x += (dir.x / len) * (knockback * 0.12 * floorResist);
      e.y += (dir.y / len) * (knockback * 0.12 * floorResist);
      e.poiseTimer = 0.42;
      this._resolveArenaAndProps(e);
    }

    this._spawnText(
      e.x + (Math.random() - 0.5) * 10,
      e.y - 18,
      crit ? `${dmg}!` : `${dmg}`,
      customColor || (crit ? '#fde047' : '#f8fafc'),
      crit
    );
    this._burstParticles(e.x, e.y - 10, crit ? '#fde047' : '#f8fafc', crit ? 7 : 4, 48);

    if (e.hp <= 0) this._killEnemy(e, idx);
  }

  _killEnemy(e, idx) {
    this.enemies.splice(idx, 1);
    this.kills += 1;
    sfx.kill();
    if (e.isBoss) {
      this.shake = Math.max(this.shake, 7);
      this.rerolls += 1;
      this._spawnRelicChest(e.x, e.y);
      this._spawnText(e.x, e.y - 26, '+1 REROLL & RELIC!', '#fde047', true);
    }

    if (this.relics.has('vampire_fang')) {
      this.vampKillCounter += 1;
      if (this.vampKillCounter >= 8) {
        this.vampKillCounter = 0;
        this.frenzyTimer = 3.0;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 12);
        this._spawnText(this.player.x, this.player.y - 24, 'FRENZY +12HP!', '#f43f5e', true);
      }
    }

    // Armor Passive: Bloodplate Cuirass leeches +2 HP every 2 kills
    if (ARMORS[this.player.armorId].passive === 'kill_leech') {
      this.bloodKillCounter += 1;
      if (this.bloodKillCounter >= 2) {
        this.bloodKillCounter = 0;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
      }
    }

    // Cinder Bomber explodes on death, blasting nearby monsters too!
    if (e.behavior === 'bomber') {
      sfx.explode();
      this.novaRings.push({ x: e.x, y: e.y, maxRadius: 42, color: '#f97316', life: 0.25, maxLife: 0.25 });
      this.lightFlashes.push({ x: e.x, y: e.y, radius: 56, colorKey: 'amber', life: 0.2, maxLife: 0.2 });
      for (const other of [...this.enemies]) {
        if (Math.hypot(other.x - e.x, other.y - e.y) < 42 + other.radius) {
          this._damageEnemy(other, 32, false, { x: other.x - e.x, y: other.y - e.y }, 40, '#fb923c');
        }
      }
    }

    const debrisCol = e.id === 'imp' ? '#dc2626' : e.id === 'ghoul' ? '#84cc16' : '#e2e8f0';
    this._burstParticles(e.x, e.y - 8, debrisCol, e.isBoss ? 28 : 11, e.isBoss ? 90 : 62, true);

    if (e.behavior === 'toxic_chase') {
      this.decals.push({ kind: 'poison', x: e.x, y: e.y, radius: 18, life: 4.5, maxLife: 4.5 });
    }

    if (e.burnTimer > 0 && this.player.mods.fireLevel > 0) {
      this._burstParticles(e.x, e.y - 8, '#f97316', 12, 72);
      for (const other of [...this.enemies]) {
        if (Math.hypot(other.x - e.x, other.y - e.y) < 36) {
          this._damageEnemy(other, Math.round(16 * this.player.mods.fireLevel), false, { x: 0, y: 0 }, 0, '#fb923c');
        }
      }
    }

    if (e.chillTimer > 0 && this.player.mods.frostLevel > 0) {
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.random();
        this.projectiles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(ang) * 210,
          vy: Math.sin(ang) * 210,
          angle: ang,
          z: 9,
          damage: Math.round(14 * this.player.mods.frostLevel * this.player.mods.damageMult),
          crit: false,
          heavy: false,
          pierceLeft: 0,
          bounceLeft: 0,
          knockback: 12,
          color: '#67e8f9',
          ignited: false,
          kind: 'arrow',
          fromEnemy: false,
          hitIds: new Set(),
          life: 0.45,
          trail: [],
        });
      }
    }

    if (WEAPONS[this.player.weaponId].wispOnKill) {
      for (let w = 0; w < 2; w++) {
        const ang = Math.random() * Math.PI * 2;
        this.projectiles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(ang) * 165,
          vy: Math.sin(ang) * 165,
          angle: ang,
          z: 10,
          damage: Math.round(15 * this.player.mods.damageMult),
          crit: false,
          heavy: false,
          pierceLeft: 0,
          bounceLeft: 0,
          knockback: 14,
          color: '#e879f9',
          ignited: false,
          kind: 'wisp',
          fromEnemy: false,
          hitIds: new Set(),
          life: 1.8,
          trail: [],
        });
      }
    }

    const xpMult = this.roomType === 'swarm' ? 2 : 1;
    const xpOrbs = e.isBoss ? 8 : 1;
    for (let k = 0; k < xpOrbs; k++) {
      this.pickups.push({
        type: 'xp',
        value: Math.round((e.xp * xpMult) / xpOrbs),
        x: e.x + (Math.random() - 0.5) * 18,
        y: e.y + (Math.random() - 0.5) * 14,
        seed: Math.random() * 20,
      });
    }
    const goldDrops = e.isBoss ? 8 : Math.random() < 0.72 ? 1 : 0;
    for (let g = 0; g < goldDrops; g++) {
      this.pickups.push({
        type: 'gold',
        value: Math.round(e.gold / Math.max(1, goldDrops)),
        x: e.x + (Math.random() - 0.5) * 20,
        y: e.y + (Math.random() - 0.5) * 16,
        seed: Math.random() * 20,
      });
    }
  }

  _detonateBarrel(barrel) {
    barrel.alive = false;
    sfx.explode();
    this.shake = Math.max(this.shake, 6);
    this.hitStop = 0.028;
    this.novaRings.push({ x: barrel.x, y: barrel.y, maxRadius: 56, color: '#fb923c', life: 0.3, maxLife: 0.3 });
    this.starbursts.push({ x: barrel.x, y: barrel.y - 8, size: 15, color: '#fde047', life: 0.2, maxLife: 0.2 });
    this.lightFlashes.push({ x: barrel.x, y: barrel.y - 6, radius: 88, colorKey: 'amber', life: 0.28, maxLife: 0.28 });
    this.scorchMarks.push({ x: barrel.x, y: barrel.y, radius: 22, ember: true, life: 16, maxLife: 16 });
    this._burstParticles(barrel.x, barrel.y - 8, '#f97316', 24, 95, true);
    this._burstParticles(barrel.x, barrel.y - 8, '#fde047', 12, 65);
    this.decals.push({
      kind: 'fire',
      x: barrel.x,
      y: barrel.y,
      radius: 30,
      life: 3.5,
      maxLife: 3.5,
      damage: Math.round(14 * this.player.mods.damageMult),
    });

    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - barrel.x, e.y - barrel.y) < 58) {
        e.burnTimer = 3.0;
        this._damageEnemy(e, Math.round(58 * this.player.mods.damageMult), true, { x: e.x - barrel.x, y: e.y - barrel.y }, 75, '#fb923c');
      }
    }
  }

  _triggerChainLightning(sourceEnemy, level) {
    let curr = sourceEnemy;
    const visited = new Set([curr]);
    const jumps = 1 + level;
    for (let j = 0; j < jumps; j++) {
      let best = null;
      let bestD = 72;
      for (const e of this.enemies) {
        if (visited.has(e)) continue;
        const d = Math.hypot(e.x - curr.x, e.y - curr.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      visited.add(best);
      this.lightningArcs.push({
        x1: curr.x,
        y1: curr.y,
        x2: best.x,
        y2: best.y,
        j1: (Math.random() - 0.5) * 14,
        j2: (Math.random() - 0.5) * 12,
        j3: (Math.random() - 0.5) * 14,
        life: 0.16,
      });
      this.lightFlashes.push({ x: best.x, y: best.y - 8, radius: 32, colorKey: 'violet', life: 0.14, maxLife: 0.14 });
      this._damageEnemy(best, Math.round((10 + level * 6) * this.player.mods.damageMult), false, { x: 0, y: 0 }, 0, '#e9d5ff');
      curr = best;
    }
  }

  _triggerShatterstorm(x, y) {
    sfx.frostNova();
    this.novaRings.push({ x, y, maxRadius: 34, color: '#67e8f9', life: 0.24, maxLife: 0.24 });
    const p = this.player;
    for (let k = 0; k < 3; k++) {
      const ang = (k / 3) * Math.PI * 2 + Math.random();
      this.projectiles.push({
        x,
        y,
        vx: Math.cos(ang) * 215,
        vy: Math.sin(ang) * 215,
        angle: ang,
        z: 9,
        damage: Math.round(16 * p.mods.damageMult),
        crit: false,
        heavy: false,
        pierceLeft: 0,
        bounceLeft: 0,
        knockback: 14,
        color: '#67e8f9',
        ignited: false,
        kind: 'arrow',
        fromEnemy: false,
        hitIds: new Set(),
        life: 0.38,
        trail: [],
      });
    }
  }

  _triggerTempestBolt(target) {
    sfx.thunder();
    this.shake = Math.max(this.shake, 3.2);
    this.hitStop = 0.02;
    this.thunderBolts.push({ x: target.x, y: target.y, life: 0.24, maxLife: 0.24 });
    this.lightFlashes.push({ x: target.x, y: target.y - 8, radius: 74, colorKey: 'violet', life: 0.24, maxLife: 0.24 });
    this.scorchMarks.push({ x: target.x, y: target.y, radius: 13, ember: false, life: 12, maxLife: 12 });
    const p = this.player;
    const boltDmg = Math.round(28 * p.mods.damageMult);
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - target.x, e.y - target.y) < 34 + e.radius) {
        this._damageEnemy(e, boltDmg, false, { x: 0, y: 0 }, 0, '#d8b4fe');
      }
    }
    this._triggerChainLightning(target, p.mods.lightningLevel + 2);
  }

  _triggerBloodEclipse() {
    const p = this.player;
    sfx.explode();
    this.shake = Math.max(this.shake, 4.5);
    this.novaRings.push({ x: p.x, y: p.y, maxRadius: 68, color: '#fb7185', life: 0.34, maxLife: 0.34 });
    this._spawnText(p.x, p.y - 26, 'BLOOD ECLIPSE!', '#fb7185', true);
    for (const e of [...this.enemies]) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < 70 + e.radius) {
        this._damageEnemy(e, Math.round(48 * p.mods.damageMult), true, { x: e.x - p.x, y: e.y - p.y }, 90, '#fb7185');
      }
    }
  }

  _updateSkyStrikes(dt) {
    for (let i = this.skyStrikes.length - 1; i >= 0; i--) {
      const s = this.skyStrikes[i];
      s.timer -= dt;
      if (s.timer <= 0) {
        sfx.hit(true);
        this.shake = Math.max(this.shake, 2.5);
        this.novaRings.push({ x: s.x, y: s.y, maxRadius: s.radius + 4, color: '#38bdf8', life: 0.22, maxLife: 0.22 });
        this.starbursts.push({ x: s.x, y: s.y - 4, size: 10, color: '#7dd3fc', life: 0.16, maxLife: 0.16 });
        this.lightFlashes.push({ x: s.x, y: s.y, radius: 52, colorKey: 'cyan', life: 0.2, maxLife: 0.2 });
        this._burstParticles(s.x, s.y, '#38bdf8', 12, 65);
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - s.x, e.y - s.y) < s.radius + e.radius) {
            this._damageEnemy(e, s.damage, true, { x: e.x - s.x, y: e.y - s.y }, 38, '#38bdf8');
          }
        }
        this.skyStrikes.splice(i, 1);
      }
    }
  }

  _spawnHazardZone(x, y, radius, duration, damage, color = '#f43f5e', colorKey = 'crimson') {
    this.hazardZones.push({ x, y, radius, duration, timer: duration, damage, color, colorKey });
  }

  _updateHazardZones(dt) {
    const p = this.player;
    for (let i = this.hazardZones.length - 1; i >= 0; i--) {
      const hz = this.hazardZones[i];
      hz.timer -= dt;
      if (hz.timer <= 0) {
        sfx.explode();
        this.shake = Math.max(this.shake, 3.2);
        this.novaRings.push({ x: hz.x, y: hz.y, maxRadius: hz.radius + 6, color: hz.color, life: 0.25, maxLife: 0.25 });
        this.lightFlashes.push({ x: hz.x, y: hz.y, radius: hz.radius * 2.1, colorKey: hz.colorKey, life: 0.22, maxLife: 0.22 });
        this.scorchMarks.push({ x: hz.x, y: hz.y, radius: hz.radius * 0.65, ember: hz.colorKey !== 'cyan', life: 10, maxLife: 10 });
        this._burstParticles(hz.x, hz.y - 4, hz.color, 12, 68);
        if (p.invuln <= 0 && Math.hypot(p.x - hz.x, p.y - hz.y) < hz.radius + p.radius - 2) {
          this._hurtPlayer(hz.damage, hz.x, hz.y);
        }
        this.hazardZones.splice(i, 1);
      }
    }
  }

  _updateDecals(dt) {
    const p = this.player;
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.decals.splice(i, 1);
        continue;
      }
      if (d.kind === 'snare') {
        for (const e of this.enemies) {
          if (Math.hypot(e.x - d.x, e.y - d.y) < d.radius) e.snareTimer = 0.45;
        }
      } else if (d.kind === 'fire') {
        d.tick = (d.tick || 0) - dt;
        if (d.tick <= 0) {
          d.tick = 0.45;
          for (const e of [...this.enemies]) {
            if (Math.hypot(e.x - d.x, e.y - d.y) < d.radius + e.radius) {
              this._damageEnemy(e, d.damage || 10, false, { x: 0, y: 0 }, 0, '#fb923c');
            }
          }
        }
      } else if (d.kind === 'caltrop') {
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - d.x, e.y - d.y) < d.radius + e.radius) {
            this._damageEnemy(e, d.damage, false, { x: 0, y: 0 }, 20, '#fb923c');
            this._burstParticles(d.x, d.y, '#fb923c', 6, 45);
            this.decals.splice(i, 1);
            break;
          }
        }
      } else if (d.kind === 'poison') {
        if (p.invuln <= 0 && Math.hypot(p.x - d.x, p.y - d.y) < d.radius) {
          this._hurtPlayer(6, d.x, d.y);
        }
      }
    }
  }

  _updatePickups(dt) {
    const p = this.player;
    const hasMagnet = this.relics.has('runic_magnet');
    const magnetRange = this.roomCleared ? 420 : hasMagnet ? 115 : 54;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const it = this.pickups[i];
      const dx = p.x - it.x;
      const dy = p.y - it.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < magnetRange) {
        const pull = this.roomCleared ? 230 : hasMagnet ? 205 : 165;
        it.x += (dx / dist) * pull * dt;
        it.y += (dy / dist) * pull * dt;
      }
      if (dist < 13) {
        if (it.type === 'gold') {
          const val = hasMagnet ? Math.ceil(it.value * 1.25) : it.value;
          this.gold += val;
          sfx.pickup(true);
          this._spawnText(p.x, p.y - 20, `+${val}g`, '#fde047', false);
          if (hasMagnet && this.enemies.length > 0) {
            const ang = Math.random() * Math.PI * 2;
            this.projectiles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(ang) * 210,
              vy: Math.sin(ang) * 210,
              angle: ang,
              z: 10,
              damage: Math.round(20 * p.mods.damageMult),
              crit: false,
              heavy: false,
              pierceLeft: 0,
              bounceLeft: 0,
              knockback: 20,
              color: '#fde047',
              ignited: false,
              kind: 'wisp',
              fromEnemy: false,
              hitIds: new Set(),
              life: 1.5,
              trail: [],
            });
          }
        } else if (it.type === 'heart') {
          p.hp = Math.min(p.maxHp, p.hp + 22);
          sfx.pickup(true);
          this._spawnText(p.x, p.y - 20, '+22 HP', '#4ade80', false);
        } else {
          this.xp += it.value;
          sfx.pickup(false);
          if (this.xp >= this.xpNext) {
            this.xp -= this.xpNext;
            this.level += 1;
            this.xpNext = Math.round(this.xpNext * 1.36 + 18);
            sfx.levelUp();
            this._openUpgradeDraft();
          }
        }
        this.pickups.splice(i, 1);
      }
    }
  }

  _updateParticles(dt) {
    for (const prop of this.props) {
      if (prop.alive && prop.type === 'brazier' && Math.random() < dt * 7) {
        this.particles.push({
          x: prop.x + (Math.random() - 0.5) * 6,
          y: prop.y,
          z: 14,
          vx: (Math.random() - 0.5) * 10,
          vy: -4,
          vz: 18 + Math.random() * 14,
          size: Math.random() < 0.5 ? 1 : 2,
          color: Math.random() < 0.5 ? '#fde047' : '#f97316',
          life: 0.75,
          maxLife: 0.75,
          gravity: 0,
        });
      }
      if (prop.wobble > 0) prop.wobble = Math.max(0, prop.wobble - dt * 4);
      if (prop.flash > 0) prop.flash -= dt;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z = Math.max(0, (pt.z || 0) + (pt.vz || 0) * dt);
      if (pt.gravity) pt.vz -= pt.gravity * dt;
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }

    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      this.lightningArcs[i].life -= dt;
      if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
    }

    for (let i = this.thunderBolts.length - 1; i >= 0; i--) {
      this.thunderBolts[i].life -= dt;
      if (this.thunderBolts[i].life <= 0) this.thunderBolts.splice(i, 1);
    }

    for (let i = this.novaRings.length - 1; i >= 0; i--) {
      this.novaRings[i].life -= dt;
      if (this.novaRings[i].life <= 0) this.novaRings.splice(i, 1);
    }

    for (let i = this.starbursts.length - 1; i >= 0; i--) {
      this.starbursts[i].life -= dt;
      if (this.starbursts[i].life <= 0) this.starbursts.splice(i, 1);
    }

    for (let i = this.lightFlashes.length - 1; i >= 0; i--) {
      this.lightFlashes[i].life -= dt;
      if (this.lightFlashes[i].life <= 0) this.lightFlashes.splice(i, 1);
    }

    for (let i = this.launchBeams.length - 1; i >= 0; i--) {
      this.launchBeams[i].life -= dt;
      if (this.launchBeams[i].life <= 0) this.launchBeams.splice(i, 1);
    }

    for (let i = this.scorchMarks.length - 1; i >= 0; i--) {
      this.scorchMarks[i].life -= dt;
      if (this.scorchMarks[i].life <= 0) this.scorchMarks.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= dt * 22;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _updateCamera(dt) {
    const vw = this.renderer.viewW;
    const vh = this.renderer.viewH;
    const maxCamX = Math.max(0, this.arenaW - vw);
    const maxCamY = Math.max(0, this.arenaH - vh);
    const targetX = maxCamX > 0
      ? Math.max(0, Math.min(maxCamX, this.player.x - vw / 2))
      : -(vw - this.arenaW) / 2;
    const targetY = maxCamY > 0
      ? Math.max(0, Math.min(maxCamY, this.player.y - vh / 2 - 12))
      : -(vh - this.arenaH) / 2;
    this.camX += (targetX - this.camX) * Math.min(1, dt * 8);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 8);
  }

  _hurtPlayer(amount, fromX, fromY) {
    const p = this.player;
    p.hp = Math.max(0, p.hp - Math.round(amount));
    p.invuln = 0.72;
    p.hurtFlash = 0.16;
    this.shake = Math.max(this.shake, 5.5);
    sfx.playerHurt();
    this._spawnText(p.x, p.y - 22, `-${Math.round(amount)}`, '#f43f5e', true);

    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    p.x += (dx / len) * 8;
    p.y += (dy / len) * 8;
    this._resolveArenaAndProps(p);

    // Armor Passive: Frostweave Mantle freezes & knocks back attackers when hit!
    if (ARMORS[p.armorId].passive === 'frost_retaliate' && p.hp > 0) {
      sfx.frostNova();
      this.novaRings.push({ x: p.x, y: p.y, maxRadius: 68, color: '#67e8f9', life: 0.32, maxLife: 0.32 });
      this.lightFlashes.push({ x: p.x, y: p.y, radius: 64, colorKey: 'cyan', life: 0.24, maxLife: 0.24 });
      this._spawnText(p.x, p.y - 28, 'FROST NOVA!', '#67e8f9', false);
      for (const e of [...this.enemies]) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 70 + e.radius) {
          e.chillTimer = 3.5;
          this._damageEnemy(e, Math.round(24 * p.mods.damageMult), false, { x: e.x - p.x, y: e.y - p.y }, 95, '#67e8f9');
        }
      }
    }

    this.ui.syncHud(this);

    if (p.hp <= 0) {
      this.state = 'gameover';
      sfx.gameOver();
      this.ui.openGameOver(this);
    }
  }

  _resolveArenaAndProps(ent, ghostProps = false) {
    ent.x = Math.max(this.wallPad + ent.radius, Math.min(this.arenaW - this.wallPad - ent.radius, ent.x));
    ent.y = Math.max(this.wallPad + 12 + ent.radius, Math.min(this.arenaH - this.wallPad - ent.radius, ent.y));
    if (ghostProps) return;

    for (const prop of this.props) {
      if (!prop.alive || !prop.solid) continue;
      const dx = ent.x - prop.x;
      const dy = ent.y - prop.y;
      const dist = Math.hypot(dx, dy);
      const minD = ent.radius + prop.radius;
      if (dist > 0 && dist < minD) {
        const push = minD - dist;
        ent.x += (dx / dist) * push;
        ent.y += (dy / dist) * push;
      }
    }
  }

  _findNearestEnemy(x, y, exclude = null) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e === exclude || e.hp <= 0) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  _burstParticles(x, y, color, count, speed, outlined = false) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        z: 6 + Math.random() * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.72,
        vz: 38 + Math.random() * 45,
        size: outlined ? 3 : 2,
        color,
        outlined,
        shadow: outlined,
        gravity: 170,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
      });
    }
  }

  _spawnText(x, y, text, color, big = false) {
    this.floatingTexts.push({ x, y, text, color, big, life: big ? 0.85 : 0.6 });
  }

  showBanner(title, sub, color = '#fde047', duration = 2.0) {
    this.banner = { title, sub, color, timer: duration };
  }

  _lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

  _bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (this.state === 'playing') {
        if (e.code === 'Space' || e.code === 'KeyQ' || e.code === 'Digit1') {
          e.preventDefault();
          this.castSkill('roll');
        } else if (e.code === 'KeyE' || e.code === 'Digit2') {
          this.castSkill('volley');
        } else if (e.code === 'KeyR' || e.code === 'Digit3') {
          this.castSkill('snare');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    const toCanvasPt = (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - rect.left) / rect.width) * this.renderer.viewW,
        y: ((ev.clientY - rect.top) / rect.height) * this.renderer.viewH,
      };
    };

    // Prevent iOS Safari bounce/scroll when dragging on the canvas
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    this.canvas.addEventListener('pointerdown', (ev) => {
      if (this.state !== 'playing') return;
      if (this.joy.active) return; // Ignore second finger so skills can be tapped simultaneously!
      sfx.init();
      const pt = toCanvasPt(ev);
      this.joy.active = true;
      this.joy.pointerId = ev.pointerId;
      this.joy.startX = pt.x;
      this.joy.startY = pt.y;
      this.joy.currX = pt.x;
      this.joy.currY = pt.y;
      this.joy.dx = 0;
      this.joy.dy = 0;
      try {
        this.canvas.setPointerCapture(ev.pointerId);
      } catch (_) {}
    });

    this.canvas.addEventListener('pointermove', (ev) => {
      if (!this.joy.active || ev.pointerId !== this.joy.pointerId) return;
      const pt = toCanvasPt(ev);
      let dx = pt.x - this.joy.startX;
      let dy = pt.y - this.joy.startY;
      const dist = Math.hypot(dx, dy);
      const maxR = 26;

      // Floating thumbstick: gently pull center along if thumb drifts far so 180° kiting is instant!
      if (dist > maxR) {
        const pull = dist - maxR;
        const ang = Math.atan2(dy, dx);
        this.joy.startX += Math.cos(ang) * pull;
        this.joy.startY += Math.sin(ang) * pull;
        dx = pt.x - this.joy.startX;
        dy = pt.y - this.joy.startY;
      }

      const clamped = Math.min(dist, maxR);
      const ang = Math.atan2(dy, dx);
      this.joy.currX = this.joy.startX + Math.cos(ang) * clamped;
      this.joy.currY = this.joy.startY + Math.sin(ang) * clamped;
      this.joy.dx = dist > 3 ? (Math.cos(ang) * clamped) / maxR : 0;
      this.joy.dy = dist > 3 ? (Math.sin(ang) * clamped) / maxR : 0;
    });

    const endJoy = (ev) => {
      if (ev.pointerId !== this.joy.pointerId) return;
      this.joy.active = false;
      this.joy.pointerId = null;
      this.joy.dx = 0;
      this.joy.dy = 0;
    };
    this.canvas.addEventListener('pointerup', endJoy);
    this.canvas.addEventListener('pointercancel', endJoy);
    this.canvas.addEventListener('lostpointercapture', endJoy);
  }
}
