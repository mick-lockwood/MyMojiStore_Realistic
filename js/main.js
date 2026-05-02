console.log("=== GAME LOGIC: SAVES, NEW BINDER, & CART UPGRADES ===");

// ==========================================
// 1. GLOBAL STATE & LOCAL STORAGE
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

// Default inventory setup
myMojiDatabase.forEach(moji => playerInventory[moji.id] = 0);

function loadGame() {
    let savedData = localStorage.getItem('myMojiSave');
    if (savedData) {
        let parsedData = JSON.parse(savedData);
        playerMoney = parsedData.money !== undefined ? Number(parsedData.money) : 50.00;
        if (parsedData.packs) playerPacks = { ...playerPacks, ...parsedData.packs };
        for (let id in parsedData.inventory) {
            if (playerInventory[id] !== undefined) playerInventory[id] = Number(parsedData.inventory[id]);
        }
        console.log("Game Loaded!");
    }
}

function saveGame() {
    localStorage.setItem('myMojiSave', JSON.stringify({
        money: playerMoney,
        packs: playerPacks,
        inventory: playerInventory
    }));
}

function calculateTotalPacks() {
    return playerPacks.basic + playerPacks.premium + playerPacks.legendary;
}

// Load save data immediately on boot
loadGame();

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
    scene.load.image('binder_open', 'assets/binder_open.png'); 
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

    // RESET GAME BUTTON
    const resetBtn = createJuicyButton(scene, 930, 30, 'RESET', () => {
        if (confirm("Delete save and start over?")) { 
            localStorage.removeItem('myMojiSave'); 
            location.reload(); 
        }
    }, 0xe74c3c);
    resetBtn.setScale(0.7);

    // Build Menus
    const storeOverlay = createOverlay(scene, '--- THE STORE ---');
    setupStore(scene, storeOverlay);

    const inventoryOverlay = createOverlay(scene, '--- OPEN PACKS ---');
    setupInventory(scene, inventoryOverlay);

    const binderOverlay = createOverlay(scene, ''); // Title handled dynamically
    setupBinder(scene, binderOverlay);

    // --- DROP ZONES & BUTTONS COMBINED ---
    
    // Left: Binder Zone (Now functions as the Open Binder button!)
    scene.binderZone = scene.add.image(120, 700, 'zone_binder').setInteractive({ cursor: 'pointer' });
    // scene.add.text(120, 700, 'DROP TO SAVE\n(Click to Open)', { fontSize: '14px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3, align: 'center' }).setOrigin(0.5);
    
    scene.binderZone.on('pointerdown', () => {
        binderOverlay.refresh();
        binderOverlay.setVisible(true);
    });

    // Right: Sell Zone
    scene.sellZone = scene.add.image(904, 700, 'zone_sell').setInteractive();
    // scene.add.text(904, 700, 'DROP TO SELL', { fontSize: '16px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    // Center UI (Removed "Binder" button since the drop zone does it now)
    createJuicyButton(scene, 420, 700, 'STORE', () => { 
        storeOverlay.refresh(); 
        storeOverlay.setVisible(true); 
    });
    createJuicyButton(scene, 604, 700, 'OPEN PACK', () => { 
        inventoryOverlay.refresh(); 
        inventoryOverlay.setVisible(true); 
    }, 0xe67e22);

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
            saveGame(); // SAVE STATE
            showFloatingText(scene, gameObject.x, gameObject.y, 'SAVED!', '#9b59b6');
            gameObject.destroy(); 
        } else if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.sellZone.getBounds())) {
            playerMoney += gameObject.mojiData.baseValue; 
            saveGame(); // SAVE STATE
            scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
            showFloatingText(scene, gameObject.x, gameObject.y, 'SOLD!', '#e74c3c');
            gameObject.destroy(); 
        }
    });
}

// ==========================================
// 4. CORE GAMEPLAY FUNCTIONS
// ==========================================

function showFloatingText(scene, x, y, message, colorHex) {
    let txt = scene.add.text(x, y, message, { 
        fontFamily: 'Arial', fontSize: '26px', color: colorHex, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 
    }).setOrigin(0.5).setDepth(200);

    scene.tweens.add({ targets: txt, y: y - 60, alpha: 0, duration: 1200, onComplete: () => txt.destroy() });
}

