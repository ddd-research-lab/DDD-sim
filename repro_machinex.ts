
import { useGameStore } from './store/gameStore.js';
import { CARD_DATABASE } from './data/cards.js';

async function runTest() {
    console.log("Initializing Game...");
    // c011: Orthros (Hand/Deck), c030: Zero Machinex (Deck)
    const deckList = ['c011', 'c030', 'c001', 'c001', 'c001']; 

    const store = useGameStore.getState();
    store.initializeGame(CARD_DATABASE, deckList);

    const cards = Object.values(useGameStore.getState().cards);
    const orthros = cards.find(c => c.cardId === 'c011')?.id;
    const machinex = cards.find(c => c.cardId === 'c030')?.id;

    if (!orthros || !machinex) {
        console.error("Failed to find cards");
        return;
    }

    console.log(`Orthros ID: ${orthros}`);
    console.log(`Machinex ID: ${machinex}`);

    // Setup Board: Machinex in MZ, Orthros in P-Zone (ST0)
    console.log("Setting up board...");
    useGameStore.getState().moveCard(machinex, 'MONSTER_ZONE', 0);
    useGameStore.getState().moveCard(orthros, 'SPELL_TRAP_ZONE', 0);

    console.log("Board State:");
    console.log(`MZ0: ${useGameStore.getState().monsterZones[0]}`);
    console.log(`ST0 (P-Zone): ${useGameStore.getState().spellTrapZones[0]}`);

    // Simulate Orthros P-Effect Activation (choice 'yes')
    // We need to handle targeting 1: Machinex, targeting 2: Orthros
    let targetStep = 0;
    const originalStartTargeting = useGameStore.getState().startTargeting;
    
    useGameStore.setState({
        startTargeting: (filter, onSelect) => {
            if (targetStep === 0) {
                console.log("Targeting 1 (Machinex)...");
                targetStep++;
                onSelect(machinex);
            } else if (targetStep === 1) {
                console.log("Targeting 2 (Orthros)...");
                targetStep++;
                onSelect(orthros);
            }
        }
    });

    // Simulate Choice 'yes' for Orthros P-Effect
    // Orthros logic is triggered manually or by specific game events.
    // In gameStore.ts, 'c011' logic handles P-Effect activation.
    console.log("Activating Orthros P-Effect...");
    const logic = (useGameStore.getState() as any).EFFECT_LOGIC['c011'];
    // Calling logic directly. fromLocation=undefined means manual activation.
    logic(useGameStore.getState(), orthros);

    // After activation, choice modal appears. We need to resolve it.
    console.log("Resolving Orthros Choice...");
    useGameStore.getState().resolveEffectSelection('yes');

    // After choice 'yes', targeting should have run via our mock.
    // Check if Machinex is in GY and if its effect triggered.
    const finalStore = useGameStore.getState();
    console.log("Final State Check:");
    console.log(`Machinex in GY: ${finalStore.graveyard.includes(machinex)}`);
    console.log(`Orthros in GY: ${finalStore.graveyard.includes(orthros)}`);
    console.log(`ST0 (P-Zone) is Empty: ${finalStore.spellTrapZones[0] === null}`);

    console.log("Pending Chain length:", finalStore.pendingChain.length);
    finalStore.pendingChain.forEach(p => console.log(` - ${p.label} (${p.id})`));

    const machinexEffect = finalStore.pendingChain.find(p => p.id === machinex);
    if (machinexEffect) {
        console.log("SUCCESS: Machinex effect triggered.");
    } else {
        console.log("FAIL: Machinex effect did NOT trigger or P-Zone was blocked.");
    }
}

runTest().catch(console.error);
