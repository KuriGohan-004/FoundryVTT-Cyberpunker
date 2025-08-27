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



    // --- Auto-select token on turn start (improved) ---
  // NOTE: This assumes you already registered the TURN_SETTING constant earlier in the script.
  Hooks.on("combatTurn", (combat, updateData) => {
    // Respect the client setting
    if (!game.settings.get(MODULE_ID, TURN_SETTING)) return;

    // Prefer the incoming turn index provided by the hook; fallback to combat.turn
    const turnIndex = (updateData && typeof updateData.turn === "number") ? updateData.turn : combat.turn;
    const turnData = combat.turns?.[turnIndex];
    const combatantId = turnData?.id;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    // Find the token on the current canvas for this combatant
    const tokenId = combatant.tokenId ?? combatant.token?.id;
    const token = tokenId ? canvas.tokens.get(tokenId) : (combatant.token?.object ?? null);
    if (!token) return;

    // Allow selection for GMs (so NPCs get selected) OR for users who have OBSERVER on the actor
    const actor = combatant.actor;
    const canSelect = game.user.isGM || (actor && actor.testUserPermission(game.user, "OBSERVER"));
    if (!canSelect) return;

    // Clear other selections and select this token
    canvas.tokens.releaseAll();
    token.control({ releaseOthers: true });
  });



  
})();
