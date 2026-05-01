// --- DATABASE: BOOSTER PACKS ---
const packDatabase = {
    "basic": { name: "Basic Pack", cost: 5.00, color: 0x2ecc71, weights: { "Common": 75, "Rare": 20, "Epic": 4, "Legendary": 1 } },
    "premium": { name: "Premium Pack", cost: 20.00, color: 0x9b59b6, weights: { "Common": 30, "Rare": 40, "Epic": 20, "Legendary": 10 } },
    "legendary": { name: "Legendary Pack", cost: 100.00, color: 0xf1c40f, weights: { "Common": 0, "Rare": 20, "Epic": 40, "Legendary": 40 } }
};

// --- GLOBAL STATE & LOCAL STORAGE ---
let playerMoney = 50.00;
let playerPacks = { "basic": 0, "premium": 0, "legendary": 0 };
let playerInventory = {};
let shoppingCart = { "basic": 0, "premium": 0, "legendary": 0 }; 

myMojiDatabase.forEach(moji => playerInventory[moji.id] = 0);

function loadGame() {
    let savedData = localStorage.getItem('myMojiSave');
    if (savedData) {
        let parsedData = JSON.parse(savedData);
        playerMoney = parsedData.money !== undefined ? Number(parsedData.money) : 50;
        if (parsedData.packs) playerPacks = { ...playerPacks, ...parsedData.packs };
        for (let id in parsedData.inventory) {
            if (playerInventory[id] !== undefined) playerInventory[id] = Number(parsedData.inventory[id]);
        }
    }
}

function saveGame() {
    localStorage.setItem('myMojiSave', JSON.stringify({
        money: playerMoney,
        packs: playerPacks,
        inventory: playerInventory
    }));
}

loadGame();

// --- PHASER ENGINE SETUP ---
const config = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#2c3e50',
    parent: 'game-container',
    scene: { create: create }
};

const game = new Phaser.Game(config);

