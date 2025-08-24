// module.js  (Cyberpunker Red)
class CyberpunkerRedHUD {
  static activeCharacterId = null;
  static hudElement = null;

  // ---------- Utilities ----------
  static _getActiveActor() {
    return game.actors.get(this.activeCharacterId) ?? null;
  }

  static _getActiveToken() {
    const actor = this._getActiveActor();
    if (!actor) return null;
    // Prefer a controlled token for this actor; else first matching token on the current canvas
    return canvas?.tokens?.controlled?.find(t => t.actor?.id === actor.id)
        || canvas?.tokens?.placeables?.find(t => t.actor?.id === actor.id)
        || null;
  }

  static _resolveHP(actor) {
    const hpPath = game.settings.get("cyberpunker-red", "hpAttribute") || "system.derivedStats.HP";
    let node = foundry.utils.getProperty(actor, hpPath);

    const fallbacks = [
      "system.derivedStats.HP",
      "system.derivedStats.hp",
      "system.attributes.hp",
      "system.hp",
      "system.health",
      "system.resources.hp",
      "system.stats.hp"
    ];

    for (const fb of fallbacks) {
      if (node != null) break;
      node = foundry.utils.getProperty(actor, fb);
    }

    const normalize = (hpNode) => {
      if (hpNode == null) return { current: 0, max: 0 };
      if (typeof hpNode === "number") return { current: Number(hpNode) || 0, max: Number(hpNode) || 0 };

      if (typeof hpNode === "object") {
        const curKeys = ["value", "current", "now", "hp", "curr"];
        const maxKeys = ["max", "maximum", "maxValue", "cap", "base", "total"];
        const dig = (obj, keys) => {
          for (const k of keys) {
            if (obj?.[k] != null && typeof obj[k] !== "object") return Number(obj[k]);
          }
          return null;
        };

        let current = dig(hpNode, curKeys);
        let max = dig(hpNode, maxKeys);

        if (current == null && typeof hpNode.value === "object") current = dig(hpNode.value, curKeys);
        if (max == null && typeof hpNode.value === "object") max = dig(hpNode.value, maxKeys);

        if (current == null && typeof hpNode.value === "object" && hpNode.value?.current != null) current = Number(hpNode.value.current);
        if (max == null && typeof hpNode.value === "object" && hpNode.value?.max != null) max = Number(hpNode.value.max);

        if (current == null) current = 0;
        if (max == null) max = current;

        return { current, max };
      }

      return { current: 0, max: 0 };
    };

    const { current, max } = normalize(node);

    if (game.user.isGM && current === 0 && max === 0 && node == null) {
      console.warn(`[Cyberpunker Red] HP path not found for actor "${actor.name}". Checked:`, [hpPath, ...fallbacks]);
    }

    return { current, max };
  }

  static _pct(cur, max) {
    if (!max || max <= 0) return 0;
    return Math.max(0, Math.min(100, (cur / max) * 100));
  }

