// ARCHER — HUD & Modal Wiring (Evolutions, Relics, Rerolls & Blacksmith)

import { ARMORS, WEAPONS, EVOLUTIONS, RELICS, getSynergyHint } from './data.js';
import { ArcherGame } from './game.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

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

function closeModals() {
  Object.values(overlays).forEach((el) => el.classList.add('hidden'));
}

function syncHud(game) {
  const p = game.player;
  $('hud-floor').textContent = `FL ${game.floor}`;
  $('hud-biome').textContent = game.biome.name;
  const left = game.getRemainingFoes();
  $('hud-wave').textContent = `WAVE ${Math.max(1, game.waveIndex)}/${game.totalWaves} • ${left} LEFT • KILLS ${game.kills}`;
  $('hud-gold').textContent = `${game.gold}`;
  $('hud-lvl').textContent = `LV ${game.level}`;
  $('hud-dice').textContent = `🎲${game.rerolls}`;
  $('bar-xp').style.width = `${Math.min(100, (game.xp / game.xpNext) * 100)}%`;

  $('hud-weapon').textContent = WEAPONS[p.weaponId].name;
  $('hud-armor').textContent = ARMORS[p.armorId].name;

  // Render active Evolutions & Relics badge strip
  const badgeRow = $('hud-badges');
  const totalBadges = p.evolutions.size + game.relics.size;
  if (totalBadges === 0) {
    badgeRow.classList.add('hidden');
  } else {
    badgeRow.classList.remove('hidden');
    const items = [];
    for (const evoId of p.evolutions) {
      const e = EVOLUTIONS.find((x) => x.id === evoId);
      if (e) items.push(`<span class="build-badge evo-badge" style="color:${e.color}" title="${e.desc}">★ ${e.icon} ${e.name}</span>`);
    }
    for (const relId of game.relics) {
      const r = RELICS.find((x) => x.id === relId);
      if (r) items.push(`<span class="build-badge" style="color:${r.color}" title="${r.desc}">${r.icon} ${r.name}</span>`);
    }
    const html = items.join('');
    if (badgeRow.dataset.sig !== html) {
      badgeRow.dataset.sig = html;
      badgeRow.innerHTML = html;
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
        <div class="choice-top">
          <span style="color:${up.color}">★ ${up.icon} ${up.name}</span>
          <span class="choice-tag" style="color:#fde047">EVOLUTION</span>
        </div>
        <div class="choice-desc">${up.desc}</div>
      `;
      btn.onclick = () => game.applyUpgrade(up.id, true);
    } else {
      const rank = game.upgradeRanks[up.id] || 0;
      const hint = getSynergyHint(up.id, game.upgradeRanks, game.player.evolutions);
      btn.className = 'choice-card';
      btn.innerHTML = `
        <div class="choice-top">
          <span style="color:${up.color}">${up.icon} ${up.name}</span>
          <span class="choice-tag" style="color:${up.color}">${up.tag} ${rank}/${up.maxRank}</span>
        </div>
        <div class="choice-desc">${up.desc}</div>
        ${hint ? `<div class="synergy-pill">✦ ${hint}</div>` : ''}
      `;
      btn.onclick = () => game.applyUpgrade(up.id, false);
    }
    list.appendChild(btn);
  }

  const rerollBtn = $('btn-reroll-up');
  rerollBtn.textContent = `🎲 REROLL CARDS (${game.rerolls})`;
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
      <div class="choice-top">
        <span style="color:${rel.color}">${rel.icon} ${rel.name}</span>
        <span class="choice-tag" style="color:${rel.color}">${rel.tag}</span>
      </div>
      <div class="choice-desc">${rel.desc}</div>
    `;
    btn.onclick = () => game.applyRelic(rel.id);
    list.appendChild(btn);
  }

  const rerollBtn = $('btn-reroll-relic');
  rerollBtn.textContent = `🎲 REROLL RELICS (${game.rerolls})`;
  rerollBtn.disabled = game.rerolls <= 0;

  overlays.relic.classList.remove('hidden');
}

function openDoorPicker(game, doors) {
  closeModals();
  const list = $('door-cards');
  list.innerHTML = '';

  for (const d of doors) {
    const btn = document.createElement('button');
    btn.className = 'choice-card';
    btn.innerHTML = `
      <div class="choice-top">
        <span style="color:${d.color}">🚪 ${d.title}</span>
        <span class="choice-tag" style="color:${d.color}">${d.tag}</span>
      </div>
      <div class="choice-desc">${d.desc}</div>
    `;
    btn.onclick = () => game.enterNextFloor(d.type);
    list.appendChild(btn);
  }

  overlays.doors.classList.remove('hidden');
}

function renderForgeContents(game) {
  $('forge-gold').textContent = `${game.gold}g`;

  const wGrid = $('forge-weapons');
  wGrid.innerHTML = '';
  for (const w of Object.values(WEAPONS)) {
    const owned = game.ownedWeapons.has(w.id);
    const equipped = game.player.weaponId === w.id;
    const canAfford = owned || game.gold >= w.cost;

    const btn = document.createElement('button');
    btn.className = `forge-item ${equipped ? 'equipped' : ''} ${!canAfford ? 'cant-afford' : ''}`;
    btn.innerHTML = `
      <div class="fi-name" style="color:${w.color}">${w.name}</div>
      <div class="fi-tag">${w.tag}</div>
      <div class="fi-cost">${equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${w.cost}g`}</div>
    `;
    btn.title = w.desc;
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
      <div class="fi-name">${a.name}</div>
      <div class="fi-tag">${a.tag}</div>
      <div class="fi-cost">${equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${a.cost}g`}</div>
    `;
    btn.title = a.desc;
    btn.onclick = () => {
      if (game.buyOrEquipArmor(a.id)) renderForgeContents(game);
    };
    aGrid.appendChild(btn);
  }

  $('btn-temper').disabled = game.gold < 45;
  $('btn-heal').disabled = game.gold < 35 || game.player.hp >= game.player.maxHp;
  $('btn-buy-rerolls').disabled = game.gold < 30;
}

function openBlacksmith(game, midRunInspect = false) {
  isForgeMidRunInspect = midRunInspect;
  closeModals();
  renderForgeContents(game);
  $('btn-leave-forge').textContent = midRunInspect ? 'RESUME BATTLE ▶' : 'DESCEND TO NEXT FLOOR ▶';
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
      <div class="choice-top">
        <span class="crimson">⛧ ${pact.name}</span>
        <span class="choice-tag crimson">PACT</span>
      </div>
      <div class="choice-desc">${pact.desc}</div>
    `;
    btn.onclick = () => game.applyCursedPact(pact.id);
    list.appendChild(btn);
  }
  overlays.cursed.classList.remove('hidden');
}

