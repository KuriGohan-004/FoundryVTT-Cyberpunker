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
    btn.innerText = "Select All Tokens";

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

    btn.addEventListener("click", () => this.selectAllTokens());

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.appendChild(btn);
  }

  static selectAllTokens() {
    const allTokens = canvas.tokens.placeables;
    if (!allTokens.length) return;

    // Deselect everything first
    canvas.tokens.releaseAll();

    // Select all tokens on the map
    for (const token of allTokens) {
      token.control({ releaseOthers: false });
    }

    // Open the Combat/Encounter sidebar
    const combatSidebar = document.querySelector("#sidebar .directory[data-tab='combat']");
    if (combatSidebar) combatSidebar.click();
  }

  static onCombatStart() {
    // Hide non-combat portrait bar if it exists
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