  // ---------- Core UI ----------
  static _buildHUD() {
    this.hudElement?.remove();

    this.hudElement = $(`
      <div id="cyberpunker-red-hud" style="
        position: absolute;
        bottom: 42px;          /* 2.1x of original 20px */
        right: 320px;
        z-index: 100;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        pointer-events: auto;
      "></div>
    `).appendTo(document.body);

    const actor = this._getActiveActor();
    if (!actor) return;

    const token = this._getActiveToken();

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

    portrait.find("img").on("click", () => {
      if (!token) return;
      token.control({ releaseOthers: true });
      canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
    });

    portrait.find("img").on("dblclick", () => {
      actor.sheet?.render(true);
    });

    const statHud = $(`<div style="display: flex; flex-direction: column; align-items: flex-start;"></div>`);

    const sourceActor = token?.actor ?? actor;
    const { current, max } = this._resolveHP(sourceActor);
    const pct = this._pct(current, max);

    const hpBar = $(`
      <div class="cpr-hp-wrap" style="
        position: relative;
        width: 330px;            /* 220px + 50% extra to the left */
        height: 28px;
        background: #1b1b1b;
        border: 2px solid #000;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 8px;
      ">
        <div class="cpr-hp-fill" style="
          width: ${pct}%;
          height: 100%;
          background: linear-gradient(90deg, #ff2a2a 0%, #ff4545 50%, #ff5e5e 100%);
          transition: width 0.25s ease;
        "></div>

        <div class="cpr-hp-current" style="
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          font-size: 14px;
          font-weight: 800;
          color: #ffffff;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
          pointer-events: none;
        ">${Number.isFinite(current) ? current : 0}</div>

        <div class="cpr-hp-name" style="
          position: absolute;
          left: 6px;
          bottom: -25px;           /* 2.1x offset */
          padding: 1px 6px;
          font-size: 12px;
          line-height: 16px;
          font-weight: 700;
          color: #ffffff;
          background: rgba(0,0,0,0.6);
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        ">${actor.name}</div>
      </div>
    `);

    // Pulsing effect for low HP (<25%)
    const fillEl = hpBar.find(".cpr-hp-fill");
    if (pct < 25) {
      fillEl.css("animation", "cpr-pulse-red 1s infinite alternate");
    }

    // Add keyframes dynamically if not present
    if (!$("style#cpr-pulse-style").length) {
      $("head").append(`
        <style id="cpr-pulse-style">
          @keyframes cpr-pulse-red {
            0% { background-color: #ff2a2a; }
            50% { background-color: #ff0000; }
            100% { background-color: #ff2a2a; }
          }
        </style>
      `);
    }

    statHud.append(hpBar);
    this.hudElement.append(statHud, portrait);
  }

  static setActiveCharacter(actor) {
    if (!actor) return;
    this.activeCharacterId = actor.id;
    game.settings.set("cyberpunker-red", "lastActive", actor.id);
    this._buildHUD();
  }

  static async restoreLastActive() {
    const lastId = game.settings.get("cyberpunker-red", "lastActive");
    let actor = game.actors.get(lastId);
    if (!actor) {
      const tok = canvas.tokens.placeables.find(t => t.actor?.isOwner);
      actor = tok?.actor || game.actors.find(a => a.isOwner);
    }
    if (actor) this.setActiveCharacter(actor);
  }

  static focusActiveToken() {
    const token = this._getActiveToken();
    if (!token) return;
    token.control({ releaseOthers: true });
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
  }

  static _wireDataRefresh() {
    Hooks.on("updateActor", (doc) => { if (doc.id === this.activeCharacterId) this._buildHUD(); });
    Hooks.on("updateToken", (doc) => { if (doc.actorId === this.activeCharacterId) this._buildHUD(); });
    Hooks.on("deleteToken", (doc) => { if (doc.actorId === this.activeCharacterId) this._buildHUD(); });
    Hooks.on("createToken", (doc) => { if (doc.actorId === this.activeCharacterId) this._buildHUD(); });
    Hooks.on("controlToken", (token, controlled) => {
      if (controlled && token.actor?.isOwner) this.setActiveCharacter(token.actor);
    });
  }
}

// ---------- Hooks ----------
Hooks.once("init", () => {
  game.settings.register("cyberpunker-red", "lastActive", {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("cyberpunker-red", "hpAttribute", {
    name: "HP Attribute Path",
    hint: "Data path for HP (default: system.derivedStats.HP). Examples: system.attributes.hp, system.health, etc.",
    scope: "world",
    config: true,
    type: String,
    default: "system.derivedStats.HP"
  });
});

Hooks.once("ready", async () => {
  await CyberpunkerRedHUD.restoreLastActive();
  CyberpunkerRedHUD._wireDataRefresh();
  if (!CyberpunkerRedHUD.hudElement) CyberpunkerRedHUD._buildHUD();

  window.addEventListener("keydown", (ev) => {
    const actor = CyberpunkerRedHUD._getActiveActor();
    if (!actor) return;

    if (ev.key === "Tab") {
      ev.preventDefault();
      if (actor.sheet?.rendered) actor.sheet.close();
      else actor.sheet?.render(true);
    }

    if (ev.key.toLowerCase() === "q") {
      ev.preventDefault();
      CyberpunkerRedHUD.focusActiveToken();
    }

    const moveKeys = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"];
    if (moveKeys.includes(ev.key.toLowerCase())) {
      const token = canvas.tokens.controlled[0];
      if (token) canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 200 });
      else CyberpunkerRedHUD.focusActiveToken();
    }
  });
});
