// module.js
class CyberpunkerRedHUD {
  static activeCharacterId = null;
  static hudElement = null;

  static init() {
    // Settings
    game.settings.register("cyberpunker-red", "lastActive", {
      scope: "client",
      config: false,
      type: String,
      default: ""
    });

    game.settings.register("cyberpunker-red", "hpAttribute", {
      name: "HP Attribute Path",
      hint: "Enter the system data path for the HP resource (default: system.derivedStats.HP)",
      scope: "world",
      config: true,
      type: String,
      default: "system.derivedStats.HP"
    });
  }

  static render() {
    CyberpunkerRedHUD.hudElement?.remove();
    CyberpunkerRedHUD.hudElement = $(`
      <div id="cyberpunker-red-hud" style="
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

    const actor = game.actors.get(CyberpunkerRedHUD.activeCharacterId);
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
    const hpPath = game.settings.get("cyberpunker-red", "hpAttribute");
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
          width: 100%;
          bottom: 0;
          text-align: center;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px black;
        ">${actor.name}</div>
      </div>
    `);

    statHud.append(hpBar);

    // Macro bar (restored older style)
    const macroBar = $(`
      <div class="macro-bar" style="
        display: flex;
        gap: 6px;
        margin-top: 4px;
      "></div>
    `);

    for (let i = 0; i < 5; i++) {
      const slot = $(`<div style="
        width: 40px;
        height: 40px;
        border: 2px solid #666;
        border-radius: 8px;
        background: rgba(20,20,20,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      "></div>`);

      macroBar.append(slot);
    }

    statHud.append(macroBar);

    CyberpunkerRedHUD.hudElement.append(statHud);
    CyberpunkerRedHUD.hudElement.append(portrait);
  }

  static setActiveCharacter(actor) {
    if (!actor) return;
    CyberpunkerRedHUD.activeCharacterId = actor.id;
    game.settings.set("cyberpunker-red", "lastActive", actor.id);
    CyberpunkerRedHUD.render();
  }

  static async restoreLastActive() {
    const lastId = game.settings.get("cyberpunker-red", "lastActive");
    let actor = game.actors.get(lastId);
    if (!actor) {
      const token = canvas.tokens.placeables.find(t => t.actor?.isOwner);
      actor = token?.actor || game.actors.find(a => a.isOwner);
    }
    if (actor) CyberpunkerRedHUD.setActiveCharacter(actor);
  }

  static focusActiveToken() {
    const actor = game.actors.get(CyberpunkerRedHUD.activeCharacterId);
    if (!actor) return;
    const token = canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
    if (!token) return;
    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
  }
}

Hooks.once("init", () => CyberpunkerRedHUD.init());

Hooks.once("ready", async () => {
  await CyberpunkerRedHUD.restoreLastActive();

  Hooks.on("controlToken", (token, controlled) => {
    if (controlled && token.actor?.isOwner) CyberpunkerRedHUD.setActiveCharacter(token.actor);
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (ev) => {
    const activeId = CyberpunkerRedHUD.activeCharacterId;
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
      CyberpunkerRedHUD.focusActiveToken();
    }

    // Movement keys
    const moveKeys = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"];
    if (moveKeys.includes(ev.key.toLowerCase())) {
      const token = canvas.tokens.controlled[0];
      if (token) {
        canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 200 });
      } else {
        CyberpunkerRedHUD.focusActiveToken();
      }
    }
  });
});
