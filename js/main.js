const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#1a1a1a', 
    parent: 'game-container',
    scene: { 
        preload: preload, // Tell Phaser to run this first
        create: create 
    }
};

const game = new Phaser.Game(config);

function preload() {
    const scene = this;
    
    // We create a hidden graphics tool to "paint" our assets
    let g = scene.make.graphics();

    // 1. Table Background (A sleek, dark playmat)
    g.fillStyle(0x1e272e, 1);
    g.fillRect(0, 0, 1024, 768);
    g.generateTexture('bg_table', 1024, 768);
    g.clear();

    // 2. UI Button (A sleek, rounded pill shape)
    g.fillStyle(0x2980b9, 1);
    g.lineStyle(2, 0xffffff, 1);
    g.fillRoundedRect(0, 0, 140, 50, 25);
    g.strokeRoundedRect(0, 0, 140, 50, 25);
    g.generateTexture('ui_button', 140, 50);
    g.clear();

    // 3. Binder Drop Zone (Looks like a closed purple book)
    g.fillStyle(0x8e44ad, 1);
    g.lineStyle(4, 0x1a1a1a, 1);
    g.fillRoundedRect(0, 0, 180, 100, 10);
    g.strokeRoundedRect(0, 0, 180, 100, 10);
    g.fillStyle(0x9b59b6, 1); // Draw a lighter book spine
    g.fillRect(10, 0, 20, 100);
    g.generateTexture('zone_binder', 180, 100);
    g.clear();

    // 4. Sell Zone (Looks like a red cash tray)
    g.fillStyle(0xc0392b, 1);
    g.lineStyle(4, 0x1a1a1a, 1);
    g.fillRect(0, 0, 180, 100);
    g.strokeRect(0, 0, 180, 100);
    g.fillStyle(0x000000, 0.3); // Draw an inner shadow
    g.fillRect(10, 10, 160, 80);
    g.generateTexture('zone_sell', 180, 100);
    g.clear();

    // 5. Card Template (White card base with rounded corners)
    g.fillStyle(0xffffff, 1);
    g.lineStyle(6, 0x1a1a1a, 1);
    g.fillRoundedRect(3, 3, 214, 314, 12);
    g.strokeRoundedRect(3, 3, 214, 314, 12);
    g.fillStyle(0xe0e0e0, 1); // Grey image placeholder box
    g.fillRect(20, 40, 180, 160);
    g.generateTexture('card_template', 220, 320);
    g.clear();

    // --- Helper function for Booster Packs ---
    function createPackTexture(key, color) {
        g.fillStyle(color, 1);
        g.lineStyle(4, 0x1a1a1a, 1);
        g.fillRoundedRect(2, 2, 136, 196, 8);
        g.strokeRoundedRect(2, 2, 136, 196, 8);
        g.fillStyle(0x1a1a1a, 1); // Dark foil strip at the top
        g.fillRect(2, 20, 136, 30);
        g.generateTexture(key, 140, 200);
        g.clear();
    }

    // 6, 7, 8. Generate the three pack tiers
    createPackTexture('pack_basic', 0x2ecc71);
    createPackTexture('pack_premium', 0x9b59b6);
    createPackTexture('pack_legendary', 0xf1c40f);
}

function create() {
    const scene = this; 

    // 2. Draw the background first so it sits at the very back
   scene.add.image(512, 384, 'bg_table');

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
