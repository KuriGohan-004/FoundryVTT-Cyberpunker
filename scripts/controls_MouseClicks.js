Hooks.once("ready", () => {
  // Add a new keybinding for targeting via left click
  game.keybindings.register("my-module", "clickTarget", {
    name: "Target Token with Click",
    editable: [{ key: "MouseLeft" }],
    onDown: async (context) => {
      const hoveredToken = canvas.tokens.hover;
      const controlledTokens = canvas.tokens.controlled;

      if (hoveredToken && controlledTokens.length > 0) {
        // Toggle target for all controlled tokens
        for (let t of controlledTokens) {
          await t.toggleTarget(hoveredToken);
        }
        return true; // Consume the event
      } else if (!hoveredToken) {
        // Clicked empty space: deselect all
        canvas.tokens.releaseAll();
        return true;
      }
      return false; // Let other handlers run
    },
    restricted: false,
  });

  // Double click behavior: switch to token if you have permission
  canvas.tokens.placeables.forEach(token => {
    token._onDoubleClickLeft = async function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (this.actor?.isOwner) {
        this.control({ releaseOthers: true });
        canvas.animatePan({ x: this.x, y: this.y, scale: canvas.stage.scale.x });
      }
    };
  });
});
