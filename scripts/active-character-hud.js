// module.js
class ActiveCharacterHUD {
  static activeCharacterId = null;
  static hudElement = null;
  static macroSlots = [];

  static init() {
    // Settings
    game.settings.register("active-character-hud", "lastActive", {
      scope: "client",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register("active-character-hud", "hpAttribute", {
      name: "HP Attribute Path",
      hint: "Enter the system data path for the HP resource (default: system.attributes.hp). Example: system.health",
      scope: "world",
      config: true,
      type: String,
      default: "system.attributes.hp"
    });

    game.settings.register("active-character-hud", "macros", {
      scope: "client",
      config: false,
      type: Array,
      default: [null, null, null, null, null]
    });
  }

  static render() {
    ActiveCharacterHUD.hudElement?.remove();
    ActiveCharacterHUD.hudElement = $(`
      <div id="active-character-hud" style="
        position: absolute;
        bottom: 20px;
        right: 320px;
        z-index: 100;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        pointer-events: auto;
      "></div>
    `).appendTo(document.body);

    const actor = game.actors.get(ActiveCharacterHUD.activeCharacterId);
    if (!actor) return;

    // --- Portrait ---
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

    const token = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    portrait.find("img").click(() => {
      if (token) {
        token.control({ releaseOthers: true });
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
      }
    });
    portrait.find("img").dblclick(() => actor.sheet?.render(true));

    // --- Stat HUD ---
    const statHud = $(`<div style="display: flex; flex-direction: column; align-items: flex-start;"></div>`);

    // Health bar
    const hpPath = game.settings.get("active-character-hud", "hpAttribute");
    const hpData = foundry.utils.getProperty(actor, hpPath) || {};
    const current = hpData.value ?? 0;
    const max = hpData.max ?? 0;
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

    const hpBar = $(`
      <div style="position: relative; width: 180px; height: 28px; background: #222; border: 2px solid #000; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
        <div class="bar" style="width: ${pct}%; height: 100%; background: #ff1a1a;"></div>
        <div class="hp-text" style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          font-size: 14px;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px black;
        ">${current} / ${max}</div>
        <div class="hp-name" style="
          position: absolute;
          bottom: -12px;
          left: 5px;
          background: rgba(0,0,0,0.6);
          color: white;
          font-weight: bold;
          padding: 0 4px;
          border-radius: 4px;
        ">${actor.name}</div>
      </div>
    `);

    statHud.append(hpBar);

    // Macro bar
    const savedMacros = game.settings.get("active-character-hud", "macros");
    const macroBar = $('<div class="macro-bar" style="display: flex; gap: 4px;"></div>');
    for (let i = 0; i < 5; i++) {
      const slot = $(`<div class="macro-slot" style="
        width: 36px;
        height: 36px;
        border: 2px solid #555;
        background: rgba(0,0,0,0.4);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      "></div>`);

      const macroId = savedMacros[i];
      if (macroId) {
        const macro = game.macros.get(macroId);
        if (macro) {
          const icon = $(`<img src="${macro.img}" style="width: 100%; height: 100%; border-radius: 4px;">`);
          slot.append(icon);
          slot.on("click", () => macro.execute());
        }
      }

      // Drag + drop
      slot.on("dragover", ev => ev.preventDefault());
      slot.on("drop", async ev => {
        ev.preventDefault();
        const data = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
        if (data.type === "Macro") {
          const newMacros = [...savedMacros];
          newMacros[i] = data.id;
          await game.settings.set("active-character-hud", "macros", newMacros);
          ActiveCharacterHUD.render();
        }
      });

      macroBar.append(slot);
    }

    statHud.append(macroBar);

    ActiveCharacterHUD.hudElement.append(statHud);
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

Hooks.once("init", () => ActiveCharacterHUD.init());

Hooks.once("ready", async () => {
  await ActiveCharacterHUD.restoreLastActive();

  Hooks.on("controlToken", (token, controlled) => {
    if (controlled && token.actor?.isOwner) ActiveCharacterHUD.setActiveCharacter(token.actor);
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

    // Movement keys
    const moveKeys = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"];
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