function openBoosterPack(scene, packKey) {
    if (playerPacks[packKey] <= 0) return; 
    
    playerPacks[packKey]--;
    saveGame();
    scene.packsText.setText('PACKS: ' + calculateTotalPacks());

    const weights = packDatabase[packKey].weights;
    
    // Pull 3 cards
    for (let i = 0; i < 3; i++) {
        let totalWeight = 0;
        myMojiDatabase.forEach(m => totalWeight += weights[m.rarity]);
        let randomNum = Math.random() * totalWeight;
        
        let pulledMoji = myMojiDatabase[0];
        for (let j = 0; j < myMojiDatabase.length; j++) {
            randomNum -= weights[myMojiDatabase[j].rarity];
            if (randomNum <= 0) { pulledMoji = myMojiDatabase[j]; break; }
        }
        spawnCardOnTable(scene, pulledMoji, i);
    }
}

function spawnCardOnTable(scene, mojiData, index) {
    const startX = 350; 
    const spacing = 160; 
    const x = startX + (index * spacing) + (Math.random() * 20 - 10); 
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
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 300, delay: index * 150, ease: 'Back.out' });
}

// ==========================================
// 5. UI COMPONENTS & OVERLAYS
// ==========================================

function createJuicyButton(scene, x, y, text, onClick, color = 0x2980b9) {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, 140, 40, color).setStrokeStyle(3, 0xffffff);
    const txt = scene.add.text(0, 0, text, { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([bg, txt]);
    container.setSize(140, 40);
    container.setInteractive({ cursor: 'pointer' });

    container.on('pointerover', () => scene.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 }));
    container.on('pointerout', () => scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 }));
    container.on('pointerdown', () => { container.setScale(0.95); onClick(); });
    container.on('pointerup', () => container.setScale(1.05));
    return container;
}

