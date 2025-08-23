// File: cyberpunker-combat.js

class CyberpunkerCombatControls {
  static BUTTON_ID = "cyberpunker-combat-toggle";

  static init() {
    if (!game.user.isGM) return;

    Hooks.on("renderSidebarTab", this.createGMButton.bind(this));
    Hooks.on("combatStart", this.onCombatStart.bind(this));
    Hooks.on("combatEnd", this.onCombatEnd.bind(this));
    Hooks.on("deleteCombat", this.onCombatEnd.bind(this));
  }

  static createGMButton() {
    if (document.getElementById(this.BUTTON_ID)) return;

    const btn = document.createElement("button");
    btn.id = this.BUTTON_ID;
    btn.innerText = game.combat ? "End Combat" : "Ready Combat";

    Object.assign(btn.style, {
      background: "black",
      color: "red",
      border: "1px solid red",
      borderRadius: "6px",
      fontWeight: "bold",
      textShadow: "0 0 6px red",
      fontFamily: "monospace",
      cursor: "pointer",
      width: "calc(100% - 8px)",
      height: "20px",
      maxHeight: "3vh",
      padding: "2px",
      margin: "4px",
      textAlign: "center",
      overflow: "hidden"
    });

    btn.addEventListener("click", () => this.toggleCombat(btn));

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.appendChild(btn);
  }

  static async toggleCombat(button) {
    if (game.combat) {
      this.endCombat();
      button.innerText = "Ready Combat";
    } else {
      await this.readyCombat();
      button.innerText = "End Combat";
    }
  }

  static async readyCombat() {
    const tokens = canvas.tokens.placeables;
    if (!tokens.length) return;

    // Deselect all first
    canvas.tokens.releaseAll();

    // Select all tokens
    for (const token of tokens) {
      token.control({ releaseOthers: false });
    }

    // Switch to Combat Encounters tab
    const combatTab = document.querySelector("#sidebar .directory[data-tab='combat']");
    if (combatTab) combatTab.click();

    // Wait a short moment to ensure tokens are selected
    await new Promise(r => setTimeout(r, 50));

    const selectedTokens = canvas.tokens.controlled;
    if (!selectedTokens.length) {
      ui.notifications.warn("No tokens selected to add to combat.");
      return;
    }

    // Create new combat
    const newCombat = await Combat.create({ scene: canvas.scene.id });

    // Add all selected tokens as combatants
    await newCombat.createEmbeddedDocuments(
      "Combatant",
      selectedTokens.map(t => ({ tokenId: t.id }))
    );

    ui.notifications.info(`Ready Combat: Added ${selectedTokens.length} tokens to new encounter.`);
  }

  static endCombat() {
    if (game.combat) {
      game.combat.endCombat();
    }
  }

  static onCombatStart() {
    // Hide non-combat portrait bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "none";

    // Add red fade
    if (!document.getElementById("cyberpunker-red-fade")) {
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
  }

  static onCombatEnd() {
    // Restore non-combat bar
    const bar = document.getElementById("cyberpunker-token-bar");
    if (bar) bar.style.display = "flex";

    // Remove red fade
    const fade = document.getElementById("cyberpunker-red-fade");
    if (fade) fade.remove();
  }
}

Hooks.once("ready", () => {
  CyberpunkerCombatControls.init();
});
