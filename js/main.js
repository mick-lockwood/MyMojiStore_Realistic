console.log("=== THE NEW UI CODE IS RUNNING ===");

// --- 1. GLOBAL STATE (Put this at the very top!) ---
let playerMoney = 50.00;
let playerPacks = { "basic": 0, "premium": 0, "legendary": 0 };

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
    scene.load.image('bg_table', 'assets/bg_table.jpg');
    scene.load.image('bg_mat', 'assets/bg_mat.png');
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
    scene.add.image(512, 384, 'bg_mat');

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

    // 1. First, build the hidden menu overlays
    const storeOverlay = createOverlay(scene, '--- THE STORE ---');
    setupStore(scene, storeOverlay);

    const inventoryOverlay = createOverlay(scene, '--- OPEN PACKS ---');
    setupInventory(scene, inventoryOverlay);

    const binderOverlay = createOverlay(scene, '--- MY BINDER ---');
    setupBinder(scene, binderOverlay);

    // 2. Now, create the action buttons and tell them to show the overlays when clicked
    createJuicyButton(scene, 350, 700, 'STORE', () => { 
        storeOverlay.setVisible(true); 
    });
    
    createJuicyButton(scene, 512, 700, 'OPEN PACK', () => { 
        inventoryOverlay.setVisible(true); 
    }, 0xe67e22);
    
    createJuicyButton(scene, 674, 700, 'BINDER', () => { 
        binderOverlay.setVisible(true); 
    });
}

// --- THE "JUICY" BUTTON FACTORY ---
// This adds programmatic "glam" by making buttons smoothly scale when hovered
function createJuicyButton(scene, x, y, text, onClick, color = 0x2980b9) {
    const container = scene.add.container(x, y);
    
    const bg = scene.add.rectangle(0, 0, 140, 50, color).setStrokeStyle(3, 0xffffff);
    
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
} // <--- THIS BRACKET WAS MISSING! IT CLOSES THE BUTTON FUNCTION.

// --- OVERLAY MENU FACTORY ---
// Creates a simple full-screen popup menu
function createOverlay(scene, titleText) {
    const container = scene.add.container(0, 0);
    
    // Semi-transparent black background covering the whole screen
    const bg = scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.9);
    bg.setInteractive(); // This blocks clicks from passing through to the table
    
    // The main menu panel
    const panel = scene.add.rectangle(512, 384, 800, 600, 0x2c3e50).setStrokeStyle(4, 0xecf0f1);
    
    // Title text
    const title = scene.add.text(512, 150, titleText, { 
        fontFamily: 'Courier New', fontSize: '40px', color: '#f1c40f', fontStyle: 'bold' 
    }).setOrigin(0.5);
    
    // Close Button
    const closeBtn = createJuicyButton(scene, 512, 600, 'CLOSE', () => {
        container.setVisible(false);
    }, 0xe74c3c);
    
    // Add everything to the container
    container.add([bg, panel, title, closeBtn]);
    
    // Hide it by default
    container.setVisible(false);
    
    // Make sure it draws on top of everything else
    container.setDepth(100); 
    
    return container;
}

// ==========================================
// --- MENU POPULATION LOGIC ---
// ==========================================

function setupStore(scene, overlay) {
    let yOffset = 250;
    
    // Loop through our pack database and create a store item for each
    Object.keys(packDatabase).forEach(key => {
        const pack = packDatabase[key];
        
        // Pack Name & Price
        const itemText = scene.add.text(350, yOffset, `${pack.name} - $${pack.cost.toFixed(2)}`, { 
            fontFamily: 'Courier New', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' 
        }).setOrigin(0, 0.5);
        
        // Buy Button
        const buyBtn = createJuicyButton(scene, 700, yOffset, 'BUY', () => {
            if (playerMoney >= pack.cost) {
                // Deduct money & add pack
                playerMoney -= pack.cost;
                playerPacks[key]++;
                
                // Update Top HUD
                scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
                scene.packsText.setText('PACKS: ' + calculateTotalPacks());
                
                // Little visual bump to show it worked
                scene.tweens.add({ targets: buyBtn, scaleX: 1.1, scaleY: 1.1, yoyo: true, duration: 100 });
            } else {
                console.log("Not enough money!"); // We can add a red flash here later
            }
        }, 0x27ae60); // Green button
        
        overlay.add([itemText, buyBtn]);
        yOffset += 100; // Move down for the next item
    });
}

function setupInventory(scene, overlay) {
    // We will build out the actual gacha unboxing animation next, 
    // for now, let's just show what you own!
    const comingSoonText = scene.add.text(512, 300, "Pack Opening Animation\nComing Soon!", { 
        fontFamily: 'Courier New', fontSize: '32px', color: '#3498db', align: 'center'
    }).setOrigin(0.5);
    
    overlay.add([comingSoonText]);
}

function setupBinder(scene, overlay) {
    // We will build the grid of your collected cards here next
    const comingSoonText = scene.add.text(512, 300, "Card Grid View\nComing Soon!", { 
        fontFamily: 'Courier New', fontSize: '32px', color: '#9b59b6', align: 'center'
    }).setOrigin(0.5);
    
    overlay.add([comingSoonText]);
}
