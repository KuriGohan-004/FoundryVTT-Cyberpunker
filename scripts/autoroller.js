const MODULE_ID = "cyberpunker-red";

// Register a world-level setting to toggle auto-roll initiative
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoRollInitiative", {
    name: "Auto-Roll Initiative",
    hint: "Automatically roll initiative for all tokens without initiative when combat starts.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
});

// Auto-roll initiative on combat start if enabled
Hooks.on("combatStart", async (combat) => {
  if (!game.settings.get(MODULE_ID, "autoRollInitiative")) return;

  const unrolled = combat.combatants.filter(c => c.initiative === null);
  if (!unrolled.length) return;

  await combat.rollInitiative(unrolled.map(c => c.id));
  console.log(`Rolled initiative for ${unrolled.length} combatants.`);
});
