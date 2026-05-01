// --- PHASER ENGINE SETUP ---
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#1a1a1a', // Fallback color
    parent: 'game-container',
    scene: { 
        preload: preload, // NEW: We added the preload phase
        create: create 
    }
};

const game = new Phaser.Game(config);

function preload() {
    const scene = this;
    // 1. Load your Photoshop assets here!
    // scene.load.image('tableBg', 'assets/bg_table.jpg');
    // scene.load.image('btn', 'assets/ui_button.png');
    // scene.load.image('binderCover', 'assets/zone_binder.png');
    // scene.load.image('sellTray', 'assets/zone_sell.png');
}

function create() {
    const scene = this; 

    // 2. Draw the background first so it sits at the very back
    // scene.add.image(512, 384, 'tableBg');

    // --- TOP HUD (Clean & Minimal) ---
    const hudBg = scene.add.rectangle(512, 30, 1024, 60, 0x000000, 0.8); // 80% opacity black bar
    
    scene.moneyText = scene.add.text(30, 30, 'BANK: $' + playerMoney.toFixed(2), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    scene.packsText = scene.add.text(300, 30, 'PACKS: ' + calculateTotalPacks(), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#3498db', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    // --- THE DASHBOARD (Bottom UI Panel) ---
    const dashBg = scene.add.rectangle(512, 700, 1024, 136, 0x111111).setStrokeStyle(4, 0x333333);

    // Left: Binder Drop Zone
    scene.binderZone = scene.add.rectangle(120, 700, 180, 100, 0x8e44ad);
    // Future image: scene.binderZone = scene.add.image(120, 700, 'binderCover').setInteractive();
    scene.add.text(120, 700, 'DROP TO SAVE', { fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);

    // Right: Sell Zone
    scene.sellZone = scene.add.rectangle(904, 700, 180, 100, 0xc0392b);
    // Future image: scene.sellZone = scene.add.image(904, 700, 'sellTray').setInteractive();
    scene.add.text(904, 700, 'DROP TO SELL', { fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);

    // Center: Action Buttons (Sleek and grouped)
    createJuicyButton(scene, 350, 700, 'STORE', () => { storeOverlay.setVisible(true); });
    createJuicyButton(scene, 512, 700, 'OPEN PACK', () => { inventoryOverlay.setVisible(true); }, 0xe67e22);
    createJuicyButton(scene, 674, 700, 'BINDER', () => { binderOverlay.setVisible(true); });
}

// --- NEW: THE "JUICY" BUTTON FACTORY ---
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
