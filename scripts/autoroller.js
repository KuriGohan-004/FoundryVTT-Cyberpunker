// Register module setting
Hooks.once("init", () => {
  game.settings.register("cyberpunker-red", "autoRollInitiative", {
    name: "Auto Roll Initiative on Begin Combat",
    hint: "If enabled, automatically rolls initiative for combatants without initiative when pressing Begin Combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// Hook into when the GM begins combat
Hooks.on("preUpdateCombat", async (combat, updateData, options, userId) => {
  // Only act if the setting is enabled
  if (!game.settings.get("cyberpunker-red", "autoRollInitiative")) return;

  // Only trigger when starting combat
  if (!("started" in updateData) || updateData.started !== true) return;

  // Roll initiative for all combatants without it
  await combat.rollAll({ reroll: false }); // exactly like the Roll All button

  // No need to manually update turn order, rollAll handles it
});
