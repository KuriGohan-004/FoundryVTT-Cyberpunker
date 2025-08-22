class CyberpunkerTokenBar {
  static init() {
    // Create container
    const bar = document.createElement("div");
    bar.id = "cyberpunker-token-bar";
    bar.style.position = "absolute";
    bar.style.top = "5px";
    bar.style.left = "50%";
    bar.style.transform = "translateX(-50%)";
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.zIndex = 100;
    bar.style.padding = "4px";
    bar.style.pointerEvents = "auto";
    document.body.appendChild(bar);

    // Register settings
    game.settings.register("cyberpunker-red", "sheetHotkey", {
      name: "Sheet Toggle Hotkey",
      hint: "Press this key to toggle the sheet of your currently selected token.",
      scope: "client",
      config: true,
      type: String,
      default: "Tab"
    });

    // Hotkey listener
    window.addEventListener("keydown", ev => {
      const settingKey = game.settings.get("cyberpunker-red", "sheetHotkey").toLowerCase();
      if (ev.key.toLowerCase() === settingKey) {
        CyberpunkerTokenBar.toggleSelectedSheet();
      }
    });

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

    // Get tokens in current scene
    const scene = game.scenes?.current;
    if (!scene) return;

    const tokens = scene.tokens.filter(t => {
      const actor = t.actor;
      if (!actor) return false;
      // If ANY player has at least OWNER level, include it
      return game.users.some(u =>
        (u.role >= CONST.USER_ROLES.PLAYER) &&
        (actor.ownership[u.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
      );
    });

    // Render tokens
    for (const token of tokens) {
      const img = document.createElement("img");
      img.src = token.texture.src;
      img.style.maxWidth = "64px";
      img.style.maxHeight = "64px";
      img.style.objectFit = "contain";
      img.style.border = "1px solid #ff0044"; // cyberpunk accent
      img.style.cursor = "pointer";

      // Left-click: focus camera + select if allowed
      img.addEventListener("click", ev => {
        ev.preventDefault();
        canvas.animatePan({ x: token.x, y: token.y, scale: 1.5 });

        const isGM = game.user.isGM || game.user.role >= CONST.USER_ROLES.ASSISTANT;
        const canControl = isGM || token.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        if (canControl) {
          token.object?.control({ releaseOthers: true });
        }
      });

      // Right-click: open sheet
      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        token.actor?.sheet?.render(true);
      });

      bar.appendChild(img);
    }
  }

  // Toggle Sheet Controls
  static toggleSelectedSheet() {
    const selected = canvas.tokens.controlled;
    if (!selected.length) return;

    // Find first selected token you can at least observe
    const token = selected.find(t =>
      game.user.isGM ||
      t.actor?.ownership[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    );
    if (!token) return;

    const sheet = token.actor?.sheet;
    if (!sheet) return;

    if (sheet.rendered) sheet.close();
    else sheet.render(true);
  }
}



// Initialize when ready - End Of Script
Hooks.once("ready", () => {
  CyberpunkerTokenBar.init();
});