function create() {
    const scene = this; 

    // --- TOP UI ---
    scene.moneyText = scene.add.text(20, 20, 'Bank: $' + playerMoney.toFixed(2), { fontFamily: 'Arial', fontSize: '28px', color: '#2ecc71', fontStyle: 'bold' });

    const resetBtn = scene.add.text(880, 20, 'RESET GAME', { fontFamily: 'Arial', fontSize: '16px', color: '#e74c3c', fontStyle: 'bold' }).setInteractive();
    resetBtn.on('pointerdown', () => {
        if (confirm("Delete save and start over?")) { localStorage.removeItem('myMojiSave'); location.reload(); }
    });

    // --- DROP ZONES ---
    scene.binderZone = scene.add.rectangle(150, 680, 240, 100, 0x8e44ad).setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(150, 680, 'DROP IN BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    scene.sellZone = scene.add.rectangle(874, 580, 240, 80, 0xc0392b).setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(874, 580, 'SELL FOR CASH', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    // --- OVERLAYS ---
    const binderOverlay = createBinderOverlay(scene);
    const storeOverlay = createStoreOverlay(scene);
    const inventoryOverlay = createInventoryOverlay(scene);

    // --- MAIN NAVIGATION BUTTONS ---
    const storeBtn = scene.add.rectangle(400, 680, 180, 60, 0x2980b9).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(400, 680, 'STORE', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    storeBtn.on('pointerdown', () => { updateStoreCart(scene, storeOverlay); storeOverlay.setVisible(true); });

    const packInvBtn = scene.add.rectangle(624, 680, 180, 60, 0xe67e22).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(624, 680, 'PACK INVENTORY', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    packInvBtn.on('pointerdown', () => { renderPackInventory(scene, inventoryOverlay); inventoryOverlay.setVisible(true); });

    const viewBinderBtn = scene.add.rectangle(874, 680, 240, 60, 0x34495e).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(874, 680, 'VIEW BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    viewBinderBtn.on('pointerdown', () => { renderBinderGrid(scene, binderOverlay); binderOverlay.setVisible(true); });
}

// --- CORE MECHANICS ---

// NEW: Visual feedback for dropping cards
function showFloatingText(scene, x, y, message, colorHex) {
    let txt = scene.add.text(x, y, message, { 
        fontFamily: 'Arial', fontSize: '22px', color: colorHex, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 
    }).setOrigin(0.5).setDepth(200);

    scene.tweens.add({
        targets: txt,
        y: y - 60,
        alpha: 0,
        duration: 1200,
        onComplete: () => txt.destroy()
    });
}

function spawnBoosterPack(scene, packId) {
    const packDef = packDatabase[packId];
    const spacing = 260; 
    let startX = 252;    
    
    for (let i = 0; i < 3; i++) {
        let pulledMoji = pullCardWithWeights(packDef.weights);
        createDraggableCard(scene, startX + (i * spacing), 350, pulledMoji);
    }
}

function pullCardWithWeights(weights) {
    let totalWeight = 0;
    for (let i = 0; i < myMojiDatabase.length; i++) totalWeight += weights[myMojiDatabase[i].rarity];
    let randomNum = Math.random() * totalWeight;
    for (let i = 0; i < myMojiDatabase.length; i++) {
        randomNum -= weights[myMojiDatabase[i].rarity];
        if (randomNum <= 0) return myMojiDatabase[i];
    }
    return myMojiDatabase[0]; 
}

function createCardGraphic(scene, mojiData) {
    const bg = scene.add.rectangle(0, 0, 220, 320, 0xffffff).setStrokeStyle(6, 0x1a1a1a);
    const imgBox = scene.add.rectangle(0, -40, 180, 160, 0xe0e0e0).setStrokeStyle(3, 0xcccccc);
    const nameTxt = scene.add.text(0, -140, mojiData.name, { fontFamily: 'Arial', fontSize: '20px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    const rarityTxt = scene.add.text(0, 70, mojiData.rarity, { fontFamily: 'Arial', fontSize: '16px', color: '#7f8c8d' }).setOrigin(0.5);
    const valTxt = scene.add.text(0, 110, '$' + mojiData.baseValue.toFixed(2), { fontFamily: 'Arial', fontSize: '24px', color: '#27ae60', fontStyle: 'bold' }).setOrigin(0.5);
    return [bg, imgBox, nameTxt, rarityTxt, valTxt];
}

function createPackGraphic(scene, packId) {
    const packDef = packDatabase[packId];
    const bg = scene.add.rectangle(0, 0, 140, 200, packDef.color).setStrokeStyle(4, 0x1a1a1a);
    const strip = scene.add.rectangle(0, -70, 140, 30, 0x1a1a1a);
    const nameTxt = scene.add.text(0, 0, packDef.name.replace(' ', '\n'), { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    return [bg, strip, nameTxt];
}

function createDraggableCard(scene, x, y, mojiData) {
    const card = scene.add.container(x, y);
    card.add(createCardGraphic(scene, mojiData));
    card.setSize(220, 320);
    card.setInteractive();
    scene.input.setDraggable(card);
    card.setDepth(10); 

    card.on('drag', function (p, dragX, dragY) { this.x = dragX; this.y = dragY; });
    card.on('dragstart', function () { this.setScale(1.05); this.setDepth(50); });
    
    card.on('dragend', function () {
        this.setScale(1); 
        this.setDepth(10); 
        let bounds = this.getBounds();
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.binderZone.getBounds())) {
            // FIX: Enforce numbers to prevent local storage string bugs
            playerInventory[mojiData.id] = Number(playerInventory[mojiData.id]) + 1; 
            saveGame(); 
            showFloatingText(scene, this.x, this.y, 'SAVED!', '#9b59b6');
            this.destroy(); 
        } 
        else if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.sellZone.getBounds())) {
            playerMoney += Number(mojiData.baseValue); 
            scene.moneyText.setText('Bank: $' + playerMoney.toFixed(2));
            saveGame(); 
            showFloatingText(scene, this.x, this.y, 'SOLD!', '#e74c3c');
            this.destroy(); 
        }
    });
}

// --- STORE UI & LOGIC ---

function createStoreOverlay(scene) {
    const overlay = scene.add.container(512, 384).setVisible(false).setDepth(100); 
    const bg = scene.add.rectangle(0, 0, 900, 650, 0x1a1a1a).setStrokeStyle(4, 0xecf0f1).setInteractive(); 
    const title = scene.add.text(0, -290, 'MOJI STORE', { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const closeBtn = scene.add.rectangle(350, -290, 120, 40, 0xe74c3c).setInteractive();
    const closeTxt = scene.add.text(350, -290, 'CLOSE', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.setVisible(false));

    overlay.add([bg, title, closeBtn, closeTxt]);

    let packKeys = Object.keys(packDatabase);
    let startX = -250;
    
    packKeys.forEach((key, index) => {
        let def = packDatabase[key];
        let packCont = scene.add.container(startX + (index * 250), -50);
        packCont.add(createPackGraphic(scene, key));
        
        let priceTxt = scene.add.text(0, 130, '$' + def.cost.toFixed(2), { fontSize: '24px', color: '#2ecc71', fontStyle: 'bold' }).setOrigin(0.5);
        let addBtn = scene.add.rectangle(0, 180, 140, 40, 0x3498db).setInteractive();
        let addTxt = scene.add.text(0, 180, '+ ADD TO CART', { fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        
        addBtn.on('pointerdown', () => {
            shoppingCart[key] += 1;
            updateStoreCart(scene, overlay);
        });
        
        packCont.add([priceTxt, addBtn, addTxt]);
        overlay.add(packCont);
    });

    const cartBg = scene.add.rectangle(0, 250, 800, 80, 0x2c3e50).setStrokeStyle(2, 0xffffff);
    overlay.cartTotalText = scene.add.text(-380, 250, 'TOTAL: $0.00', { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0, 0.5);
    overlay.cartItemsText = scene.add.text(0, 250, 'Items: 0', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    
    const clearBtn = scene.add.rectangle(200, 250, 100, 40, 0xe74c3c).setInteractive();
    const clearTxt = scene.add.text(200, 250, 'CLEAR', { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    clearBtn.on('pointerdown', () => {
        shoppingCart = { "basic": 0, "premium": 0, "legendary": 0 };
        updateStoreCart(scene, overlay);
    });

    const buyBtn = scene.add.rectangle(320, 250, 120, 50, 0x27ae60).setInteractive();
    const buyTxt = scene.add.text(320, 250, 'CHECKOUT', { fontSize: '18px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    
    buyBtn.on('pointerdown', () => {
        let cost = calculateCartTotal();
        if (cost > 0 && playerMoney >= cost) {
            playerMoney -= cost;
            scene.moneyText.setText('Bank: $' + playerMoney.toFixed(2));
            for (let key in shoppingCart) playerPacks[key] += shoppingCart[key];
            shoppingCart = { "basic": 0, "premium": 0, "legendary": 0 };
            updateStoreCart(scene, overlay);
            saveGame();
            scene.moneyText.setColor('#f1c40f'); 
            scene.time.delayedCall(300, () => scene.moneyText.setColor('#2ecc71'));
        } else if (cost > playerMoney) {
            overlay.cartTotalText.setColor('#e74c3c'); 
            scene.time.delayedCall(300, () => overlay.cartTotalText.setColor('#f1c40f'));
        }
    });

    overlay.add([cartBg, overlay.cartTotalText, overlay.cartItemsText, clearBtn, clearTxt, buyBtn, buyTxt]);
    return overlay;
}

function calculateCartTotal() {
    let total = 0;
    for (let key in shoppingCart) total += (shoppingCart[key] * packDatabase[key].cost);
    return total;
}

function updateStoreCart(scene, overlay) {
    overlay.cartTotalText.setText(`TOTAL: $${calculateCartTotal().toFixed(2)}`);
    let summary = [];
    for (let key in shoppingCart) {
        if (shoppingCart[key] > 0) summary.push(`${shoppingCart[key]}x ${packDatabase[key].name}`);
    }
    overlay.cartItemsText.setText(summary.length > 0 ? summary.join(' | ') : 'Cart is empty');
}

// --- PACK INVENTORY UI & LOGIC ---

function createInventoryOverlay(scene) {
    const overlay = scene.add.container(512, 384).setVisible(false).setDepth(100); 
    const bg = scene.add.rectangle(0, 0, 900, 650, 0x1a1a1a).setStrokeStyle(4, 0xecf0f1).setInteractive(); 
    const title = scene.add.text(0, -290, 'MY PACKS', { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const closeBtn = scene.add.rectangle(350, -290, 120, 40, 0xe74c3c).setInteractive();
    const closeTxt = scene.add.text(350, -290, 'CLOSE', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.setVisible(false));

    overlay.add([bg, title, closeBtn, closeTxt]);
    overlay.gridContainer = scene.add.container(0, 0); 
    overlay.add(overlay.gridContainer);
    
    return overlay;
}

function renderPackInventory(scene, overlay) {
    overlay.gridContainer.removeAll(true);
    let startX = -250;
    let packKeys = Object.keys(playerPacks);
    let index = 0;

    packKeys.forEach((key) => {
        let count = playerPacks[key];
        if (count > 0) {
            let packCont = scene.add.container(startX + (index * 250), -50);
            packCont.add(createPackGraphic(scene, key));
            
            let badgeBg = scene.add.circle(60, -90, 30, 0xe74c3c);
            let badgeTxt = scene.add.text(60, -90, 'x' + count, { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            
            let openBtn = scene.add.rectangle(0, 130, 140, 40, 0x27ae60).setInteractive();
            let openTxt = scene.add.text(0, 130, 'TEAR OPEN', { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            
            openBtn.on('pointerdown', () => {
                playerPacks[key] -= 1; 
                saveGame();
                overlay.setVisible(false); 
                spawnBoosterPack(scene, key); 
            });
            
            packCont.add([badgeBg, badgeTxt, openBtn, openTxt]);
            overlay.gridContainer.add(packCont);
            index++;
        }
    });

    if (index === 0) {
        let emptyTxt = scene.add.text(0, 0, "You don't have any packs.\nVisit the Store to buy some!", { fontSize: '24px', color: '#7f8c8d', align: 'center' }).setOrigin(0.5);
        overlay.gridContainer.add(emptyTxt);
    }
}

// --- UPDATED BINDER VISUALS & LOGIC ---
function createBinderOverlay(scene) {
    const overlay = scene.add.container(512, 384).setVisible(false).setDepth(100); 
    const bg = scene.add.rectangle(0, 0, 900, 650, 0x1a1a1a).setStrokeStyle(4, 0xecf0f1).setInteractive(); 
    const title = scene.add.text(0, -290, 'MY COLLECTION', { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const closeBtn = scene.add.rectangle(0, 300, 200, 40, 0xe74c3c).setInteractive();
    const closeTxt = scene.add.text(0, 300, 'CLOSE', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.setVisible(false));
    
    overlay.add([bg, title, closeBtn, closeTxt]);
    
    overlay.currentCategory = 'Common';
    overlay.viewMode = 'Collection'; 
    overlay.gridContainer = scene.add.container(0, 0); 
    overlay.add(overlay.gridContainer);

    // FIX: Store tab objects so we can update their text/colors dynamically
    overlay.tabs = [];
    const categories = ['Common', 'Rare', 'Epic', 'Legendary'];
    let tabX = -300;
    
    categories.forEach(cat => {
        let tab = scene.add.text(tabX, -240, cat.toUpperCase(), { fontSize: '18px', color: '#7f8c8d', fontStyle: 'bold' }).setInteractive().setOrigin(0.5);
        tab.on('pointerdown', () => { 
            overlay.currentCategory = cat; 
            renderBinderGrid(scene, overlay); 
        });
        overlay.tabs.push({ textObj: tab, category: cat });
        overlay.add(tab); 
        tabX += 200;
    });

    const modeBtn = scene.add.rectangle(0, 240, 300, 40, 0xf39c12).setInteractive();
    const modeText = scene.add.text(0, 240, 'VIEWING: MAIN COLLECTION', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    modeBtn.on('pointerdown', () => {
        overlay.viewMode = (overlay.viewMode === 'Collection') ? 'Doubles' : 'Collection';
        modeText.setText(overlay.viewMode === 'Collection' ? 'VIEWING: MAIN COLLECTION (CLICK TO WITHDRAW)' : 'VIEWING: DOUBLES (CLICK TO WITHDRAW)');
        modeBtn.setFillStyle(overlay.viewMode === 'Collection' ? 0xf39c12 : 0x8e44ad);
        renderBinderGrid(scene, overlay);
    });

    overlay.add([modeBtn, modeText]);
    return overlay;
}

function renderBinderGrid(scene, overlay) {
    overlay.gridContainer.removeAll(true);
    
    // FIX: Update Tab Counters and Colors so the player knows where their cards are!
    overlay.tabs.forEach(tab => {
        let countInTab = myMojiDatabase.filter(m => m.rarity === tab.category).reduce((sum, m) => sum + Number(playerInventory[m.id]), 0);
        tab.textObj.setText(`${tab.category.toUpperCase()} (${countInTab})`);
        tab.textObj.setColor(tab.category === overlay.currentCategory ? '#ffffff' : '#7f8c8d');
    });

    let filteredCards = myMojiDatabase.filter(m => m.rarity === overlay.currentCategory);
    let startX = -320, startY = -120, col = 0, spacingX = 160, spacingY = 220;

    filteredCards.forEach(moji => {
        let owned = Number(playerInventory[moji.id]);
        
        if (owned >= 1) {
            let isDoublesMode = (overlay.viewMode === 'Doubles');

            // Skip drawing if we are in doubles mode but only own 1 copy
            if (isDoublesMode && owned === 1) return;

            let miniCard = scene.add.container(startX + (col * spacingX), startY);
            miniCard.add(createCardGraphic(scene, moji));
            miniCard.setScale(0.45); 
            
            // Add Badge ONLY in Doubles mode
            if (isDoublesMode) {
                let badgeBg = scene.add.circle(80, -130, 40, 0xe74c3c);
                let badgeTxt = scene.add.text(80, -130, 'x' + (owned - 1), { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
                miniCard.add([badgeBg, badgeTxt]);
            }

            miniCard.setSize(220, 320); 
            miniCard.setInteractive({ cursor: 'pointer' });
            miniCard.on('pointerdown', () => {
                playerInventory[moji.id] = Number(playerInventory[moji.id]) - 1; 
                saveGame();
                createDraggableCard(scene, 512, 384, moji); 
                renderBinderGrid(scene, overlay); 
            });

            overlay.gridContainer.add(miniCard);
            col++;
            if (col > 4) { col = 0; startY += spacingY; }
        }
    });
}
