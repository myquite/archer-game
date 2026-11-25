// ARCHER — Pixel-Art Mobile-First HUD & Modal Wiring

import { ARMORS, WEAPONS, EVOLUTIONS, RELICS, BIOMES, getSynergyHint } from './data.js';
import { ArcherGame } from './game.js';
import { sfx } from './audio.js';
import { pxIcon } from './icons.js';

const $ = (id) => document.getElementById(id);

// Hydrate all static pixel-art icon placeholders in index.html
document.querySelectorAll('[data-px-icon]').forEach((el) => {
  const name = el.dataset.pxIcon;
  const size = parseInt(el.dataset.pxSize || '16', 10);
  el.innerHTML = pxIcon(name, size);
});

const overlays = {
  title: $('overlay-title'),
  levelup: $('overlay-levelup'),
  relic: $('overlay-relic'),
  doors: $('overlay-doors'),
  blacksmith: $('overlay-blacksmith'),
  cursed: $('overlay-cursed'),
  gameover: $('overlay-gameover'),
};

let isForgeMidRunInspect = false;
let activeForgeTab = 'weapons';
let selectedChapter = 1;

function closeModals() {
  Object.values(overlays).forEach((el) => el.classList.add('hidden'));
}

function rankPips(rank, max) {
  return '●'.repeat(rank) + '○'.repeat(Math.max(0, max - rank));
}

function syncHud(game) {
  const p = game.player;
  const left = game.getRemainingFoes();

  $('hud-floor').textContent = `F${game.floor}`;
  $('hud-wave').textContent = `W${Math.max(1, game.waveIndex)}/${game.totalWaves}`;
  $('hud-left').textContent = game.roomCleared ? 'CLEAR' : `${left}`;
  $('hud-gold').textContent = `${game.gold}`;
  $('hud-lvl').textContent = `LV ${game.level}`;
  $('bar-xp').style.width = `${Math.min(100, (game.xp / game.xpNext) * 100)}%`;

  // Compact pixel-art icon badges for awakened Evolutions & Relics
  const badgeRow = $('hud-badges');
  const totalBadges = p.evolutions.size + game.relics.size;
  if (totalBadges === 0) {
    badgeRow.classList.add('hidden');
  } else {
    badgeRow.classList.remove('hidden');
    const sig = `${[...p.evolutions].join(',')}|${[...game.relics].join(',')}`;
    if (badgeRow.dataset.sig !== sig) {
      badgeRow.dataset.sig = sig;
      const items = [];
      for (const evoId of p.evolutions) {
        const e = EVOLUTIONS.find((x) => x.id === evoId);
        if (e) items.push(`<span class="mini-badge evo-badge" style="color:${e.color}" title="${e.name}: ${e.desc}">${pxIcon(e.icon, 14)}</span>`);
      }
      for (const relId of game.relics) {
        const r = RELICS.find((x) => x.id === relId);
        if (r) items.push(`<span class="mini-badge" style="color:${r.color}" title="${r.name}: ${r.desc}">${pxIcon(r.icon, 14)}</span>`);
      }
      badgeRow.innerHTML = items.join('');
    }
  }

  $('txt-hp').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
  $('bar-hp').style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;

  $('txt-mana').textContent = `${Math.floor(p.mana)}/${p.maxMana}`;
  $('bar-mana').style.width = `${Math.max(0, (p.mana / p.maxMana) * 100)}%`;

  for (const key of ['roll', 'volley', 'snare']) {
    const sk = p.skills[key];
    const mask = $(`cd-${key}`);
    const btn = $(`skill-${key}`);
    if (sk.cd > 0) {
      mask.textContent = `${sk.cd.toFixed(1)}s`;
      mask.classList.add('active');
    } else {
      mask.classList.remove('active');
    }
    btn.classList.toggle('disabled', sk.cd > 0 || p.mana < sk.cost);
  }
}

function openLevelUp(game, choices) {
  closeModals();
  const list = $('levelup-cards');
  list.innerHTML = '';

  for (const up of choices) {
    const btn = document.createElement('button');
    if (up.isEvolution) {
      btn.className = 'choice-card evo-card';
      btn.innerHTML = `
        <div class="choice-ico" style="color:${up.color}">${pxIcon(up.icon, 26)}</div>
        <div class="choice-body">
          <div class="choice-top">
            <span style="color:${up.color}">${up.name}</span>
            <span class="rank-pips gold">EVO</span>
          </div>
          <div class="choice-desc">${up.desc}</div>
        </div>
      `;
      btn.onclick = () => game.applyUpgrade(up.id, true);
    } else {
      const rank = game.upgradeRanks[up.id] || 0;
      const hint = getSynergyHint(up.id, game.upgradeRanks, game.player.evolutions);
      btn.className = 'choice-card';
      btn.innerHTML = `
        <div class="choice-ico" style="color:${up.color}">${pxIcon(up.icon, 24)}</div>
        <div class="choice-body">
          <div class="choice-top">
            <span style="color:${up.color}">${up.name}</span>
            <span class="rank-pips" style="color:${up.color}">${rankPips(rank, up.maxRank)}</span>
          </div>
          <div class="choice-desc">${up.desc}</div>
          ${hint ? `<div class="synergy-pill">+ ${hint}</div>` : ''}
        </div>
      `;
      btn.onclick = () => game.applyUpgrade(up.id, false);
    }
    list.appendChild(btn);
  }

  const rerollBtn = $('btn-reroll-up');
  rerollBtn.innerHTML = `${pxIcon('dice', 16)} <span>REROLL (${game.rerolls})</span>`;
  rerollBtn.disabled = game.rerolls <= 0;

  overlays.levelup.classList.remove('hidden');
}

