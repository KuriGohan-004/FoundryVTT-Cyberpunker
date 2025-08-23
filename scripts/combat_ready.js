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
    Hooks.on("updateCombat", this.onCombatUpdate.bind(this));
  }

  static createGMButton() {
    if (document.getElementById(this.BUTTON_ID)) return;

    const btn = document.createElement("button");
    btn.id = this.BUTTON_ID;
    btn.innerText = "⚔️ Combat";

    Object.assign(btn.style, {
      background: "black",
      color: "red",
      border: "1px solid red",
      borderRadius: "6px",
      fontWeight: "bold",
      textShadow: "0 0 6px red",
      fontFamily: "monospace",
      cursor: "pointer",
      width: "calc(100% - 8px)", // full width minus sidebar padding
      height: "20px",             // fixed height
      maxHeight: "3vh",
      padding: "2px",
      margin: "4px",
      textAlign: "center",
      overflow: "hidden"
    });

    btn.addEventListener("click", () => this.toggleCombat());

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.appendChild(btn);

    this.updateButtonState();
  }

  static updateButtonState() {
    const btn = document.getElementById(this.BUTTON_ID);
    if (!btn) return;
    const combat = game.combat;
    btn.innerText = combat ? "✖️ End Combat" : "⚔️ Start Combat";

    // Hide or show non-combat portrait bar appropriately
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) {
      if (combat && combat.turns.length > 0) bar.style.display = "none";
      else bar.style.display = "flex";
    }
  }

  static addRedFade() {
    if (document.getElementById("cyberpunker-red-fade")) return;

    const fade = document.createElement("div");
    fade.id = "cyberpunker-red-fade";
    Object.assign(fade.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "5%",
      background: "linear-gradient(to bottom, rgba(255,0,0,0.6), rgba(255,0,0,0))",
      zIndex: 99,
      pointerEvents: "none"
    });

    document.body.appendChild(fade);
  }

  static removeRedFade() {
    const fade = document.getElementById("cyberpunker-red-fade");
    if (fade) fade.remove();
  }

  static async toggleCombat() {
    const combat = game.combat;
    if (combat) {
      await combat.delete();
    } else {
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

      // Roll initiative for any combatant that hasn't rolled yet
      for (let c of newCombat.combatants) {
        if (c.initiative === null) await c.rollInitiative({ chatMessage: false });
      }

      // Sort combatants by initiative descending
      newCombat.turns.sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

      // Set turn to the top combatant
      await newCombat.update({ turn: 0 });

      await newCombat.startCombat();
    }

    this.updateButtonState();
  }

  static onCombatStart() {
    this.addRedFade();
    this.updateButtonState();
  }

  static onCombatEnd() {
    this.removeRedFade();
    this.updateButtonState();
  }

  static onCombatUpdate() {
    this.updateButtonState();
  }
}

Hooks.once("ready", () => {
  CyberpunkerCombatControls.init();
});
