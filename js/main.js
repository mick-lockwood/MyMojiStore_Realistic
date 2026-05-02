console.log("=== THE COMPLETE GAME LOGIC IS RUNNING again ===");

// ==========================================
// 1. GLOBAL STATE & DATABASES
// ==========================================
const packDatabase = {
    "basic": { name: "Basic Pack", cost: 5.00, color: 0x2ecc71, weights: { "Common": 75, "Rare": 20, "Epic": 4, "Legendary": 1 } },
    "premium": { name: "Premium Pack", cost: 20.00, color: 0x9b59b6, weights: { "Common": 30, "Rare": 40, "Epic": 20, "Legendary": 10 } },
    "legendary": { name: "Legendary Pack", cost: 100.00, color: 0xf1c40f, weights: { "Common": 0, "Rare": 20, "Epic": 40, "Legendary": 40 } }
};

let playerMoney = 50.00;
let playerPacks = { "basic": 0, "premium": 0, "legendary": 0 };
let playerInventory = {};

// Give the player 0 of every card to start
myMojiDatabase.forEach(moji => playerInventory[moji.id] = 0);

function calculateTotalPacks() {
    return playerPacks.basic + playerPacks.premium + playerPacks.legendary;
}

// ==========================================
// 2. PHASER CONFIG & PRELOAD
// ==========================================
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#1a1a1a', 
    parent: 'game-container',
    scene: { preload: preload, create: create }
};

const game = new Phaser.Game(config);

function preload() {
    const scene = this;
    // Load all your shiny new assets!
    scene.load.image('bg_table', 'assets/bg_table.jpg');
    scene.load.image('bg_mat', 'assets/bg_mat.png');
    scene.load.image('zone_binder', 'assets/zone_binder.png');
    scene.load.image('zone_sell', 'assets/zone_sell.png');
    
    // Make sure you have these, or the game will show broken image boxes!
    scene.load.image('card_template', 'assets/card_template.png');
    scene.load.image('pack_basic', 'assets/pack_basic.png');
    scene.load.image('pack_premium', 'assets/pack_premium.png');
    scene.load.image('pack_legendary', 'assets/pack_legendary.png');
}

// ==========================================
// 3. MAIN CREATE FUNCTION
// ==========================================
function create() {
    const scene = this; 

    // Backgrounds
    scene.add.image(512, 384, 'bg_table');
    scene.add.image(512, 384, 'bg_mat');

    // Top HUD
    scene.add.rectangle(512, 30, 1024, 60, 0x000000, 0.8); 
    scene.moneyText = scene.add.text(30, 30, 'BANK: $' + playerMoney.toFixed(2), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    scene.packsText = scene.add.text(300, 30, 'PACKS: ' + calculateTotalPacks(), { 
        fontFamily: 'Courier New', fontSize: '24px', color: '#3498db', fontStyle: 'bold' 
    }).setOrigin(0, 0.5);

    // Drop Zones
    scene.binderZone = scene.add.image(120, 700, 'zone_binder').setInteractive();
    scene.add.text(120, 700, '', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    scene.sellZone = scene.add.image(904, 700, 'zone_sell').setInteractive();
    scene.add.text(904, 700, '', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Build Menus
    const storeOverlay = createOverlay(scene, '--- THE STORE ---');
    setupStore(scene, storeOverlay);

    const inventoryOverlay = createOverlay(scene, '--- OPEN PACKS ---');
    setupInventory(scene, inventoryOverlay);

    const binderOverlay = createOverlay(scene, '--- MY BINDER ---');
    setupBinder(scene, binderOverlay);

    // Menu Action Buttons
    createJuicyButton(scene, 350, 700, 'STORE', () => { storeOverlay.setVisible(true); });
    createJuicyButton(scene, 512, 700, 'OPEN PACK', () => { 
        inventoryOverlay.refresh(); 
        inventoryOverlay.setVisible(true); 
    }, 0xe67e22);
    createJuicyButton(scene, 674, 700, 'BINDER', () => { 
        binderOverlay.refresh(); // Refresh binder to show newly saved cards!
        binderOverlay.setVisible(true); 
    });

    // --- RESTORED: DRAG AND DROP LOGIC ---
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
        gameObject.setDepth(50); // Bring to front while dragging
    });

    scene.input.on('dragend', (pointer, gameObject) => {
        gameObject.setDepth(10); // Reset depth
        const bounds = gameObject.getBounds();

        // Dropped on BINDER?
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.binderZone.getBounds())) {
            playerInventory[gameObject.mojiData.id]++; // Add to inventory
            gameObject.destroy(); // Remove from table
            console.log("Saved to Binder!");
        } 
        // Dropped on SELL TRAY?
        else if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.sellZone.getBounds())) {
            playerMoney += gameObject.mojiData.baseValue; // Add money
            scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
            gameObject.destroy(); // Remove from table
            console.log("Sold card!");
        }
    });
}

