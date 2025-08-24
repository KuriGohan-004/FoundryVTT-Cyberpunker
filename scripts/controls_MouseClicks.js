Hooks.once("ready", () => {
  // Store original mouse handlers in case we want to restore them
  const originalOnClickLeft = Token.prototype._onClickLeft;
  const originalOnDoubleClickLeft = Token.prototype._onDoubleClickLeft;

  // Override single click behavior
  Token.prototype._onClickLeft = function(event) {
    event.preventDefault();
    event.stopPropagation();

    const selected = canvas.tokens.controlled;
    const clickedToken = this;

    if (selected.length > 0 && !selected.includes(clickedToken)) {
      // Toggle targeting if another token is selected
      clickedToken.toggleTarget();
    } else if (selected.includes(clickedToken)) {
      // Do nothing special if clicking already selected token
    } else {
      // No token selected, select the clicked token normally
      canvas.tokens.releaseAll();
      clickedToken.control({ releaseOthers: true });
    }
  };

  // Override double click behavior
  Token.prototype._onDoubleClickLeft = function(event) {
    event.preventDefault();
    event.stopPropagation();

    const clickedToken = this;

    // Check user permission to control the token
    if (clickedToken.actor && clickedToken.actor.isOwner) {
      clickedToken.control({ releaseOthers: true });
      canvas.animatePan({ x: clickedToken.x, y: clickedToken.y, scale: canvas.stage.scale.x });
    }
  };

  // Handle clicking on empty space
  Hooks.on("canvasReady", () => {
    canvas.stage.interactive = true;
    canvas.stage.hitArea = canvas.app.renderer.plugins.interaction.hitTest(canvas.stage);

    canvas.stage.on("mousedown", (event) => {
      const target = event.target;
      if (!target?.document) {
        // Clicked empty space
        canvas.tokens.releaseAll();
      }
    });
  });
});
