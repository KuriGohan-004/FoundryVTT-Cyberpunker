/**
 * Cyberpunker Red Weapon Sound System
 * Plays a configured sound when a weapon attack is rolled
 */

Hooks.once("init", () => {
    console.log("Cyberpunker Red Weapon Sounds | Initializing");

    // Define weapon types in your system
    const weaponTypes = ["melee", "pistol", "rifle", "shotgun", "heavy"];

    // Register a world setting for each weapon type
    weaponTypes.forEach(type => {
        game.settings.register("cyberpunker-red", `sound-${type}`, {
            name: `Sound for ${type} weapons`,
            hint: `Select the sound effect to play when a ${type} weapon attack is rolled`,
            scope: "world",
            config: true,
            type: String,
            default: "", // Default no sound
        });
    });
});

// Hook into item rolls
Hooks.on("rollItem", async (item, rollData) => {
    try {
        // Only proceed if this is a weapon
        if (!item || item.type !== "weapon") return;

        // Access the weapon type (adjust property based on your system)
        const weaponType = item.system.weaponType;
        if (!weaponType) return;

        // Retrieve GM-configured sound for this weapon type
        const soundPath = game.settings.get("cyberpunker-red", `sound-${weaponType}`);
        if (!soundPath) return;

        // Play the sound for all connected players
        AudioHelper.play({ src: soundPath, volume: 0.8, autoplay: true, loop: false }, true);

        console.log(`Weapon rolled: ${item.name} | Type: ${weaponType} | Playing sound: ${soundPath}`);
    } catch (err) {
        console.error("Cyberpunker Red Weapon Sounds | Error:", err);
    }
});
