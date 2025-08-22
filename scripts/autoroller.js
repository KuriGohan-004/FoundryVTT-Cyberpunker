// modules/my-module/main.js

Hooks.once("init", () => {
  console.log("My Auto-Initiative Module | Initializing");
});

Hooks.on("combatStart", async (combat) => {
  console.log("My Auto-Initiative Module | Combat started, rolling initiatives");

  for (let c of combat.combatants) {
    if (c.initiative === null) {
      await c.rollInitiative({ createCombatants: false });
      console.log(`Rolled initiative for ${c.name}`);
    }
  }
});
