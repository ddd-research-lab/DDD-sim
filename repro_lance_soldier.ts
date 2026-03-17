
import { useGameStore } from './store/gameStore.js';
import { CARD_DATABASE } from './data/cards.js';

async function runTest() {
    console.log("Initializing Game...");
    // c032: DD Lance Soldier, c022: Caesar (Rank 4 Xyz), c015: Necro Slime (Level 4)
    const deckList = ['c032', 'c015', 'c015', 'c001', 'c001']; 

    const store = useGameStore.getState();
    store.initializeGame(CARD_DATABASE, deckList);

    const cards = Object.values(useGameStore.getState().cards);
    const lance = cards.find(c => c.cardId === 'c032')?.id;
    const mat1 = cards.find(c => c.cardId === 'c015' && c.id !== lance)?.id;
    const mat2 = cards.find(c => c.cardId === 'c015' && c.id !== lance && c.id !== mat1)?.id;

    if (!lance || !mat1 || !mat2) {
        console.error("Failed to find cards");
        return;
    }

    console.log(`Lance Soldier ID: ${lance}`);
    console.log(`Material 1 ID: ${mat1}`);
    console.log(`Material 2 ID: ${mat2}`);

    // --- CASE 1: Xyz Summon ---
    console.log("\n--- Scenario 1: Xyz Summon ---");
    
    // 1. Setup: Lance in GY, Contract on field
    console.log("Setting up: Lance in GY, Contract on field...");
    const contractId = cards.find(c => c.cardId === 'c001')?.id;
    if (contractId) useGameStore.getState().moveCard(contractId, 'SPELL_TRAP_ZONE', 1);
    useGameStore.getState().moveCard(lance, 'GRAVEYARD');

    // 2. Activate Lance Effect in GY to SS itself
    console.log("Activating Lance GY Effect...");
    const lanceLogic = (useGameStore.getState() as any).EFFECT_LOGIC['c032'];
    lanceLogic(useGameStore.getState(), lance);
    
    // Select choice 'yes'
    useGameStore.getState().resolveEffectSelection('yes');
    // Select contract to destroy (targetId = contractId)
    // startTargeting mock/resolution
    useGameStore.getState().resolveTarget(contractId!);
    // Select zone for SS
    useGameStore.getState().resolveZoneSelection('MONSTER_ZONE', 0);

    console.log(`Lance in Monster Zone: ${useGameStore.getState().monsterZones[0] === lance}`);
    console.log(`Lance Flags: ${JSON.stringify(useGameStore.getState().cardFlags[lance])}`);
    
    // 3. Xyz Summon using Lance as material
    // Setup another material
    useGameStore.getState().moveCard(mat1, 'MONSTER_ZONE', 1);
    
    console.log("Performing Xyz Summon (Caesar)...");
    const caesarId = useGameStore.getState().extraDeck.find(id => useGameStore.getState().cards[id].cardId === 'c022');
    if (!caesarId) {
        console.error("Caesar not found in Extra Deck");
        return;
    }

    // Resolve Xyz Summon
    useGameStore.getState().resolveXyzSummon(caesarId, [lance, mat1], 'MONSTER_ZONE', 0);

    const afterXyzState = useGameStore.getState();
    const isLanceInBanish = afterXyzState.banished.includes(lance);
    const isLanceInMaterial = afterXyzState.materials[caesarId]?.includes(lance);

    console.log(`Check - Lance in Banish: ${isLanceInBanish}`);
    console.log(`Check - Lance in Material: ${isLanceInMaterial}`);

    if (isLanceInMaterial && !isLanceInBanish) {
        console.log("SUCCESS: Lance Soldier correctly moved to Material zone.");
    } else {
        console.log("FAIL: Lance Soldier was banished or failed to move to Material.");
    }

    // 4. Detach Lance Soldier
    console.log("Detaching Lance Soldier...");
    useGameStore.getState().moveCard(lance, 'GRAVEYARD', 0, 'MATERIAL');
    
    const afterDetachState = useGameStore.getState();
    console.log(`Check - Lance in GY: ${afterDetachState.graveyard.includes(lance)}`);
    console.log(`Check - Lance in Banish: ${afterDetachState.banished.includes(lance)}`);
    
    if (afterDetachState.graveyard.includes(lance) && !afterDetachState.banished.includes(lance)) {
        console.log("SUCCESS: Lance Soldier correctly moved to GY after detachment.");
    } else {
        console.log("FAIL: Lance Soldier was banished after detachment or failed to move to GY.");
    }

    // --- CASE 2: Synchro Summon ---
    console.log("\n--- Scenario 2: Synchro Summon ---");
    // Reset or setup for Synchro
    useGameStore.getState().moveCard(lance, 'GRAVEYARD');
    if (contractId) useGameStore.getState().moveCard(contractId, 'SPELL_TRAP_ZONE', 1);
    
    // SS Lance again
    lanceLogic(useGameStore.getState(), lance);
    useGameStore.getState().resolveEffectSelection('yes');
    useGameStore.getState().resolveTarget(contractId!);
    useGameStore.getState().resolveZoneSelection('MONSTER_ZONE', 0);
    
    // Setup Tuner (c015 - wait c015 is not tuner, let's use c010 Ghost which is c010)
    // Actually let's just force a card to be a tuner for test
    const tunerId = mat2;
    useGameStore.getState().cards[tunerId].subType = ['TUNER', 'DD'];
    useGameStore.getState().moveCard(tunerId, 'MONSTER_ZONE', 1);

    console.log("Performing Synchro Summon (Alexander c020)...");
    const alexId = useGameStore.getState().extraDeck.find(id => useGameStore.getState().cards[id].cardId === 'c020');
    if (alexId) {
        useGameStore.getState().resolveSynchroSummon(tunerId, [lance], alexId, 'MONSTER_ZONE', 0);
    }
    
    const afterSynchroState = useGameStore.getState();
    console.log(`Check - Lance in Banish: ${afterSynchroState.banished.includes(lance)}`);
    
    if (afterSynchroState.banished.includes(lance)) {
        console.log("SUCCESS: Lance Soldier correctly banished as Synchro Material.");
    } else {
        console.log("FAIL: Lance Soldier was NOT banished as Synchro Material.");
    }
}

runTest().catch(console.error);
