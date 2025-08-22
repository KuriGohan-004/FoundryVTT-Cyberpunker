class CyberpunkerTokenBar {
  static init() {
    // Create a container
    const bar = document.createElement("div");
    bar.id = "cyberpunker-token-bar";
    bar.style.position = "absolute";
    bar.style.top = "5px";
    bar.style.left = "50%";
    bar.style.transform = "translateX(-50%)";
    bar.style.display = "flex";
    bar.style.gap = "6px";
    bar.style.zIndex = 100;
    bar.style.padding = "4px";
    bar.style.pointerEvents = "auto";
    document.body.appendChild(bar);

    // Re-render on relevant hooks
    Hooks.on("updateScene", () => CyberpunkerTokenBar.render());
    Hooks.on("updateToken", () => CyberpunkerTokenBar.render());
    Hooks.on("createToken", () => CyberpunkerTokenBar.render());
    Hooks.on("deleteToken", () => CyberpunkerTokenBar.render());
    Hooks.on("updateCombat", () => CyberpunkerTokenBar.render());
    Hooks.on("deleteCombat", () => CyberpunkerTokenBar.render());
    Hooks.on("renderSceneControls", () => CyberpunkerTokenBar.render());

    CyberpunkerTokenBar.render();
  }

  static render() {
    const bar = document.getElementById("cyberpunker-token-bar");
    if (!bar) return;

    // Hide bar if turn order has tokens
    const combat = game.combats?.active;
    if (combat && combat.turns.length > 0) {
      bar.style.display = "none";
      return;
    }
    bar.style.display = "flex";

    // Clear bar
    bar.innerHTML = "";

    // Collect player-owned tokens in current scene
    const scene = game.scenes?.current;
    if (!scene) return;

    const tokens = scene.tokens.filter(t => {
      const actor = t.actor;
      if (!actor) return false;
      return actor.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    });

    // Render tokens
    for (const token of tokens) {
      const img = document.createElement("img");
      img.src = token.texture.src;
      img.style.width = "48px";
      img.style.height = "48px";
      img.style.borderRadius = "50%";
      img.style.border = "2px solid #ff0044"; // Cyberpunk-y color
      img.style.cursor = "pointer";

      // Left-click: focus camera
      img.addEventListener("click", ev => {
        ev.preventDefault();
        canvas.animatePan({ x: token.x, y: token.y, scale: 1.5 });
      });

      // Right-click: open sheet
      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        token.actor?.sheet?.render(true);
      });

      bar.appendChild(img);
    }
  }
}

// Initialize when ready
Hooks.once("ready", () => {
  CyberpunkerTokenBar.init();
});
