class CyberpunkerRedCarousel {
  static ID = "cyberpunker-red";
  static carousel = null;

  static init() {
    // Register settings
    game.settings.register(this.ID, "showCarousel", {
      name: "Show Combat Carousel",
      hint: "Enable or disable the combat carousel bar (GM only).",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "sidePortraits", {
      name: "Right-Side Portraits",
      hint: "How many portraits to show to the right of the active combatant.",
      scope: "world",
      config: true,
      type: Number,
      default: 2
    });

    game.settings.register(this.ID, "leftPortraits", {
      name: "Left-Side Portraits",
      hint: "How many portraits to show to the left of the active combatant.",
      scope: "world",
      config: true,
      type: Number,
      default: 1
    });

    Hooks.on("ready", () => {
      if (game.combat && game.settings.get(this.ID, "showCarousel")) {
        this.renderCarousel();
      }
    });

    Hooks.on("deleteCombat", () => this.removeCarousel());
    Hooks.on("combatStart", () => {
      if (game.settings.get(this.ID, "showCarousel")) this.renderCarousel();
    });
    Hooks.on("combatEnd", () => this.removeCarousel());
    Hooks.on("updateCombat", () => {
      if (game.settings.get(this.ID, "showCarousel")) this.renderCarousel();
    });
    Hooks.on("updateCombatant", () => {
      if (game.settings.get(this.ID, "showCarousel")) this.renderCarousel();
    });

    // Keybind: End Turn with "E"
    window.addEventListener("keydown", (ev) => {
      if (ev.key.toLowerCase() === "e") {
        this.tryEndTurn();
      }
    });
  }

  static renderCarousel() {
    this.removeCarousel();

    if (!game.settings.get(this.ID, "showCarousel")) return;

    const combat = game.combat;
    if (!combat) return;

    const turn = combat.turn;
    const combatants = combat.turns;
    if (!combatants.length) return;

    const rightCount = game.settings.get(this.ID, "sidePortraits") || 2;
    const leftCount = game.settings.get(this.ID, "leftPortraits") || 1;

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
      alignItems: "flex-start",
      zIndex: 100,
      pointerEvents: "auto"
    });

    // Collect combatants: left side + current + right side
    const ordered = [];

    // Left side (previous turns)
    for (let i = leftCount; i > 0; i--) {
      const idx = (turn - i + combatants.length) % combatants.length;
      ordered.push({ combatant: combatants[idx], isCurrent: false });
    }

    // Current
    ordered.push({ combatant: combatants[turn], isCurrent: true });

    // Right side (future turns)
    for (let i = 1; i <= rightCount; i++) {
      const idx = (turn + i) % combatants.length;
      ordered.push({ combatant: combatants[idx], isCurrent: false });
    }

    // Build portraits
    ordered.forEach(({ combatant, isCurrent }) => {
      if (!combatant?.token) return;

      const portraitWrapper = document.createElement("div");
      portraitWrapper.style.display = "flex";
      portraitWrapper.style.flexDirection = "column";
      portraitWrapper.style.alignItems = "center";

      const portrait = document.createElement("img");
      portrait.src = combatant.token.texture.src;
      portrait.draggable = false;
      portrait.dataset.combatantId = combatant.id;

      Object.assign(portrait.style, {
        cursor: "pointer",
        transition: "all 0.2s ease",
        width: isCurrent ? "100px" : "50px",
        height: isCurrent ? "100px" : "50px",
        border: isCurrent ? "3px solid red" : "2px solid #444",
        boxShadow: isCurrent ? "0 0 15px red" : "none",
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

      portraitWrapper.appendChild(portrait);

      // Add End Turn button for current token if conditions are met
      if (isCurrent) {
        if (this.canEndTurn(combatant)) {
          const btn = document.createElement("button");
          btn.innerText = "End Turn";
          Object.assign(btn.style, {
            marginTop: "5px",
            padding: "2px 8px",
            background: "black",
            color: "red",
            border: "2px solid red",
            borderRadius: "4px",
            fontWeight: "bold",
            textShadow: "0 0 5px red",
            cursor: "pointer"
          });

          btn.addEventListener("click", () => {
            combat?.nextTurn();
          });

          portraitWrapper.appendChild(btn);
        }
      }

      container.appendChild(portraitWrapper);
    });

    // Add right arrow if more combatants exist
    const totalShown = 1 + leftCount + rightCount;
    if (combatants.length > totalShown) {
      const arrow = document.createElement("div");
      arrow.innerText = "▶";
      Object.assign(arrow.style, {
        fontSize: "32px",
        alignSelf: "center",
        padding: "0 5px",
        color: "red",
        border: "2px solid red",
        borderRadius: "4px",
        textShadow: "0 0 5px red"
      });
      container.appendChild(arrow);
    }

    document.body.appendChild(container);
    this.carousel = container;
  }

  static removeCarousel() {
    if (this.carousel) {
      this.carousel.remove();
      this.carousel = null;
    }
  }

  static canEndTurn(combatant) {
    const actor = combatant?.actor;
    if (!actor) return false;

    const isGM = game.user.isGM;
    const isOwner = actor.isOwner;

    // Check if some non-GM online owner exists
    const owners = actor.ownership || {};
    const hasOnlineOwner = Object.entries(owners).some(([userId, level]) => {
      const u = game.users.get(userId);
      return u?.active && level >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER && !u.isGM;
    });

    if ((isOwner && !isGM) || (isGM && !hasOnlineOwner)) return true;
    return false;
  }

  static tryEndTurn() {
    const combat = game.combat;
    if (!combat) return;
    const combatant = combat.combatant;
    if (combatant && this.canEndTurn(combatant)) {
      combat.nextTurn();
    }
  }
}

Hooks.once("init", () => CyberpunkerRedCarousel.init());
