// cyberpunker-red-topbar.js

Hooks.once('init', () => {
  console.log("Cyberpunker Red Top Bar | Initializing");

  // Module setting to toggle the top bar
  game.settings.register('cyberpunker-red', 'enableTopBar', {
    name: "Enable Player Token Top Bar",
    hint: "If disabled, the top bar showing player tokens will not appear.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
});

class TopBar {
  container: HTMLElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "cyberpunker-red-topbar";
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 4px;
      z-index: 1000;
      background: rgba(0,0,0,0.5);
      border-radius: 4px;
    `;
    document.body.appendChild(this.container);
  }

  clear() {
    this.container.innerHTML = "";
  }

  addToken(token: Token) {
    const square = document.createElement("div");
    square.style.cssText = `
      width: 36px;
      height: 36px;
      background-image: url(${token.data.img});
      background-size: cover;
      cursor: pointer;
      border: 2px solid white;
      border-radius: 4px;
    `;
    square.onclick = () => {
      canvas.animatePan({ x: token.x + token.w / 2 - canvas.width / 2, y: token.y + token.h / 2 - canvas.height / 2 });
      if (token.isOwner) token.control({ releaseOthers: true });
    };
    this.container.appendChild(square);
  }

  render(tokens: Token[]) {
    if (!game.settings.get('cyberpunker-red', 'enableTopBar')) return;
    if (game.combat?.started) {
      this.container.style.display = "none";
      return;
    }
    this.container.style.display = "flex";
    this.clear();
    tokens.forEach(token => this.addToken(token));
  }
}

let topBar: TopBar;

async function updateEncounter() {
  if (!canvas.scene) return;

  // Ensure an encounter exists
  let encounter = game.combats.contents.find(c => !c.started) || await Combat.create({ name: "Player Encounter" });

  const playerTokens = canvas.tokens.placeables.filter(t => t.actor?.hasPlayerOwner);
  const tokenIds: string[] = [];

  for (let token of playerTokens) {
    // Remove old token from encounter if exists
    const existing = encounter.combatants.find(c => c.actor?.id === token.actor?.id);
    if (existing) await encounter.deleteEmbeddedDocuments("Combatant", [existing.id]);
    // Add new token
    const newCombatant = { tokenId: token.id, actorId: token.actor?.id };
    await encounter.createEmbeddedDocuments("Combatant", [newCombatant]);
    tokenIds.push(token.id);
  }

  // Render top bar
  topBar?.render(playerTokens);
}

// Hooks to update top bar and encounter
Hooks.once('ready', () => {
  topBar = new TopBar();
  updateEncounter();
});

Hooks.on('createToken', () => updateEncounter());
Hooks.on('deleteToken', () => updateEncounter());
Hooks.on('updateCombat', () => topBar?.render(canvas.tokens.placeables.filter(t => t.actor?.hasPlayerOwner)));
Hooks.on('deleteCombat', () => updateEncounter());
Hooks.on('updateScene', () => updateEncounter());
Hooks.on('canvasReady', () => updateEncounter());