// ==========================================
// 4. RESTORED: CORE GAMEPLAY FUNCTIONS
// ==========================================

// Gacha Logic: Picks a random card based on pack weights
function openBoosterPack(scene, packKey) {
    if (playerPacks[packKey] <= 0) return; // Stop if they have no packs
    
    // Deduct pack
    playerPacks[packKey]--;
    scene.packsText.setText('PACKS: ' + calculateTotalPacks());

    // 1. Roll for Rarity
    const weights = packDatabase[packKey].weights;
    const roll = Math.random() * 100;
    let pulledRarity = "Common";
    
    if (roll <= weights["Legendary"]) pulledRarity = "Legendary";
    else if (roll <= weights["Legendary"] + weights["Epic"]) pulledRarity = "Epic";
    else if (roll <= weights["Legendary"] + weights["Epic"] + weights["Rare"]) pulledRarity = "Rare";

    // 2. Grab all cards matching that rarity
    let possibleCards = myMojiDatabase.filter(c => c.rarity === pulledRarity);
    if (possibleCards.length === 0) possibleCards = myMojiDatabase; // Safety fallback

    // 3. Pick a random card from that pool
    const finalCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];

    // 4. Spawn it on the table!
    spawnCardOnTable(scene, finalCard);
}

// Spawns the physical, draggable card object on the screen
function spawnCardOnTable(scene, mojiData) {
    // Random position in the center of the table
    const x = 512 + (Math.random() * 200 - 100); 
    const y = 384 + (Math.random() * 100 - 50);

    const container = scene.add.container(x, y);

    // Card Background
    const cardBg = scene.add.image(0, 0, 'card_template').setScale(0.8);
    
    // Text Data
    const nameText = scene.add.text(0, -90, mojiData.name, { fontFamily: 'Arial', fontSize: '18px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    const rarityText = scene.add.text(0, 80, mojiData.rarity, { fontFamily: 'Courier New', fontSize: '16px', color: '#8e44ad', fontStyle: 'bold' }).setOrigin(0.5);
    const valueText = scene.add.text(0, 110, `Value: $${mojiData.baseValue.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '16px', color: '#27ae60', fontStyle: 'bold' }).setOrigin(0.5);

    container.add([cardBg, nameText, rarityText, valueText]);
    container.setSize(cardBg.displayWidth, cardBg.displayHeight);
    
    // Make it draggable
    container.setInteractive({ cursor: 'grab', draggable: true });
    
    // Attach the database info to the object so the drop zones know what it is
    container.mojiData = mojiData; 
    
    // Little pop-in animation
    container.setScale(0);
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.out' });
}


// ==========================================
// 5. UI COMPONENTS & OVERLAYS
// ==========================================

function createJuicyButton(scene, x, y, text, onClick, color = 0x2980b9) {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, 140, 50, color).setStrokeStyle(3, 0xffffff);
    const txt = scene.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([bg, txt]);
    container.setSize(140, 50);
    container.setInteractive({ cursor: 'pointer' });

    container.on('pointerover', () => scene.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 100 }));
    container.on('pointerout', () => scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 }));
    container.on('pointerdown', () => { container.setScale(0.95); onClick(); });
    container.on('pointerup', () => container.setScale(1.1));

    return container;
}

function createOverlay(scene, titleText) {
    const container = scene.add.container(0, 0);
    const bg = scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.9);
    bg.setInteractive(); 
    const panel = scene.add.rectangle(512, 384, 800, 600, 0x2c3e50).setStrokeStyle(4, 0xecf0f1);
    const title = scene.add.text(512, 150, titleText, { fontFamily: 'Courier New', fontSize: '40px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const closeBtn = createJuicyButton(scene, 512, 600, 'CLOSE', () => container.setVisible(false), 0xe74c3c);
    
    container.add([bg, panel, title, closeBtn]);
    container.setVisible(false);
    container.setDepth(100); 
    return container;
}

function setupStore(scene, overlay) {
    let xOffset = 260;
    Object.keys(packDatabase).forEach(key => {
        const pack = packDatabase[key];
        const packImg = scene.add.image(xOffset, 320, 'pack_' + key).setScale(0.9);
        const itemText = scene.add.text(xOffset, 450, `${pack.name}\n$${pack.cost.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
        
        const buyBtn = createJuicyButton(scene, xOffset, 520, 'BUY', () => {
            if (playerMoney >= pack.cost) {
                playerMoney -= pack.cost;
                playerPacks[key]++;
                scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
                scene.packsText.setText('PACKS: ' + calculateTotalPacks());
            }
        }, 0x27ae60);
        
        overlay.add([packImg, itemText, buyBtn]);
        xOffset += 250;
    });
}

function setupInventory(scene, overlay) {
    if(!overlay.inventoryContainer) {
        overlay.inventoryContainer = scene.add.container(0,0);
        overlay.add(overlay.inventoryContainer);
    }
    
    overlay.refresh = () => {
        overlay.inventoryContainer.removeAll(true);
        let xOffset = 260;
        let hasPacks = false;
        
        Object.keys(playerPacks).forEach(key => {
            if (playerPacks[key] > 0) {
                hasPacks = true;
                const packImg = scene.add.image(xOffset, 320, 'pack_' + key).setScale(0.9);
                const countText = scene.add.text(xOffset, 450, `Owned: ${playerPacks[key]}`, { fontFamily: 'Courier New', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
                
                // RESTORED: The Open Button actually works now!
                const openBtn = createJuicyButton(scene, xOffset, 520, 'OPEN', () => {
                    openBoosterPack(scene, key); // Spawn the card
                    overlay.setVisible(false);   // Close the menu so you can see the table
                }, 0xe67e22);
                
                overlay.inventoryContainer.add([packImg, countText, openBtn]);
                xOffset += 250;
            }
        });
        
        if (!hasPacks) {
            const emptyText = scene.add.text(512, 350, "You don't have any packs!\nGo buy some in the store.", { fontFamily: 'Courier New', fontSize: '28px', color: '#bdc3c7', align: 'center' }).setOrigin(0.5);
            overlay.inventoryContainer.add(emptyText);
        }
    };
}

function setupBinder(scene, overlay) {
    if(!overlay.binderContainer) {
        overlay.binderContainer = scene.add.container(0,0);
        overlay.add(overlay.binderContainer);
    }

    // Refresh function so it updates when you open it
    overlay.refresh = () => {
        overlay.binderContainer.removeAll(true);
        let startX = 220;
        let startY = 250;
        let col = 0;
        let row = 0;
        
        myMojiDatabase.forEach((moji) => {
            if (playerInventory[moji.id] > 0) {
                let x = startX + (col * 190);
                let y = startY + (row * 240);
                const cardBg = scene.add.image(x, y, 'card_template').setScale(0.6);
                const nameText = scene.add.text(x, y + 60, moji.name, { fontFamily: 'Arial', fontSize: '14px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
                const qtyText = scene.add.text(x, y + 80, `x${playerInventory[moji.id]}`, { fontFamily: 'Courier New', fontSize: '18px', color: '#8e44ad', fontStyle: 'bold' }).setOrigin(0.5);
                
                overlay.binderContainer.add([cardBg, nameText, qtyText]);
                col++;
                if (col >= 4) { col = 0; row++; }
            }
        });
        
        if (Object.values(playerInventory).every(val => val === 0)) {
            const emptyText = scene.add.text(512, 350, "Your binder is empty!\nOpen some packs to get cards.", { fontFamily: 'Courier New', fontSize: '28px', color: '#bdc3c7', align: 'center' }).setOrigin(0.5);
            overlay.binderContainer.add(emptyText);
        }
    }
}
