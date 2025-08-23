class CyberpunkerCombatManager {
  static ID = "cyberpunker-combat-manager";
  static FADE_ID = "cyberpunker-red-fade";
  static BUTTON_ID = "cyberpunker-combat-btn";

  static init() {
    // Hooks
    Hooks.on("combatStart", this.onCombatStart.bind(this));
    Hooks.on("combatEnd", this.onCombatEnd.bind(this));
    Hooks.on("renderSidebarTab", this.onRenderSidebarTab.bind(this));
  }

  // When combat begins
  static onCombatStart(combat) {
    this.addRedFade();
    this.updateButton(true);
  }

  // When combat ends
  static onCombatEnd(combat) {
    this.removeRedFade();
    this.updateButton(false);
  }

  // Add the GM button at bottom of left sidebar
  static onRenderSidebarTab(app, html) {
    if (!game.user.isGM) return;

    // Avoid duplicates
    if (document.getElementById(this.BUTTON_ID)) return;

    const btn = document.createElement("button");
    btn.id = this.BUTTON_ID;
    btn.innerText = "⚔️ Start Combat";
    Object.assign(btn.style, {
      background: "black",
      color: "red",
      border: "2px solid red",
      borderRadius: "6px",
      fontWeight: "bold",
      textShadow: "0 0 5px red",
      margin: "4px 6px",
      padding: "6px 10px",
      cursor: "pointer",
      width: "calc(100% - 12px)"
    });

    btn.addEventListener("click", () => this.toggleCombat());

    // Append to bottom of left sidebar
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      sidebar.appendChild(btn);
    }

    // Sync initial state
    this.updateButton(!!game.combat);
  }

  // Adds a red fade at top 5% of screen
  static addRedFade() {
    if (document.getElementById(this.FADE_ID)) return;

    const fade = document.createElement("div");
    fade.id = this.FADE_ID;
    Object.assign(fade.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "5%",
      background: "linear-gradient(to bottom, rgba(255,0,0,0.6), rgba(0,0,0,0))",
      pointerEvents: "none",
      zIndex: 50 // beneath carousel (which uses 100)
    });

    document.body.appendChild(fade);
  }

  // Removes red fade
  static removeRedFade() {
    const fade = document.getElementById(this.FADE_ID);
    if (fade) fade.remove();
  }

  // Toggle combat state
  static async toggleCombat() {
    const combat = game.combat;

    if (combat) {
      // End combat
      await combat.endCombat();
      return;
    }

    // No combat exists → add selected tokens & start new combat
    const tokens = canvas.tokens.controlled;
    if (!tokens.length) {
      ui.notifications.warn("Select at least one token to start combat.");
      return;
    }

    let cbt = game.combats.active;
    if (!cbt) {
      cbt = await Combat.create({ scene: canvas.scene.id });
    }

    for (let token of tokens) {
      if (!cbt.combatants.find(c => c.tokenId === token.id)) {
        await cbt.createEmbeddedDocuments("Combatant", [{ tokenId: token.id }]);
      }
    }

    await cbt.startCombat();
  }

  // Update button label depending on state
  static updateButton(isInCombat) {
    const btn = document.getElementById(this.BUTTON_ID);
    if (!btn) return;
    btn.innerText = isInCombat ? "✖️ End Combat" : "⚔️ Start Combat";
  }
}

Hooks.once("init", () => {
  CyberpunkerCombatManager.init();
});
