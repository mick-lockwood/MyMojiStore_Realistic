console.log("=== THE COMPLETE GAME LOGIC IS RUNNING (WITH FULL FEATURES) ===");

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
let shoppingCart = { "basic": 0, "premium": 0, "legendary": 0 }; 
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
    scene.load.image('bg_table', 'assets/bg_table.jpg');
    scene.load.image('bg_mat', 'assets/bg_mat.png');
    scene.load.image('zone_binder', 'assets/zone_binder.png');
    scene.load.image('zone_sell', 'assets/zone_sell.png');
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
    // scene.add.text(120, 700, 'DROP TO SAVE', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    scene.sellZone = scene.add.image(904, 700, 'zone_sell').setInteractive();
    // scene.add.text(904, 700, 'DROP TO SELL', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Build Menus
    const storeOverlay = createOverlay(scene, '--- THE STORE ---');
    setupStore(scene, storeOverlay);

    const inventoryOverlay = createOverlay(scene, '--- OPEN PACKS ---');
    setupInventory(scene, inventoryOverlay);

    const binderOverlay = createOverlay(scene, '--- MY BINDER ---');
    setupBinder(scene, binderOverlay);

    // Menu Action Buttons
    createJuicyButton(scene, 350, 700, 'STORE', () => { 
        storeOverlay.refresh(); 
        storeOverlay.setVisible(true); 
    });
    createJuicyButton(scene, 512, 700, 'OPEN PACK', () => { 
        inventoryOverlay.refresh(); 
        inventoryOverlay.setVisible(true); 
    }, 0xe67e22);
    createJuicyButton(scene, 674, 700, 'BINDER', () => { 
        binderOverlay.refresh(); 
        binderOverlay.setVisible(true); 
    });

    // DRAG AND DROP LOGIC
    scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
        gameObject.setDepth(50);
    });

    scene.input.on('dragend', (pointer, gameObject) => {
        gameObject.setDepth(10);
        const bounds = gameObject.getBounds();

        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.binderZone.getBounds())) {
            playerInventory[gameObject.mojiData.id]++; 
            gameObject.destroy(); 
        } else if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.sellZone.getBounds())) {
            playerMoney += gameObject.mojiData.baseValue; 
            scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
            gameObject.destroy(); 
        }
    });
}

// ==========================================
// 4. CORE GAMEPLAY FUNCTIONS
// ==========================================

// PULLS 3 CARDS INSTEAD OF 1
function openBoosterPack(scene, packKey) {
    if (playerPacks[packKey] <= 0) return; 
    
    playerPacks[packKey]--;
    scene.packsText.setText('PACKS: ' + calculateTotalPacks());

    const weights = packDatabase[packKey].weights;
    
    // Loop 3 times to pull 3 cards
    for (let i = 0; i < 3; i++) {
        const roll = Math.random() * 100;
        let pulledRarity = "Common";
        
        if (roll <= weights["Legendary"]) pulledRarity = "Legendary";
        else if (roll <= weights["Legendary"] + weights["Epic"]) pulledRarity = "Epic";
        else if (roll <= weights["Legendary"] + weights["Epic"] + weights["Rare"]) pulledRarity = "Rare";

        let possibleCards = myMojiDatabase.filter(c => c.rarity === pulledRarity);
        if (possibleCards.length === 0) possibleCards = myMojiDatabase;

        const finalCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];

        // Pass 'i' so the cards space themselves out!
        spawnCardOnTable(scene, finalCard, i);
    }
}

