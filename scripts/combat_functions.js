// File: scripts/bar1-death-handler.js
(() => {
  const MODULE_ID = "cyberpunker-red";
  const SETTING_KEY = "enableBar1DeathHandler";
  const DEAD_TINT = "#ff0000";

  // --- Settings ---
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, SETTING_KEY, {
      name: "Enable Bar 1 Death Handler",
      hint: "When a token’s Bar 1 resource reaches 0 or below, tint it red, add/remove the 'Dead' status effect, and (if unowned) remove it from active combat.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });
  });

  // --- Helpers ---
  function getBar1Path(tokenDoc) {
    const attr = tokenDoc?.bar1?.attribute;
    if (!attr || typeof attr !== "string" || !attr.trim()) return null;
    return attr.startsWith("system.") ? attr : `system.${attr}`;
  }

  function getNumericAtPath(actor, path) {
    const raw =
      foundry.utils.getProperty(actor, path) ??
      foundry.utils.getProperty(actor, `${path}.value`) ??
      foundry.utils.getProperty(actor, `${path}.current`);
    if (raw == null) return null;
    if (typeof raw === "object") {
      const v = raw.value ?? raw.current ?? raw.hp ?? null;
      return v == null ? null : Number(v);
    }
    return Number(raw);
  }

  function isUnownedByPlayers(actor) {
    return !actor?.hasPlayerOwner;
  }

  /** Apply/remove "Dead" status effect and tint based on Bar1 <= 0 */
  async function applyDeathState(token, isDead) {
    const doc = token.document;

    // --- Tint ---
    const currentTint = doc.texture?.tint ?? null;
    if (isDead && currentTint !== DEAD_TINT) {
      await doc.update({ "texture.tint": DEAD_TINT });
    } else if (!isDead && currentTint) {
      await doc.update({ "texture.tint": null });
    }

    // --- Dead status effect ---
    const hasDead = token.actor?.statuses?.has("dead");
    const deadEffect = CONFIG.statusEffects.find(e => e.id === "dead");
    if (!deadEffect) {
      console.warn(`${MODULE_ID} | Could not find 'dead' status effect in CONFIG.statusEffects`);
    } else {
      if (isDead && !hasDead) {
        await token.toggleEffect(deadEffect);
      } else if (!isDead && hasDead) {
        await token.toggleEffect(deadEffect);
      }
    }

    // --- Remove from combat if dead + unowned ---
    if (isDead && isUnownedByPlayers(token.actor) && game.combat?.active && token.combatant) {
      try {
        await token.combatant.delete();
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to remove combatant for token ${token.id}:`, e);
      }
    }
  }

  async function evaluateTokenByBar1(token) {
    if (!token?.actor) return;
    const barPath = getBar1Path(token.document);
    if (!barPath) return;

    const value = getNumericAtPath(token.actor, barPath);
    if (value == null || Number.isNaN(value)) return;

    const isDead = value <= 0;
    await applyDeathState(token, isDead);
  }

  async function evaluateActorTokens(actor) {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    const tokens = actor.getActiveTokens(true);
    for (const token of tokens) {
      await evaluateTokenByBar1(token);
    }
  }

  // --- Hooks ---
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    for (const token of canvas.tokens.placeables) {
      await evaluateTokenByBar1(token);
    }
  });

  Hooks.on("updateActor", async (actor, _changes, _options, _userId) => {
    await evaluateActorTokens(actor);
  });

  Hooks.on("updateToken", async (tokenDoc, changes, _options, _userId) => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    if (foundry.utils.hasProperty(changes, "bar1.attribute")) {
      const token = tokenDoc.object;
      if (token) await evaluateTokenByBar1(token);
    }
  });

  Hooks.on("createToken", async (tokenDoc, _data, _options, _userId) => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    const token = tokenDoc.object;
    if (token) await evaluateTokenByBar1(token);
  });


// Select the new combatanttt rawr! //

  let lastActiveCombatantId = null;

Hooks.on("updateCombat", async (combat, changed, options, userId) => {
  // Only proceed if the active combatant changed
  if (!("turn" in changed || "round" in changed)) return;

  const activeCombatant = combat.combatant;
  if (!activeCombatant) return;

  // Check if it's a new combatant
  if (activeCombatant.id === lastActiveCombatantId) return;
  lastActiveCombatantId = activeCombatant.id;

  // Get the token linked to the active combatant
  const token = canvas.tokens.get(activeCombatant.token?.id);
  if (token && token.isOwner) {
    token.control({ releaseOthers: true });
  }
});

              //    Disable the click-drag     //
// --- Settings for disabling token movement in combat ---
const DISABLE_MOVEMENT_KEY = "disableTokenMoveInCombat";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, DISABLE_MOVEMENT_KEY, {
    name: "Disable Token Movement During Combat",
    hint: "Prevents tokens from being clicked or dragged while a combat encounter is active.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

// --- Helper ---
function isMovementDisabled() {
  return game.settings.get(MODULE_ID, DISABLE_MOVEMENT_KEY) && game.combat?.active;
}

// --- Patch Token prototype to block drag ---
Hooks.once("ready", () => {
  const originalDragStart = Token.prototype._onDragLeftStart;
  const originalDragMove = Token.prototype._onDragLeftMove;

  Token.prototype._onDragLeftStart = function(event) {
    if (!game.user.isGM && isMovementDisabled()) {
      ui.notifications.warn("Token movement is disabled during combat.");
      return; // Prevent drag from starting
    }
    return originalDragStart.call(this, event);
  };

  Token.prototype._onDragLeftMove = function(event) {
    if (!game.user.isGM && isMovementDisabled()) return; // Prevent movement while dragging
    return originalDragMove.call(this, event);
  };
});


              //    Disable move when not your turn     //
// --- Settings for turn-based movement restriction ---
const DISABLE_NOT_YOUR_TURN_KEY = "disableTokenMoveOutsideTurn";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, DISABLE_NOT_YOUR_TURN_KEY, {
    name: "Disable Token Movement Outside Your Turn",
    hint: "Prevents players from moving their tokens if it is not their turn during combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// --- Helper ---
function isMovementBlockedByTurn(token) {
  if (!game.settings.get(MODULE_ID, DISABLE_NOT_YOUR_TURN_KEY)) return false;
  if (!game.combat?.active) return false;
  if (game.user.isGM) return false; // GM can always move
  const combatant = token?.combatant;
  return combatant?.id !== game.combat?.combatant?.id;
}

// --- Patch Token drag to respect turn ---
Hooks.once("ready", () => {
  const originalDragStart = Token.prototype._onDragLeftStart;
  const originalDragMove = Token.prototype._onDragLeftMove;

  Token.prototype._onDragLeftStart = function(event) {
    if (isMovementBlockedByTurn(this)) {
      ui.notifications.warn("You can only move this token on your turn.");
      return; // Prevent drag from starting
    }
    return originalDragStart.call(this, event);
  };

  Token.prototype._onDragLeftMove = function(event) {
    if (isMovementBlockedByTurn(this)) return; // Prevent movement while dragging
    return originalDragMove.call(this, event);
  };
});



  
})();
