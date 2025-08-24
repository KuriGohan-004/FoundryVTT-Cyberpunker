Hooks.once("ready", () => {
  // Only add once
  if (document.getElementById("combat-toggle-button")) return;

  // Create button
  const button = document.createElement("button");
  button.id = "combat-toggle-button";
  button.innerText = "⚔️";
  Object.assign(button.style, {
    position: "absolute",
    right: "-25px",     // stick just outside the sidebar
    top: "100px",       // vertical position, tweak as needed
    width: "25px",
    height: "25px",
    fontSize: "14px",
    lineHeight: "25px",
    textAlign: "center",
    padding: "0",
    margin: "0",
    zIndex: "1000"
  });

  // Append to the sidebar
  document.getElementById("sidebar").appendChild(button);

  // Button logic
  button.addEventListener("click", async () => {
    const combat = game.combats.active;

    if (!combat) {
      // Select all tokens
      canvas.tokens.placeables.forEach(t => t.control({ releaseOthers: false }));

      // Create new encounter
      const encounter = await Combat.create({ scene: canvas.scene.id });
      if (!encounter) return;

      // Add controlled tokens
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
