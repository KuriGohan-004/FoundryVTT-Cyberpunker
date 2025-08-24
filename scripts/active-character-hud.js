// module.js
class ActiveCharacterHUD {
  static activeCharacterId = null;
  static hudElement = null;

  static init() {
    // Create HUD container
    ActiveCharacterHUD.hudElement = $(`
      <div id="active-character-hud" style="
        position: absolute;
        bottom: 20px;
        right: 20px;
        z-index: 100;
        pointer-events: auto;
      "></div>
    `).appendTo(document.body);
  }

  static render() {
    ActiveCharacterHUD.hudElement.empty();
    const actor = game.actors.get(ActiveCharacterHUD.activeCharacterId);
    if (!actor) return;

    const token = canvas.tokens.controlled.find(t => t.actor.id === actor.id) 
      || canvas.tokens.placeables.find(t => t.actor?.id === actor.id);

    const portrait = $(`
      <div style="position: relative; display: inline-block;">
        <img src="${actor.img}" style="
          width: 64px;
          height: 64px;
          border-radius: 8px;
          border: 2px solid #444;
          cursor: pointer;
        "/>
        <button class="combat-toggle" style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          background: #222;
          color: white;
          border: 1px solid #666;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 10px;
          cursor: pointer;
        ">⚔</button>
      </div>
    `);

    // Hover shows combat toggle
    portrait.hover(
      () => portrait.find(".combat-toggle").show(),
      () => portrait.find(".combat-toggle").hide()
    );

    // Click portrait → select & center token
    portrait.find("img").click(() => {
      if (token) {
        token.control({ releaseOthers: true });
        canvas.animatePan({ x: token.x, y: token.y, duration: 250 });
      }
    });

    // Toggle combat state
    portrait.find(".combat-toggle").click(async (ev) => {
      ev.stopPropagation();
      if (!token) return;
      const combat = game.combats.active || await Combat.create({ scene: canvas.scene.id });
      let combatant = combat.combatants.find(c => c.tokenId === token.id);
      if (combatant) {
        await combatant.delete();
      } else {
        await combat.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, actorId: actor.id }]);
      }
    });

    ActiveCharacterHUD.hudElement.append(portrait);
  }

  static setActiveCharacter(actor) {
    if (!actor) return;
    ActiveCharacterHUD.activeCharacterId = actor.id;
    game.settings.set("active-character-hud", "lastActive", actor.id);
    ActiveCharacterHUD.render();
  }

  static async restoreLastActive() {
    const lastId = game.settings.get("active-character-hud", "lastActive");
    let actor = game.actors.get(lastId);

    if (!actor) {
      // fallback: find first owned actor in scene
      const token = canvas.tokens.placeables.find(t => t.actor?.isOwner);
      actor = token?.actor || game.actors.find(a => a.isOwner);
    }

    if (actor) ActiveCharacterHUD.setActiveCharacter(actor);
  }
}

Hooks.once("init", () => {
  // Register client-only setting (per-user)
  game.settings.register("active-character-hud", "lastActive", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.once("ready", async () => {
  ActiveCharacterHUD.init();
  await ActiveCharacterHUD.restoreLastActive();

  // Clicking on a controlled token sets it as active
  Hooks.on("controlToken", (token, controlled) => {
    if (controlled && token.actor?.isOwner) {
      ActiveCharacterHUD.setActiveCharacter(token.actor);
    }
  });

  // Tab toggles sheet of active character
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab" && ActiveCharacterHUD.activeCharacterId) {
      ev.preventDefault();
      const actor = game.actors.get(ActiveCharacterHUD.activeCharacterId);
      if (!actor) return;
      if (actor.sheet.rendered) actor.sheet.close();
      else actor.sheet.render(true);
    }
  });
});
