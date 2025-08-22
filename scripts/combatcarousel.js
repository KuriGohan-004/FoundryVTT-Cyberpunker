// == Combat Carousel Script ==
// Adds a horizontal turn order carousel at the top of the screen

// Configuration
const carouselHeight = "10vh"; // 10% of screen height
const visibleCount = 6;        // Current + next 5 tokens
const tokenGap = "5px";        // Gap between tokens
const activeTokenScale = 2;    // Active token size multiplier
const activeBorderColor = "red"; // Glow color for active token

// Helper function to create carousel container
function createCarousel() {
    let carousel = document.createElement("div");
    carousel.id = "combat-carousel";
    carousel.style.position = "fixed";
    carousel.style.top = "0";
    carousel.style.left = "50%";
    carousel.style.transform = "translateX(-50%)";
    carousel.style.display = "flex";
    carousel.style.alignItems = "center";
    carousel.style.height = carouselHeight;
    carousel.style.zIndex = "9999";
    carousel.style.background = "rgba(0,0,0,0.4)";
    carousel.style.padding = "5px";
    carousel.style.borderRadius = "5px";
    carousel.style.overflow = "hidden";
    carousel.style.whiteSpace = "nowrap";
    document.body.appendChild(carousel);
    return carousel;
}

// Function to render carousel given a combat
function renderCarousel(combat) {
    if (!combat) return;
    let carousel = document.getElementById("combat-carousel") || createCarousel();
    carousel.innerHTML = "";

    let turnOrder = combat.turns;
    if (!turnOrder.length) return;

    const currentIndex = combat.turn;
    for (let i = 0; i < visibleCount; i++) {
        const index = (currentIndex + i) % turnOrder.length;
        const combatant = turnOrder[index];
        const token = canvas.tokens.get(combatant.tokenId);
        if (!token) continue;

        const tokenEl = document.createElement("div");
        tokenEl.style.width = `calc(${carouselHeight} - 10px)`;
        tokenEl.style.height = `calc(${carouselHeight} - 10px)`;
        tokenEl.style.marginRight = tokenGap;
        tokenEl.style.flex = "0 0 auto";
        tokenEl.style.backgroundImage = `url(${token.data.img})`;
        tokenEl.style.backgroundSize = "cover";
        tokenEl.style.backgroundPosition = "center";
        tokenEl.style.borderRadius = "5px";
        tokenEl.style.cursor = "pointer";
        tokenEl.style.transition = "transform 0.2s, box-shadow 0.2s";

        // Highlight current active token
        if (i === 0) {
            tokenEl.style.transform = `scale(${activeTokenScale})`;
            tokenEl.style.boxShadow = `0 0 15px 5px ${activeBorderColor}`;
        }

        // Click handlers
        tokenEl.addEventListener("click", () => {
            canvas.tokens.get(combatant.tokenId)?.control({ releaseOthers: true });
            canvas.animatePan({ x: token.x + token.width / 2, y: token.y + token.height / 2, scale: canvas.stage.scale.x });
        });
        tokenEl.addEventListener("dblclick", () => {
            combatant.actor?.sheet?.render(true);
        });

        carousel.appendChild(tokenEl);
    }

    // Add continuation arrow if needed
    if (turnOrder.length > visibleCount) {
        const arrow = document.createElement("div");
        arrow.innerText = "→";
        arrow.style.fontSize = "2em";
        arrow.style.color = "white";
        arrow.style.display = "flex";
        arrow.style.alignItems = "center";
        arrow.style.justifyContent = "center";
        arrow.style.marginLeft = tokenGap;
        carousel.appendChild(arrow);
    }
}

// Hook to create carousel at combat start
Hooks.on("combatStart", (combat) => {
    renderCarousel(combat);
});

// Hook to update carousel whenever turn changes
Hooks.on("updateCombat", (combat, changed, options, userId) => {
    if (changed.turn !== undefined) {
        renderCarousel(combat);
    }
});
