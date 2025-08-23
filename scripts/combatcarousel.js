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
      name: "Side Portraits",
      hint: "How many portraits to show to the side of the active combatant.",
      scope: "world",
      config: true,
      type: Number,
      default: 2
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
  }

  static renderCarousel() {
    this.removeCarousel();

    if (!game.settings.get(this.ID, "showCarousel")) return;

    const combat = game.combat;
    if (!combat) return;

    const turn = combat.turn;
    const combatants = combat.turns;
    if (!combatants.length) return;

    const sideCount = game.settings.get(this.ID, "sidePortraits") || 2;

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

    // Grab ordered list: current + sideCount
    const ordered = [];
    const totalToShow = 1 + sideCount;
    for (let i = 0; i < totalToShow; i++) {
      const idx = (turn + i) % combatants.length;
      ordered.push(combatants[idx]);
    }

    // Build portraits
    ordered.forEach((combatant, i) => {
      if (!combatant.token) return;

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
        width: i === 0 ? "100px" : "50px",
        height: i === 0 ? "100px" : "50px",
        border: i === 0 ? "3px solid red" : "2px solid #444",
        boxShadow: i === 0 ? "0 0 15px red" : "none",
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

      // Add End Turn button if conditions are met
      if (i === 0) {
        const actor = combatant.actor;
        const isGM = game.user.isGM;
        const isOwner = actor?.isOwner;
        const owners = actor?.ownership || {};
        const hasOnlineOwner = Object.entries(owners).some(([userId, level]) => {
          const u = game.users.get(userId);
          return u?.active && level >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER && !u.isGM;
        });

        if ((isOwner && !isGM) || (isGM && !hasOnlineOwner)) {
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
    if (combatants.length > totalToShow) {
      const arrow = document.createElement("div");
      arrow.innerText = "➡️";
      Object.assign(arrow.style, {
        fontSize: "32px",
        alignSelf: "center",
        textShadow: "0 0 5px black"
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
}

Hooks.once("init", () => CyberpunkerRedCarousel.init());