function createOverlay(scene, titleText) {
    const container = scene.add.container(0, 0);
    const bg = scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0.9).setInteractive(); 
    
    // We make the main panel slightly transparent so you can see the table behind it
    const panel = scene.add.rectangle(512, 384, 900, 650, 0x2c3e50, 0.95).setStrokeStyle(4, 0xecf0f1);
    const title = scene.add.text(512, 100, titleText, { fontFamily: 'Courier New', fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const closeBtn = createJuicyButton(scene, 512, 660, 'CLOSE', () => container.setVisible(false), 0xe74c3c);
    
    container.titleObj = title; // Save reference to change text later
    container.add([bg, panel, title, closeBtn]);
    container.setVisible(false);
    container.setDepth(100); 
    return container;
}

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
            
            // PLUS / MINUS Cart Buttons
            const subBtn = createJuicyButton(scene, xOffset - 40, 500, '-', () => {
                if (shoppingCart[key] > 0) { shoppingCart[key]--; overlay.refresh(); }
            }, 0xe74c3c);
            subBtn.setSize(40,40); subBtn.list[0].width = 40; subBtn.list[0].height = 40;

            const addBtn = createJuicyButton(scene, xOffset + 40, 500, '+', () => {
                shoppingCart[key]++; overlay.refresh();
            }, 0x3498db);
            addBtn.setSize(40,40); addBtn.list[0].width = 40; addBtn.list[0].height = 40;
            
            overlay.storeContainer.add([packImg, itemText, cartText, subBtn, addBtn]);
            xOffset += 250;
        });

        // Calculate Cart Total
        let totalCost = 0;
        Object.keys(shoppingCart).forEach(k => { totalCost += shoppingCart[k] * packDatabase[k].cost; });

        const totalText = scene.add.text(512, 580, `TOTAL: $${totalCost.toFixed(2)}`, { fontFamily: 'Courier New', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        // CLEAR Cart Button
        const clearBtn = createJuicyButton(scene, 250, 580, 'CLEAR', () => {
            shoppingCart = { basic: 0, premium: 0, legendary: 0 };
            overlay.refresh();
        }, 0xe74c3c);

        // CHECKOUT Button
        const checkoutBtn = createJuicyButton(scene, 774, 580, 'CHECKOUT', () => {
            if (playerMoney >= totalCost && totalCost > 0) {
                playerMoney -= totalCost;
                playerPacks.basic += shoppingCart.basic;
                playerPacks.premium += shoppingCart.premium;
                playerPacks.legendary += shoppingCart.legendary;
                shoppingCart = { basic: 0, premium: 0, legendary: 0 };
                
                saveGame(); // SAVE STATE
                scene.moneyText.setText('BANK: $' + playerMoney.toFixed(2));
                scene.packsText.setText('PACKS: ' + calculateTotalPacks());
                overlay.refresh();
            }
        }, 0x27ae60);

        overlay.storeContainer.add([totalText, clearBtn, checkoutBtn]);
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

// ==========================================
// 6. NEW BINDER SPREAD UI
// ==========================================
function setupBinder(scene, overlay) {
    overlay.currentTab = 'collection'; 
    overlay.currentCategory = 'Common'; 

    if(!overlay.binderContainer) {
        overlay.binderContainer = scene.add.container(0,0);
        overlay.add(overlay.binderContainer);
    }

    overlay.refresh = () => {
        overlay.binderContainer.removeAll(true);
        
        // 1. Draw the new Binder Graphic in the background (scaled to fit)
        const binderImg = scene.add.image(512, 384, 'binder_open').setScale(1);
        overlay.binderContainer.add(binderImg);
        
        // Hide standard overlay panel/title so the graphic shines
        overlay.list[1].setVisible(false); // hides dark grey panel
        overlay.titleObj.setVisible(false); 

        // 2. Rarity Category Tabs (Top)
        const categories = ['Common', 'Rare', 'Epic', 'Legendary'];
        let tabX = 220;
        categories.forEach(cat => {
            let catColor = overlay.currentCategory === cat ? 0xf1c40f : 0x7f8c8d;
            const tabBtn = createJuicyButton(scene, tabX, 70, cat.toUpperCase(), () => {
                overlay.currentCategory = cat;
                overlay.refresh();
            }, catColor);
            overlay.binderContainer.add(tabBtn);
            tabX += 190;
        });

        // 3. View Mode Toggle (Bottom Center)
        const modeColor = overlay.currentTab === 'collection' ? 0x2980b9 : 0x8e44ad;
        const modeText = overlay.currentTab === 'collection' ? 'VIEWING: MAIN SET' : 'VIEWING: DOUBLES';
        const modeBtn = createJuicyButton(scene, 512, 620, modeText, () => {
            overlay.currentTab = overlay.currentTab === 'collection' ? 'doubles' : 'collection';
            overlay.refresh();
        }, modeColor);
        modeBtn.list[0].width = 220; // widen button
        overlay.binderContainer.add(modeBtn);

        // 4. DRAW THE 9x2 SPREAD GRID
        // These coordinates are tuned to align with a standard centered binder graphic
        let startX = 152; // <>
        let startY = 240; // ^v
        let spacingX = 121; 
        let spacingY = 155; 
        let spineGap = 115;  // Extra distance added only when jumping to the right page

        let col = 0;
        let row = 0;
        
        let filteredCards = myMojiDatabase.filter(m => m.rarity === overlay.currentCategory);

        filteredCards.forEach((moji) => {
            const owned = playerInventory[moji.id];
            
            let qtyToShow = 0;
            if (overlay.currentTab === 'collection' && owned > 0) qtyToShow = 1;
            if (overlay.currentTab === 'doubles' && owned > 1) qtyToShow = owned - 1;

            if (qtyToShow > 0) {
                // Calculate grid X. If col >= 3, it's on the right page, so jump the spine gap
                let x = startX + (col * spacingX);
                if (col >= 3) x += spineGap;
                
                let y = startY + (row * spacingY);
                
                // Draw the Mini Card
                const cardBg = scene.add.image(x, y, 'card_template').setScale(0.45); // Shrink to fit sleeves
                const nameText = scene.add.text(x, y - 40, moji.name, { fontFamily: 'Arial', fontSize: '10px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
                const qtyBadge = scene.add.text(x, y + 40, `x${qtyToShow}`, { fontFamily: 'Courier New', fontSize: '14px', color: '#8e44ad', fontStyle: 'bold', stroke: '#fff', strokeThickness: 2 }).setOrigin(0.5);
                
                // Clicking the card "Takes it out"
                cardBg.setInteractive({ cursor: 'pointer' });
                cardBg.on('pointerdown', () => {
                    playerInventory[moji.id]--;
                    saveGame(); // SAVE STATE
                    overlay.setVisible(false);
                    spawnCardOnTable(scene, moji, 1);
                });
                
                overlay.binderContainer.add([cardBg, nameText, qtyBadge]);
                
                // Move grid position
                col++;
                if (col >= 6) { // 6 total columns across the spread
                    col = 0; 
                    row++; 
                }
            }
        });
        
        // Empty State Handler
        if (filteredCards.every(m => playerInventory[m.id] === 0)) {
            const emptyText = scene.add.text(512, 384, `No ${overlay.currentCategory} cards here.`, { fontFamily: 'Courier New', fontSize: '24px', color: '#bdc3c7', align: 'center', backgroundColor: '#000' }).setOrigin(0.5);
            overlay.binderContainer.add(emptyText);
        }
    }
}
