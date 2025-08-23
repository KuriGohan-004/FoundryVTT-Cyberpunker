// File: cyberpunker-combat_ready.js

class CyberpunkerCombatControls {
  static ID = "cyberpunker-red";

  static init() {
    this.createGMButton();

    // Hooks
    Hooks.on("combatStart", () => this.onCombatStart());
    Hooks.on("deleteCombat", () => this.onCombatEnd());
    Hooks.on("updateCombat", () => this.onCombatUpdate());
  }

  // --- GM Button ---
  static createGMButton() {
    const btn = document.createElement("div");
    btn.id = "cyberpunker-combat-toggle";
    btn.innerText = "⚔️ Combat";
    btn.style.position = "absolute";
    btn.style.left = "5px";
    btn.style.bottom = "5px";
    btn.style.width = "80px";
    btn.style.height = "28px"; // shorter button
    btn.style.lineHeight = "28px";
    btn.style.textAlign = "center";
    btn.style.background = "black";
    btn.style.border = "1px solid red";
    btn.style.color = "red";
    btn.style.fontFamily = "monospace";
    btn.style.cursor = "pointer";
    btn.style.zIndex = 200;
    btn.style.textShadow = "0 0 6px red";
    btn.style.borderRadius = "6px";

    btn.addEventListener("click", () => this.toggleCombat());

    document.body.appendChild(btn);
  }

  static async toggleCombat() {
    const combat = game.combats.active;

    if (combat) {
      // End combat
      await combat.delete();
    } else {
      // Collect selected tokens and add them to combat
      const tokens = canvas.tokens.controlled;
      if (!tokens.length) {
        ui.notifications.warn("Select tokens to start combat.");
        return;
      }

      const combatDoc = await Combat.create({ scene: canvas.scene.id });
      await combatDoc.createEmbeddedDocuments(
        "Combatant",
        tokens.map(t => ({ tokenId: t.id }))
      );
      await combatDoc.startCombat();
    }
  }

  // --- Red Fade ---
  static addRedFade() {
    if (document.getElementById("cyberpunker-red-fade")) return;

    const fade = document.createElement("div");
    fade.id = "cyberpunker-red-fade";
    fade.style.position = "absolute";
    fade.style.top = "0";
    fade.style.left = "0";
    fade.style.width = "100%";
    fade.style.height = "5%";
    fade.style.background = "linear-gradient(to bottom, rgba(255,0,0,0.6), rgba(255,0,0,0))";
    fade.style.zIndex = 99; // just beneath carousel bar
    fade.style.pointerEvents = "none";
    document.body.appendChild(fade);
  }

  static removeRedFade() {
    const fade = document.getElementById("cyberpunker-red-fade");
    if (fade) fade.remove();
  }

  // --- Hooks ---
  static onCombatStart() {
    // Only add fade if there are player-owned tokens
    const combat = game.combats.active;
    if (!combat) return;

    const hasPlayerOwned = combat.combatants.some(c => {
      const actor = c.actor;
      return actor && game.users.some(u =>
        u.role >= CONST.USER_ROLES.PLAYER &&
        actor.ownership[u.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
    });

    if (hasPlayerOwned) this.addRedFade();

    // Hide the non-combat bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "none";
  }

  static onCombatEnd() {
    this.removeRedFade();

    // Restore non-combat bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "flex";
  }

  static onCombatUpdate(combat, changes, options, userId) {
    if (combat.round === 0 && combat.turn === 0) {
      this.onCombatStart();
    }
  }
}

// Init
Hooks.once("ready", () => {
  if (game.user.isGM) CyberpunkerCombatControls.init();
});
