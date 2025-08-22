const MODULE_ID = "cyberpunker-red";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoRollInit", {
    name: "Auto Roll Initiative",
    hint: "Automatically roll initiative for unrolled combatants when combat starts.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "displayCurrentTurn", {
    name: "Display Current Turn",
    hint: "Show a spotlight overlay for the current combatant at turn start.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "endTurnKey", {
    name: "End Turn Key",
    hint: "Key to press to end your turn.",
    scope: "client",
    config: true,
    type: String,
    default: "E"
  });
});

Hooks.once("ready", () => {
  createCyberpunkerBar();
  updateCyberpunkerBar(game.combat);
});

Hooks.on("renderCombatTracker", () => {
  createCyberpunkerBar();
  updateCyberpunkerBar(game.combat);
});

Hooks.on("createCombat", () => updateCyberpunkerBar(game.combat));
Hooks.on("updateCombat", () => updateCyberpunkerBar(game.combat));
Hooks.on("deleteCombat", () => removeCyberpunkerBar());

Hooks.on("combatStart", async combat => {
  if (game.settings.get(MODULE_ID, "autoRollInit")) {
    for (let c of combat.combatants) {
      if (c.initiative === null) await c.rollInitiative();
    }
  }
  updateCyberpunkerBar(combat);
});

Hooks.on("combatTurn", (combat, updateData, options) => {
  updateCyberpunkerBar(combat);
  if (game.settings.get(MODULE_ID, "displayCurrentTurn")) {
    showTurnSpotlight(combat.combatant);
  }
});

function createCyberpunkerBar() {
  if (document.getElementById("cyberpunker-bar")) return;

  const bar = document.createElement("div");
  bar.id = "cyberpunker-bar";
  bar.style.position = "fixed";
  bar.style.top = "10px";
  bar.style.left = "50%";
  bar.style.transform = "translateX(-50%)";
  bar.style.zIndex = 100;
  bar.style.display = "flex";
  bar.style.flexDirection = "column";
  bar.style.alignItems = "center";
  bar.style.pointerEvents = "none";

  const controls = document.createElement("div");
  controls.id = "cyberpunker-controls";
  controls.style.display = "flex";
  controls.style.flexDirection = "column";
  controls.style.alignItems = "center";
  controls.style.gap = "4px";
  controls.style.pointerEvents = "auto";

  document.body.appendChild(bar);
  document.body.appendChild(controls);
}

function removeCyberpunkerBar() {
  document.getElementById("cyberpunker-bar")?.remove();
  document.getElementById("cyberpunker-controls")?.remove();
}

