class CyberpunkerRedCarousel {
  static ID = "cyberpunker-red";
  static carousel = null;

  static init() {
    Hooks.on("ready", () => {
      // Ensure carousel shows for late joiners if combat is active
      if (game.combat) this.renderCarousel();
    });

    Hooks.on("deleteCombat", () => this.removeCarousel());
    Hooks.on("combatStart", () => this.renderCarousel());
    Hooks.on("combatEnd", () => this.removeCarousel());

    // Keep carousel updated each turn
    Hooks.on("updateCombat", () => this.renderCarousel());
    Hooks.on("updateCombatant", () => this.renderCarousel());
  }

  static renderCarousel() {
    this.removeCarousel();

    const combat = game.combat;
    if (!combat) return;

    const turn = combat.turn;
    const combatants = combat.turns;
    if (!combatants.length) return;

    // Create container
    const container = document.createElement("div");
    container.id = `${this.ID}-carousel`;
    Object.assign(container.style, {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "10px",
      alignItems: "center",
      zIndex: 100,
      pointerEvents: "auto"
    });

    // Grab ordered list: current + next 4
    const ordered = [];
    for (let i = 0; i < 5; i++) {
      const idx = (turn + i) % combatants.length;
      ordered.push(combatants[idx]);
    }

    // Build portraits
    ordered.forEach((combatant, i) => {
      const token = combatant.token?.object;
      if (!combatant.token) return;

      const portrait = document.createElement("img");
      portrait.src = combatant.token.texture.src;
      portrait.draggable = false;
      portrait.dataset.combatantId = combatant.id;

      Object.assign(portrait.style, {
        borderRadius: "50%",
        cursor: "pointer",
        transition: "all 0.2s ease",
        width: i === 0 ? "100px" : "50px",
        height: i === 0 ? "100px" : "50px",
        border: i === 0 ? "3px solid red" : "2px solid #444",
        boxShadow: i === 0 ? "0 0 20px red" : "none",
        objectFit: "cover"
      });

      // Click to pan camera
      portrait.addEventListener("click", () => {
        const t = canvas.tokens.get(combatant.token.id);
        if (t) canvas.animatePan({ x: t.x, y: t.y, scale: 1.5 });
      });

      // Double-click to open sheet
      portrait.addEventListener("dblclick", () => {
        if (combatant.actor?.sheet) combatant.actor.sheet.render(true);
      });

      container.appendChild(portrait);
    });

    document.body.appendChild(container);
    this.carousel = container;
  }

  static removeCarousel() {
    if (this.carousel) {
      this.carousel.remove();
      this.carousel = null;
    }
  }
}

Hooks.once("init", () => CyberpunkerRedCarousel.init());
