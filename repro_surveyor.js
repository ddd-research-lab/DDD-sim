
const { useGameStore } = require('./store/gameStore');
const { CARD_DATABASE } = require('./data/cards');

// Mock formatLog
global.formatLog = (key, params) => key;
global.getCardName = (card) => card.name;

async function runTest() {
    console.log("Initializing Game...");
    const deckList = ['c002', 'c014', 'c017', 'c001', 'c001']; // Copernicus, Surveyor, Gilgamesh
    useGameStore.getState().initializeGame(CARD_DATABASE, deckList);

    const store = useGameStore.getState();
    const cards = Object.values(store.cards);

    // Find IDs
    const copernicus = cards.find(c => c.cardId === 'c002').id;
    const surveyor = cards.find(c => c.cardId === 'c014').id;
    const gilgamesh = cards.find(c => c.cardId === 'c017').id;

    console.log(`Copernicus: ${copernicus}`);
    console.log(`Surveyor: ${surveyor}`);
    console.log(`Gilgamesh: ${gilgamesh}`);

    // Setup Board
    console.log("Setting up board...");
    store.moveCard(copernicus, 'MONSTER_ZONE', 0);
    store.moveCard(surveyor, 'MONSTER_ZONE', 1);
    store.moveCard(gilgamesh, 'EXTRA_DECK'); // Ensure logic sees it there

    console.log("Board State:");
    console.log(`MZ0: ${store.monsterZones[0]}`);
    console.log(`MZ1: ${store.monsterZones[1]}`);

    // Perform Link Summon
    console.log("Performing Link Summon...");
    // Gilgamesh logic handles the move if we target EMZ
    store.moveCard(gilgamesh, 'EXTRA_MONSTER_ZONE', 0, 'EXTRA_DECK', false, false);

    // Check State
    const finalStore = useGameStore.getState();
    console.log("Final Board State:");
    console.log(`MZ0: ${finalStore.monsterZones[0]}`);
    console.log(`MZ1: ${finalStore.monsterZones[1]}`);
    console.log(`EMZ0: ${finalStore.extraMonsterZones[0]}`);

    console.log(`Graveyard: ${finalStore.graveyard.length} cards`);
    console.log(`Graveyard Includes Surveyor? ${finalStore.graveyard.includes(surveyor)}`);

    // Check Prompt
    console.log("Checking UI State...");
    console.log(`Effect Selection Open: ${finalStore.effectSelectionState.isOpen}`);
    if (finalStore.effectSelectionState.isOpen) {
        console.log(`Title: ${finalStore.effectSelectionState.title}`);
        console.log(`Options: ${JSON.stringify(finalStore.effectSelectionState.options)}`);
    }

    // Check Pending Chain (should be empty if processed)
    console.log(`Pending Chain: ${finalStore.pendingChain.length}`);
    if (finalStore.pendingChain.length > 0) {
        console.log("Executing Pending Chain Item...");
        // Manually execute to see if it prompts
        finalStore.pendingChain[0].execute();
        const postExecStore = useGameStore.getState();
        console.log(`Effect Selection Open (Post Exec): ${postExecStore.effectSelectionState.isOpen}`);
        if (postExecStore.effectSelectionState.isOpen) {
            console.log(`Options: ${JSON.stringify(postExecStore.effectSelectionState.options)}`);
            console.log("FAIL: Prompt appeared despite no targets.");
        } else {
            console.log("SUCCESS: No prompt appeared.");
        }
    }
}

runTest();
