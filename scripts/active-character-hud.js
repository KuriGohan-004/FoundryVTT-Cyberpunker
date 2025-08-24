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
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 12px;
      "></div>
    `).appendTo(document.body);
  }

  static render() {
    ActiveCharacterHUD.hudElement.empty();
    const actor = game.actors.get(ActiveCharacterHUD.activeCharacterId);
    if (!actor) return;

    // Try to find an active token
    const token = canvas.tokens.controlled.find(t => t.actor.id === actor.id) 
      || canvas.tokens.placeables.find(t => t.actor?.id === actor.id);

    // -------- Portrait --------
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

    // Single click → focus token (if exists)
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

    // -------- Stat HUD --------
    const hp = token?.actor?.system?.attributes?.hp ?? actor.system?.attributes?.hp;
    const value = hp?.value ?? 0;
    const max = hp?.max ?? 0;
    const pct = max > 0 ? Math.clamped(value / max, 0, 1) : 0;

    const statHud = $(`
      <div style="
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-end;
        width: 220px;
      ">
        <div class="macro-bar" style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        "></div>
        <div style="
          position: relative;
          height: 28px;
          background: #550000;
          border: 2px solid #333;
          border-radius: 6px;
          overflow: hidden;
        ">
          <div class="hp-fill" style="
            height: 100%;
            width: ${pct * 100}%;
            background: linear-gradient(to right, #cc0000, #ff4444);
            transition: width 0.3s ease;
          "></div>
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            background: rgba(0,0,0,0.6);
            padding: 2px 6px;
            font-size: 12px;
            color: white;
            font-weight: bold;
            border-top-right-radius: 4px;
          ">
            ${actor.name} — ${value}/${max}
          </div>
        </div>
      </div>
    `);

    // -------- Macro bar --------
    const macroBar = statHud.find(".macro-bar");
    const macros = ActiveCharacterHUD.loadMacros();

    for (let i = 0; i < 5; i++) {
      const macro = macros[i] ? game.macros.get(macros[i]) : null;
      const slot = $(`
        <div style="
          width: 40px;
          height: 40px;
          border: 2px solid #333;
          border-radius: 6px;
          background: #222;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          ${macro ? `<img src="${macro.img}" style="width: 90%; height: 90%; object-fit: contain;" />` : ""}
        </div>
      `);

      slot.click(async (ev) => {
        if (macro) {
          macro.execute();
        } else {
          ui.notifications.info("Empty Macro Slot");
        }
      });

      // Right-click to assign macro
      slot.contextmenu(async (ev) => {
        ev.preventDefault();
        const macroId = await ActiveCharacterHUD.pickMacro();
        if (macroId) {
          macros[i] = macroId;
          ActiveCharacterHUD.saveMacros(macros);
          ActiveCharacterHUD.render();
        }
      });

      macroBar.append(slot);
    }

    ActiveCharacterHUD.hudElement.append(statHud, portrait);
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

  // ---- Macro save/load ----
  static loadMacros() {
    return game.settings.get("active-character-hud", "macros") ?? [null, null, null, null, null];
  }

  static saveMacros(macros) {
    game.settings.set("active-character-hud", "macros", macros);
  }

  static async pickMacro() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Assign Macro",
        content: "<p>Select a Macro from your hotbar or macro directory.</p>",
        buttons: {
          choose: {
            label: "Choose",
            callback: async () => {
              const macros = game.macros.filter(m => m.isOwner);
              const list = macros.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
              const dlg = new Dialog({
                title: "Select Macro",
                content: `<select id="macro-choice">${list}</select>`,
                buttons: {
                  ok: {
                    label: "OK",
                    callback: (html) => resolve(html.find("#macro-choice").val())
                  },
                  cancel: { label: "Cancel", callback: () => resolve(null) }
                }
              });
              dlg.render(true);
            }
          },
          cancel: { label: "Cancel", callback: () => resolve(null) }
        }
      }).render(true);
    });
  }
}

Hooks.once("init", () => {
  game.settings.register("active-character-hud", "lastActive", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });
  game.settings.register("active-character-hud", "macros", {
    scope: "client",
    config: false,
    type: Array,
    default: [null, null, null, null, null]
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
