// cyberpunker-red-tile-links.js

Hooks.once('init', () => {
  console.log("Cyberpunker Red Tile Links | Initializing");
});

// Extend the TileConfig form
Hooks.on('renderTileConfig', (app: TileConfig, html: JQuery, data: any) => {
  // Container for our options
  const container = $(`
    <fieldset class="form-group">
      <legend>Cyberpunker Red Scene Link</legend>
      <label>
        <input type="checkbox" name="flags.cyberpunker-red.enable">
        Enable Scene Link
      </label>
      <br>
      <label>
        <input type="checkbox" name="flags.cyberpunker-red.allowPlayers">
        Allow Players
      </label>
      <br>
      <label>
        <input type="checkbox" name="flags.cyberpunker-red.setActive">
        Set Scene Active
      </label>
      <br>
      <label>
        Scene:
        <select name="flags.cyberpunker-red.scene"></select>
      </label>
    </fieldset>
  `);

  // Fill scene selector
  const sceneSelect = container.find('select');
  game.scenes.forEach(scene => {
    const selected = data.flags?.['cyberpunker-red']?.scene === scene.id ? "selected" : "";
    sceneSelect.append(`<option value="${scene.id}" ${selected}>${scene.name}</option>`);
  });

  // Append to the form
  html.find('footer').before(container);

  // Ensure changes save to tile flags
  container.find('input, select').on('change', function () {
    const updates: any = {};
    container.find('input[name], select[name]').each(function () {
      const input = $(this);
      const name = input.attr('name')!;
      const flagPath = name.split('.');
      const value = input.is(':checkbox') ? input.prop('checked') : input.val();
      updates[flagPath[2]] = value;
    });
    app.object.setFlag('cyberpunker-red', updates);
  });
});

// Handle clicks on tiles
Hooks.on('ready', () => {
  const handleTileClick = async (tile: TileDocument) => {
    const flags = tile.getFlag('cyberpunker-red', 'enable');
    if (!flags) return;

    const allowPlayers = tile.getFlag('cyberpunker-red', 'allowPlayers') ?? false;
    if (!game.user.isGM && !allowPlayers) return;

    const targetSceneId = tile.getFlag('cyberpunker-red', 'scene');
    if (!targetSceneId) return;

    const setActive = tile.getFlag('cyberpunker-red', 'setActive') ?? false;

    const targetScene = game.scenes.get(targetSceneId);
    if (!targetScene) return ui.notifications.warn("Target scene not found");

    if (setActive) {
      await targetScene.activate();
    } else {
      await targetScene.view();
    }
  };

  // Attach listeners for all tiles dynamically
  Hooks.on('canvasReady', () => {
    canvas.tiles.placeables.forEach(tile => {
      // Remove old listener to avoid duplicates
      $(tile.object.element).off('click.cyberpunkerRed');
      $(tile.object.element).on('click.cyberpunkerRed', async (event) => {
        if (game.user.isGM || canvas.tokens.controlled.length > 0) {
          event.stopPropagation();
          await handleTileClick(tile.document);
        }
      });
    });
  });
});
