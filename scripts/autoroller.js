const MODULE_ID = "cyberpunker-red";

// Register a world-level setting to toggle auto-roll initiative
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoRollInitiative", {
    name: "Auto-Roll Initiative",
    hint: "Automatically roll initiative for all tokens without initiative when combat starts.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
});

// Auto-roll initiative on combat start if enabled
Hooks.on("combatStart", async (combat) => {
  if (!game.settings.get(MODULE_ID, "autoRollInitiative")) return;

  const unrolled = combat.combatants.filter(c => c.initiative === null);
  if (!unrolled.length) return;

  await combat.rollInitiative(unrolled.map(c => c.id));
  console.log(`Rolled initiative for ${unrolled.length} combatants.`);

  // Start the next combat round
  await combat.nextRound();
  console.log("Advanced to next combat round.");

  // Switch GM UI to chat tab
  if (ui.sidebar?.tabs?.active !== "chat") {
    ui.sidebar.activateTab("chat");
  }
  
});

// ----------------------
// Combat Start Enhancements
// ----------------------
Hooks.once("init", () => {
  // Setting to hide initiative rolls
  game.settings.register(MODULE_ID, "hideInitiativeChat", {
    name: "Hide Initiative Rolls in Chat",
    hint: "Prevent initiative rolls from being displayed in the chat log.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Setting for custom combat start message
  game.settings.register(MODULE_ID, "combatStartMessage", {
    name: "Combat Start Message",
    hint: "Custom message to display when combat starts.",
    scope: "world",
    config: true,
    default: "Combat has begun!",
    type: String
  });

  // Setting for custom combat start sound
  game.settings.register(MODULE_ID, "combatStartSound", {
    name: "Combat Start Sound",
    hint: "Path to the sound file to play when combat starts.",
    scope: "world",
    config: true,
    default: "",
    type: String
  });
});

// Hide initiative rolls and show custom message/play sound
Hooks.on("preCreateChatMessage", (message, options, userId) => {
  if (game.settings.get(MODULE_ID, "hideInitiativeChat") && message.data?.flags?.core?.roll?.type === "initiative") {
    return false; // Prevent the message from posting
  }
});

Hooks.on("combatStart", async (combat) => {
  // Show custom message
  const msg = game.settings.get(MODULE_ID, "combatStartMessage");
  if (msg) {
    ChatMessage.create({ content: `<b>${msg}</b>` });
  }

  // Play custom sound
  const soundPath = game.settings.get(MODULE_ID, "combatStartSound");
  if (soundPath) {
    AudioHelper.play({ src: soundPath, volume: 0.8, autoplay: true, loop: false }, true);
  }
});
