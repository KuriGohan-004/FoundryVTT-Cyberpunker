// File: scripts/death-handler.js
const MODULE_ID = "cyberpunker-red";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoDeathHandler", {
    name: "Enable Auto Death Handling",
    hint: "Automatically tint tokens red, add/remove death icons, and remove unowned NPCs from combat when HP <= 0.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.on("updateActor", async (actor, changes, options, userId) => {
  if (!game.settings.get(MODULE_ID, "autoDeathHandler")) return;

  // Check if HP was updated
  if (!foundry.utils.hasProperty(changes, "system.derivedStats.HP")) return;

  const hp = foundry.utils.getProperty(actor.system, "derivedStats.HP");
  const tokens = actor.getActiveTokens();

  for (let token of tokens) {
    if (hp <= 0) {
      // Apply red tint
      await token.document.update({
        texture: { tint: "#ff0000" }
      });

      // Add death icon (skull)
      if (!token.document.effects.includes("icons/svg/skull.svg")) {
        await token.document.toggleEffect("icons/svg/skull.svg", { overlay: true });
      }

      // Remove from combat if unowned
      const hasOwner = actor.hasPlayerOwner || game.users.some(u => u.isGM && actor.testUserPermission(u, "OWNER"));
      if (!hasOwner && token.combatant && game.combat?.active) {
        await game.combat.removeCombatant(token.combatant.id);
      }
    } else {
      // Remove tint
      await token.document.update({
        texture: { tint: null }
      });

      // Remove skull icon
      if (token.document.effects.includes("icons/svg/skull.svg")) {
        await token.document.toggleEffect("icons/svg/skull.svg", { overlay: true });
      }
    }
  }
});
