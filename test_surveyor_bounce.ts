import { useGameStore } from './store/gameStore.js';
import { CARD_DATABASE } from './data/cards.js';

async function runTest() {
    console.log("Starting Scale Surveyor bounce face-down test...");

    const deckList = ['c014', 'c018', 'c029', 'c035'];
    const store = useGameStore.getState();
    store.initializeGame(CARD_DATABASE, deckList);

    const cards = Object.values(useGameStore.getState().cards);
    const surveyor = cards.find(c => c.cardId === 'c014')?.id;
    const deusMachinex = cards.find(c => c.cardId === 'c018')?.id;
    const arcCrisis = cards.find(c => c.cardId === 'c029')?.id;
    const whitest = cards.find(c => c.cardId === 'c035')?.id;

    if (!surveyor || !deusMachinex || !arcCrisis || !whitest) {
        console.error("Failed to find test cards");
        return;
    }

    const testCards = [
        { id: deusMachinex, name: 'Deus Machinex (c018)' },
        { id: arcCrisis, name: 'Arc Crisis (c029)' },
        { id: whitest, name: 'Whitest Hell Armageddon (c035)' }
    ];

    for (const target of testCards) {
        console.log(`\nTesting ${target.name}...`);
        
        // Reset state for target
        useGameStore.setState({
            turnEffectUsage: {}
        });

        // Place target in Monster Zone
        useGameStore.getState().moveCard(target.id, 'MONSTER_ZONE', 0);

        // Put surveyor in Graveyard to trigger its effect
        useGameStore.setState({
            startEffectSelection: (prompt, options, onSelect) => {
                // Auto-confirm bounce
                onSelect('yes');
            },
            startSearch: (filter, onSelect) => {
                // Select target card
                onSelect(target.id);
            }
        });

        // Move surveyor from Field to Graveyard (e.g. as Link Material or sent to GY)
        useGameStore.getState().moveCard(surveyor, 'MONSTER_ZONE', 1);
        useGameStore.getState().moveCard(surveyor, 'GRAVEYARD', undefined, 'MONSTER_ZONE');

        // Check target card state in Extra Deck
        const updatedTarget = useGameStore.getState().cards[target.id];
        const inExtraDeck = useGameStore.getState().extraDeck.includes(target.id);

        console.log(`In Extra Deck: ${inExtraDeck}`);
        console.log(`faceUp: ${updatedTarget.faceUp}`);

        if (!inExtraDeck || updatedTarget.faceUp !== false) {
            console.error(`FAIL: ${target.name} should be face-down (faceUp === false) in Extra Deck!`);
            process.exit(1);
        } else {
            console.log(`SUCCESS: ${target.name} is face-down in Extra Deck.`);
        }
    }

    console.log("\nALL TESTS PASSED!");
}

runTest();
