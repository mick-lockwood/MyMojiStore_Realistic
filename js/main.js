// --- GLOBAL STATE & LOCAL STORAGE ---
let playerMoney = 50.00;
let playerPacks = 0; // NEW: Track unopened packs
let playerInventory = {};

// 1. Initialize default inventory based on database
myMojiDatabase.forEach(moji => {
    playerInventory[moji.id] = 0;
});

// 2. Load Save Data
function loadGame() {
    let savedData = localStorage.getItem('myMojiSave');
    if (savedData) {
        let parsedData = JSON.parse(savedData);
        playerMoney = parsedData.money || 50;
        playerPacks = parsedData.packs || 0; // Load packs
        for (let id in parsedData.inventory) {
            if (playerInventory[id] !== undefined) {
                playerInventory[id] = parsedData.inventory[id];
            }
        }
    }
}

// 3. Save Game Logic
function saveGame() {
    let dataToSave = {
        money: playerMoney,
        packs: playerPacks,
        inventory: playerInventory
    };
    localStorage.setItem('myMojiSave', JSON.stringify(dataToSave));
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

    // --- UI: TOP BAR ---
    scene.moneyText = scene.add.text(20, 20, 'Bank: $' + playerMoney.toFixed(2), { 
        fontFamily: 'Arial', fontSize: '28px', color: '#2ecc71', fontStyle: 'bold' 
    });

    scene.packsText = scene.add.text(20, 60, 'Packs Owned: ' + playerPacks, { 
        fontFamily: 'Arial', fontSize: '20px', color: '#3498db', fontStyle: 'bold' 
    });

    const resetBtn = scene.add.text(880, 20, 'RESET GAME', { 
        fontFamily: 'Arial', fontSize: '16px', color: '#e74c3c', fontStyle: 'bold' 
    }).setInteractive();
    resetBtn.on('pointerdown', () => {
        if (confirm("Are you sure you want to delete your save and start over?")) {
            localStorage.removeItem('myMojiSave');
            location.reload(); 
        }
    });

    // --- UI: DROP ZONES ---
    scene.binderZone = scene.add.rectangle(150, 680, 240, 100, 0x8e44ad).setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(150, 680, 'DROP IN BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    scene.sellZone = scene.add.rectangle(874, 580, 240, 80, 0xc0392b).setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(874, 580, 'SELL FOR CASH', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    // --- UI: STORE CONTROLS ---
    const buyPackBtn = scene.add.rectangle(400, 680, 180, 60, 0x2980b9).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(400, 680, 'BUY PACK ($5)', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    buyPackBtn.on('pointerdown', () => {
        if (playerMoney >= 5.00) {
            playerMoney -= 5.00;
            playerPacks += 1;
            scene.moneyText.setText('Bank: $' + playerMoney.toFixed(2));
            scene.packsText.setText('Packs Owned: ' + playerPacks);
            saveGame();
        } else {
            scene.moneyText.setColor('#e74c3c');
            scene.time.delayedCall(300, () => scene.moneyText.setColor('#2ecc71'));
        }
    });

    const openPackBtn = scene.add.rectangle(624, 680, 180, 60, 0x27ae60).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(624, 680, 'OPEN PACK', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    openPackBtn.on('pointerdown', () => {
        if (playerPacks > 0) {
            playerPacks -= 1;
            scene.packsText.setText('Packs Owned: ' + playerPacks);
            saveGame();
            spawnBoosterPack(scene); 
        } else {
            scene.packsText.setColor('#e74c3c');
            scene.time.delayedCall(300, () => scene.packsText.setColor('#3498db'));
        }
    });

    // --- UI: VIEW BINDER BUTTON ---
    const viewBinderBtn = scene.add.rectangle(874, 680, 240, 60, 0x34495e).setInteractive().setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(874, 680, 'VIEW BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const binderOverlay = createBinderOverlay(scene);

    viewBinderBtn.on('pointerdown', () => {
        renderBinderGrid(scene, binderOverlay); 
        binderOverlay.setVisible(true);  
    });
}

// --- CORE SYSTEMS ---

function spawnBoosterPack(scene) {
    const spacing = 260; 
    let startX = 252;    
    for (let i = 0; i < 3; i++) {
        let pulledMoji = pullCardWithWeights();
        createDraggableCard(scene, startX + (i * spacing), 350, pulledMoji);
    }
}

function pullCardWithWeights() {
    const rarityWeights = { "Common": 70, "Rare": 20, "Epic": 9, "Legendary": 1 };
    let totalWeight = 0;
    for (let i = 0; i < myMojiDatabase.length; i++) totalWeight += rarityWeights[myMojiDatabase[i].rarity];
    let randomNum = Math.random() * totalWeight;
    for (let i = 0; i < myMojiDatabase.length; i++) {
        randomNum -= rarityWeights[myMojiDatabase[i].rarity];
        if (randomNum <= 0) return myMojiDatabase[i];
    }
    return myMojiDatabase[0]; 
}

// NEW: Separated the visual drawing from the drag logic
function createCardGraphic(scene, mojiData) {
    const bg = scene.add.rectangle(0, 0, 220, 320, 0xffffff).setStrokeStyle(6, 0x1a1a1a);
    const imgBox = scene.add.rectangle(0, -40, 180, 160, 0xe0e0e0).setStrokeStyle(3, 0xcccccc);
    const nameTxt = scene.add.text(0, -140, mojiData.name, { fontFamily: 'Arial', fontSize: '20px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    const rarityTxt = scene.add.text(0, 70, mojiData.rarity, { fontFamily: 'Arial', fontSize: '16px', color: '#7f8c8d' }).setOrigin(0.5);
    const valTxt = scene.add.text(0, 110, '$' + mojiData.baseValue.toFixed(2), { fontFamily: 'Arial', fontSize: '24px', color: '#27ae60', fontStyle: 'bold' }).setOrigin(0.5);
    return [bg, imgBox, nameTxt, rarityTxt, valTxt];
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
            playerInventory[mojiData.id] += 1; 
            saveGame();
            this.destroy(); 
        }
        else if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, scene.sellZone.getBounds())) {
            playerMoney += mojiData.baseValue; 
            scene.moneyText.setText('Bank: $' + playerMoney.toFixed(2));
            saveGame();
            this.destroy(); 
        }
    });
}

// --- VISUAL BINDER & PAGINATION LOGIC ---

function createBinderOverlay(scene) {
    const overlay = scene.add.container(512, 384).setVisible(false);
    overlay.setDepth(100); 

    const bg = scene.add.rectangle(0, 0, 900, 650, 0x1a1a1a).setStrokeStyle(4, 0xecf0f1).setInteractive(); 
    const title = scene.add.text(0, -290, 'MY COLLECTION', { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const closeBtn = scene.add.rectangle(0, 300, 200, 40, 0xe74c3c).setInteractive();
    const closeText = scene.add.text(0, 300, 'CLOSE', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.setVisible(false));

    overlay.add([bg, title, closeBtn, closeText]);
    
    // State variables for the overlay
    overlay.currentCategory = 'Common';
    overlay.viewMode = 'Collection'; // 'Collection' or 'Doubles'
    overlay.gridContainer = scene.add.container(0, 0); // Holds the mini-cards
    overlay.add(overlay.gridContainer);

    // --- SETUP TABS ---
    const categories = ['Common', 'Rare', 'Epic', 'Legendary'];
    let tabX = -300;
    categories.forEach(cat => {
        let tab = scene.add.text(tabX, -240, cat.toUpperCase(), { fontSize: '18px', color: '#7f8c8d', fontStyle: 'bold' }).setInteractive().setOrigin(0.5);
        tab.on('pointerdown', () => {
            overlay.currentCategory = cat;
            renderBinderGrid(scene, overlay);
        });
        overlay.add(tab);
        tabX += 200;
    });

    // --- SETUP MODE TOGGLE (Collection vs Doubles) ---
    const modeBtn = scene.add.rectangle(0, 240, 300, 40, 0xf39c12).setInteractive();
    const modeText = scene.add.text(0, 240, 'VIEWING: MAIN COLLECTION', { fontFamily: 'Arial', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    modeBtn.on('pointerdown', () => {
        overlay.viewMode = (overlay.viewMode === 'Collection') ? 'Doubles' : 'Collection';
        modeText.setText(overlay.viewMode === 'Collection' ? 'VIEWING: MAIN COLLECTION (SAFE)' : 'VIEWING: DOUBLES (CLICK TO WITHDRAW)');
        modeBtn.setFillStyle(overlay.viewMode === 'Collection' ? 0xf39c12 : 0x8e44ad);
        renderBinderGrid(scene, overlay);
    });

    overlay.add([modeBtn, modeText]);
    return overlay;
}

function renderBinderGrid(scene, overlay) {
    // 1. Clear old grid
    overlay.gridContainer.removeAll(true);

    // 2. Filter database by active category
    let filteredCards = myMojiDatabase.filter(m => m.rarity === overlay.currentCategory);

    // 3. Setup grid math
    let startX = -320;
    let startY = -120;
    let col = 0;
    let spacingX = 160;
    let spacingY = 220;

    filteredCards.forEach(moji => {
        let owned = playerInventory[moji.id];
        
        // Logic check: Do we draw this card?
        let shouldDraw = false;
        let withdrawableAmount = 0;

        if (overlay.viewMode === 'Collection' && owned >= 1) {
            shouldDraw = true; // Show 1st copy
        } else if (overlay.viewMode === 'Doubles' && owned > 1) {
            shouldDraw = true; // Show extra copies
            withdrawableAmount = owned - 1; 
        }

        if (shouldDraw) {
            // Build the mini-card graphic
            let miniCard = scene.add.container(startX + (col * spacingX), startY);
            miniCard.add(createCardGraphic(scene, moji));
            miniCard.setScale(0.45); // Shrink it down!
            
            // Add a counter badge
            let displayCount = overlay.viewMode === 'Doubles' ? withdrawableAmount : owned;
            let badgeBg = scene.add.circle(80, -130, 40, 0xe74c3c);
            let badgeTxt = scene.add.text(80, -130, 'x' + displayCount, { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            miniCard.add([badgeBg, badgeTxt]);

            // Add interaction if in Doubles mode
            if (overlay.viewMode === 'Doubles') {
                miniCard.setSize(220, 320); // Set hit area
                miniCard.setInteractive({ cursor: 'pointer' });
                miniCard.on('pointerdown', () => {
                    playerInventory[moji.id] -= 1; // Take one out
                    saveGame();
                    createDraggableCard(scene, 512, 384, moji); // Spawn it on the table
                    renderBinderGrid(scene, overlay); // Refresh the grid
                });
            }

            overlay.gridContainer.add(miniCard);

            // Move to next column
            col++;
            if (col > 4) { // Max 5 columns
                col = 0;
                startY += spacingY;
            }
        }
    });
}
