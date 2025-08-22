// Register the module setting
Hooks.once("init", () => {
  game.settings.register("cyberpunker-red", "autoRollInitiative", {
    name: "Auto-Roll Initiative",
    hint: "If enabled, combatants without initiative will automatically roll when combat starts.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

// Hook into combat creation
Hooks.on("preCreateCombat", async (combat, options, userId) => {
  // Check if the setting is enabled
  if (!game.settings.get("cyberpunker-red", "autoRollInitiative")) return;

  // Slight delay to ensure combatants are created
  setTimeout(async () => {
    const combatantsToRoll = combat.combatants.filter(c => c.initiative === null);

    for (const combatant of combatantsToRoll) {
      const actor = combatant.actor;
      if (!actor) continue;

      // Roll initiative: use actor's initiative formula if available, fallback to d20
      const formula = actor.data.data?.attributes?.initiative?.formula || "1d20";
      const roll = await new Roll(formula).roll({ async: true });
      await combat.setCombatantInitiative(combatant.id, roll.total);
    }

    // Refresh the turn order
    await combat.update({ turn: 0 });
  }, 100);
});
