// File: cyberpunker-combat.js

class CyberpunkerCombatControls {
  static ID = "cyberpunker-red";
  static BUTTON_ID = "cyberpunker-combat-toggle";

  static init() {
    if (!game.user.isGM) return;

    Hooks.on("renderSidebarTab", this.createGMButton.bind(this));
    Hooks.on("combatStart", this.onCombatStart.bind(this));
    Hooks.on("combatEnd", this.onCombatEnd.bind(this));
    Hooks.on("deleteCombat", this.onCombatEnd.bind(this));
    Hooks.on("updateCombat", this.updateButtonState.bind(this));
  }

  static createGMButton(app, html) {
    // Avoid duplicates
    if (document.getElementById(this.BUTTON_ID)) return;

    const btn = document.createElement("button");
    btn.id = this.BUTTON_ID;
    btn.style.background = "black";
    btn.style.color = "red";
    btn.style.border = "1px solid red";
    btn.style.borderRadius = "6px";
    btn.style.fontWeight = "bold";
    btn.style.textShadow = "0 0 6px red";
    btn.style.fontFamily = "monospace";
    btn.style.cursor = "pointer";
    btn.style.width = "80px";
    btn.style.height = "28px"; // shorter button
    btn.style.margin = "4px";
    btn.style.textAlign = "center";

    btn.addEventListener("click", () => this.toggleCombat());

    // Append to bottom-left of the sidebar
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.appendChild(btn);

    // Initial label
    this.updateButtonState();
  }

  // --- Button label logic ---
  static updateButtonState() {
    const btn = document.getElementById(this.BUTTON_ID);
    if (!btn) return;

    const combat = game.combat;
    if (combat) btn.innerText = "✖️ End Combat";
    else btn.innerText = "⚔️ Start Combat";
  }

  // --- Red fade ---
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
    fade.style.zIndex = 99;
    fade.style.pointerEvents = "none";
    document.body.appendChild(fade);
  }

  static removeRedFade() {
    const fade = document.getElementById("cyberpunker-red-fade");
    if (fade) fade.remove();
  }

  // --- Combat actions ---
  static async toggleCombat() {
    const combat = game.combat;

    if (combat) {
      // End combat
      await combat.delete();
    } else {
      // Start combat with selected tokens
      const tokens = canvas.tokens.controlled;
      if (!tokens.length) {
        ui.notifications.warn("Select tokens to start combat.");
        return;
      }

      const newCombat = await Combat.create({ scene: canvas.scene.id });
      await newCombat.createEmbeddedDocuments(
        "Combatant",
        tokens.map(t => ({ tokenId: t.id }))
      );
      await newCombat.startCombat();
    }

    // Update button label after change
    this.updateButtonState();
  }

  static onCombatStart() {
    this.addRedFade();

    // Hide non-combat bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "none";

    this.updateButtonState();
  }

  static onCombatEnd() {
    this.removeRedFade();

    // Restore non-combat bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "flex";

    this.updateButtonState();
  }
}

Hooks.once("ready", () => {
  CyberpunkerCombatControls.init();
});
