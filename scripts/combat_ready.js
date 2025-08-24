// File: scripts/scene-left-click-view.js

Hooks.on("ready", () => {
  // Patch the sidebar scene buttons
  Hooks.on("renderSceneDirectory", (app, html, data) => {
    html.find("li.scene").each((i, li) => {
      const $li = $(li);

      // Remove existing click listeners that open config
      $li.off("click");

      // Add our own click handler
      $li.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const sceneId = $li.data("documentId");
        const scene = game.scenes.get(sceneId);

        if (scene) {
          scene.view();
        }
      });

      // Keep right-click behavior intact (context menu for config)
      $li.on("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const sceneId = $li.data("documentId");
        const scene = game.scenes.get(sceneId);

        if (scene) scene.sheet.render(true);
      });
    });
  });
});
