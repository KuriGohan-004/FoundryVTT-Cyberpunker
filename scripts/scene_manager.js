// File: scripts/scene-left-click-view.js

Hooks.on("ready", () => {
  Hooks.on("renderSceneDirectory", (app, html, data) => {
    html.find("li.scene").each((i, li) => {
      const $li = $(li);

      // Remove default click handlers
      $li.off("click");

      // Left click -> view
      $li.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const sceneId = $li.data("documentId");
        const scene = game.scenes.get(sceneId);
        if (scene) scene.view();
      });

      // Double click -> activate
      $li.on("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const sceneId = $li.data("documentId");
        const scene = game.scenes.get(sceneId);
        if (scene && game.user.isGM) scene.activate();
      });

      // Right-click is left alone so Foundry’s normal context menu still works
    });
  });
});
