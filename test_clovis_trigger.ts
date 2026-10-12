import { useGameStore } from './store/gameStore.js';
import { CARD_DATABASE } from './data/cards.js';

async function runTest() {
    console.log("Starting Clovis Synchro summon trigger test...");

    const deckList = ['c026', 'c004']; // Clovis, Kepler
    const store = useGameStore.getState();
    store.initializeGame(CARD_DATABASE, deckList);

    const cards = Object.values(useGameStore.getState().cards);
    const clovis = cards.find(c => c.cardId === 'c026')?.id;
    const kepler = cards.find(c => c.cardId === 'c004')?.id;

    if (!clovis || !kepler) {
        console.error("Failed to find test cards");
        return;
    }

    // Place kepler in banished
    useGameStore.getState().moveCard(kepler, 'BANISHED', 0);

    let clovisPromptShown = false;
    useGameStore.setState({
        startEffectSelection: (prompt, options, onSelect) => {
            if (prompt.includes('除外・墓地の「DD」を特殊召喚しますか？')) {
                clovisPromptShown = true;
            }
            onSelect('no');
        }
    });

    // Test 1: Clovis Special Summoned from Graveyard (e.g. Reborn) -> Should NOT trigger
    console.log("Testing Clovis SS from Graveyard...");
    clovisPromptShown = false;
    useGameStore.getState().moveCard(clovis, 'GRAVEYARD', 0);
    useGameStore.getState().moveCard(clovis, 'MONSTER_ZONE', 0, 'GRAVEYARD');
    if (clovisPromptShown) {
        console.error("FAIL: Clovis triggered when SS from Graveyard!");
        process.exit(1);
    } else {
        console.log("SUCCESS: Clovis did NOT trigger from GY SS.");
    }

    // Test 2: Clovis Synchro Summoned from Extra Deck -> SHOULD trigger
    console.log("Testing Clovis Synchro Summon from Extra Deck...");
    clovisPromptShown = false;
    useGameStore.getState().moveCard(clovis, 'EXTRA_DECK', 0);
    useGameStore.getState().moveCard(clovis, 'MONSTER_ZONE', 0, 'EXTRA_DECK', false, true, 'mats:Tuner＋NonTuner');
    if (!clovisPromptShown) {
        console.error("FAIL: Clovis did not trigger on Synchro Summon!");
        process.exit(1);
    } else {
        console.log("SUCCESS: Clovis triggered on Synchro Summon.");
    }

    console.log("\nALL CLOVIS TESTS PASSED!");
}

runTest();
