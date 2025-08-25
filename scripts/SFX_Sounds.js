Hooks.once("init", async () => {
    console.log("Cyberpunker Red Weapon Sounds | Initializing");

    const weaponTypes = ["melee", "pistol", "rifle", "shotgun", "heavy"];

    weaponTypes.forEach(type => {
        game.settings.register("cyberpunker-red", `sound-${type}`, {
            name: `Sound for ${type} weapons`,
            hint: `Select the sound effect to play when a ${type} weapon attack is rolled`,
            scope: "world",
            config: true,
            type: String,
            default: "",
            filePicker: true
        });
    });
});

// Hook into chat messages instead of item rolls
Hooks.on("createChatMessage", async (msg) => {
    try {
        if (!msg.isRoll) return; // Only process rolls

        // The data sent with the roll
        const rollData = msg.data.flags?.["cyberpunker-red"] || msg.data.flags?.["red"]; 

        // Only proceed if this is a weapon attack
        if (!rollData?.weaponId) return;

        const actor = game.actors.get(msg.data.speaker.actor);
        if (!actor) return;

        const item = actor.items.get(rollData.weaponId);
        if (!item || item.type !== "weapon") return;

        const weaponType = item.system.weaponType;
        if (!weaponType) return;

        const soundPath = game.settings.get("cyberpunker-red", `sound-${weaponType}`);
        if (!soundPath) return;

        AudioHelper.play({ src: soundPath, volume: 0.8, autoplay: true, loop: false }, true);

        console.log(`Weapon attack rolled: ${item.name} (${weaponType}) → playing ${soundPath}`);
    } catch (err) {
        console.error("Cyberpunker Red Weapon Sounds | Error:", err);
    }
});
