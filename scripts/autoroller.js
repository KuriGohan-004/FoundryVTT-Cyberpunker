const MODULE_ID = "cyberpunker-red";

// ----------------------
// Settings Registration
// ----------------------
Hooks.once("init", () => {

  // Auto-roll initiative setting
  game.settings.register(MODULE_ID, "autoRollInitiative", {
    name: "Auto-Roll Initiative",
    hint: "Automatically roll initiative for all tokens without initiative when combat starts.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  // Combat start message
  game.settings.register(MODULE_ID, "combatStartMessage", {
    name: "Combat Start Message",
    hint: "Custom message to display when combat starts.",
    scope: "world",
    config: true,
    default: "Combat has begun!",
    type: String
  });

  // Combat start sound
  game.settings.register(MODULE_ID, "combatStartSound", {
    name: "Combat Start Sound",
    hint: "Select a sound file to play when combat starts.",
    scope: "world",
    config: true,
    default: "",
    type: String,
    filePicker: "audio"
  });

  // Combat start playlist
  game.settings.register(MODULE_ID, "combatStartPlaylist", {
    name: "Combat Start Playlist",
    hint: "Select a playlist to play when combat starts.",
    scope: "world",
    config: true,
    default: "",
    type: String,
    choices: () => {
      // Return an object mapping playlist IDs to their names
      const playlists = game.playlists.contents;
      const options = {};
      playlists.forEach(p => options[p.id] = p.name);
      return options;
    }
  });

});

// ----------------------
// Combat Start Handling
// ----------------------
Hooks.on("combatStart", async (combat) => {

  // Show custom message
  const msg = game.settings.get(MODULE_ID, "combatStartMessage");
  if (msg) ChatMessage.create({ content: `<b>${msg}</b>` });

  // Play combat start sound (once)
  if (!combat.getFlag(MODULE_ID, "soundPlayed")) {
    const soundPath = game.settings.get(MODULE_ID, "combatStartSound");
    if (soundPath && game.user.isGM) {
      game.socket.emit(`module.${MODULE_ID}`, { action: "playSound", src: soundPath });
    }
    await combat.setFlag(MODULE_ID, "soundPlayed", true);
  }

  // Play combat start playlist
  if (!combat.getFlag(MODULE_ID, "playlistPlayed")) {
    const playlistId = game.settings.get(MODULE_ID, "combatStartPlaylist");
    if (playlistId && game.user.isGM) {
      const playlist = game.playlists.get(playlistId);
      if (playlist) {
        await playlist.playAll();
        game.socket.emit(`module.${MODULE_ID}`, { action: "playPlaylist", playlistId: playlistId });
      }
    }
    await combat.setFlag(MODULE_ID, "playlistPlayed", true);
  }

});

// ----------------------
// Socket Listeners
// ----------------------
game.socket.on(`module.${MODULE_ID}`, async (data) => {
  if (data.action === "playSound" && data.src) {
    AudioHelper.play({ src: data.src, volume: 0.8, autoplay: true, loop: false }, true);
  }
  if (data.action === "playPlaylist" && data.playlistId) {
    const playlist = game.playlists.get(data.playlistId);
    if (playlist) playlist.playAll();
  }
});

// ----------------------
// Auto-roll Initiative
// ----------------------
Hooks.on("combatStart", async (combat) => {
  if (!game.settings.get(MODULE_ID, "autoRollInitiative")) return;

  const unrolled = combat.combatants.filter(c => c.initiative === null);
  if (!unrolled.length) return;

  await combat.rollInitiative(unrolled.map(c => c.id));
  console.log(`Rolled initiative for ${unrolled.length} combatants.`);

  await combat.nextRound();
  console.log("Advanced to next combat round.");

  if (ui.sidebar?.tabs?.active !== "chat") {
    ui.sidebar.activateTab("chat");
  }
});

// ----------------------
// Auto-switch GM UI to Combat Tab
// ----------------------
Hooks.on("createCombat", (combat, options, userId) => {
  if (!game.user.isGM) return;
  if (ui.sidebar?.tabs?.active !== "combat") {
    ui.sidebar.activateTab("combat");
    console.log("Switched GM UI to Combat tab.");
  }
});
