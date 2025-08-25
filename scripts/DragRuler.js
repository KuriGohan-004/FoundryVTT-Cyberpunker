/**
 * Cyberpunker Red Drag Ruler
 * Shows a temporary ruler when dragging a token
 */

let dragRuler = null;
let dragStart = null;

// When a token drag starts
Hooks.on("controlToken", (token, controlled) => {
    if (controlled) {
        // Reset start position
        dragStart = token.center; 
    } else {
        // Clear ruler when deselecting
        if (dragRuler) {
            dragRuler.destroy();
            dragRuler = null;
        }
        dragStart = null;
    }
});

// Hook on token movement
Hooks.on("preUpdateToken", (scene, tokenData, updateData, options, userId) => {
    if (!dragStart) return; // only if a drag has started

    // Check if the token is actually moving
    if (updateData.x === undefined && updateData.y === undefined) return;

    const token = canvas.tokens.get(tokenData._id);
    if (!token) return;

    const start = dragStart;
    const end = {
        x: updateData.x !== undefined ? updateData.x + token.width * canvas.grid.size / 2 : token.x + token.width * canvas.grid.size / 2,
        y: updateData.y !== undefined ? updateData.y + token.height * canvas.grid.size / 2 : token.y + token.height * canvas.grid.size / 2
    };

    // Remove previous ruler
    if (dragRuler) dragRuler.destroy();

    // Create a new ruler
    dragRuler = new Ruler();
    dragRuler.initialize({ x: start.x, y: start.y }, { x: end.x, y: end.y }, {
        color: 0xff0000,
        thickness: 4,
        text: true
    });
    dragRuler.draw();
});
