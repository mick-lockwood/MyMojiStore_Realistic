console.log("=== THE NEW UI CODE IS RUNNING ===");

// --- DATABASE: BOOSTER PACKS ---
const packDatabase = {
    "basic": { name: "Basic Pack", cost: 5.00, color: 0x2ecc71, weights: { "Common": 75, "Rare": 20, "Epic": 4, "Legendary": 1 } },
    "premium": { name: "Premium Pack", cost: 20.00, color: 0x9b59b6, weights: { "Common": 30, "Rare": 40, "Epic": 20, "Legendary": 10 } },
    "legendary": { name: "Legendary Pack", cost: 100.00, color: 0xf1c40f, weights: { "Common": 0, "Rare": 20, "Epic": 40, "Legendary": 40 } }
};

// --- GLOBAL STATE ---
let playerMoney = 50.00;
let playerPacks = { "basic": 0, "premium": 0, "legendary": 0 };
let playerInventory = {};
let shoppingCart = { "basic": 0, "premium": 0, "legendary": 0 }; 
myMojiDatabase.forEach(moji => playerInventory[moji.id] = 0);

function calculateTotalPacks() {
    return playerPacks.basic + playerPacks.premium + playerPacks.legendary;
}

// --- PHASER ENGINE SETUP ---
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#1a1a1a', 
    parent: 'game-container',
    scene: { 
        preload: preload, 
        create: create 
    }
};

const game = new Phaser.Game(config);

function preload() {
    const scene = this;
    
    // THIS is how we connect your uploaded files!
    // Make sure the names here match EXACTLY what is in your assets folder.
    scene.load.image('bg_table', 'assets/bg_table.jpg'); // or .png depending on how you saved it
    scene.load.image('zone_binder', 'assets/zone_binder.png');
    scene.load.image('zone_sell', 'assets/zone_sell.png');
    
    // If you haven't uploaded these yet, that's okay, but the game will look for them:
    // scene.load.image('card_template', 'assets/card_template.png');
    // scene.load.image('pack_legendary', 'assets/pack_legendary.png');
}

function create() {
    const scene = this; 

    // Draw the background first
    scene.add.image(512, 384, 'bg_table');

    // --- TOP HUD ---
    const hudBg = scene.add.rectangle(512, 30, 1024, 60, 0x000000, 0.8); 
    
    scene.moneyText = scene.add.text(30, 30, 'BANK: $' + playerMoney.toFixed(2), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    scene.packsText = scene.add.text(300, 30, 'PACKS: ' + calculateTotalPacks(), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#3498db', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    // --- THE DASHBOARD ---
    const dashBg = scene.add.rectangle(512, 700, 1024, 136, 0x111111).setStrokeStyle(4, 0x333333);

    // Left: Binder Drop Zone
    scene.binderZone = scene.add.image(120, 700, 'zone_binder').setInteractive();
    scene.add.text(120, 700, 'DROP TO SAVE', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Right: Sell Zone
    scene.sellZone = scene.add.image(904, 700, 'zone_sell').setInteractive();
    scene.add.text(904, 700, 'DROP TO SELL', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Center: Action Buttons 
    // (Note: clicking these will error until you paste back your overlay logic!)
    createJuicyButton(scene, 350, 700, 'STORE', () => { /* Store logic */ });
    createJuicyButton(scene, 512, 700, 'OPEN PACK', () => { /* Inventory logic */ }, 0xe67e22);
    createJuicyButton(scene, 674, 700, 'BINDER', () => { /* Binder logic */ });
}

// --- THE "JUICY" BUTTON FACTORY ---
// This adds programmatic "glam" by making buttons smoothly scale when hovered
function createJuicyButton(scene, x, y, text, onClick, color = 0x2980b9) {
    const container = scene.add.container(x, y);
    
    const bg = scene.add.rectangle(0, 0, 140, 50, color).setStrokeStyle(3, 0xffffff);
    // Future image: const bg = scene.add.image(0, 0, 'btn');
    
    const txt = scene.add.text(0, 0, text, { 
        fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' 
    }).setOrigin(0.5);

    container.add([bg, txt]);
    container.setSize(140, 50);
    container.setInteractive({ cursor: 'pointer' });

    // Hover Animation (Glam!)
    container.on('pointerover', () => {
        scene.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 100 });
    });
    container.on('pointerout', () => {
        scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    
    // Click Action
    container.on('pointerdown', () => {
        container.setScale(0.95); // Squish
        onClick();
    });
    container.on('pointerup', () => container.setScale(1.1));

    return container;
}
