/**
 * Cyberpunker Red Weapon Sound System with File Picker
 * Plays a configured sound when a weapon attack is rolled
 */

Hooks.once("init", async () => {
    console.log("Cyberpunker Red Weapon Sounds | Initializing");

    // Define your weapon types
    const weaponTypes = ["melee", "pistol", "rifle", "shotgun", "heavy"];

    // Register a setting for each weapon type with a FilePicker button
    weaponTypes.forEach(type => {
        game.settings.register("cyberpunker-red", `sound-${type}`, {
            name: `Sound for ${type} weapons`,
            hint: `Select the sound effect to play when a ${type} weapon attack is rolled`,
            scope: "world",
            config: true,
            type: String,
            default: "",
            filePicker: true, // Enable file picker
            onChange: value => {
                console.log(`Cyberpunker Red | ${type} sound set to: ${value}`);
            }
        });
    });

    // Add a small UI helper for FilePicker buttons
    ui.notifications.info("Cyberpunker Red Weapon Sounds initialized. Use Settings to select sound files.");
});

// Hook into item rolls
Hooks.on("rollItem", async (item, rollData) => {
    try {
        if (!item || item.type !== "weapon") return;

        // Adjust this property based on your system
        const weaponType = item.system.weaponType;
        if (!weaponType) return;

        // Get the GM-selected sound path
        const soundPath = game.settings.get("cyberpunker-red", `sound-${weaponType}`);
        if (!soundPath) return;

        // Play the sound for all connected players
        AudioHelper.play({ src: soundPath, volume: 0.8, autoplay: true, loop: false }, true);

        console.log(`Weapon rolled: ${item.name} | Type: ${weaponType} | Playing sound: ${soundPath}`);
    } catch (err) {
        console.error("Cyberpunker Red Weapon Sounds | Error:", err);
    }
});
