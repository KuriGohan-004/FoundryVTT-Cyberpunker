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
  bar.innerHTML = "";

  if (!combat || !combat.combatants.size) return;

  const currentIndex = combat.turn ?? 0;
  const ordered = combat.turns;

  // Limit window to current +/- 4
  const start = Math.max(0, currentIndex - 4);
  const end = Math.min(ordered.length, currentIndex + 5);

  if (start > 0) bar.appendChild(createArrow("left", combat));

  for (let i = start; i < end; i++) {
    const combatant = ordered[i];
    const token = combatant.token;
    if (!token) continue;

    const img = document.createElement("img");
    img.src = token.texture.src;
    img.style.width = "48px";
    img.style.height = "48px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.style.transition = "all 0.2s ease";
    img.style.cursor = "pointer";

    if (i === currentIndex) {
      img.style.boxShadow = "0 0 12px 3px red";
      img.style.transform = "scale(1.1)";
    }

    // Click to select & center
    img.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const tokenDoc = canvas.tokens.get(token.id);
      if (tokenDoc && tokenDoc.isOwner) {
        tokenDoc.control({ releaseOthers: true });
        canvas.animatePan({ x: tokenDoc.x, y: tokenDoc.y, scale: canvas.stage.scale.x });
      }
    });

    // Double click or right click to open sheet
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
}

Hooks.on("createCombat", (combat) => updateTokenBar(combat));
Hooks.on("updateCombat", (combat, changed) => updateTokenBar(combat));
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
