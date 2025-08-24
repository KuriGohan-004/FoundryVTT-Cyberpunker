// File: scripts/scene-left-click-view.js

Hooks.on("ready", () => {
  Hooks.on("renderSceneDirectory", (app, html, data) => {
    html.find("li.scene").each((i, li) => {
      const $li = $(li);
      const sceneId = $li.data("documentId");
      const scene = game.scenes.get(sceneId);

      // Remove default click handlers
      $li.off("click");

      // Left click -> view
      $li.on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (scene) scene.view();
      });

      // Add an icon for the active scene
      $li.find(".scene-active-indicator").remove(); // cleanup if re-rendered
      if (scene && scene.active) {
        const icon = $(`<i class="fas fa-star scene-active-indicator" title="Active Scene"></i>`);
        $li.find(".document-name").prepend(icon); // put before the scene name
      }
    });
  });
});