function openRelicDraft(game, choices) {
  closeModals();
  const list = $('relic-cards');
  list.innerHTML = '';

  for (const rel of choices) {
    const btn = document.createElement('button');
    btn.className = 'choice-card relic-card';
    btn.innerHTML = `
      <div class="choice-ico" style="color:${rel.color}">${pxIcon(rel.icon, 26)}</div>
      <div class="choice-body">
        <div class="choice-top">
          <span style="color:${rel.color}">${rel.name}</span>
          <span class="rank-pips" style="color:${rel.color}">${rel.tag}</span>
        </div>
        <div class="choice-desc">${rel.desc}</div>
      </div>
    `;
    btn.onclick = () => game.applyRelic(rel.id);
    list.appendChild(btn);
  }

  const rerollBtn = $('btn-reroll-relic');
  rerollBtn.innerHTML = `${pxIcon('dice', 16)} <span>REROLL (${game.rerolls})</span>`;
  rerollBtn.disabled = game.rerolls <= 0;

  overlays.relic.classList.remove('hidden');
}

function openDoorPicker(game, doors) {
  closeModals();
  const list = $('door-cards');
  list.innerHTML = '';

  const iconMap = {
    swarm: 'up_hellfire',
    blacksmith: 'anvil',
    cursed: 'ch_abyss',
    boss: 'door_boss',
  };

  for (const d of doors) {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.innerHTML = `
      <div class="choice-ico" style="color:${d.color}">${pxIcon(iconMap[d.type] || 'door_portal', 24)}</div>
      <div class="choice-body">
        <div class="choice-top">
          <span style="color:${d.color}">${d.title}</span>
        </div>
        <div class="choice-desc">${d.tag}</div>
      </div>
    `;
    btn.onclick = () => game.enterNextFloor(d.type);
    list.appendChild(btn);
  }

  overlays.doors.classList.remove('hidden');
}

function setForgeTab(tab) {
  activeForgeTab = tab;
  $('tab-weapons').classList.toggle('active', tab === 'weapons');
  $('tab-armors').classList.toggle('active', tab === 'armors');
  $('forge-weapons').classList.toggle('hidden', tab !== 'weapons');
  $('forge-armors').classList.toggle('hidden', tab !== 'armors');
}

function renderForgeContents(game) {
  $('forge-gold').textContent = `${game.gold}`;

  const wGrid = $('forge-weapons');
  wGrid.innerHTML = '';
  for (const w of Object.values(WEAPONS)) {
    const owned = game.ownedWeapons.has(w.id);
    const equipped = game.player.weaponId === w.id;
    const canAfford = owned || game.gold >= w.cost;

    const btn = document.createElement('button');
    btn.className = `forge-item ${equipped ? 'equipped' : ''} ${!canAfford ? 'cant-afford' : ''}`;
    btn.innerHTML = `
      <div class="fi-ico">${pxIcon(`w_${w.id}`, 24)}</div>
      <div class="fi-info">
        <div class="fi-name" style="color:${w.color}">${w.name}</div>
        <div class="fi-tag">${w.tag}</div>
        <div class="fi-cost">${equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${pxIcon('coin', 11)} ${w.cost}`}</div>
      </div>
    `;
    btn.onclick = () => {
      if (game.buyOrEquipWeapon(w.id)) renderForgeContents(game);
    };
    wGrid.appendChild(btn);
  }

  const aGrid = $('forge-armors');
  aGrid.innerHTML = '';
  for (const a of Object.values(ARMORS)) {
    const owned = game.ownedArmors.has(a.id);
    const equipped = game.player.armorId === a.id;
    const canAfford = owned || game.gold >= a.cost;

    const btn = document.createElement('button');
    btn.className = `forge-item ${equipped ? 'equipped' : ''} ${!canAfford ? 'cant-afford' : ''}`;
    btn.innerHTML = `
      <div class="fi-ico">${pxIcon(`a_${a.id}`, 24)}</div>
      <div class="fi-info">
        <div class="fi-name">${a.name}</div>
        <div class="fi-tag">${a.tag}</div>
        <div class="fi-cost">${equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${pxIcon('coin', 11)} ${a.cost}`}</div>
      </div>
    `;
    btn.onclick = () => {
      if (game.buyOrEquipArmor(a.id)) renderForgeContents(game);
    };
    aGrid.appendChild(btn);
  }

  $('btn-temper').disabled = game.gold < 45;
  $('btn-heal').disabled = game.gold < 35 || game.player.hp >= game.player.maxHp;
  $('btn-buy-rerolls').disabled = game.gold < 30;
  setForgeTab(activeForgeTab);
}

