const MODULE_ID = "cyberpunker-red";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoRollInitiative", {
    name: "Auto-Roll Initiative",
    hint: "Automatically roll initiative for all tokens without initiative when combat starts.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register(MODULE_ID, "displayCurrentTurn", {
    name: "Display Current Turn",
    hint: "Show a large popup of the active combatant when their turn begins.",
    scope: "client",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register(MODULE_ID, "endTurnKey", {
    name: "End Turn Key",
    hint: "Keyboard key to end your turn.",
    scope: "client",
    config: true,
    default: "E",
    type: String
  });
});

Hooks.on("renderCombatTracker", (app, html, data) => {
  if (document.getElementById("cyberpunker-bar")) return;

  const bar = document.createElement("div");
  bar.id = "cyberpunker-bar";
  bar.style.position = "absolute";
  bar.style.top = "0";
  bar.style.left = "50%";
  bar.style.transform = "translateX(-50%)";
  bar.style.display = "flex";
  bar.style.alignItems = "center";
  bar.style.gap = "6px";
  bar.style.padding = "4px";
  bar.style.zIndex = 99;
  bar.style.background = "rgba(0,0,0,0.5)";
  bar.style.borderRadius = "6px";
  bar.style.flexDirection = "column";

  // End Turn button container
  const endTurnBtn = document.createElement("button");
  endTurnBtn.id = "cyberpunker-endturn";
  endTurnBtn.textContent = "End Turn";
  endTurnBtn.style.marginTop = "4px";
  endTurnBtn.style.display = "none";
  endTurnBtn.onclick = () => tryEndTurn();

  bar.appendChild(endTurnBtn);
  document.body.appendChild(bar);
});

function createArrow(direction, combat) {
  const arrow = document.createElement("div");
  arrow.textContent = direction === "left" ? "◀" : "▶";
  arrow.style.color = "white";
  arrow.style.fontSize = "20px";
  arrow.style.cursor = "pointer";
  arrow.style.userSelect = "none";
  arrow.onclick = () => {
    let idx = combat.turn ?? 0;
    if (direction === "left" && idx > 0) combat.update({ turn: idx - 1 });
    if (direction === "right" && idx < combat.turns.length - 1) combat.update({ turn: idx + 1 });
  };
  return arrow;
}

function updateTokenBar(combat) {
  const bar = document.getElementById("cyberpunker-bar");
  if (!bar) return;
  // keep End Turn button
  const endTurnBtn = document.getElementById("cyberpunker-endturn");
  bar.innerHTML = "";
  if (endTurnBtn) bar.appendChild(endTurnBtn);

  if (!combat || !combat.combatants.size) return;

  const currentIndex = combat.turn ?? 0;
  const ordered = combat.turns;

  const start = Math.max(0, currentIndex - 4);
  const end = Math.min(ordered.length, currentIndex + 5);

  if (start > 0) bar.appendChild(createArrow("left", combat));

  for (let i = start; i < end; i++) {
    const combatant = ordered[i];
    const token = combatant.token;
    if (!token) continue;

    const img = document.createElement("img");
    img.src = token.texture.src;
    img.style.width = i === currentIndex ? "96px" : "48px";
    img.style.height = i === currentIndex ? "96px" : "48px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.style.transition = "all 0.2s ease";
    img.style.cursor = "pointer";

    if (i === currentIndex) {
      img.style.boxShadow = "0 0 18px 5px red";
      img.style.transform = "scale(1.0)"; // size already doubled
    }

    img.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const tokenDoc = canvas.tokens.get(token.id);
      if (tokenDoc && tokenDoc.isOwner) {
        tokenDoc.control({ releaseOthers: true });
        canvas.animatePan({ x: tokenDoc.x, y: tokenDoc.y, scale: canvas.stage.scale.x });
      }
    });
    img.addEventListener("dblclick", (ev) => {
      ev.preventDefault();
      if (combatant.actor?.sheet?.rendered) combatant.actor.sheet.bringToTop();
      else combatant.actor?.sheet?.render(true);
    });
    img.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      if (combatant.actor?.sheet?.rendered) combatant.actor.sheet.bringToTop();
      else combatant.actor?.sheet?.render(true);
    });

    bar.appendChild(img);
  }

  if (end < ordered.length) bar.appendChild(createArrow("right", combat));

  // Update End Turn button visibility
  updateEndTurnButton(combat);
}

