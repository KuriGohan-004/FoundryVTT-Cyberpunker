class CyberpunkerRed {
  static ID = "cyberpunker-red";
  static BAR_ID = "cyberpunker-red-carousel";

  static init() {
    game.settings.register(this.ID, "enableCarousel", {
      name: "Enable Combat Carousel",
      hint: "Show the combat carousel when combat starts.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register(this.ID, "rightPortraits", {
      name: "Number of Right-Side Portraits",
      hint: "How many combatants to display to the right of the current turn.",
      scope: "world",
      config: true,
      type: Number,
      default: 4
    });

    game.settings.register(this.ID, "leftPortraits", {
      name: "Number of Left-Side Portraits",
      hint: "How many combatants to display to the left of the current turn.",
      scope: "world",
      config: true,
      type: Number,
      default: 1
    });

    game.settings.register(this.ID, "centerMode", {
      name: "Center Camera on Turn Start",
      hint: "Decide when the camera should center on the active token at the start of its turn.",
      scope: "world",
      config: true,
      type: String,
      default: "owned",
      choices: {
        off: "Off",
        owned: "Owned",
        party: "Party",
        all: "All"
      }
    });

    Hooks.on("combatStart", this.onCombatStart.bind(this));
    Hooks.on("combatTurn", this.onCombatTurn.bind(this));
    Hooks.on("combatEnd", this.onCombatEnd.bind(this));

    // Keyboard shortcut for ending turn
    document.addEventListener("keydown", (ev) => {
      if (ev.key.toLowerCase() === "e") {
        this.tryEndTurn();
      }
    });
  }

  static onCombatStart(combat) {
    if (!game.settings.get(this.ID, "enableCarousel")) return;
    this.renderCarousel(combat);
  }

  static onCombatTurn(combat, updateData) {
    if (!game.settings.get(this.ID, "enableCarousel")) return;
    this.renderCarousel(combat);

    // Center camera on start of turn based on GM setting
    const combatant = combat.combatant;
    if (combatant?.token?.object) {
      if (this.shouldCenterOn(combatant)) {
        canvas.animatePan({ x: combatant.token.object.x, y: combatant.token.object.y });
      }
    }
  }

  static onCombatEnd() {
    const bar = document.getElementById(this.BAR_ID);
    if (bar) bar.remove();
  }

  static shouldCenterOn(combatant) {
    const mode = game.settings.get(this.ID, "centerMode");
    const isGM = game.user.isGM;
    const actor = combatant.actor;

    if (!actor) return false;

    // Does this actor have *any* player ownership (online or offline)?
    const ownedByPlayer = game.users.some(u => actor.ownership?.[u.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);

    switch (mode) {
      case "off":
        return false;

      case "owned":
        return isGM ? true : actor.isOwner;

      case "party":
        return isGM ? true : (actor.isOwner || ownedByPlayer);

      case "all":
        return true;

      default:
        return false;
    }
  }

  static renderCarousel(combat) {
    let bar = document.getElementById(this.BAR_ID);
    if (!bar) {
      bar = document.createElement("div");
      bar.id = this.BAR_ID;
      Object.assign(bar.style, {
        position: "fixed",
        top: "5px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        zIndex: 100,
        pointerEvents: "auto"
      });
      document.body.appendChild(bar);
    }
    bar.innerHTML = "";

    const currentIndex = combat.turn;
    const combatants = combat.turns;
    if (!combatants.length) return;

    const leftCount = game.settings.get(this.ID, "leftPortraits");
    const rightCount = game.settings.get(this.ID, "rightPortraits");

    const indices = [];
    for (let i = currentIndex - leftCount; i <= currentIndex + rightCount; i++) {
      if (i < 0 || i >= combatants.length) continue;
      indices.push(i);
    }

    for (let idx of indices) {
      const combatant = combatants[idx];
      const img = document.createElement("img");
      img.src = combatant.token?.texture?.src || combatant.actor?.img || "";
      img.draggable = false;
      Object.assign(img.style, {
        width: idx === currentIndex ? "96px" : "48px",
        height: idx === currentIndex ? "96px" : "48px",
        objectFit: "cover",
        border: idx === currentIndex ? "4px solid red" : "2px solid gray",
        boxShadow: idx === currentIndex ? "0 0 10px red" : "",
        transition: "all 0.2s",
        cursor: "pointer"
      });

      img.addEventListener("click", () => {
        if (combatant.token?.object) {
          canvas.animatePan({
            x: combatant.token.object.x,
            y: combatant.token.object.y
          });
        }
      });

      img.addEventListener("dblclick", () => {
        if (combatant.actor?.sheet?.rendered) {
          combatant.actor.sheet.maximize();
        } else {
          combatant.actor?.sheet?.render(true);
        }
      });

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";

      container.appendChild(img);

      // End Turn button under current token portrait
      if (idx === currentIndex) {
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
            cursor: "pointer",
            opacity: "0.9",
            animation: "cyberpunker-pulse 2s infinite"
          });
          btn.addEventListener("click", () => this.tryEndTurn());
          container.appendChild(btn);

          // Inject pulse animation style once
          if (!document.getElementById("cyberpunker-pulse-style")) {
            const style = document.createElement("style");
            style.id = "cyberpunker-pulse-style";
            style.textContent = `
              @keyframes cyberpunker-pulse {
                0%   { opacity: 0.9; }
                50%  { opacity: 0.5; }
                100% { opacity: 0.9; }
              }
            `;
            document.head.appendChild(style);
          }
        }
      }

      bar.appendChild(container);
    }

    // Right-side arrow if more combatants remain
    if (currentIndex + rightCount < combatants.length - 1) {
      const arrow = document.createElement("div");
      arrow.innerText = "➤";
      Object.assign(arrow.style, {
        fontSize: "32px",
        color: "white",
        textShadow: "0 0 8px red",
        filter: "drop-shadow(0 0 4px red)"
      });
      bar.appendChild(arrow);
    }
  }

  static canEndTurn(combatant) {
    const isGM = game.user.isGM;
    if (isGM) {
      // GM restriction: if owned by player or trusted player who is online, don't show button
      const owners = game.users.filter(
        u => u.active && (u.role >= CONST.USER_ROLES.PLAYER) && combatant.actor?.ownership?.[u.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
      if (owners.length > 0) return false;
      return true;
    } else {
      return combatant.actor?.isOwner;
    }
  }

  static async tryEndTurn() {
    const combat = game.combat;
    if (!combat) return;
    const combatant = combat.combatant;
    if (!combatant) return;
    if (!this.canEndTurn(combatant)) return;
    await combat.nextTurn();
  }
}

Hooks.once("init", () => {
  CyberpunkerRed.init();
});
