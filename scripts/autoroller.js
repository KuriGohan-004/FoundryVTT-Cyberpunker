// Register the module setting
Hooks.once("init", () => {
  game.settings.register("cyberpunker-red", "autoRollInitiative", {
    name: "Auto-Roll Initiative on Begin Combat",
    hint: "If enabled, combatants without initiative will automatically roll when the GM presses Begin Combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// Hook into combat start
Hooks.on("preUpdateCombat", async (combat, updateData, options, userId) => {
  // Check if the setting is enabled
  if (!game.settings.get("cyberpunker-red", "autoRollInitiative")) return;

  // Only act when Begin Combat is pressed
  if (updateData.started !== true) return;

  // Filter combatants without initiative
  const combatantsToRoll = combat.combatants.filter(c => c.initiative === null);

  for (const combatant of combatantsToRoll) {
    const actor = combatant.actor;
    if (!actor) continue;

    // Use actor initiative formula if available, fallback to 1d20
    const formula = actor.data.data?.attributes?.initiative?.formula || "1d20";
    const roll = await new Roll(formula).roll({ async: true });
    await combat.setCombatantInitiative(combatant.id, roll.total);
  }

  // Refresh turn order
  await combat.update({ turn: 0 });
});