function showTurnSpotlight(combatant) {
  if (!game.settings.get(MODULE_ID, "displayCurrentTurn")) return;
  if (!combatant?.token) return;

  const spotlight = document.createElement("div");
  spotlight.id = "cyberpunker-spotlight";
  spotlight.style.position = "absolute";
  spotlight.style.top = 0;
  spotlight.style.left = 0;
  spotlight.style.width = "100%";
  spotlight.style.height = "100%";
  spotlight.style.background = "rgba(0,0,0,0.7)";
  spotlight.style.display = "flex";
  spotlight.style.flexDirection = "column";
  spotlight.style.alignItems = "center";
  spotlight.style.justifyContent = "center";
  spotlight.style.zIndex = 200;

  const img = document.createElement("img");
  img.src = combatant.token.texture.src;
  img.style.width = "256px";
  img.style.height = "256px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "8px";
  img.style.boxShadow = "0 0 20px 5px red";

  const nameBanner = document.createElement("div");
  nameBanner.textContent = combatant.name;
  nameBanner.style.fontSize = "32px";
  nameBanner.style.fontWeight = "bold";
  nameBanner.style.color = "white";
  nameBanner.style.padding = "8px 16px";
  nameBanner.style.marginTop = "12px";
  nameBanner.style.borderRadius = "6px";

  let bannerColor = "red";
  const owners = combatant.actor?.ownership || {};
  const playerOwners = game.users.filter(u => owners[u.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && u.active);
  if (playerOwners.length > 0) bannerColor = playerOwners[0].color || bannerColor;
  nameBanner.style.background = bannerColor;

  spotlight.appendChild(img);
  spotlight.appendChild(nameBanner);
  document.body.appendChild(spotlight);

  setTimeout(() => {
    spotlight.remove();
  }, 3000);
}

function tryEndTurn() {
  const combat = game.combat;
  if (!combat) return;
  const current = combat.combatant;
  if (!current) return;

  const token = current.token ? canvas.tokens.get(current.token.id) : null;
  const isOwner = token?.isOwner;
  const isGM = game.user.isGM;
  const actorOwners = current.actor ? game.users.filter(u => current.actor.testUserPermission(u, "OWNER") && u.active) : [];

  if (isOwner || (isGM && actorOwners.length === 0)) {
    combat.nextTurn();
  }
}

function updateEndTurnButton(combat) {
  const btn = document.getElementById("cyberpunker-endturn");
  if (!btn) return;
  const current = combat.combatant;
  if (!current) { btn.style.display = "none"; return; }

  const token = current.token ? canvas.tokens.get(current.token.id) : null;
  const isOwner = token?.isOwner;
  const isGM = game.user.isGM;
  const actorOwners = current.actor ? game.users.filter(u => current.actor.testUserPermission(u, "OWNER") && u.active) : [];

  if (isOwner || (isGM && actorOwners.length === 0)) {
    btn.style.display = "block";
  } else {
    btn.style.display = "none";
  }
}

// Hooks
Hooks.on("createCombat", (combat) => updateTokenBar(combat));
Hooks.on("updateCombat", (combat, changed) => {
  updateTokenBar(combat);
});
Hooks.on("deleteCombat", () => {
  const bar = document.getElementById("cyberpunker-bar");
  if (bar) bar.remove();
});

Hooks.on("combatStart", async (combat) => {
  if (!game.settings.get(MODULE_ID, "autoRollInitiative")) return;
  const unrolled = combat.combatants.filter(c => c.initiative === null);
  if (!unrolled.length) return;
  await combat.rollInitiative(unrolled.map(c => c.id));
});

Hooks.on("combatTurn", (combat, updateData) => {
  const current = combat.combatant;
  if (current) showTurnSpotlight(current);
  updateTokenBar(combat);
});

// End turn hotkey
window.addEventListener("keydown", (ev) => {
  const key = game.settings.get(MODULE_ID, "endTurnKey")?.toUpperCase() || "E";
  if (ev.key.toUpperCase() === key) {
    tryEndTurn();
  }
});
