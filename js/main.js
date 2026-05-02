console.log("=== THE NEW UI CODE IS RUNNING ===");

// --- 1. GLOBAL STATE & DATABASES (Put this at the very top!) ---

const packDatabase = {
    "basic": { name: "Basic Pack", cost: 5.00, color: 0x2ecc71, weights: { "Common": 75, "Rare": 20, "Epic": 4, "Legendary": 1 } },
    "premium": { name: "Premium Pack", cost: 20.00, color: 0x9b59b6, weights: { "Common": 30, "Rare": 40, "Epic": 20, "Legendary": 10 } },
    "legendary": { name: "Legendary Pack", cost: 100.00, color: 0xf1c40f, weights: { "Common": 0, "Rare": 20, "Epic": 40, "Legendary": 40 } }
};

let playerMoney = 50.00;
let playerPacks = { "basic": 0, "premium": 0, "legendary": 0 };

// --- THE MISSING INVENTORY CODE ---
let playerInventory = {};
// Automatically give the player 0 of every card in the database to start
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
    // const dashBg = scene.add.rectangle(512, 700, 1024, 136, 0x111111).setStrokeStyle(4, 0x333333);

    // Left: Binder Drop Zone
    scene.binderZone = scene.add.image(120, 700, 'zone_binder').setInteractive();
    scene.add.text(120, 700, '', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Right: Sell Zone
    scene.sellZone = scene.add.image(904, 700, 'zone_sell').setInteractive();
    scene.add.text(904, 700, '', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

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
    
    createJuicyButton(scene, 512, 700, 'INVENTORY', () => { 
        inventoryOverlay.refresh(); // <--- This forces it to check your newly bought packs!
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
    let xOffset = 260; // Start drawing on the left side
    
    // Loop through our pack database and create a store item for each
    Object.keys(packDatabase).forEach(key => {
        const pack = packDatabase[key];
        
        // 1. Draw the Pack Image
        // (Assumes you have loaded 'pack_basic', 'pack_premium', etc. in preload)
        const packImg = scene.add.image(xOffset, 320, 'pack_' + key).setScale(0.9);
        
        // 2. Name & Price Text
        const itemText = scene.add.text(xOffset, 450, `${pack.name}\n$${pack.cost.toFixed(2)}`, { 
            fontFamily: 'Courier New', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center' 
        }).setOrigin(0.5);
        
        // 3. Buy Button
        const buyBtn = createJuicyButton(scene, xOffset, 520, 'BUY', () => {
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
                // Red flash if you are broke!
                scene.tweens.add({ targets: itemText, scaleX: 1.2, scaleY: 1.2, yoyo: true, duration: 100 });
                itemText.setTint(0xff0000);
                scene.time.delayedCall(200, () => itemText.clearTint());
            }
        }, 0x27ae60); // Green button
        
        overlay.add([packImg, itemText, buyBtn]);
        xOffset += 250; // Move to the right for the next pack
    });
}

function setupInventory(scene, overlay) {
    // Because inventory changes as you buy things, we create a container inside the overlay
    // that we can clear and redraw every time you open the menu.
    if(!overlay.inventoryContainer) {
        overlay.inventoryContainer = scene.add.container(0,0);
        overlay.add(overlay.inventoryContainer);
    }
    
    // This function gets called every time you click "OPEN PACKS" on the main screen
    overlay.refresh = () => {
        overlay.inventoryContainer.removeAll(true); // Clear old data
        
        let xOffset = 260;
        let hasPacks = false;
        
        Object.keys(playerPacks).forEach(key => {
            if (playerPacks[key] > 0) {
                hasPacks = true;
                
                // Pack Image
                const packImg = scene.add.image(xOffset, 320, 'pack_' + key).setScale(0.9);
                
                // Quantity Text
                const countText = scene.add.text(xOffset, 450, `Owned: ${playerPacks[key]}`, { 
                    fontFamily: 'Courier New', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' 
                }).setOrigin(0.5);
                
                // Open Button (Logic coming soon!)
                const openBtn = createJuicyButton(scene, xOffset, 520, 'OPEN', () => {
                    console.log(`Opening a ${key} pack!`);
                }, 0xe67e22);
                
                overlay.inventoryContainer.add([packImg, countText, openBtn]);
                xOffset += 250;
            }
        });
        
        if (!hasPacks) {
            const emptyText = scene.add.text(512, 350, "You don't have any packs!\nGo buy some in the store.", { 
                fontFamily: 'Courier New', fontSize: '28px', color: '#bdc3c7', align: 'center' 
            }).setOrigin(0.5);
            overlay.inventoryContainer.add(emptyText);
        }
    };
    
    overlay.refresh(); // Run once to set it up
}

function setupBinder(scene, overlay) {
    // Simple 4-column grid for the binder
    let startX = 220;
    let startY = 250;
    let col = 0;
    let row = 0;
    
    myMojiDatabase.forEach((moji, index) => {
        // Only draw the card if the player owns at least 1
        if (playerInventory[moji.id] > 0) {
            let x = startX + (col * 190);
            let y = startY + (row * 240);
            
            // Draw Card Template (Assumes 'card_template' is loaded)
            const cardBg = scene.add.image(x, y, 'card_template').setScale(0.6);
            
            // Draw Name & Quantity
            const nameText = scene.add.text(x, y + 60, moji.name, { 
                fontFamily: 'Arial', fontSize: '14px', color: '#000', fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            const qtyText = scene.add.text(x, y + 80, `x${playerInventory[moji.id]}`, { 
                fontFamily: 'Courier New', fontSize: '18px', color: '#8e44ad', fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            overlay.add([cardBg, nameText, qtyText]);
            
            col++;
            if (col >= 4) { // Move to next row after 4 columns
                col = 0;
                row++;
            }
        }
    });
    
    // If binder is empty
    if (Object.values(playerInventory).every(val => val === 0)) {
        const emptyText = scene.add.text(512, 350, "Your binder is empty!\nOpen some packs to get cards.", { 
            fontFamily: 'Courier New', fontSize: '28px', color: '#bdc3c7', align: 'center' 
        }).setOrigin(0.5);
        overlay.add(emptyText);
    }
}
