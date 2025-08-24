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
      </div>
    `);

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

    // Movement keys → always recenter on controlled or active token
    const moveKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    if (moveKeys.includes(ev.key.toLowerCase())) {
      const token = canvas.tokens.controlled[0];
      if (token) {
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 200 });
      } else {
        ActiveCharacterHUD.focusActiveToken();
      }
    }
  });
});
