// module.js
class ActiveCharacterHUD {
  static activeCharacterId = null;
  static hudElement = null;

  static init() {
    ActiveCharacterHUD.hudElement = $(`
      <div id="active-character-hud" style="
        position: absolute;
        bottom: 20px;
        right: 320px;  /* just left of sidebar */
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
          width: 160px;
          height: 160px;
          border-radius: 12px;
          border: 3px solid #444;
          cursor: pointer;
        "/>
        <button class="combat-toggle" style="
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          display: none;
          background: #222;
          color: white;
          border: 1px solid #666;
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 12px;
          cursor: pointer;
        "></button>
      </div>
    `);

    const button = portrait.find(".combat-toggle");

    // update button label + state
    function updateCombatButton() {
      if (!token) return button.hide();

      const combat = game.combats.active;
      if (!combat) {
        button.text("Ready").show();
        return;
      }

      const combatant = combat.combatants.find(c => c.tokenId === token.id);
      if (!combatant) {
        button.text("Join").show();
        return;
      }

      // In encounter already
      if (combatant.initiative == null) {
        button.text("Init").show();
        return;
      }

      // Already rolled initiative → hide
      button.hide();
    }

    updateCombatButton();

    // Hover shows combat toggle
    portrait.hover(
      () => button.show(),
      () => button.hide()
    );

    // Single click → focus token
    portrait.find("img").click(() => {
      if (token) {
        token.control({ releaseOthers: true });
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
      }
    });

    // Double click → open sheet
    portrait.find("img").dblclick(() => {
      if (actor?.sheet) actor.sheet.render(true);
    });

    // Button click actions
    button.click(async (ev) => {
      ev.stopPropagation();
      if (!token) return;

      let combat = game.combats.active;
      if (!combat) {
        combat = await Combat.create({ scene: canvas.scene.id });
      }

      let combatant = combat.combatants.find(c => c.tokenId === token.id);

      if (!combatant) {
        await combat.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, actorId: actor.id }]);
      } else if (combatant.initiative == null) {
        await combatant.rollInitiative();
      }
      updateCombatButton();
    });

    // Update button when combat state changes
    Hooks.on("updateCombat", () => updateCombatButton());
    Hooks.on("deleteCombat", () => updateCombatButton());

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
      const token = canvas.tokens.placeables.find(t => t.actor?.isOwner);
      actor = token?.actor || game.actors.find(a => a.isOwner);
    }

    if (actor) ActiveCharacterHUD.setActiveCharacter(actor);
  }

  static focusActiveToken() {
    const actor = game.actors.get(ActiveCharacterHUD.activeCharacterId);
    if (!actor) return;
    const token = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!token) return;

    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
  }
}

Hooks.once("init", () => {
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

  Hooks.on("controlToken", (token, controlled) => {
    if (controlled && token.actor?.isOwner) {
      ActiveCharacterHUD.setActiveCharacter(token.actor);
    }
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (ev) => {
    const activeId = ActiveCharacterHUD.activeCharacterId;
    if (!activeId) return;
    const actor = game.actors.get(activeId);
    if (!actor) return;

    // Tab toggles sheet
    if (ev.key === "Tab") {
      ev.preventDefault();
      if (actor.sheet.rendered) actor.sheet.close();
      else actor.sheet.render(true);
    }

    // Q focuses token
    if (ev.key.toLowerCase() === "q") {
      ev.preventDefault();
      ActiveCharacterHUD.focusActiveToken();
    }

    // Movement keys → ensure token selected and pan to them
    const moveKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    if (moveKeys.includes(ev.key.toLowerCase())) {
      const token = canvas.tokens.controlled[0];
      if (!token) {
        ActiveCharacterHUD.focusActiveToken();
      } else {
        // Always recenter on the controlled token
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 200 });
      }
    }
  });
});