function openBlacksmith(game, midRunInspect = false) {
  isForgeMidRunInspect = midRunInspect;
  closeModals();
  renderForgeContents(game);
  $('btn-leave-forge').textContent = midRunInspect ? 'RESUME ▶' : 'NEXT FLOOR ▶';
  overlays.blacksmith.classList.remove('hidden');
}

function openCursedAltar(game, pacts) {
  closeModals();
  const list = $('cursed-cards');
  list.innerHTML = '';

  for (const pact of pacts) {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.innerHTML = `
      <div class="choice-ico crimson">${pxIcon('ch_abyss', 24)}</div>
      <div class="choice-body">
        <div class="choice-top"><span class="crimson">${pact.name}</span></div>
        <div class="choice-desc">${pact.desc}</div>
      </div>
    `;
    btn.onclick = () => game.applyCursedPact(pact.id);
    list.appendChild(btn);
  }
  overlays.cursed.classList.remove('hidden');
}

function openGameOver(game) {
  closeModals();
  $('gameover-stats').innerHTML = `
    <div class="stat-tile"><div class="st-val gold">F${game.floor}</div><div class="st-lbl">FLOOR</div></div>
    <div class="stat-tile"><div class="st-val crimson">${game.kills}</div><div class="st-lbl">KILLS</div></div>
    <div class="stat-tile"><div class="st-val" style="color:#38bdf8">LV ${game.level}</div><div class="st-lbl">LEVEL</div></div>
    <div class="stat-tile"><div class="st-val purple">${game.player.evolutions.size + game.relics.size}</div><div class="st-lbl">RELICS &amp; EVOS</div></div>
  `;
  overlays.gameover.classList.remove('hidden');
}

const game = new ArcherGame($('game-canvas'), {
  syncHud,
  closeModals,
  openLevelUp,
  openRelicDraft,
  openDoorPicker,
  openBlacksmith,
  openCursedAltar,
  openGameOver,
});

$('tab-weapons').textContent = `BOWS (${Object.keys(WEAPONS).length})`;
$('tab-armors').textContent = `ARMOR (${Object.keys(ARMORS).length})`;

function renderChapterPicker() {
  const wrap = $('chapter-pills');
  wrap.innerHTML = '';
  for (const b of BIOMES) {
    const btn = document.createElement('button');
    btn.className = `ch-btn ${b.chapter === selectedChapter ? 'active' : ''}`;
    btn.innerHTML = `${pxIcon(b.icon, 20)}<span>C${b.chapter}</span>`;
    btn.onclick = () => {
      selectedChapter = b.chapter;
      sfx.uiClick();
      renderChapterPicker();
    };
    wrap.appendChild(btn);
  }
  const active = BIOMES[selectedChapter - 1];
  const bonus = active.chapter > 1 ? ` · ${active.startGold}g` : '';
  $('chapter-label').textContent = `CH ${active.chapter} · ${active.name} (F${active.minFloor}${bonus})`;

  const best = game.getBestFloor();
  $('title-best').textContent = best > 1 ? `BEST DEPTH: FLOOR ${best}` : '5 CHAPTERS · 16 GEAR SETS';
}

renderChapterPicker();

$('btn-start').onclick = () => {
  closeModals();
  game.startRun(selectedChapter);
};

$('btn-restart').onclick = () => {
  closeModals();
  game.startRun(selectedChapter);
};

function syncAudioBtn() {
  const btn = $('btn-mute');
  const iconName = sfx.mode === 'all' ? 'sound_all' : sfx.mode === 'sfx' ? 'sound_sfx' : 'sound_mute';
  btn.innerHTML = pxIcon(iconName, 18);
  btn.title = sfx.getModeLabel();
}
syncAudioBtn();

$('btn-mute').onclick = () => {
  sfx.cycleMode();
  syncAudioBtn();
};

$('btn-gear').onclick = () => {
  if (game.state === 'playing') {
    game.state = 'modal';
    openBlacksmith(game, true);
  }
};

$('tab-weapons').onclick = () => setForgeTab('weapons');
$('tab-armors').onclick = () => setForgeTab('armors');

$('btn-temper').onclick = () => {
  if (game.temperWeapon()) renderForgeContents(game);
};

$('btn-heal').onclick = () => {
  if (game.healAtShrine()) renderForgeContents(game);
};

$('btn-buy-rerolls').onclick = () => {
  if (game.buyRerolls()) renderForgeContents(game);
};

$('btn-reroll-up').onclick = () => game.rerollUpgradeDraft();
$('btn-reroll-relic').onclick = () => game.rerollRelicDraft();

$('btn-leave-forge').onclick = () => {
  if (isForgeMidRunInspect) {
    closeModals();
    game.state = 'playing';
  } else {
    game.leaveBlacksmith();
  }
};

$('btn-decline-curse').onclick = () => game.enterNextFloor('combat');

document.querySelectorAll('.skill-btn').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sfx.init();
    game.castSkill(btn.dataset.skill);
  });
});

window.__ARCHER_GAME__ = game;
