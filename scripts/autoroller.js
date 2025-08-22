// Standalone auto-roll initiative for Foundry VTT

Hooks.on("combatStart", async (combat) => {
  // Find combatants without initiative
  const unrolled = combat.combatants.filter(c => c.initiative === null);
  if (!unrolled.length) return;

  // Roll initiative for them
  await combat.rollInitiative(unrolled.map(c => c.id));
  console.log(`Rolled initiative for ${unrolled.length} combatants.`);
});
