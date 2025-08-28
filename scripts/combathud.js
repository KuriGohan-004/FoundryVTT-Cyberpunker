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

  addToken(token: TokenDocument) {
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
    square.onclick = async () => {
      // Pan to token
      canvas.animatePan({
        x: token.x + token.width / 2 - canvas.app.renderer.width / 2,
        y: token.y + token.height / 2 - canvas.app.renderer.height / 2
      });
      // Select token if owned
      if (token.isOwner) await token.control({ releaseOthers: true });
    };
    this.container.appendChild(square);
  }

  render(tokens: TokenDocument[], encounterActive: boolean) {
    if (!game.settings.get('cyberpunker-red', 'enableTopBar')) {
      this.container.style.display = "none";
      return;
    }

    if (encounterActive) {
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

  // Find an encounter that hasn't started yet
  let encounter = game.combats.contents.find(c => !c.started);
  if (!encounter) {
    encounter = await Combat.create({ name: "Player Encounter", scene: canvas.scene.id });
  }

  // Add all player-owned tokens (including offline)
  const playerTokens = canvas.tokens.placeables.filter(t => t.actor?.hasPlayerOwner);
  for (let token of playerTokens) {
    const existing = encounter.combatants.find(c => c.actor?.id === token.actor?.id);
    if (existing) await encounter.deleteEmbeddedDocuments("Combatant", [existing.id]);

    await encounter.createEmbeddedDocuments("Combatant", [{ tokenId: token.id, actorId: token.actor?.id }]);
  }

  // Render top bar only if encounter hasn't started
  topBar?.render(playerTokens, encounter.started);
}

// Initialize top bar
Hooks.once('ready', () => {
  topBar = new TopBar();
  updateEncounter();
});

// Update on scene activation, token changes, and combat deletion
Hooks.on('canvasReady', () => updateEncounter());
Hooks.on('createToken', () => updateEncounter());
Hooks.on('deleteToken', () => updateEncounter());
Hooks.on('updateScene', () => updateEncounter());
Hooks.on('deleteCombat', () => updateEncounter());
