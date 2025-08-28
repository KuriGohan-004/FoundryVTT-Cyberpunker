// cyberpunker-red-tile-links.js

Hooks.once('init', () => {
  console.log("Cyberpunker Red Tile Links | Initializing");

  // Register a module setting if you want global defaults (optional)
});

Hooks.on('renderTileConfig', (app: TileConfig, html: JQuery, data: any) => {
  // Add a new section below existing controls
  const container = $('<div class="form-group"><h4>Cyberpunker Red Scene Link</h4></div>');
  
  // Enable checkbox
  const enableCheckbox = $(`
    <label>
      <input type="checkbox" name="data.flags.cyberpunkerRed.enable" ${data.flags?.cyberpunkerRed?.enable ? "checked" : ""}>
      Enable Scene Link
    </label>
  `);
  container.append(enableCheckbox);

  // Allow Players checkbox
  const allowPlayersCheckbox = $(`
    <label>
      <input type="checkbox" name="data.flags.cyberpunkerRed.allowPlayers" ${data.flags?.cyberpunkerRed?.allowPlayers ? "checked" : ""}>
      Allow Players
    </label>
  `);
  container.append(allowPlayersCheckbox);

  // Set Active checkbox
  const setActiveCheckbox = $(`
    <label>
      <input type="checkbox" name="data.flags.cyberpunkerRed.setActive" ${data.flags?.cyberpunkerRed?.setActive ? "checked" : ""}>
      Set Scene Active
    </label>
  `);
  container.append(setActiveCheckbox);

  // Scene selector dropdown
  const sceneOptions = game.scenes.map(s => `<option value="${s.id}" ${data.flags?.cyberpunkerRed?.scene === s.id ? "selected" : ""}>${s.name}</option>`).join("");
  const sceneSelector = $(`
    <label>
      Scene:
      <select name="data.flags.cyberpunkerRed.scene">
        ${sceneOptions}
      </select>
    </label>
  `);
  container.append(sceneSelector);

  // Insert the container after the existing tile configuration fields
  html.find('.form-group').last().after(container);
});

// Hook to handle tile clicks
Hooks.on('controlToken', (token: Token, controlled: boolean) => {
  // Only when GM or allowed players control the token
  if (!controlled) return;

  // Add click listener to tiles with our flag enabled
  canvas.tiles.placeables.forEach(tile => {
    const flags = tile.getFlag('cyberpunker-red', 'enable');
    if (!flags) return;

    const allowPlayers = tile.getFlag('cyberpunker-red', 'allowPlayers') ?? false;
    if (!game.user.isGM && !allowPlayers) return;

    const targetSceneId = tile.getFlag('cyberpunker-red', 'scene');
    if (!targetSceneId) return;

    const setActive = tile.getFlag('cyberpunker-red', 'setActive') ?? false;

    // Remove previous listener to avoid duplicates
    $(tile.object.element).off('click.cyberpunkerRed');

    // Add click listener
    $(tile.object.element).on('click.cyberpunkerRed', async (event) => {
      event.stopPropagation();

      const targetScene = game.scenes.get(targetSceneId);
      if (!targetScene) return ui.notifications.warn("Target scene not found");

      if (setActive) {
        await targetScene.activate();
      } else {
        await targetScene.view();
      }
    });
  });
});
