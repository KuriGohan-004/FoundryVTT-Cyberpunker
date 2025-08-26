// File: scripts/bar1-death-handler.js
(() => {
  const MODULE_ID = "cyberpunker-red";
  const SETTING_KEY = "enableBar1DeathHandler";
  const SKULL_ICON = "icons/svg/skull.svg";
  const DEAD_TINT = "#ff0000";

  // --- Settings ---
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, SETTING_KEY, {
      name: "Enable Bar 1 Death Handler",
      hint: "When a token’s Bar 1 resource reaches 0 or below, tint it red, add a skull overlay, and (if it has no player owner) remove it from active combat.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });
  });

  // --- Helpers ---
  /** Return the dot path used by Bar 1 on this token, normalized to start with "system." */
  function getBar1Path(tokenDoc) {
    const attr = tokenDoc?.bar1?.attribute;
    if (!attr || typeof attr !== "string" || !attr.trim()) return null;
    return attr.startsWith("system.") ? attr : `system.${attr}`;
  }

  /** Resolve a numeric value at a dot path on an Actor (handles {value,max} objects or raw numbers). */
  function getNumericAtPath(actor, path) {
    // Try path, then ".value", then ".current"
    const raw = foundry.utils.getProperty(actor, path) ?? foundry.utils.getProperty(actor, `${path}.value`) ?? foundry.utils.getProperty(actor, `${path}.current`);
    if (raw == null) return null;
    if (typeof raw === "object") {
      const v = raw.value ?? raw.current ?? raw.hp ?? null;
      return v == null ? null : Number(v);
    }
    return Number(raw);
  }

  /** True if this token should be considered "unowned by a player" (i.e., typical NPC). */
  function isUnownedByPlayers(actor) {
    return !actor?.hasPlayerOwner;
  }

  /** Apply/remove skull overlay and tint based on dead state; optionally remove from combat. */
  async function applyDeathState(token, isDead) {
    const doc = token.document;

    // TINT
    const currentTint = doc.texture?.tint ?? null;
    if (isDead && currentTint !== DEAD_TINT) {
      await doc.update({ "texture.tint": DEAD_TINT });
    } else if (!isDead && currentTint) {
      await doc.update({ "texture.tint": null });
    }

    // SKULL OVERLAY
    const currentOverlay = doc.overlayEffect ?? null;
    if (isDead && currentOverlay !== SKULL_ICON) {
      await doc.update({ overlayEffect: SKULL_ICON });
    } else if (!isDead && currentOverlay) {
      await doc.update({ overlayEffect: null });
    }

    // REMOVE FROM COMBAT (only when dead, unowned by players, and the active combat includes this token)
    if (isDead && isUnownedByPlayers(token.actor) && game.combat?.active && token.combatant) {
      try {
        await token.combatant.delete();
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to remove combatant for token ${token.id}:`, e);
      }
    }
  }

  /** Check a single token against its Bar 1 value and update visuals/combat if needed. */
  async function evaluateTokenByBar1(token) {
    if (!token?.actor) return;
    const barPath = getBar1Path(token.document);
    if (!barPath) return;

    const value = getNumericAtPath(token.actor, barPath);
    if (value == null || Number.isNaN(value)) return;

    const isDead = value <= 0;
    await applyDeathState(token, isDead);
  }

  /** Evaluate all active tokens for a given actor. */
  async function evaluateActorTokens(actor) {
    // Only run from a GM to avoid permission issues and duplicate work from multiple clients
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    // getActiveTokens() returns Token placeables on the active scene(s)
    const tokens = actor.getActiveTokens(true);
    for (const token of tokens) {
      await evaluateTokenByBar1(token);
    }
  }

  // --- Hooks ---

  // On ready, sweep the scene so stuff already at 0 gets marked correctly.
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    for (const token of canvas.tokens.placeables) {
      await evaluateTokenByBar1(token);
    }
  });

  // Any time an Actor updates, re-check tokens using its Bar 1 resource.
  Hooks.on("updateActor", async (actor, _changes, _options, _userId) => {
    await evaluateActorTokens(actor);
  });

  // If a Token changes its Bar 1 assignment (or is created), re-check it.
  Hooks.on("updateToken", async (tokenDoc, changes, _options, _userId) => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    // If Bar 1 assignment changed, or overlay/tint issues after duplication, re-evaluate.
    const bar1Changed = foundry.utils.hasProperty(changes, "bar1.attribute");
    const created = false; // handled by createToken below
    if (!bar1Changed) return;

    const token = tokenDoc.object; // may be undefined if the scene isn't on the canvas
    if (token) await evaluateTokenByBar1(token);
  });

  // When a token is created on the active scene, evaluate once.
  Hooks.on("createToken", async (tokenDoc, _data, _options, _userId) => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTING_KEY)) return;

    const token = tokenDoc.object;
    if (token) await evaluateTokenByBar1(token);
  });

})();
