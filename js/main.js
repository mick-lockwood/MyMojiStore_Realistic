// --- GLOBAL STATE ---
let playerMoney = 50.00;
let playerInventory = {};

// Initialize inventory
myMojiDatabase.forEach(moji => {
    playerInventory[moji.id] = 0;
});

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
    const scene = this; // Save a reference to the scene

    const moneyText = scene.add.text(20, 20, 'Bank: $' + playerMoney.toFixed(2), { 
        fontFamily: 'Arial', fontSize: '28px', color: '#2ecc71', fontStyle: 'bold' 
    });
    
    // Attach moneyText to scene so we can update it from anywhere
    scene.moneyText = moneyText; 

    // FIX 1 (Part A): Attach the binderZone to the scene so cards can always find it
    scene.binderZone = scene.add.rectangle(150, 680, 240, 100, 0x8e44ad);
    scene.binderZone.setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(150, 680, 'DROP IN BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const packButton = scene.add.rectangle(512, 680, 240, 60, 0x27ae60).setInteractive();
    packButton.setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(512, 680, 'OPEN PACK ($5)', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    packButton.on('pointerdown', () => {
        packButton.setScale(0.95);
        if (playerMoney >= 5.00) {
            playerMoney -= 5.00;
            scene.moneyText.setText('Bank: $' + playerMoney.toFixed(2));
            spawnBoosterPack(scene); 
        } else {
            scene.moneyText.setColor('#e74c3c');
            scene.time.delayedCall(300, () => scene.moneyText.setColor('#2ecc71'));
        }
    });

    packButton.on('pointerup', () => packButton.setScale(1));

    const viewBinderBtn = scene.add.rectangle(874, 680, 240, 60, 0x34495e).setInteractive();
    viewBinderBtn.setStrokeStyle(4, 0x1a1a1a);
    scene.add.text(874, 680, 'VIEW BINDER', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    // Create the overlay
    const binderOverlay = createBinderOverlay(scene);

    viewBinderBtn.on('pointerdown', () => {
        updateBinderView(scene, binderOverlay); 
        binderOverlay.setVisible(true);  
    });
}

// --- SYSTEMS ---

function spawnBoosterPack(scene) {
    const spacing = 260; 
    let startX = 252;    
    for (let i = 0; i < 3; i++) {
        let pulledMoji = pullCardWithWeights();
        createCard(scene, startX + (i * spacing), 350, pulledMoji);
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

function createCard(scene, x, y, mojiData) {
    const card = scene.add.container(x, y);
    card.setDepth(10); // Standard depth for cards on the table

    const cardBg = scene.add.rectangle(0, 0, 220, 320, 0xffffff).setStrokeStyle(6, 0x1a1a1a);
    const imageBox = scene.add.rectangle(0, -40, 180, 160, 0xe0e0e0).setStrokeStyle(3, 0xcccccc);
    const nameText = scene.add.text(0, -140, mojiData.name, { fontFamily: 'Arial', fontSize: '20px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    const rarityText = scene.add.text(0, 70, mojiData.rarity, { fontFamily: 'Arial', fontSize: '16px', color: '#7f8c8d' }).setOrigin(0.5);
    const valueText = scene.add.text(0, 110, '$' + mojiData.baseValue.toFixed(2), { fontFamily: 'Arial', fontSize: '24px', color: '#27ae60', fontStyle: 'bold' }).setOrigin(0.5);

    card.add([cardBg, imageBox, nameText, rarityText, valueText]);
    card.setSize(220, 320);
    card.setInteractive();
    scene.input.setDraggable(card);

    // FIX 2: Attach the drag events directly to the specific CARD, not the global scene.
    // This stops the cards from overwriting each other's data.
    card.on('drag', function (pointer, dragX, dragY) {
        this.x = dragX;
        this.y = dragY;
    });

    card.on('dragstart', function () {
        this.setScale(1.05);
        this.setDepth(50); // Bring it above other cards, but keep it below the UI overlay
    });

    card.on('dragend', function () {
        this.setScale(1);
        this.setDepth(10); 
        
        let cardBounds = this.getBounds();
        let zoneBounds = scene.binderZone.getBounds();

        if (Phaser.Geom.Intersects.RectangleToRectangle(cardBounds, zoneBounds)) {
            playerInventory[mojiData.id] += 1; 
            this.destroy(); 
        }
    });
}

// --- BINDER MENU & WITHDRAWAL LOGIC ---

function createBinderOverlay(scene) {
    const overlay = scene.add.container(512, 384).setVisible(false);
    
    // FIX 1 (Part B): Set the depth of the overlay to 100 so it ALWAYS covers cards (depth 10-50).
    overlay.setDepth(100); 

    const bg = scene.add.rectangle(0, 0, 800, 600, 0x1a1a1a).setStrokeStyle(4, 0xecf0f1);
    
    // Catch clicks on the background so you don't accidentally drag cards underneath it
    bg.setInteractive(); 

    const title = scene.add.text(0, -250, 'MY COLLECTION', { fontFamily: 'Arial', fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const closeBtn = scene.add.rectangle(0, 250, 200, 50, 0xe74c3c).setInteractive();
    const closeText = scene.add.text(0, 250, 'CLOSE', { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    closeBtn.on('pointerdown', () => overlay.setVisible(false));

    overlay.add([bg, title, closeBtn, closeText]);
    
    // Array to hold our dynamic list rows
    overlay.listItems = []; 
    return overlay;
}

// NEW: Dynamic Interactive List System
function updateBinderView(scene, overlay) {
    // 1. Clear out the old list
    overlay.listItems.forEach(item => item.destroy());
    overlay.listItems = [];

    let yPos = -180; // Starting height for the list

    // 2. Loop through the database. If the player owns the card, create a clickable row for it
    myMojiDatabase.forEach(moji => {
        let count = playerInventory[moji.id];
        if (count > 0) {
            
            // Create the interactive text row
            let rowText = scene.add.text(-350, yPos, `${moji.name} (x${count})  >>  [ CLICK TO WITHDRAW ]`, { 
                fontFamily: 'Courier New', fontSize: '18px', color: '#f39c12' 
            }).setInteractive();

            // Hover effects to make it feel like a real button
            rowText.on('pointerover', () => rowText.setColor('#ffffff'));
            rowText.on('pointerout', () => rowText.setColor('#f39c12'));

            // The Withdrawal Action
            rowText.on('pointerdown', () => {
                playerInventory[moji.id] -= 1; // Remove from inventory
                
                // Spawn the physical card on the shop counter (behind the overlay)
                createCard(scene, 512, 384, moji); 
                
                // Refresh the binder view to update the numbers
                updateBinderView(scene, overlay); 
            });

            // Add the row to the overlay container
            overlay.add(rowText);
            overlay.listItems.push(rowText);
            
            yPos += 30; // Move down for the next line
        }
    });
}