function updateCyberpunkerBar(combat) {
  const bar = document.getElementById("cyberpunker-bar");
  const controls = document.getElementById("cyberpunker-controls");
  if (!bar || !controls) return;
  bar.innerHTML = "";
  controls.innerHTML = "";

  if (!combat) return;
  const combatants = combat.turns;
  if (!combatants.length) return;

  const currentIndex = combat.turn ?? 0;
  const visible = [];
  for (let i = -4; i <= 4; i++) {
    let idx = (currentIndex + i + combatants.length) % combatants.length;
    visible.push({ combatant: combatants[idx], offset: i });
  }

  // Carousel container
  const carousel = document.createElement("div");
  carousel.style.display = "flex";
  carousel.style.gap = "6px";
  carousel.style.pointerEvents = "auto";
  carousel.style.justifyContent = "center";
  carousel.style.alignItems = "center";

  if (combatants.length > 9) {
    const left = document.createElement("div");
    left.textContent = "◀";
    left.style.color = "red";
    left.style.fontSize = "20px";
    left.style.cursor = "pointer";
    left.style.pointerEvents = "auto";
    carousel.appendChild(left);
  }

  for (let { combatant, offset } of visible) {
    const img = document.createElement("img");
    img.src = combatant.token?.texture.src || "icons/svg/mystery-man.svg";
    img.style.width = offset === 0 ? "96px" : "48px";
    img.style.height = offset === 0 ? "96px" : "48px";
    img.style.border = offset === 0 ? "2px solid red" : "2px solid transparent";
    img.style.borderRadius = "4px";
    img.style.objectFit = "cover";
    img.style.transition = "all 0.2s ease-in-out";
    img.style.cursor = "pointer";
    img.addEventListener("click", ev => {
      ev.stopPropagation();
      if (combatant.token?.object?.isOwner) {
        canvas.tokens.controlled.forEach(t => t.release());
        combatant.token.object.control({ releaseOthers: true });
        canvas.animatePan({ x: combatant.token.object.x, y: combatant.token.object.y });
      }
    });
    img.addEventListener("dblclick", ev => combatant.actor?.sheet?.render(true));
    img.addEventListener("contextmenu", ev => { ev.preventDefault(); combatant.actor?.sheet?.render(true); });
    carousel.appendChild(img);
  }

  if (combatants.length > 9) {
    const right = document.createElement("div");
    right.textContent = "▶";
    right.style.color = "red";
    right.style.fontSize = "20px";
    right.style.cursor = "pointer";
    right.style.pointerEvents = "auto";
    carousel.appendChild(right);
  }

  bar.appendChild(carousel);

  const active = combat.combatant;
  if (!active) return;
  const isOwner = active.token?.object?.isOwner;
  const isGM = game.user.isGM;
  const onlineOwners = active.actor?.players.filter(p => p.active);

  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.gap = "6px";

  if (combat.started) {
    if (isOwner || (isGM && !onlineOwners?.length)) {
      const endBtn = document.createElement("button");
      endBtn.textContent = "End Turn";
      endBtn.style.background = "black";
      endBtn.style.color = "red";
      endBtn.style.border = "2px solid red";
      endBtn.style.boxShadow = "0 0 6px red";
      endBtn.style.borderRadius = "6px";
      endBtn.style.padding = "4px 8px";
      endBtn.style.cursor = "pointer";
      endBtn.addEventListener("click", () => combat.nextTurn());
      buttons.appendChild(endBtn);
    }
  } else if (isGM) {
    const startBtn = document.createElement("button");
    startBtn.textContent = "Start Combat";
    startBtn.style.background = "black";
    startBtn.style.color = "red";
    startBtn.style.border = "2px solid red";
    startBtn.style.boxShadow = "0 0 6px red";
    startBtn.style.borderRadius = "6px";
    startBtn.style.padding = "4px 8px";
    startBtn.style.cursor = "pointer";
    startBtn.addEventListener("click", () => combat.startCombat());
    buttons.appendChild(startBtn);
  }
  controls.appendChild(buttons);
}

function showTurnSpotlight(combatant) {
  if (!combatant) return;
  const overlay = document.createElement("div");
  overlay.id = "cyberpunker-spotlight";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.zIndex = 200;
  overlay.style.cursor = "pointer";

  const img = document.createElement("img");
  img.src = combatant.token?.texture.src || "icons/svg/mystery-man.svg";
  img.style.width = "256px";
  img.style.height = "256px";
  img.style.objectFit = "contain";
  img.style.marginBottom = "12px";
  overlay.appendChild(img);

  const name = document.createElement("div");
  name.textContent = combatant.name;
  name.style.fontSize = "32px";
  name.style.padding = "6px 12px";
  name.style.color = "white";
  name.style.borderRadius = "6px";
  const onlineOwners = combatant.actor?.players.filter(p => p.active);
  if (onlineOwners?.length) {
    name.style.background = onlineOwners[0].color || "blue";
  } else {
    name.style.background = "red";
  }
  overlay.appendChild(name);

  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2500);
}

window.addEventListener("keydown", ev => {
  const key = game.settings.get(MODULE_ID, "endTurnKey");
  if (ev.key.toUpperCase() === key.toUpperCase()) {
    const combat = game.combat;
    if (!combat) return;
    const active = combat.combatant;
    if (!active) return;
    const isOwner = active.token?.object?.isOwner;
    const isGM = game.user.isGM;
    const onlineOwners = active.actor?.players.filter(p => p.active);
    if (isOwner || (isGM && !onlineOwners?.length)) combat.nextTurn();
  }
});
