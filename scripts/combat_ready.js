Hooks.once("ready", () => {
  Hooks.on("renderChatLog", (app, html) => {
    // Prevent duplicates
    if ($("#combat-toggle-button").length) return;

    // Create button
    const button = $(`
      <button id="combat-toggle-button" style="
        display: block;
        width: 100%;
        height: 15px;
        line-height: 15px;
        font-size: 11px;
        padding: 0;
        margin: 0;
      ">
        ⚔️ Combat
      </button>
    `);

    // Insert after the chat log inside the chat tab
    html.parent().append(button);

    // Button logic
    button.on("click", async () => {
      const combat = game.combats.active;

      if (!combat) {
        // Select all tokens
        canvas.tokens.placeables.forEach(t => t.control({ releaseOthers: false }));

        // Create new encounter
        const encounter = await Combat.create({ scene: canvas.scene.id });
        if (!encounter) return;

        // Add controlled tokens as combatants
        await encounter.createEmbeddedDocuments("Combatant", canvas.tokens.controlled.map(t => ({
          tokenId: t.id,
          sceneId: canvas.scene.id
        })));

        // Make encounter active
        await game.combats.setActive(encounter);

        // Switch to combat sidebar
        ui.sidebar.activateTab("combat");
      } else {
        // End active combat
        await combat.delete();
      }
    });
  });
});
