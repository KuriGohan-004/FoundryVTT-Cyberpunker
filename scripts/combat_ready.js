// module.js
Hooks.once("init", () => {
  console.log("Quick Combat | Initializing module");
});

// Add button to the UI
Hooks.on("getSceneControlButtons", (controls) => {
  controls.find(c => c.name === "token").tools.push({
    name: "quickCombat",
    title: "Quick Combat",
    icon: "fas fa-swords", // any FontAwesome icon
    visible: game.user.isGM,
    onClick: async () => {
      await quickCombat();
    },
    button: true
  });
});

async function quickCombat() {
  let combat = game.combat;

  // If no combat, create one
  if (!combat) {
    combat = await Combat.create({ scene: canvas.scene.id });
  }

  // Select all placeable tokens
  const tokens = canvas.tokens.placeables;

  // Add them all to combat
  for (let token of tokens) {
    if (!combat.combatants.find(c => c.tokenId === token.id)) {
      await combat.createEmbeddedDocuments("Combatant", [{
        tokenId: token.id,
        actorId: token.actor?.id,
        sceneId: canvas.scene.id
      }]);
    }
    // Toggle combat state ON
    token.toggleCombat(true, { force: true });
  }

  // Switch sidebar to Combat
  ui.sidebar.activateTab("combat");

  // Make sure this encounter is the active one
  if (game.combat?.id !== combat.id) {
    await game.combats.setActive(combat.id);
  }

  ui.notifications.info("All tokens added to combat!");
}