// Spawns the physical card object
function spawnCardOnTable(scene, mojiData, index) {
    // Fan them out: Left, Center, Right
    const startX = 350; 
    const spacing = 160; 
    const x = startX + (index * spacing) + (Math.random() * 20 - 10); // Slight random tilt
    const y = 350 + (Math.random() * 40 - 20);

    const container = scene.add.container(x, y);
    const cardBg = scene.add.image(0, 0, 'card_template').setScale(0.8);
    
    const nameText = scene.add.text(0, -90, mojiData.name, { fontFamily: 'Arial', fontSize: '18px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    const rarityText = scene.add.text(0, 80, mojiData.rarity, { fontFamily: 'Courier New', fontSize: '16px', color: '#8e44ad', fontStyle: 'bold' }).setOrigin(0.5);
    const valueText = scene.add.text(0, 110, `Value: $${mojiData.baseValue.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '16px', color: '#27ae60', fontStyle: 'bold' }).setOrigin(0.5);

    container.add([cardBg, nameText, rarityText, valueText]);
    container.setSize(cardBg.displayWidth, cardBg.displayHeight);
    container.setInteractive({ cursor: 'grab', draggable: true });
    container.mojiData = mojiData; 
    
    container.setScale(0);
    // Delay each card popping up slightly for a nice animation effect
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 300, delay: index * 150, ease: 'Back.out' });
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
    const title = scene.add.text(512, 120, titleText, { fontFamily: 'Courier New', fontSize: '40px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const closeBtn = createJuicyButton(scene, 512, 630, 'CLOSE', () => container.setVisible(false), 0xe74c3c);
    
    container.add([bg, panel, title, closeBtn]);
    container.setVisible(false);
    container.setDepth(100); 
    return container;
}

// RESTORED: ADD TO CART LOGIC
function setupStore(scene, overlay) {
    if(!overlay.storeContainer) {
        overlay.storeContainer = scene.add.container(0,0);
        overlay.add(overlay.storeContainer);
    }

    overlay.refresh = () => {
        overlay.storeContainer.removeAll(true);
        let xOffset = 260;
        
        Object.keys(packDatabase).forEach(key => {
            const pack = packDatabase[key];
            const packImg = scene.add.image(xOffset, 280, 'pack_' + key).setScale(0.8);
            
            const itemText = scene.add.text(xOffset, 390, `${pack.name}\n$${pack.cost.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '18px', color: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
            
            const cartText = scene.add.text(xOffset, 440, `In Cart: ${shoppingCart[key]}`, { fontFamily: 'Courier New', fontSize: '16px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
            
            // Add to Cart Button
            const addBtn = createJuicyButton(scene, xOffset, 500, '+ CART', () => {
                shoppingCart[key]++;
                overlay.refresh(); // Redraw to update text
            }, 0x3498db);
            
            overlay.storeContainer.add([packImg, itemText, cartText, addBtn]);
            xOffset += 250;
        });

        // Calculate Cart Total
        let totalCost = 0;
        Object.keys(shoppingCart).forEach(k => { totalCost += shoppingCart[k] * packDatabase[k].cost; });

        const totalText = scene.add.text(512, 570, `TOTAL: $${totalCost.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // Checkout Button
        const checkoutBtn = createJuicyButton(scene, 750, 570, 'CHECKOUT', () => {
            if (playerMoney >= totalCost && totalCost > 0) {
                playerMoney -= totalCost;
                playerPacks.basic += shoppingCart.basic;
                playerPacks.premium += shoppingCart.premium;
                playerPacks.legendary += shoppingCart.legendary;
                
                // Clear cart
                shoppingCart = { basic: 0, premium: 0, legendary: 0 };
                
                scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
                scene.packsText.setText('PACKS: ' + calculateTotalPacks());
                overlay.refresh();
            }
        }, 0x27ae60);

        overlay.storeContainer.add([totalText, checkoutBtn]);
    };
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
                
                const openBtn = createJuicyButton(scene, xOffset, 520, 'OPEN', () => {
                    openBoosterPack(scene, key); 
                    overlay.setVisible(false);   
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

// RESTORED: MULTIPLE PAGES IN BINDER + TAKE OUT FEATURE
function setupBinder(scene, overlay) {
    overlay.currentTab = 'collection'; 

    if(!overlay.binderContainer) {
        overlay.binderContainer = scene.add.container(0,0);
        overlay.add(overlay.binderContainer);
    }

    overlay.refresh = () => {
        overlay.binderContainer.removeAll(true);
        
        // Draw the Tab Buttons
        const colColor = overlay.currentTab === 'collection' ? 0xf1c40f : 0x7f8c8d;
        const colBtn = createJuicyButton(scene, 350, 180, 'MAIN SET', () => {
            overlay.currentTab = 'collection';
            overlay.refresh();
        }, colColor);

        const doubColor = overlay.currentTab === 'doubles' ? 0xf1c40f : 0x7f8c8d;
        const doubBtn = createJuicyButton(scene, 674, 180, 'DOUBLES', () => {
            overlay.currentTab = 'doubles';
            overlay.refresh();
        }, doubColor);

        overlay.binderContainer.add([colBtn, doubBtn]);

        // Draw the Cards
        let startX = 220;
        let startY = 320;
        let col = 0;
        let row = 0;
        
        myMojiDatabase.forEach((moji) => {
            const owned = playerInventory[moji.id];
            
            // Logic: Show 1 in Collection. Show (owned - 1) in Doubles.
            let qtyToShow = 0;
            if (overlay.currentTab === 'collection' && owned > 0) qtyToShow = 1;
            if (overlay.currentTab === 'doubles' && owned > 1) qtyToShow = owned - 1;

            if (qtyToShow > 0) {
                let x = startX + (col * 190);
                let y = startY + (row * 240);
                
                const cardBg = scene.add.image(x, y, 'card_template').setScale(0.6);
                const nameText = scene.add.text(x, y + 60, moji.name, { fontFamily: 'Arial', fontSize: '14px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
                const qtyText = scene.add.text(x, y + 80, `x${qtyToShow}`, { fontFamily: 'Courier New', fontSize: '18px', color: '#8e44ad', fontStyle: 'bold' }).setOrigin(0.5);
                
                // NEW: Take Out Button
                const takeBtn = createJuicyButton(scene, x, y + 115, 'TAKE OUT', () => {
                    // 1. Remove from inventory
                    playerInventory[moji.id]--;
                    
                    // 2. Close the menu so the player can see the table
                    overlay.setVisible(false);
                    
                    // 3. Spawn the card in the center of the table (index 1 is the middle slot)
                    spawnCardOnTable(scene, moji, 1);
                }, 0xe74c3c); // Red button so it stands out
                takeBtn.setScale(0.7); // Shrink it a bit so it fits nicely under the card
                
                overlay.binderContainer.add([cardBg, nameText, qtyText, takeBtn]);
                col++;
                if (col >= 4) { col = 0; row++; }
            }
        });
        
        if (Object.values(playerInventory).every(val => val === 0)) {
            const emptyText = scene.add.text(512, 400, "Your binder is empty!", { fontFamily: 'Courier New', fontSize: '28px', color: '#bdc3c7', align: 'center' }).setOrigin(0.5);
            overlay.binderContainer.add(emptyText);
        }
    }
}