function openGameOver(game) {
  closeModals();
  const evoNames = [...game.player.evolutions].map((id) => EVOLUTIONS.find((e) => e.id === id)?.name).filter(Boolean);
  const relNames = [...game.relics].map((id) => RELICS.find((r) => r.id === id)?.name).filter(Boolean);

  $('gameover-stats').innerHTML = `
    <div>DEPTH REACHED: <b class="gold">FLOOR ${game.floor}</b> (${game.biome.name})</div>
    <div>MONSTERS SLAIN: <b class="crimson">${game.kills}</b> • LEVEL <b style="color:#38bdf8">LV ${game.level}</b></div>
    <div>GEAR: <b>${WEAPONS[game.player.weaponId].name}</b> + <b>${ARMORS[game.player.armorId].name}</b></div>
    ${evoNames.length ? `<div>EVOLUTIONS: <b class="gold">${evoNames.join(', ')}</b></div>` : ''}
    ${relNames.length ? `<div>RELICS: <b style="color:#c084fc">${relNames.join(', ')}</b></div>` : ''}
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

$('btn-start').onclick = () => {
  closeModals();
  game.startRun();
};

$('btn-restart').onclick = () => {
  closeModals();
  game.startRun();
};

$('btn-mute').onclick = () => {
  const muted = sfx.toggleMute();
  $('btn-mute').textContent = muted ? '🔇' : '🔊';
};

$('btn-gear').onclick = () => {
  if (game.state === 'playing') {
    game.state = 'modal';
    openBlacksmith(game, true);
  }
};

$('btn-temper').onclick = () => {
  if (game.temperWeapon()) renderForgeContents(game);
};

$('btn-heal').onclick = () => {
  if (game.healAtShrine()) renderForgeContents(game);
};

$('btn-buy-rerolls').onclick = () => {
  if (game.buyRerolls()) renderForgeContents(game);
};

$('btn-reroll-up').onclick = () => {
  game.rerollUpgradeDraft();
};

$('btn-reroll-relic').onclick = () => {
  game.rerollRelicDraft();
};

$('btn-leave-forge').onclick = () => {
  if (isForgeMidRunInspect) {
    closeModals();
    game.state = 'playing';
  } else {
    game.leaveBlacksmith();
  }
};

$('btn-decline-curse').onclick = () => {
  game.enterNextFloor('combat');
};

document.querySelectorAll('.skill-btn').forEach((btn) => {
  // Instant zero-latency tap on iPhone (works simultaneously while dragging the thumbstick!)
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sfx.init();
    game.castSkill(btn.dataset.skill);
  });
});

window.__ARCHER_GAME__ = game;
