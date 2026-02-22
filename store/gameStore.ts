import { create } from 'zustand';
import { GameState, Card, ZoneType } from '@/types';
import { formatLog, getCardName } from '@/data/locales';

// Extend GameState locally if needed or just use it. 
// Since GameState is imported, we should update types.ts.
// But we can cast or extend here for the store.
// Let's check where GameState is defined. It is imported from '@/types'.
// I should update '@/types'.

// Ark Crisis Material Validation Helper
const checkArkCrisisMaterials = (mats: Card[]): boolean => {
    if (mats.length !== 4) return false;

    const hasFusion = mats.some(m => m.subType?.includes('FUSION'));
    const hasSynchro = mats.some(m => m.subType?.includes('SYNCHRO'));

    // Special Rule: Deus Machinex (c018) can be Xyz OR Pendulum
    const machinexes = mats.filter(m => m.cardId === 'c018');
    const others = mats.filter(m => m.cardId !== 'c018');

    const checkCombinations = (remainingMats: Card[], foundXyz: boolean, foundPend: boolean): boolean => {
        if (remainingMats.length === 0) return foundXyz && foundPend;
        const [current, ...rest] = remainingMats;

        const possible: boolean[] = [];
        const isX = current.subType?.includes('XYZ');
        const isP = current.subType?.includes('PENDULUM');

        if (current.cardId === 'c018') {
            // Can be Xyz or Pend (Special handling for Deus Machinex)
            // But wait, the requirements are: 1 Fusion, 1 Synchro, 1 Xyz, 1 Pend.
            // If we have 2 Machinexes, one can be Xyz, one can be Pend.
            // If we have 1 Machinex, it can be either.
            if (!foundXyz) possible.push(checkCombinations(rest, true, foundPend));
            if (!foundPend) possible.push(checkCombinations(rest, foundXyz, true));
        } else {
            const nowX = foundXyz || isX;
            const nowP = foundPend || isP;
            // Must be at least one of them to be useful (and not already found or we don't care about duplicates?)
            // Actually, we need EXACTLY one of each type in the 4-set.
            // Wait, the user said "計4体". 
            // So among the 4:
            // - Fusion must exist
            // - Synchro must exist
            // - Xyz must exist
            // - Pendulum must exist
            // Machinex can substitute X OR P.

            // If this 'current' card is Fusion or Synchro, we skip (already checked mats.some for those)
            // No, we need to make sure 1 card maps to 1 requirement.
            return checkCombinations(rest, nowX || false, nowP || false);
        }
        return possible.some(p => p);
    };

    // Refined logic:
    // We need 4 cards that can collectively cover {Fusion, Synchro, Xyz, Pendulum}.
    // Each card can be one or more types. Machinex is {Xyz, Pendulum} PLUS the special rule makes it {Xyz, Pendulum} again.
    // Let's use a simpler check:
    // Can we assign each card to a unique requirement?
    const requirements = ['FUSION', 'SYNCHRO', 'XYZ', 'PENDULUM'];
    const canSatisfy = (card: Card, req: string): boolean => {
        if (req === 'FUSION') return card.subType?.includes('FUSION') || false;
        if (req === 'SYNCHRO') return card.subType?.includes('SYNCHRO') || false;
        if (req === 'XYZ') return card.subType?.includes('XYZ') || card.cardId === 'c018';
        if (req === 'PENDULUM') return card.subType?.includes('PENDULUM') || card.cardId === 'c018';
        return false;
    };

    const solve = (cardIdx: number, usedReqs: Set<string>): boolean => {
        if (usedReqs.size === 4) return true;
        if (cardIdx >= mats.length) return false;
        for (const req of requirements) {
            if (!usedReqs.has(req) && canSatisfy(mats[cardIdx], req)) {
                usedReqs.add(req);
                if (solve(cardIdx + 1, usedReqs)) return true;
                usedReqs.delete(req);
            }
        }
        return false;
    };

    return solve(0, new Set<string>());
};

// --- Extra Deck Sorting Helper ---
const sortExtraDeck = (instanceIds: string[], cards: { [id: string]: Card }): string[] => {
    const getCategory = (card: Card): number => {
        const subType = (card.subType || '').toUpperCase();
        if (subType.includes('FUSION')) return 0;
        if (subType.includes('SYNCHRO')) return 1;
        if (subType.includes('XYZ')) return 2;
        if (subType.includes('LINK')) return 3;
        return 4; // Others (e.g., Main Deck Pendulums in EX)
    };

    return [...instanceIds].sort((a, b) => {
        const cardA = cards[a];
        const cardB = cards[b];
        if (!cardA || !cardB) return 0;

        const catA = getCategory(cardA);
        const catB = getCategory(cardB);

        if (catA !== catB) return catA - catB;

        // Internal Sort
        if (catA <= 2) { // Fusion, Synchro, Xyz
            const valA = cardA.level || cardA.rank || 0;
            const valB = cardB.level || cardB.rank || 0;
            return valA - valB;
        }

        if (catA === 3) { // Link
            // Gilgamesh (c017) then Zeus Ragnarok (c028)
            const order: { [key: string]: number } = { 'c017': 0, 'c028': 1 };
            const ordA = order[cardA.cardId] ?? 99;
            const ordB = order[cardB.cardId] ?? 99;
            return ordA - ordB;
        }

        return 0; // Maintain order for others
    });
};

// Effect helper logic
const EFFECT_LOGIC: { [cardId: string]: (store: any, selfId: string, fromLocation?: string, summonVariant?: string, isUsedAsMaterial?: boolean) => void } = {
    // DDD Cursed King Siegfried Logic
    'c020': (store, selfId, fromLocation) => {
        // Effect 1: Negate S/T (Quick) - Not implemented for Solo as per request.

        // Effect 2: If destroyed: Gain 1000 LP per "Dark Contract".
        // Trigger condition: "If destroyed" -> generic trigger is usually from Field to GY?
        // Rule: "If destroyed" usually means from Field to GY by battle/effect.
        // We will assume "sent to GY from Monster Zone" implies destruction for now in this sim's level of detail,
        // or specifically if triggers run when moving to GY.
        // fromLocation check:
        if (store.graveyard.includes(selfId) && fromLocation === 'MONSTER_ZONE') {
            // Logic: Count Contracts -> Gain LP
            const contractCount = [...store.spellTrapZones, store.fieldZone]
                .filter(id => id) // remove nulls
                .map(id => store.cards[id!])
                .filter(card => card && (card.name.includes('Dark Contract') || card.name.includes('契約書')))
                .length;

            if (contractCount > 0) {
                const gain = contractCount * 1000;
                store.addLog(formatLog('log_trigger_effect', { card: getCardName(store.cards['c020'], store.language) }));
                store.changeLP(gain);
                store.addLog(formatLog('log_recover_lp', { amount: gain.toString() }));
            }
        }
    },

    'c004': (store, selfId, fromLocation) => {
        // [Monster Effect] If Summoned: Choice between Add Contract or Return DD
        if ((store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) && fromLocation) {
            const options = [{ label: formatLog('label_contract_search_deck'), value: 'search' }];

            const hasDDToReturn = [...store.monsterZones, ...store.extraMonsterZones].some(id =>
                id && id !== selfId && store.cards[id].name.includes('DD')
            );
            if (hasDDToReturn) {
                options.push({ label: formatLog('label_dd_return_field'), value: 'return' });
            }

            store.startEffectSelection(
                formatLog('prompt_kepler_select_effect'),
                options,
                (choice) => {
                    if (choice === 'search') {
                        store.startSearch(
                            (c) => c.name.includes('Dark Contract') || c.name.includes('契約書'),
                            (selectedId) => {
                                store.moveCard(selectedId, 'HAND');
                                // Log is handled by moveCard
                                store.addTurnEffectUsage('c004', selfId);
                            },
                            formatLog('prompt_contract_search')
                        );
                    } else if (choice === 'return') {
                        store.startTargeting(
                            (card) => {
                                const onField = store.monsterZones.includes(card.id) || store.extraMonsterZones.includes(card.id);
                                return onField && card.id !== selfId && card.name.includes('DD');
                            },
                            (targetId) => {
                                store.moveCard(targetId, 'HAND');
                                // Log is handled by moveCard
                                store.addTurnEffectUsage('c004', selfId);
                            }
                        );
                    }
                }
            );
        }
    },
    // DDD Flame King Genghis (c007) and High King Genghis (c019)
    // [Effect] If another "DD" is SS: Target 1 "DD" in GY; SS it.
    'c007': (store, selfId, fromLocation) => {
        if (!store.monsterZones.includes(selfId) && !store.extraMonsterZones.includes(selfId)) return;
        // Fix: Strictly require TRIGGER. preventing manual activation.
        if (fromLocation !== 'TRIGGER') return;

        const cardName = store.cards[selfId].name;
        const usageKey = `${cardName}_opt`; // HOPT per name
        if (store.turnEffectUsage[usageKey]) {
            if (fromLocation !== 'TRIGGER') store.addLog(store.language === 'ja' ? formatLog('log_error_condition') : `"${cardName}" effect already used this turn.`);
            // Automatically clear from triggers if already used
            useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));
            return;
        }

        const hasTarget = store.graveyard.some(id => store.cards[id].name.includes('DD') && store.cards[id].type === 'MONSTER');
        if (!hasTarget) {
            if (fromLocation !== 'TRIGGER') store.addLog(store.language === 'ja' ? formatLog('log_search_fail') : 'No valid "DD" monsters in GY.');
            useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));
            return;
        }

        store.startEffectSelection(formatLog('prompt_genghis_gy_ss', { card: getCardName(store.cards[selfId], store.language) }), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
            // Remove from triggers as soon as choice is picked
            const usageKey = `${cardName}_opt`;
            useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));

            if (choice === 'yes') {
                store.addTurnEffectUsage(usageKey, selfId); // Mark as used even before selection to prevent re-trigger during search if moveCard called
                store.startSearch(
                    (c) => store.graveyard.includes(c.id) && c.name.includes('DD') && c.type === 'MONSTER',
                    (tid) => {
                        const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                        if (emptyIndices.length > 0) {
                            store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                useGameStore.getState().moveCard(tid, 'MONSTER_ZONE', i, 'GRAVEYARD', false, true);
                                const cardName = getCardName(store.cards[tid], store.language);
                                // Log is handled by moveCard
                                store.addTurnEffectUsage(usageKey, selfId);

                            });
                        }
                    },
                    formatLog('prompt_select_dd_ss'),
                    store.graveyard
                );
            }
        });
    },
    'c019': (store, selfId, fromLocation) => {
        // High King Genghis shares the same SS trigger logic as Flame King Genghis
        // (Also has a negation effect, but focusing on SS per user request)
        EFFECT_LOGIC['c007'](store, selfId, fromLocation);
    },
    'c008': (store, selfId, fromLocation) => {
        // Abyss Ragnarok
        const isMonster = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);
        const isPZone = store.spellTrapZones.includes(selfId);

        if (isMonster) {
            // (1) If Summoned: SS "DDD"
            if (fromLocation && fromLocation !== 'TRIGGER') {
                const name = store.cards[selfId].name;
                const usageKey = `${name}_summon_opt`;
                const hasTarget = store.graveyard.some(id => store.cards[id].name.includes('DDD') && store.cards[id].type === 'MONSTER');

                if (hasTarget && !store.turnEffectUsage[usageKey]) {
                    store.startEffectSelection(formatLog('prompt_ragnarok_gy_ss', { card: getCardName(store.cards[selfId], store.language) }), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                        // Cleanup triggers
                        useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));

                        if (choice === 'yes') {
                            store.startSearch(
                                (c) => store.graveyard.includes(c.id) && c.name.includes('DDD') && c.type === 'MONSTER',
                                (tid) => {
                                    const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                    if (emptyIndices.length > 0) {
                                        store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                            useGameStore.getState().moveCard(tid, 'MONSTER_ZONE', i, undefined, false, true);
                                            useGameStore.getState().moveCard(tid, 'MONSTER_ZONE', i, undefined, false, true);
                                            // Log handled by moveCard
                                            store.addTurnEffectUsage(usageKey);
                                        });
                                    }
                                },
                                formatLog('prompt_select_lv8_ddd'), // Or general DDD
                                store.graveyard
                            );
                        }
                    });
                }
            }
        }

        if (isPZone) {
            if (fromLocation && fromLocation !== 'TRIGGER') return;

            const name = store.cards[selfId].name;
            const usageKey = `${name}_peffect_opt`;
            if (store.turnEffectUsage[usageKey]) {
                if (fromLocation !== 'TRIGGER') store.addLog(formatLog('log_error_condition'));
                useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));
                return;
            }

            const hasTarget = store.graveyard.some(id => store.cards[id].name.includes('DD') && store.cards[id].type === 'MONSTER');
            if (hasTarget) {
                store.startEffectSelection(formatLog('prompt_ragnarok_p_ss'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                    // Cleanup pending trigger
                    useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));

                    if (choice === 'yes') {
                        // Mark usage early to prevent re-triggering during resolution
                        store.addTurnEffectUsage(usageKey);

                        store.startSearch(
                            (c) => {
                                const s = useGameStore.getState();
                                return s.graveyard.includes(c.id) && c.name.includes('DD') && c.type === 'MONSTER';
                            },
                            (tid) => {
                                const s2 = useGameStore.getState();
                                const emptyIndices = s2.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                if (emptyIndices.length > 0) {
                                    s2.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                        const s3 = useGameStore.getState();
                                        s3.moveCard(tid, 'MONSTER_ZONE', i, 'GRAVEYARD', false, true);
                                        s3.changeLP(-1000);
                                        useGameStore.setState({ isTellBuffActive: true });
                                        // Log handled by moveCard and changeLP
                                        s3.addLog(formatLog('log_take_damage', { amount: '1000' }));
                                    });
                                }
                            },
                            'Select "DD" in GY',
                            store.graveyard
                        );
                    }
                });
            }
        }
    },
    // DD Savant Copernicus Logic (c009)
    'c009': (store, selfId, fromLocation) => {
        // [Monster Effect] If Summoned: Send DD/Contract to GY
        if (store.monsterZones.includes(selfId) && fromLocation) {
            // HOPT Check (Manual because exempt from moveCard for cancellation)
            if (store.turnEffectUsage['c009']) return;

            store.startEffectSelection(formatLog('prompt_copernicus_dump'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    // Note: Copernicus is usually Trigger, not Ignition, so activateEffect often not used.
                    // But if it were, we add usage here.
                    // Trigger uses its own logic usually? Copernicus is trigger.
                    store.startSearch(
                        (c) => (c.name.includes('DD') || c.name.includes('Dark Contract') || c.name.includes('契約書')) && c.id !== selfId,
                        (id) => {
                            // Suppress generic log, use specific localized log
                            store.moveCard(id, 'GRAVEYARD', 0, undefined, true);
                            const cardName = getCardName(store.cards[id], store.language);
                            store.addLog(formatLog('log_copernicus_dump', { card: cardName }));
                        },
                        formatLog('prompt_select_card'),
                        store.deck
                    );
                    store.addTurnEffectUsage('c009', selfId); // Add usage upon confirmation
                }
            });
        }
    },
    // DD Count Surveyor Logic (c012)
    'c012': (store, selfId, fromLocation, summonVariant) => {
        const inHand = store.hand.includes(selfId);
        const inMZ = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);

        // [Hand Effect]
        if (inHand && !inMZ && !fromLocation && !store.isHistoryBatching && summonVariant !== 'PENDULUM' && !store.isBatching && !store.isPendulumSummoning && !store.isPendulumProcessing) {
            if (!store.turnEffectUsage['c012_hand_ss']) {
                store.startEffectSelection(formatLog('prompt_count_surveyor_hand_ss'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                    if (choice === 'yes') {
                        const currentStore = useGameStore.getState();
                        const handDD = currentStore.hand.filter(id => id !== selfId && currentStore.cards[id].name.includes('DD'));

                        if (handDD.length === 0) {
                            currentStore.addLog(formatLog('log_error_condition'));
                            return;
                        }

                        currentStore.startSearch(
                            (c) => handDD.includes(c.id),
                            (discardId) => {
                                // Start Batching to order triggers: Discard (Scale) -> Summon (Count)
                                useGameStore.setState({ isBatching: true });
                                try {
                                    useGameStore.getState().addTurnEffectUsage('c012_hand_ss', selfId);
                                    const cs = useGameStore.getState();

                                    // 1. Discard Cost
                                    // Use generic moveCard log
                                    cs.moveCard(discardId, 'GRAVEYARD', 0);


                                    // 2. SS Self
                                    const emptyIndices = cs.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                    if (emptyIndices.length > 0) {
                                        cs.startZoneSelection(formatLog('prompt_select_zone'), (t, zi) => t === 'MONSTER_ZONE' && emptyIndices.includes(zi), (t, zi) => {
                                            const finalState = useGameStore.getState();
                                            // Suppress automatic SS log to prevent duplicate with manual log (if exists) or just generic "Moved" log
                                            // User reported duplicate: [9] Moved to Zone 5, [10] Special Summoned.
                                            // We keep the "Moved to Zone" (or vice versa? User said "Same meaning").
                                            // Actually, moveCard with isSpecialSummon=true likely logs "Special Summoned".
                                            // If we suppress, we get NO log from moveCard?
                                            // Let's suppress and rely on the manual log if we add one, OR
                                            // If we DON'T add a manual log, maybe moveCard DOES both?
                                            // Let's assume moveCard does ONE log, and c012 logic *elsewhere* does another?
                                            // Wait, I didn't find another manual log in c012.
                                            // If moveCard logs "Moved" AND "Special Summoned", that's a moveCard issue.
                                            // But user says:
                                            // [9] DD...をモンスターゾーン5に特殊召喚しました。 (Detailed)
                                            // [10] DD... を特殊召喚しました。 (Simple)
                                            // One is likely "log_sp_summon_to_mz" (from moveCard?), one is "log_sp_summon" (from moveCard?).
                                            // Let's look at moveCard logging logic.
                                            // But for now, setting suppressLog=true will kill ONE of them (the moveCard one).
                                            // If both come from moveCard, causing NO logs would be bad.
                                            // But if I suppress, I can Add Manual Log safely.
                                            finalState.moveCard(selfId, 'MONSTER_ZONE', zi, 'HAND', true, true);
                                            finalState.addLog(formatLog('log_sp_summon_to_mz', { card: getCardName(finalState.cards[selfId], finalState.language), index: (zi + 1).toString() }));
                                            // Log handled by moveCard


                                            // 3. Process Batch
                                            console.log('c012 Batch End - Pushing History');
                                            useGameStore.setState({ isBatching: false });
                                            finalState.processPendingEffects();
                                            finalState.processUiQueue();
                                            finalState.pushHistory(); // Ensure snapshot is saved
                                        });
                                    } else {
                                        cs.addLog(formatLog('err_count_surveyor_no_zone'));
                                        useGameStore.setState({ isBatching: false });
                                        cs.processUiQueue();
                                    }
                                } catch (e) {
                                    console.error(e);
                                    useGameStore.setState({ isBatching: false });
                                }
                            },
                            formatLog('prompt_discard_dd_hand'),
                            handDD
                        );
                    }
                });
            }
            return;
        }
        // [Monster Effect] If Summoned: Add 0/0 DD (Separate HOPT from SS effect)
        // Use a slight timeout or ensure we check the freshest state to avoid closure issues
        const freshState = useGameStore.getState();
        // [Monster Effect] If Summoned: Add 0/0 DD
        if (inMZ && fromLocation) {
            // Check HOPT for search effect separately
            if (freshState.turnEffectUsage['c012_search']) {
                freshState.addLog(formatLog('log_hopt_used', { card: getCardName(freshState.cards[selfId], freshState.language) }));
                return;
            }
            store.startEffectSelection(formatLog('prompt_count_surveyor_search_0'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    useGameStore.getState().addTurnEffectUsage('c012_search', selfId); // Mark search effect used
                    store.startSearch(
                        (c) => c.name.includes('DD') && (c.attack === 0 || c.defense === 0),
                        (id) => {
                            // Use generic moveCard log, remove manual log to prevent duplicates
                            const s = useGameStore.getState();
                            s.moveCard(id, 'HAND', 0);
                        },
                        formatLog('prompt_select_0_dd'),
                        store.deck
                    );
                }
            });
        }
    },
    // DD Gryphon Logic (c013)
    'c013': (store, selfId, fromLocation, summonVariant) => {
        // [Hand Effect] SS from Hand
        // Allow activation if triggered manually (!fromLocation) OR if explicitly moved from 'HAND' (fromLocation === 'HAND')

        const inHand = store.hand.includes(selfId);
        const inMZ = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);
        const inGY = store.graveyard.includes(selfId);
        const inED = store.extraDeck.includes(selfId);
        const inSTZ = store.spellTrapZones.includes(selfId);

        // [Hand Effect] SS from Hand
        if (inHand && !inMZ && !inGY && !inED && !fromLocation && !store.isHistoryBatching && summonVariant !== 'PENDULUM' && !store.isBatching && !store.isPendulumSummoning && !store.isPendulumProcessing) {
            if (store.turnEffectUsage['c013_hand_ss']) return;

            // Check if we control a "DD" Monster
            const hasDD = store.monsterZones.some(id => id && store.cards[id].name.includes('DD')) ||
                store.extraMonsterZones.some(id => id && store.cards[id].name.includes('DD'));

            if (!hasDD) return;

            store.startEffectSelection(formatLog('prompt_gryphon_hand_ss'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                    if (emptyIndices.length > 0) {
                        store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                            store.addTurnEffectUsage('c013_hand_ss', selfId); // Mark used
                            useGameStore.getState().moveCard(selfId, 'MONSTER_ZONE', i, 'HAND', false, true);
                            // Log handled by moveCard
                        });
                    }
                }
            });
            return;
        }
        // [P-Effect] Target Fiend; ATK+2000, Destroy this.
        // Condition: You can only use this effect if you have a "Dark Contract" card in your GY or Field.
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return;

            // Check for Dark Contract in Field (S/T Zone, Field Zone) or GY
            const hasContract = [...store.spellTrapZones, store.fieldZone, ...store.graveyard]
                .some(id => id && (store.cards[id].name.includes('Dark Contract') || store.cards[id].name.includes('契約書')));

            if (!hasContract) {
                store.addLog(formatLog('log_error_condition'));
                return;
            }

            store.startEffectSelection(formatLog('prompt_gryphon_p_atk_up'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    // Target: "DD" Monster on FIELD (Monster Zones or Extra Monster Zones). NOT P-Zones.
                    store.startTargeting(
                        (c) => {
                            const onField = store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id);
                            return onField && c.name.includes('DD');
                        },
                        (tid) => {
                            store.addTurnEffectUsage('c013', selfId);
                            store.modifyCardProperty(tid, 'attack', 2000, 'add');
                            store.addLog(formatLog('log_activate_effect', { card: getCardName(store.cards[selfId], store.language) }));
                            useGameStore.setState({ lastEffectSourceId: selfId });
                            store.addLog(formatLog('log_destroy', { card: getCardName(store.cards[selfId], store.language) }));
                            store.moveCard(selfId, 'EXTRA_DECK');
                        }
                    );
                }
            });
            return;
        }

        // [Monster Effect] If Pendulum Summoned: Discard DD/Contract -> Draw 1
        // Condition: "If this card is Pendulum Summoned"
        // We detect this via the transient flag 'isPendulumSummoned' set by moveCard during P-Summon.
        if (store.monsterZones.includes(selfId) && store.cardFlags[selfId]?.includes('isPendulumSummoned')) {
            store.startEffectSelection(formatLog('prompt_gryphon_draw'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    // Cost: Discard 1 "DD" or "Dark Contract" card
                    const handCandidates = store.hand.filter(id => {
                        const c = store.cards[id];
                        return c.name.includes('DD') || c.name.includes('Dark Contract') || c.name.includes('契約書');
                    });

                    if (handCandidates.length === 0) {
                        store.addLog(formatLog('log_error_condition'));
                        return;
                    }

                    store.startSearch(
                        (c) => handCandidates.includes(c.id),
                        (discardId) => {
                            useGameStore.getState().addTurnEffectUsage('c013_psummon', selfId);
                            const s = useGameStore.getState();
                            s.moveCard(discardId, 'GRAVEYARD');
                            // moveCard handles the log

                            // Effect: Draw 1
                            s.drawCard();
                            s.addLog(s.language === 'ja' ? formatLog('log_draw') : 'Drew 1 card.');
                        },
                        formatLog('prompt_discard_card'),
                        handCandidates
                    );
                }
            });
        }

        // [Monster Effect] If SS from GY -> Add DD
        if (store.monsterZones.includes(selfId) && fromLocation === 'GRAVEYARD') {
            store.startEffectSelection(formatLog('prompt_gryphon_gy_return'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.startSearch(
                        (c) => c.name.includes('DD'),
                        (id) => { store.moveCard(id, 'HAND'); },
                        formatLog('prompt_select_dd_ss')
                    );
                }
            });
        }
    },

    // DD Savant Thomas Logic (c010)
    'c010': (store, selfId, fromLocation) => {
        // [P-Effect] Add face-up "DD" P-Monster from Extra Deck to Hand.
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return;
            if (store.turnEffectUsage['c010_p']) {
                store.addLog(formatLog('log_hopt_used', { card: getCardName(store.cards[selfId], store.language) }));
                return;
            }
            store.startEffectSelection(formatLog('prompt_thomas_p_return'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.startSearch(
                        (c) => {
                            const st = c.subType || '';
                            const isEDType = st.includes('FUSION') || st.includes('SYNCHRO') || st.includes('XYZ') || st.includes('LINK');
                            return c.name.includes('DD') && st.includes('PENDULUM') && !isEDType;
                        },
                        (id) => {
                            store.moveCard(id, 'HAND');
                            // moveCard handles the log
                            store.addTurnEffectUsage('c010_p', selfId);
                        },
                        formatLog('prompt_select_card'),
                        store.extraDeck
                    );
                }
            });
            return;
        }
        // [Monster Effect] Target P-Zone card -> Destroy -> SS Lv8 DDD from Deck
        if (store.monsterZones.includes(selfId)) {
            if (fromLocation) return; // Manual Activation only
            if (store.turnEffectUsage['c010_m']) {
                store.addLog(formatLog('log_hopt_used', { card: getCardName(store.cards[selfId], store.language) }));
                return;
            }
            store.startEffectSelection(formatLog('prompt_thomas_ss_lv8'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.startTargeting(
                        (c) => (store.spellTrapZones.includes(c.id)) && c.name.includes('DD'),
                        (tid) => {
                            useGameStore.setState({ lastEffectSourceId: selfId });
                            store.addLog(formatLog('log_destroy', { card: getCardName(store.cards[tid], store.language) }));
                            useGameStore.setState({ lastEffectSourceId: selfId });
                            store.moveCard(tid, 'GRAVEYARD');
                            store.addTurnEffectUsage('c010_m', selfId);

                            store.startSearch(
                                (c) => c.name.includes('DDD') && c.level === 8,
                                (deckId) => {
                                    const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                    if (emptyIndices.length > 0) {
                                        store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                            // Negate effects and set level 8
                                            const s = useGameStore.getState();
                                            const mods = { ...s.cardPropertyModifiers };
                                            mods[deckId] = { isNegated: true, level: 8 };
                                            useGameStore.setState({ cardPropertyModifiers: mods });

                                            store.moveCard(deckId, 'MONSTER_ZONE', i, undefined, false, true); // SS
                                        });
                                    }
                                },
                                formatLog('prompt_select_lv8_ddd'),
                                store.deck
                            );
                        }
                    );
                }
            });
        }
    },

    // DD Orthros Logic (c011)
    'c011': (store, selfId, fromLocation, summonVariant) => {
        // [P-Effect] Target 1 DD/Contract + 1 S/T -> Destroy
        // Activated when in Spell/Trap Zone (P-Zone)
        if (store.spellTrapZones.includes(selfId)) {
            // Prevent auto-trigger if just placed? Typically P-Effects are Ignition-like.
            if (fromLocation) return;

            store.startEffectSelection(formatLog('prompt_orthros_p_destroy'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    useGameStore.setState({ lastEffectSourceId: selfId });
                    store.addLog(formatLog('log_activate_effect', { card: getCardName(store.cards[selfId], store.language) }));
                    store.startTargeting(
                        (c) => {
                            const isOnField = store.monsterZones.includes(c.id) ||
                                store.extraMonsterZones.includes(c.id) ||
                                store.spellTrapZones.includes(c.id) ||
                                store.fieldZone === c.id;
                            return isOnField && (c.name.includes('DD') || c.name.includes('Dark Contract')) && c.id !== selfId;
                        },
                        (tid1) => {
                            store.startTargeting(
                                (c) => (store.spellTrapZones.includes(c.id) || store.fieldZone === c.id) && c.id !== tid1,
                                (tid2) => {
                                    // Set Source ID right before each move to ensure Machinex sees it
                                    // Set Source ID right before each move to ensure Machinex sees it
                                    store.addTurnEffectUsage('c011', selfId);
                                    store.addLog(formatLog('log_orthros_destroy', { card: getCardName(store.cards[tid1], store.language), target: getCardName(store.cards[tid2], store.language) }));
                                    useGameStore.setState({ lastEffectSourceId: selfId });
                                    store.moveCard(tid1, 'GRAVEYARD');
                                    useGameStore.setState({ lastEffectSourceId: selfId });
                                    store.moveCard(tid2, 'GRAVEYARD');
                                }
                            );
                        }
                    );
                }
            });
            return;
        }

        // [Monster Effect] Special Summon when taking damage (or triggered by Gilgamesh/Ragnarok as per user request)
        // User requested: If Orthros is in Hand, it glows Green when Gilgamesh/Ragnarok activates.
        // Clicking it triggers SS.
        // The trigger system calls EFFECT_LOGIC with fromLocation='TRIGGER'.
        const inHand = store.hand.includes(selfId);
        const inMZ = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);

        if (inHand && !inMZ && fromLocation === 'TRIGGER' && summonVariant !== 'PENDULUM' && !store.isBatching && !store.isPendulumSummoning && !store.isPendulumProcessing) {
            store.startEffectSelection(formatLog('prompt_orthros_hand_ss'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    // SS from Hand
                    // Check empty zones
                    const currentStore = useGameStore.getState();
                    const emptyIndices = currentStore.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                    if (emptyIndices.length > 0) {
                        currentStore.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                            useGameStore.getState().moveCard(selfId, 'MONSTER_ZONE', i, 'HAND', true, true);
                            useGameStore.getState().addLog(formatLog('log_sp_summon', { card: getCardName(useGameStore.getState().cards[selfId], useGameStore.getState().language) }));
                        });
                    } else {
                        currentStore.addLog(formatLog('log_orthros_no_empty_zone'));
                    }
                }
            });
        }
    },
    // DD Scale Surveyor Logic (c014)
    'c014': (store, selfId, fromLocation, summonVariant) => {
        // [Hand Effect] If control "DD" P-Monster Card, SS from Hand
        const inHand = store.hand.includes(selfId);
        const inMZ = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);
        const inSTZ = store.spellTrapZones.includes(selfId);

        // [Hand Effect]
        if (inHand && !inMZ && !inSTZ && !fromLocation && !store.isHistoryBatching && summonVariant !== 'PENDULUM' && !store.isBatching && !store.isPendulumSummoning && !store.isPendulumProcessing) { // Removed store.isDragging check
            if (store.turnEffectUsage['c014_hand_ss']) { // Corrected usage key from c012 to c014
                store.addLog(formatLog('log_error_condition'));
                return;
            }

            // Check if user controls any DD P-Monster Card (Monster Zone or P-Zone)
            const hasDDPCard = [...store.monsterZones, ...store.extraMonsterZones, store.spellTrapZones[0], store.spellTrapZones[4]].some(id =>
                id && store.cards[id].name.includes('DD') && (store.cards[id].subType?.includes('PENDULUM'))
            );

            if (!hasDDPCard) {
                store.addLog(formatLog('log_error_condition'));
                return;
            }

            store.startEffectSelection(formatLog('prompt_scale_surveyor_ss'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                    if (emptyIndices.length > 0) {
                        store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                            store.addTurnEffectUsage('c014_hand_ss', selfId);
                            store.moveCard(selfId, 'MONSTER_ZONE', i, 'HAND', false, true);
                        });
                    } else {
                        store.addLog(formatLog('log_error_zone'));
                    }
                }
            });
            return;
        }

        // [Monster Effect] Ignition: Change Level to 4
        if (inMZ && !fromLocation) {
            if (store.turnEffectUsage['c014_level_change']) {
                store.addLog(formatLog('log_error_condition'));
                return;
            }

            store.startEffectSelection(formatLog('prompt_scale_surveyor_level_change'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.addTurnEffectUsage('c014_level_change', selfId);
                    store.modifyCardProperty(selfId, 'level', 4, 'set');
                    // Explicitly mark as activated so the wrapper (if used) or our manual check sees it
                    useGameStore.setState({ isEffectActivated: true });
                }
            });
            return;
        }

        // [Trigger Effect] If sent to GY or Extra Deck: Return DD P-Monster Card from Field to Hand
        if ((store.graveyard.includes(selfId) || store.extraDeck.includes(selfId)) && fromLocation) {
            if (store.turnEffectUsage['c014_bounce']) {
                return;
            }

            // Start of candidate check logic (extracted for pre-check)
            const getCandidates = (s: GameStore) => {
                const currentFieldCards = [
                    ...s.monsterZones,
                    ...s.extraMonsterZones,
                    ...s.spellTrapZones,
                    s.fieldZone
                ].filter((id): id is string => id !== null);

                return currentFieldCards.filter(id => {
                    const c = s.cards[id];
                    const isInDataLocation = s.graveyard.includes(id) || s.extraDeck.includes(id) || s.banished.includes(id);
                    return !isInDataLocation && c.name.includes('DD') && c.subType?.includes('PENDULUM');
                });
            };

            const candidatesBeforeQueue = getCandidates(store);
            if (candidatesBeforeQueue.length === 0) return;

            const executeBounce = () => {
                const s = useGameStore.getState();
                // HOPT Double-Check
                if (s.turnEffectUsage['c014_bounce']) return;

                const candidates = getCandidates(s);
                // DEBUG LOG Removed
                // s.addLog(`Debug Surveyor: Found ${candidates.length} candidates.`);
                // candidates.forEach(cid => s.addLog(` - ${s.cards[cid].name} (${cid})`));

                if (candidates.length > 0) {
                    s.startEffectSelection(formatLog('prompt_scale_surveyor_bounce'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                        if (choice === 'yes') {
                            const s2 = useGameStore.getState();
                            s2.startSearch(
                                (c) => candidates.includes(c.id),
                                (selectedId) => {
                                    const s3 = useGameStore.getState();
                                    s3.addTurnEffectUsage('c014_bounce'); // Consume HOPT
                                    const cardDef = s3.cards[selectedId];
                                    const isExMonster = cardDef.subType?.includes('FUSION') || cardDef.subType?.includes('SYNCHRO') || cardDef.subType?.includes('XYZ') || cardDef.subType?.includes('LINK');

                                    if (isExMonster) {
                                        s3.moveCard(selectedId, 'EXTRA_DECK');
                                        s3.addLog(formatLog('log_to_extra', { card: cardDef.name }));
                                    } else {
                                        s3.moveCard(selectedId, 'HAND', 0, undefined, true);
                                        s3.addLog(formatLog('log_scale_surveyor_bounced', { card: getCardName(cardDef, s3.language) }));
                                    }
                                },
                                formatLog('prompt_select_card'),
                                candidates
                            );
                        }
                    });
                }
            };

            // Defer if inside a Link Summon sequence / Material Move
            if (store.isLinkSummoningActive || store.isMaterialMove) {
                useGameStore.setState(prev => ({
                    pendingChain: [...prev.pendingChain, {
                        id: `c014_deferred_${selfId}_${Date.now()}`,
                        label: formatLog('prompt_scale_surveyor_bounce'),
                        execute: executeBounce
                    }]
                }));
            } else {
                executeBounce();
            }
        }
    },
    // DD Necro Slime Logic (c015)
    'c015': (store, selfId, fromLocation) => {
        if (fromLocation) return;
        const currentStore = useGameStore.getState();
        if (currentStore.turnEffectUsage['c015_effect']) return;

        if (currentStore.graveyard.includes(selfId)) {
            const hasOtherDD = currentStore.graveyard.some(id => id !== selfId && currentStore.cards[id].name.includes('DD'));
            if (!hasOtherDD) return;

            store.startEffectSelection(formatLog('prompt_necro_slime_fusion'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                const s = useGameStore.getState();
                if (choice === 'yes') {
                    // Check usage again inside callback to be safe
                    if (s.turnEffectUsage['c015_effect']) return;

                    const fusionOptions = s.extraDeck
                        .filter(id => {
                            const c = s.cards[id];
                            return c.subType?.includes('FUSION') && c.name.includes('DDD') && c.cardId !== 'c029';
                        }).map(id => ({
                            label: getCardName(s.cards[id], s.language),
                            value: id,
                            imageUrl: s.cards[id].imageUrl
                        }));

                    if (fusionOptions.length === 0) {
                        s.addLog(formatLog('log_no_fusion_in_ex'));
                        return;
                    }

                    s.startEffectSelection(formatLog('label_fusion_monster_select'), fusionOptions, (fusionId) => {
                        const s2 = useGameStore.getState();
                        s2.addLog(formatLog('log_fusion_select', { card: getCardName(s2.cards[fusionId], s2.language) }));
                        s2.startSearch(
                            (c) => {
                                const s3 = useGameStore.getState();
                                if (!s3.graveyard.includes(c.id)) return false;
                                if (!c.name.includes('DD')) return false;
                                if (c.id === selfId) return false;
                                // Special rule for High King Genghis (c019)
                                if (s3.cards[fusionId].cardId === 'c019') {
                                    const selfLevel = s3.cardPropertyModifiers[selfId]?.level ?? s3.cards[selfId].level ?? 0;
                                    const matLevel = s3.cardPropertyModifiers[c.id]?.level ?? c.level ?? 0;
                                    return selfLevel >= 5 || matLevel >= 5;
                                }
                                return true;
                            },
                            (matId) => {
                                const { moveCard, addLog, cards, addTurnEffectUsage, monsterZones, extraMonsterZones, startZoneSelection } = useGameStore.getState();

                                // 1. Mark usage immediately to prevent race conditions during zone selection
                                addTurnEffectUsage('c015_effect', selfId);

                                // 2. Banish materials
                                useGameStore.setState({ isMaterialMove: true });
                                moveCard(selfId, 'BANISHED');
                                moveCard(matId, 'BANISHED');
                                useGameStore.setState({ isMaterialMove: false });
                                const slName = getCardName(cards[selfId], useGameStore.getState().language);
                                const matName = getCardName(cards[matId], useGameStore.getState().language);
                                addLog(formatLog('log_necro_slime_banish', { card1: slName, card2: matName }));


                                // 3. Select Zone and Move Fusion Card
                                const s4 = useGameStore.getState();
                                const emptyMZ = s4.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                const emptyEMZ = s4.extraMonsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

                                if (emptyMZ.length > 0 || emptyEMZ.length > 0) {
                                    startZoneSelection(formatLog('prompt_select_zone_fusion'),
                                        (t, i) => {
                                            const s = useGameStore.getState();
                                            if (t === 'MONSTER_ZONE') {
                                                return s.monsterZones[i] === null;
                                            }
                                            if (t === 'EXTRA_MONSTER_ZONE') {
                                                const emzOccupied = s.extraMonsterZones[0] !== null || s.extraMonsterZones[1] !== null;
                                                if (emzOccupied) return false;
                                                return s.extraMonsterZones[i] === null;
                                            }
                                            return false;
                                        },
                                        (t, i) => {
                                            const s = useGameStore.getState();
                                            s.moveCard(fusionId, t, i, undefined, false, true, 'FUSION');
                                            const matNames = [selfId, matId].map(id => getCardName(s.cards[id], s.language)).join(', ');
                                            s.addLog(formatLog('log_summon_materials', { materials: matNames }));
                                        }

                                    );
                                } else {
                                    addLog(formatLog('log_no_available_zones'));
                                }
                            },
                            formatLog('prompt_select_material'),
                            s.graveyard
                        );
                    });
                }
            });
        }
    },

    // Dark Contract with the Witch (c016)
    'c016': (store, selfId, fromLocation) => {
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return;
            store.startEffectSelection(formatLog('prompt_witch_destroy'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    const costCandidates = [...store.hand].filter(id => store.cards[id].name.includes('DD') || store.cards[id].name.includes('Dark Contract'));
                    if (costCandidates.length === 0) {
                        store.addLog(formatLog('log_error_condition'));
                        return;
                    }
                    store.startSearch(
                        (c) => costCandidates.includes(c.id),
                        (costId) => {
                            useGameStore.setState({ lastEffectSourceId: selfId });
                            store.moveCard(costId, 'GRAVEYARD');
                            store.addTurnEffectUsage('c016');
                            const fieldCards = [...store.monsterZones, ...store.extraMonsterZones, ...store.spellTrapZones, store.fieldZone].filter((id): id is string => id !== null);
                            if (fieldCards.length > 0) {
                                store.startTargeting((c) => fieldCards.includes(c.id), (tid) => {
                                    useGameStore.setState({ lastEffectSourceId: selfId });
                                    store.moveCard(tid, 'GRAVEYARD');
                                    store.addLog(formatLog('log_destroy', { card: getCardName(store.cards[tid], store.language) }));
                                });
                            }
                        },
                        formatLog('prompt_discard_card'),
                        costCandidates
                    );
                }
            });
        }
    },

    // Dark Contract with the Gate logic
    'c005': (store, selfId, fromLocation) => {
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return;
            store.startEffectSelection(formatLog('prompt_gate_search'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.addLog(formatLog('log_trigger_effect', { card: getCardName(store.cards[selfId], store.language) }));
                    store.startSearch(
                        (card) => card.type === 'MONSTER' && card.name.includes('DD'),
                        (selectedId) => {
                            store.moveCard(selectedId, 'HAND');
                            // Log handled by moveCard
                            store.addTurnEffectUsage('c005');
                        },
                        formatLog('prompt_select_dd_ss')
                    );
                }
            });
        }
    },

    // Dark Contract with the Swamp King (c006)
    'c006': (store, selfId, fromLocation) => {
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return;
            const fusionOptions = store.extraDeck
                .filter(id => store.cards[id].subType?.includes('FUSION') && store.cards[id].cardId !== 'c029')
                .map(id => ({
                    label: getCardName(store.cards[id], store.language),
                    value: id,
                    imageUrl: store.cards[id].imageUrl
                }));

            if (fusionOptions.length === 0) {
                store.addLog(formatLog('log_no_fusion_in_ex'));
                return;
            }

            store.startEffectSelection(formatLog('prompt_swamp_king_fusion'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.startEffectSelection(formatLog('label_fusion_monster_select'), fusionOptions, (fusionId) => {
                        const fusionCard = store.cards[fusionId];
                        const isDD = fusionCard.name.includes('DD');
                        const locs = isDD ? ['HAND', 'MONSTER_ZONE', 'GRAVEYARD'] : ['HAND', 'MONSTER_ZONE'];
                        const sourceList = [
                            ...store.hand,
                            ...store.monsterZones.filter((id): id is string => id !== null),
                            ...store.extraMonsterZones.filter((id): id is string => id !== null),
                            ...(isDD ? store.graveyard : [])
                        ];
                        const checkLoc = (id: string) => {
                            if (store.hand.includes(id)) return 'HAND';
                            if (store.monsterZones.includes(id) || store.extraMonsterZones.includes(id)) return 'MONSTER_ZONE';
                            if (store.graveyard.includes(id)) return 'GRAVEYARD';
                            return null;
                        };
                        const matFilter = (c: Card) => c.name.includes('DD') && c.type === 'MONSTER';

                        store.startSearch(
                            (c) => {
                                const loc = checkLoc(c.id);
                                if (!loc || !locs.includes(loc)) return false;
                                return matFilter(c);
                            },
                            (mat1) => {
                                const remainingSource = sourceList.filter(id => id !== mat1);
                                // High King Genghis (c019) requirement: At least one material must be Level 5+
                                const isHighKingGenghis = fusionCard.cardId === 'c019';
                                const mat1Level = store.cards[mat1].level || 0;

                                store.startSearch(
                                    (c) => {
                                        const loc = checkLoc(c.id);
                                        if (!loc || !locs.includes(loc)) return false;
                                        if (!matFilter(c)) return false;

                                        // Requirement check for c019: One material must be Level 5+
                                        if (isHighKingGenghis) {
                                            const m1Mods = store.cardPropertyModifiers[mat1];
                                            const m2Mods = store.cardPropertyModifiers[c.id];
                                            const m1Lv = m1Mods?.level ?? store.cards[mat1].level ?? 0;
                                            const m2Lv = m2Mods?.level ?? c.level ?? 0;
                                            return m1Lv >= 5 || m2Lv >= 5;
                                        }
                                        return true;
                                    },
                                    (mat2) => {
                                        const card1 = store.cards[mat1];
                                        const card2 = store.cards[mat2];
                                        const m1Loc = checkLoc(mat1);
                                        const m2Loc = checkLoc(mat2);

                                        // Material Handling Logic:
                                        // - GY material -> BANISHED
                                        // - Field/Hand material -> GRAVEYARD (moveCard handles P-Rule for Field)
                                        const m1Final = (m1Loc === 'GRAVEYARD') ? 'BANISHED' : 'GRAVEYARD';
                                        const m2Final = (m2Loc === 'GRAVEYARD') ? 'BANISHED' : 'GRAVEYARD';

                                        useGameStore.setState({ isMaterialMove: true });
                                        if (m1Loc) useGameStore.getState().moveCard(mat1, m1Final, 0, m1Loc);
                                        if (m2Loc) useGameStore.getState().moveCard(mat2, m2Final, 0, m2Loc);
                                        useGameStore.setState({ isMaterialMove: false });

                                        const emptyIndices = store.monsterZones.map((v, i) => (v === null || v === mat1 || v === mat2) ? i : -1).filter(i => i !== -1);
                                        if (emptyIndices.length > 0) {
                                            store.startZoneSelection(formatLog('prompt_select_zone_fusion'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                                useGameStore.getState().moveCard(fusionId, 'MONSTER_ZONE', i, undefined, false, true, 'FUSION');
                                                const matNames = [mat1, mat2].map(id => getCardName(store.cards[id], store.language)).join(', ');
                                                store.addLog(formatLog('log_summon_materials', { materials: matNames }));

                                                store.addTurnEffectUsage('c006');
                                            });
                                        }
                                    },
                                    formatLog('prompt_select_material'),
                                    remainingSource
                                );
                            },
                            formatLog('prompt_select_material'),
                            sourceList
                        );
                    });
                }
            });
        }
    },

    'c028': (store, selfId, fromLocation) => {
        if (fromLocation) return;
        const onField = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);
        if (!onField) return;

        store.startEffectSelection(formatLog('prompt_zeus_extra_p'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
            if (choice === 'yes') {
                useGameStore.setState({ lastEffectSourceId: selfId });
                store.startTargeting(
                    (c) => {
                        const s = useGameStore.getState();
                        const isOnField = s.monsterZones.includes(c.id) || s.extraMonsterZones.includes(c.id) ||
                            s.spellTrapZones.includes(c.id) || s.fieldZone === c.id;
                        return isOnField && (c.name.includes('DD') || c.name.includes('Dark Contract')) && c.id !== selfId;
                    },
                    (targetId) => {
                        store.pushHistory();
                        store.addTurnEffectUsage('c028');
                        const targetCard = store.cards[targetId];
                        const targetName = getCardName(targetCard, store.language);

                        store.moveCard(targetId, 'GRAVEYARD');
                        store.incrementPendulumSummonLimit();

                        store.addLog(formatLog('log_zeus_extra_p', { card: targetName }));
                    }
                );
            }
        });
    },

    'c021': (store, selfId, fromLocation) => {
        // [Trigger Effect] If sent to GY: Send DD/Contract from Deck to GY
        // OCG: If this card is sent to the GY: You can send 1 "DD" or "Dark Contract" card from your Deck to the GY, except "DDD Marksman King Tell".
        const wasOnField = fromLocation && ['MONSTER_ZONE', 'EXTRA_MONSTER_ZONE'].includes(fromLocation);
        const state = useGameStore.getState();
        // Trigger if sent to GY from field. Link materials (isMaterialMove) SHOULD trigger here.
        if (store.graveyard.includes(selfId) && wasOnField && fromLocation !== 'MATERIAL') {
            store.startEffectSelection(formatLog('prompt_tell_send_gy'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    const currentStore = useGameStore.getState(); // Fix: Use fresh state
                    currentStore.startSearch(
                        (card) => (card.name.includes('DD') || card.name.includes('Dark Contract') || card.name.includes('契約書')) && !card.name.includes('Tell'),
                        (selectedId) => {
                            const cs = useGameStore.getState();
                            cs.moveCard(selectedId, 'GRAVEYARD', 0, undefined, true);
                            cs.addLog(formatLog('log_to_gy', { card: getCardName(cs.cards[selectedId], cs.language) }));
                        },
                        formatLog('prompt_select_card'),
                        currentStore.deck
                    );
                }
            });
        }
        // [Manual Effect] Detach is UNLIMITED (Removed Mill - just detach as per User feedback)
        if (store.isTellBuffActive && (store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) && !fromLocation) {
            const materials = store.materials[selfId];
            if (materials && materials.length > 0) {
                store.startEffectSelection(formatLog('prompt_tell_detach'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                    if (choice === 'yes') {
                        store.startEffectSelection(formatLog('prompt_select_material'), materials.map(mid => ({ label: getCardName(store.cards[mid], store.language), value: mid })), (matId) => {
                            store.moveCard(matId, 'GRAVEYARD');
                            // User feedback: Field effect is ONLY detaching material. 
                            // OCG ATK/DEF loss not implemented unless requested.
                        });
                    }
                });
            }
        }
    },

    'c022': (store, selfId, fromLocation) => {
        if (store.graveyard.includes(selfId) && fromLocation !== 'MATERIAL') {
            store.startEffectSelection(formatLog('prompt_caesar_add_contract'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.startSearch(
                        (card) => (card.name.includes('Dark Contract') || card.name.includes('契約書')),
                        (selectedId) => {
                            store.moveCard(selectedId, 'HAND');
                        },
                        formatLog('prompt_contract_search')
                    );
                }
            });
        }
    },
    // DDD High King Executive Caesar (c023)
    'c023': (store, selfId, fromLocation) => {
        // [Trigger Effect] If sent to GY with material: Add Contract
        // Simplified: If sent to GY from Field (assume it had material if fromLocation suggests it)
        const inGraveyard = store.graveyard.includes(selfId);
        const inMonsterZone = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);

        if (inGraveyard && fromLocation !== 'MATERIAL') {
            if (store.turnEffectUsage['c023_gy']) return;
            store.startEffectSelection(formatLog('prompt_caesar_add_contract'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    store.addTurnEffectUsage('c023_gy');
                    store.startSearch(
                        (card) => (card.name.includes('Dark Contract') || card.name.includes('契約書')),
                        (selectedId) => {
                            store.moveCard(selectedId, 'HAND');
                        },
                        formatLog('prompt_contract_search')
                    );
                }
            });
            return;
        }
        // [Quick Effect] Detach 2 to Negate/Destroy
        if (inMonsterZone && !fromLocation) {
            const materials = store.materials[selfId] || [];
            if (materials.length < 2) {
                store.addLog(formatLog('log_error_condition'));
                return;
            }
            store.startEffectSelection(formatLog('prompt_activate_effect', { card: store.cards[selfId].name }), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                if (choice === 'yes') {
                    // Logic: Detach 2
                    // Since specific material selection is tedious for negation, 
                    // and usually we detach ANY 2, let's just detach the first 2 or ask.
                    // Let's ask.
                    const selectMat = (count, mats) => {
                        if (count === 0) {
                            store.addLog(formatLog('log_activate_effect', { card: store.cards[selfId].name }));
                            return;
                        }
                        store.startEffectSelection(formatLog('prompt_select_material'), mats.map(mid => ({ label: store.cards[mid].name, value: mid })), (mid) => {
                            store.moveCard(mid, 'GRAVEYARD');
                            selectMat(count - 1, mats.filter(m => m !== mid));
                        });
                    };
                    selectMat(2, materials);
                }
            });
        }
    },

    // DDD Wise King Solomon Logic
    'c025': (store, selfId, fromLocation) => {
        // Effect 1: Detach 1; Add "DD" card (Ignition)
        if (store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) {
            // Manual Activation Only
            if (fromLocation) return;
            const hasMaterials = store.materials[selfId] && store.materials[selfId].length > 0;
            if (hasMaterials) {
                store.startEffectSelection(
                    formatLog('prompt_solomon_search'),
                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                    (choice) => {
                        if (choice === 'yes') {
                            const materials = store.materials[selfId];
                            store.startEffectSelection(
                                '取り除く素材を選択：',
                                materials.map((mid) => ({ label: getCardName(store.cards[mid], store.language), value: mid })),
                                (matId) => {
                                    useGameStore.setState({ isBatching: true });
                                    try {
                                        store.moveCard(matId, 'GRAVEYARD');
                                        // Manually remove material? relying on moveCard logic.
                                        store.addLog(formatLog('log_detach_material', { card: getCardName(store.cards[selfId], store.language), material: getCardName(store.cards[matId], store.language) }));
                                        store.addTurnEffectUsage('c025');

                                        store.startSearch(
                                            (card) => card.name.includes('DD'), // Matches "DD" monsters/spells/traps
                                            (selectedId) => {
                                                store.moveCard(selectedId, 'HAND');
                                                // Log handled by moveCard
                                            },
                                            formatLog('prompt_select_card')
                                        );
                                    } finally {
                                        useGameStore.setState({ isBatching: false });
                                        store.processUiQueue();
                                        store.pushHistory();
                                    }
                                }
                            );
                        }
                    }
                );
            }
        }
        // Effect 2: Banished -> Skip
    },

    // DDD First King Clovis Logic
    'c026': (store, selfId, fromLocation) => {
        // Effect 1: If Synchro Summoned: Target banished "DD". If "Dark Contract" exists, check GY too.
        if ((store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) && fromLocation) {
            // Check for valid targets early
            const hasContract = [...store.spellTrapZones, store.fieldZone]
                .filter(id => id && (store.cards[id].name.includes('Dark Contract') || store.cards[id].name.includes('契約書')))
                .length > 0;

            const candidates = hasContract
                ? [...store.banished, ...store.graveyard].filter(id => store.cards[id].name.includes('DD'))
                : store.banished.filter(id => store.cards[id].name.includes('DD'));

            if (candidates.length === 0) {
                store.addLog(formatLog('log_search_fail'));
                return;
            }

            store.startEffectSelection(
                formatLog('prompt_clovis_ss'),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {

                        store.startSearch(
                            (card) => candidates.includes(card.id),
                            (targetId) => {
                                const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                if (emptyIndices.length > 0) {
                                    store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                        store.moveCard(targetId, 'MONSTER_ZONE', i, undefined, false, true);
                                        store.addTurnEffectUsage('c026');
                                    });
                                } else {
                                    store.addLog(store.language === 'ja' ? formatLog('log_error_condition') : 'No empty Monster Zones to Special Summon.');
                                }
                            },
                            'Select "DD" monster',
                            candidates
                        );
                    }
                }
            );

        }
    },
    'c027': (store, selfId, fromLocation) => {
        // Effect 1: Fusion Summon (Shuffle from Field/Banished to Deck)
        // Manual Trigger in Monster Zone
        if (store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) {
            if (fromLocation) return; // Prevent Auto-Trigger on Summon
            store.startEffectSelection(
                formatLog('prompt_alfred_fusion'),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {
                        // Select Fusion Monster
                        store.startEffectSelection(
                            formatLog('label_fusion_monster_select'),
                            store.extraDeck
                                .map(id => store.cards[id])
                                .filter(card => card.type === 'MONSTER' && card.subType?.includes('FUSION') && card.cardId !== 'c029')
                                .map(card => ({
                                    label: getCardName(card, store.language),
                                    value: card.id,
                                    imageUrl: card.imageUrl
                                })),
                            (fusionId) => {
                                // Source: Field (Monster Zones, EMZ), Banished ONLY
                                const candidates = [
                                    ...store.monsterZones.filter((id): id is string => id !== null),
                                    ...store.extraMonsterZones.filter((id): id is string => id !== null),
                                    ...store.banished
                                ].filter(id => id !== null) as string[];

                                if (candidates.length < 2) {
                                    store.addLog(formatLog('log_error_material'));
                                    return;
                                }

                                const fusionCard = store.cards[fusionId];
                                const isHighKingGenghis = fusionCard.cardId === 'c019';

                                store.startSearch(
                                    (card) => candidates.includes(card.id) && card.name.includes('DD'),
                                    (mat1Id) => {
                                        const mat1Level = store.cards[mat1Id].level || 0;
                                        const remaining = candidates.filter(id => id !== mat1Id);
                                        store.startSearch(
                                            (card) => {
                                                if (!remaining.includes(card.id)) return false;
                                                if (!card.name.includes('DD')) return false;
                                                // High King Genghis requirement: One material must be Level 5+
                                                if (isHighKingGenghis) {
                                                    const s = useGameStore.getState();
                                                    const m1Mods = s.cardPropertyModifiers[mat1Id];
                                                    const m2Mods = s.cardPropertyModifiers[card.id];
                                                    const m1Lv = m1Mods?.level ?? s.cards[mat1Id].level ?? 0;
                                                    const m2Lv = m2Mods?.level ?? card.level ?? 0;
                                                    return m1Lv >= 5 || m2Lv >= 5;
                                                }
                                                return true;
                                            },
                                            (mat2Id) => {
                                                // Execute Fusion
                                                [mat1Id, mat2Id].forEach(id => {
                                                    const def = useGameStore.getState().cards[id];
                                                    const isED = def.subType && (def.subType.includes('FUSION') || def.subType.includes('SYNCHRO') || def.subType.includes('XYZ') || def.subType.includes('LINK'));

                                                    useGameStore.getState().moveCard(id, isED ? 'EXTRA_DECK' : 'DECK', 0, undefined, true);

                                                    const s = useGameStore.getState();
                                                    const logKey = isED ? 'log_move_to_ex' : 'log_to_deck';
                                                    s.addLog(formatLog(logKey, { card: getCardName(def, s.language) }));
                                                });

                                                // Select Zone for Fusion Summon
                                                const freshState = useGameStore.getState();
                                                const emptyMZ = freshState.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                                const emptyEMZ = freshState.extraMonsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

                                                const validZones: { type: string; index: number }[] = [
                                                    ...emptyMZ.map(i => ({ type: 'MONSTER_ZONE', index: i })),
                                                    ...emptyEMZ.map(i => ({ type: 'EXTRA_MONSTER_ZONE', index: i }))
                                                ];

                                                if (validZones.length === 0) {
                                                    freshState.addLog(formatLog('log_no_available_zones'));
                                                    return;
                                                }

                                                store.startZoneSelection(
                                                    formatLog('prompt_select_zone_fusion'),
                                                    (t, i) => {
                                                        const s = useGameStore.getState();
                                                        if (t === 'MONSTER_ZONE') {
                                                            return s.monsterZones[i] === null;
                                                        }
                                                        if (t === 'EXTRA_MONSTER_ZONE') {
                                                            // EMZ Rule: Can only use EMZ if:
                                                            // 1. Both EMZs are empty, OR
                                                            // 2. A material was on EMZ (freeing it up)
                                                            const materialFromEMZ = s.extraMonsterZones.includes(mat1Id) || s.extraMonsterZones.includes(mat2Id);
                                                            const emzOccupied = s.extraMonsterZones[0] !== null || s.extraMonsterZones[1] !== null;

                                                            if (emzOccupied && !materialFromEMZ) return false;
                                                            return s.extraMonsterZones[i] === null;
                                                        }
                                                        return false;
                                                    },
                                                    (zoneType, zoneIndex) => {
                                                        store.moveCard(fusionId, zoneType, zoneIndex, 'EXTRA_DECK', false, true, 'FUSION');
                                                        store.addTurnEffectUsage('c027');
                                                    }
                                                );
                                            },
                                            formatLog('prompt_select_material'),
                                            remaining
                                        );
                                    },
                                    formatLog('prompt_select_material'),
                                    candidates
                                );
                            }
                        );
                    }
                }
            );
        }

        if (store.banished.includes(selfId)) {
            // Check if we want to activate Effect 2
            // Only if distinct trigger or user clicks?
            // For now, let's allow manual activation if in Banished zone.

            store.startEffectSelection(
                formatLog('prompt_alfred_recover_contract'),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {
                        const dddCount = store.monsterZones
                            .filter(id => id && store.cards[id].name.includes('DDD'))
                            .length;

                        if (dddCount === 0) {
                            store.addLog(formatLog('log_error_condition'));
                            return;
                        }

                        store.addLog(`Can recover up to ${dddCount} Contracts.`);
                        // Loop X times? Or single target for now.
                        // Supporting multiple is hard with current chaining. Let's do 1.
                        store.startTargeting(
                            (card) => (card.name.includes('Dark Contract') || card.name.includes('契約書')) && (store.graveyard.includes(card.id) || store.banished.includes(card.id)),
                            (targetId) => {
                                const s = useGameStore.getState();
                                const emptyIndices = s.spellTrapZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

                                if (emptyIndices.length > 0) {
                                    s.startZoneSelection(formatLog('prompt_select_zone'),
                                        (t, i) => t === 'SPELL_TRAP_ZONE' && emptyIndices.includes(i),
                                        (t, i) => {
                                            const finalState = useGameStore.getState();
                                            finalState.moveCard(targetId, t, i);
                                            // Log handled by moveCard

                                            finalState.addTurnEffectUsage('c027', selfId);
                                        }
                                    );
                                } else {
                                    s.addLog(formatLog('log_error_condition'));
                                }
                            }
                        );
                    }
                }
            );
        }
    },

    // DDD Abyss King Gilgamesh Logic
    // DDD Abyss King Gilgamesh Logic
    'c017': (store, selfId, fromLocation) => {
        // Effect 1: If Special Summoned: Place 2 "DD" P-Monsters from Deck in P-Zones.
        const p1 = store.spellTrapZones[0];
        const p4 = store.spellTrapZones[4];

        if ((store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) && fromLocation) {
            if (p1 === null && p4 === null) {
                store.startEffectSelection(
                    formatLog('prompt_gilgamesh_p_place'),
                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                    (choice) => {
                        if (choice === 'yes') {
                            const s1 = useGameStore.getState(); // Fix: Fresh State
                            s1.startSearch(
                                (c) => c.name.includes('DD') && (c.subType?.includes('PENDULUM') || false),
                                (id1) => {
                                    const s2 = useGameStore.getState(); // Fix: Fresh State each step
                                    const name1 = s2.cards[id1].name;
                                    s2.startSearch(
                                        (c) => c.name.includes('DD') && (c.subType?.includes('PENDULUM') || false) && c.name !== name1,
                                        (id2) => {
                                            const s3 = useGameStore.getState(); // Fix: Fresh State
                                            s3.moveCard(id1, 'SPELL_TRAP_ZONE', 0);
                                            s3.moveCard(id2, 'SPELL_TRAP_ZONE', 4);
                                            // Lock c030 if placed
                                            const newFlagsState = { ...s3.cardFlags };
                                            let updated = false;
                                            if (s3.cards[id1].cardId === 'c030') {
                                                newFlagsState[id1] = [...(newFlagsState[id1] || []), 'c030_locked'];
                                                updated = true;
                                            }
                                            if (s3.cards[id2].cardId === 'c030') {
                                                newFlagsState[id2] = [...(newFlagsState[id2] || []), 'c030_locked'];
                                                updated = true;
                                            }
                                            if (updated) useGameStore.setState({ cardFlags: newFlagsState });

                                            // Log handled by moveCard for each card

                                            s3.changeLP(-1000);
                                            useGameStore.setState({ isTellBuffActive: true });
                                            s3.addLog(formatLog('log_take_damage', { amount: '1000' }));

                                            // Trigger Orthros (c011) if in Hand
                                            const orthros = s3.hand.find(id => s3.cards[id].cardId === 'c011');
                                            if (orthros) {
                                                useGameStore.setState(prev => ({ triggerCandidates: [...prev.triggerCandidates, orthros] }));
                                            }
                                        },
                                        'Select 2nd P-Monster',
                                        s2.deck // Fix: Use fresh deck for 2nd search
                                    );
                                },
                                'Select 1st P-Monster',
                                s1.deck // Fix: Use fresh deck for 1st search
                            );
                        }
                    }
                );
            }
        }
        // DESTROY EFFECT REMOVED PER USER REQUEST
    },

    // DDD Zero Doom Queen Machinex Logic
    'c030': (store, selfId, fromLocation, summonVariant, isUsedAsMaterial) => {
        // [P-Effect]
        if (store.spellTrapZones.includes(selfId)) {
            // Check Lock Flag
            if (store.cardFlags[selfId]?.includes('c030_locked')) {
                if (!fromLocation) store.addLog(store.language === 'ja' ? formatLog('log_error_condition') : 'Zero Machinex P-Effect is locked (Placed by Effect).');
                return;
            }
            if (!fromLocation) {
                // ... Existing P-Effect Logic (Manual Trigger for now?)
                // Description: [1] Once per turn: During your Main Phase if this card was activated this turn: Place 1 "Dark Contract" Continuous S/T from Deck face-up in your S/T Zone.
                // Sim: Just "Place Contract".
                const usageKey = 'c030_peffect';
                if (store.turnEffectUsage[usageKey]) {
                    store.addLog(formatLog('log_error_condition'));
                    return;
                }
                store.startEffectSelection(formatLog('prompt_machinex_p_place'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                    if (choice === 'yes') {
                        const emptyIndices = store.spellTrapZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                        if (emptyIndices.length === 0) {
                            store.addLog(store.language === 'ja' ? formatLog('log_error_condition') : 'Cannot activate: No empty Spell/Trap zones.');
                            return;
                        }
                        store.addTurnEffectUsage(usageKey, selfId);
                        store.startSearch(
                            (c) => c.name.includes('Dark Contract') && c.subType?.includes('CONTINUOUS') || false,
                            (id) => {
                                store.startZoneSelection('Select Zone for Contract', (t, i) => t === 'SPELL_TRAP_ZONE' && emptyIndices.includes(i), (t, i) => {
                                    store.moveCard(id, t, i, 'DECK', false, true); // Treat as Place/Activate
                                });
                            },
                            'Select Continuous Dark Contract',
                            store.deck
                        );
                    }
                });
            }
            return;
        }

        // [Monster Effect] If face-up in Extra Deck and DDD/Contract destroyed: SS this card.
        // Also: [2] If destroyed in MZ: Place in P-Zone.
        if (store.graveyard.includes(selfId) || store.extraDeck.includes(selfId)) {
            // EX Deck Trigger (New)
            if (fromLocation === 'TRIGGER' && store.extraDeck.includes(selfId)) {
                store.startEffectSelection(
                    formatLog('prompt_activate_effect', { name: getCardName(store.cards[selfId], store.language) }),
                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                    (choice) => {
                        useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== selfId) }));
                        if (choice === 'yes') {
                            const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                            if (emptyIndices.length > 0) {
                                store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                    store.moveCard(selfId, 'MONSTER_ZONE', i, 'EXTRA_DECK', false, true, 'SPECIAL_SUMMON_EFFECT');
                                    store.addLog(formatLog('log_activate_effect', { card: getCardName(store.cards[selfId], store.language) }));
                                    store.startTargeting(
                                        (c) => (store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id) || store.spellTrapZones.includes(c.id) || store.fieldZone === c.id),
                                        (tid) => {
                                            store.moveCard(tid, 'GRAVEYARD');
                                            store.addLog(formatLog('log_destroy', { card: getCardName(store.cards[tid], store.language) }));
                                        }
                                    );
                                });
                            }
                        }
                    }
                );
                return;
            }

            // Destruction Trigger -> Place in P-Zone (Existing)
            // Fix: Check isUsedAsMaterial to prevent Link Material trigger logic
            if ((fromLocation === 'MONSTER_ZONE' || fromLocation === 'EXTRA_MONSTER_ZONE') && !isUsedAsMaterial && !store.isMaterialMove && !store.isLinkSummoningActive) {
                // Ensure we are truly in a terminal zone move, not a nested material move
                if (store.isLinkSummoningActive) return;
                const emptyP: number[] = [];
                if (store.spellTrapZones[0] === null) emptyP.push(0);
                if (store.spellTrapZones[4] === null) emptyP.push(4);

                const usageKey = 'c030_destruction';
                if (emptyP.length > 0 && !store.turnEffectUsage[usageKey]) {
                    store.startEffectSelection(formatLog('prompt_machinex_destruction_p'), [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }], (choice) => {
                        if (choice === 'yes') {
                            store.addTurnEffectUsage(usageKey, selfId);
                            store.moveCard(selfId, 'SPELL_TRAP_ZONE', emptyP[0], undefined, false, true);
                            // Set Flag
                            const newFlags = store.cardFlags[selfId] ? [...store.cardFlags[selfId], 'c030_locked'] : ['c030_locked'];
                            useGameStore.setState(prev => ({ cardFlags: { ...prev.cardFlags, [selfId]: newFlags } }));
                            store.addLog('Placed Zero Machinex in P-Zone (P-Effect Locked).');
                        }
                    });
                }
            }
        }
    },



    // DD Lance Soldier Logic
    // DD Lance Soldier Logic (c032)
    'c032': (store: GameStore, selfId: string, fromLocation?: string) => {
        // Global Guard: Manual Activation Only (Ignition Effects)
        if (fromLocation) return;

        // Effect 1: Ignition (Monster Zone) - Level Modulation
        if (store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId)) {
            // HOPT Check for level effect
            const levelHoptKey = 'c032_level';
            if (store.turnEffectUsage[levelHoptKey]) {
                store.addLog(formatLog('log_error_condition'));
                // Don't return - allow other interactions
            } else {
                // Count Contracts first to see if valid
                const contractCount = [...store.spellTrapZones, store.fieldZone, ...store.graveyard]
                    .filter(id => id && (store.cards[id].name.includes('Dark Contract') || store.cards[id].name.includes('契約書') || store.cards[id].subType?.includes('CONTINUOUS')))
                    .filter(id => id && (store.cards[id].name.includes('Dark Contract') || store.cards[id].name.includes('契約書')))
                    .length;

                if (contractCount === 0) {
                    store.addLog(formatLog('log_error_condition'));
                } else {
                    store.startEffectSelection(
                        formatLog('prompt_lance_soldier_level'),
                        [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                        (choice) => {
                            if (choice === 'yes') {
                                store.addTurnEffectUsage(levelHoptKey);
                                store.startTargeting(
                                    // Fix: Explicitly check Monster Zones to exclude P-Zones and Materials (which might be "green" otherwise)
                                    (c) => (store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id)) && c.name.includes('DD') && c.type === 'MONSTER' && !c.subType?.includes('XYZ') && !c.subType?.includes('LINK'),
                                    (targetId) => {
                                        const options = Array.from({ length: contractCount }, (_, i) => ({ label: `+${i + 1}`, value: String(i + 1) }));
                                        if (options.length === 1) {
                                            store.modifyCardProperty(targetId, 'level', 1, 'add');
                                            store.addLog(formatLog('log_level_change_amount', { card: getCardName(store.cards[targetId], store.language), amount: '1' }));
                                        } else {
                                            store.startEffectSelection(`Increase Level by how much? (Max ${contractCount})`, options, (val) => {
                                                const amount = parseInt(val);
                                                store.modifyCardProperty(targetId, 'level', amount, 'add');
                                                store.addLog(formatLog('log_level_change_amount', { card: getCardName(store.cards[targetId], store.language), amount: amount.toString() }));
                                            });
                                        }
                                    }
                                );
                            }
                        }
                    );
                }
            }
        }

        // Effect 2: Ignition (GY) - SS Self
        if (store.graveyard.includes(selfId)) {
            // HOPT Check for GY SS effect
            const gyHoptKey = 'c032_gy_ss';
            if (store.turnEffectUsage[gyHoptKey]) {
                store.addLog(formatLog('log_effect_already_used', { card: getCardName(store.cards[selfId], store.language) }));
                return;
            }

            const hasContract = [...store.spellTrapZones, store.fieldZone].some(id => id && (store.cards[id].name.includes('Dark Contract') || store.cards[id].name.includes('契約書')));
            if (!hasContract) return;

            store.startEffectSelection(
                formatLog('prompt_lance_gy'),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {
                        store.addTurnEffectUsage(gyHoptKey);
                        store.startTargeting(
                            (card) => (store.spellTrapZones.includes(card.id) || store.fieldZone === card.id) && (card.name.includes('Dark Contract') || card.name.includes('契約書')),
                            (targetId) => {
                                // Use batching to ensure Lance Soldier SS happens before Zero Machinex trigger popped by moveCard
                                useGameStore.setState({ isBatching: true });
                                try {
                                    useGameStore.setState({ lastEffectSourceId: selfId });
                                    store.moveCard(targetId, 'GRAVEYARD');

                                    const currentStore = useGameStore.getState();
                                    const emptyIndices = currentStore.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                    if (emptyIndices.length > 0) {
                                        store.startZoneSelection(
                                            formatLog('prompt_select_zone_ss'),
                                            (type, index) => type === 'MONSTER_ZONE' && emptyIndices.includes(index),
                                            (type, index) => {
                                                store.moveCard(selfId, 'MONSTER_ZONE', index, undefined, false, true);
                                                if (store.setCardFlag) {
                                                    store.setCardFlag(selfId, 'BANISH_ON_LEAVE');
                                                    store.addLog(formatLog('log_lance_soldier_banish_warn'));
                                                }
                                            }
                                        );
                                    } else {
                                        store.addLog(formatLog('log_error_condition'));
                                    }
                                } finally {
                                    useGameStore.setState({ isBatching: false });
                                    store.processUiQueue();
                                    store.pushHistory();
                                }
                            }
                        );
                    }
                }
            );
        }
    },

    // DD Defense Soldier Logic (c033)
    'c033': (store: GameStore, selfId: string, fromLocation?: string) => {
        // Global Guard: Manual Activation Only
        if (fromLocation) return;

        const inMonsterZone = store.monsterZones.includes(selfId) || store.extraMonsterZones.includes(selfId);
        const inGraveyard = store.graveyard.includes(selfId);

        if (!inMonsterZone && !inGraveyard) return; // Must be on Field or GY

        const options: { label: string, value: string }[] = [];

        // Effect 1: SS from P-Zone (Field)
        if (inMonsterZone && !store.turnEffectUsage['c033_p_ss']) {
            options.push({ label: formatLog('label_ss_pzone'), value: 'ss_p' });
        }

        // Effect 2: GY Search (GY)
        if (inGraveyard && !store.turnEffectUsage['c033_gy_search']) {
            options.push({ label: formatLog('label_gy_add_p'), value: 'gy_search' });
        }

        if (options.length === 0) {
            // Provide feedback if attempts are made but usages block
            if (inMonsterZone || inGraveyard) {
                store.addLog(formatLog('log_effect_already_used', { card: 'DD Defense Soldier' }));
            }
            return;
        }

        store.startEffectSelection(formatLog('prompt_defense_soldier_activate'), [
            ...options,
            { label: formatLog('ui_cancel'), value: 'no' }
        ], (choice) => {
            if (choice === 'ss_p') {
                if (!store.monsterZones.includes(selfId) && !store.extraMonsterZones.includes(selfId)) {
                    store.addLog(formatLog('log_error_condition'));
                    return;
                }
                store.addLog(formatLog('prompt_select_card'));
                store.startTargeting(
                    (card) => {
                        const idx = store.spellTrapZones.indexOf(card.id);
                        return idx !== -1 && (idx === 0 || idx === 4) && card.name.includes('DD') && (card.subType?.includes('PENDULUM') || false);
                    },
                    (targetId) => {
                        const emptyIndices = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                        if (emptyIndices.length > 0) {
                            store.startZoneSelection(formatLog('prompt_select_zone_p'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                store.moveCard(targetId, 'MONSTER_ZONE', i, undefined, false, true);
                                store.addLog(formatLog('log_sp_summon', { card: store.cards[targetId].name }));
                                store.addTurnEffectUsage('c033_p_ss');
                            });
                        } else {
                            store.addLog(formatLog('log_error_condition'));
                        }
                    }
                );
            } else if (choice === 'gy_search') {
                if (!store.graveyard.includes(selfId)) {
                    store.addLog(formatLog('log_error_condition'));
                    return;
                }
                // Cost: Banish self
                store.moveCard(selfId, 'BANISHED');
                store.addLog(formatLog('log_banish', { card: store.cards[selfId].name }));

                // Filter: DD P-Monster in GY or face-up ED (Except Machinex, Ark Crisis)
                const isDDP = (c: Card) => c.name.includes('DD') && c.subType?.includes('PENDULUM') && c.cardId !== 'c018' && c.cardId !== 'c029';

                // Re-fetch state to get current locations (though self is already in GY/Banished)
                const s = useGameStore.getState();

                const extraP = s.extraDeck.filter(id => {
                    const c = s.cards[id];
                    const isEDType = c.subType?.includes('FUSION') || c.subType?.includes('SYNCHRO') || c.subType?.includes('XYZ') || c.subType?.includes('LINK');
                    // Face-up ED P-Monsters are those in Extra Deck that are PENDULUM match.
                    // Note: Face-down ED cards are also in extraDeck. 
                    // Sim doesn't strictly distinguish face-up/down in array, but usually Face-Up P-Monsters are just in there.
                    // However, valid targets for "Add to Hand" from ED must be Face-Up.
                    // Rule: P-Monsters go to ED face-up when destroyed.
                    // We assume all P-Monsters in ED are candidates?
                    // No, fusion/synchro/xyz P-Monsters might be face-down if not used yet?
                    // Actually, main deck P-monsters in ED are always face-up.
                    // Hybrids (Fusion/P) like Ark Crisis start face-down.
                    // But effectively, if it's in ED and matches "DD P-Monster", we can treat it as valid target if it's "Face-Up".
                    // For Sim simplicity: All "DD" P-Monsters in ED are valid targets?
                    // Except Hybrid monsters that are face-down?
                    // We can't easily tell face-up/down state in this array structure without a flag.
                    // But typically, you can't add a face-down ED card to hand with this effect type unless specified.
                    // Let's assume valid targets are those that "ended up" there (Face-Up).
                    // Standard P-Monsters (Main Deck types) in ED are always Face-Up.
                    // Hybrid P-Monsters ... if they are there, they are likely Face-Up or Face-Down.
                    // Let's filter by: Main Deck P-Monsters OR Hybrid P-Monsters that are explicitly Face-Up?
                    // Sim workaround: Allow all non-Hybrid P-Monsters. Hybrids are usually excluded by specific CardId checks?
                    // User said: "Except Machinex (c030 - Wait c030 is Machinex) and Ark Crisis (c029)".
                    // c018 is Machinex (XYZ/P). c029 is Ark Crisis (Fusion/P).
                    // c030 is Zero Machinex (P/Effect - Main Deck?). No, c030 is "Zero Doom Queen Machinex" (P/Effect).
                    // Wait, let's check definitions.
                    // c030 is "DDD Zero Doom Queen Machinex" -> PENDULUM/EFFECT (Main Deck).
                    // c018 is "DDD Deviser King Deus Machinex" -> XYZ/PENDULUM.
                    // User said "Except Machinex and Ark Crisis".
                    // They likely mean the Extra Deck Hybrids: Deus Machinex (c018) and Ark Crisis (c029).
                    // And maybe Zero Machinex (c030) if it's in ED? It's a Main Deck P-monster, so if it's in ED, it's Face-Up.
                    // User said "Ex Deck (Deus Machinex, Ark Crisis except)".
                    // So we must allow Main Deck P-Monsters.
                    // Current filter: !isEDType && isDDP.
                    // isEDType blocks Fusion/Synchro/Xyz/Link.
                    // This correctly blocks Deus Machinex (Xyz) and Ark Crisis (Fusion).
                    // Does it block anything else?
                    // Genghis, etc are not P-Monsters.
                    // So `!isEDType` allows Main Deck P-Monsters.

                    return !isEDType && isDDP(c);
                });

                const graveP = s.graveyard.filter(id => isDDP(s.cards[id]));
                const uniqueTargets = Array.from(new Set([...extraP, ...graveP])); // Deduplicate to be safe

                if (uniqueTargets.length === 0) {
                    store.addLog(formatLog('log_defense_soldier_no_targets'));
                    return;
                }

                store.startSearch(
                    (c) => uniqueTargets.includes(c.id),
                    (sid) => {
                        store.moveCard(sid, 'HAND');
                        // Log handled by moveCard
                        store.addTurnEffectUsage('c033_gy_search');
                    },
                    formatLog('prompt_select_dd_p'),
                    uniqueTargets // Pass PRE-FILTERED list to SearchModal source to avoid searching whole deck
                );
            }
        });
    },

    // Dark Contract with the Zero King (c034)
    'c034': (store: GameStore, selfId: string, fromLocation?: string) => {
        // [1] Target 1 other "DD" card; destroy it, SS "DD" from Deck.
        if (store.spellTrapZones.includes(selfId)) {
            if (fromLocation) return; // Manual Only

            // Check for Valid Targets (Other "DD" cards)
            const targets = [...store.monsterZones, ...store.spellTrapZones, ...store.extraMonsterZones, store.fieldZone]
                .filter(id => id && id !== selfId && store.cards[id].name.includes('DD')); // "DD" Card

            if (targets.length === 0) {
                store.addLog(formatLog('log_error_condition'));
                return;
            }

            store.startEffectSelection(
                formatLog('prompt_activate_effect', { name: getCardName(store.cards[selfId], store.language) }),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {

                        store.startTargeting(
                            (c) => targets.includes(c.id),
                            (tid) => {
                                useGameStore.setState({ lastEffectSourceId: selfId });
                                store.addLog(formatLog('log_destroy', { card: getCardName(store.cards[tid], store.language) }));
                                useGameStore.setState({ lastEffectSourceId: selfId });
                                store.moveCard(tid, 'GRAVEYARD');
                                store.addTurnEffectUsage('c034');
                                store.startSearch(
                                    (c) => c.name.includes('DD') && c.type === 'MONSTER',
                                    (sid) => {
                                        // SS to MZ
                                        const currentStore = useGameStore.getState(); // Get fresh state after destruction
                                        const emptyIndices = currentStore.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
                                        if (emptyIndices.length > 0) {
                                            store.startZoneSelection(formatLog('prompt_select_zone'), (t, i) => t === 'MONSTER_ZONE' && emptyIndices.includes(i), (t, i) => {
                                                store.moveCard(sid, 'MONSTER_ZONE', i, 'DECK', false, true);
                                                store.addLog(formatLog('log_sp_summon', { card: getCardName(store.cards[sid], store.language) }));
                                            });

                                        }
                                    },
                                    formatLog('prompt_select_dd_ss'),
                                    store.deck
                                );
                            }
                        );
                    }
                });
        }
    },



    // Deus Machinex Reaction
    'c030_reaction': (store: GameStore, extraDeckId: string) => {
        const execute = () => {
            const s = useGameStore.getState();
            const usageKey = 'c030_ss_reaction';
            if (s.turnEffectUsage[usageKey]) return;

            const { startEffectSelection, startZoneSelection, moveCard, addLog, extraDeck, cards, monsterZones, extraMonsterZones } = s;
            if (!extraDeck.includes(extraDeckId)) return;

            const validZones: { type: any, index: number }[] = [];
            const emz0Occupied = extraMonsterZones[0] !== null;
            const emz1Occupied = extraMonsterZones[1] !== null;

            // EMZ 1 (Left)
            if (extraMonsterZones[0] === null && !emz1Occupied) {
                validZones.push({ type: 'EXTRA_MONSTER_ZONE', index: 0 });
            } else if (extraMonsterZones[0] !== null) {
                const occupant = cards[extraMonsterZones[0]!];
                if (occupant.cardId === 'c017' || occupant.cardId === 'c028') {
                    if (monsterZones[0] === null) validZones.push({ type: 'MONSTER_ZONE', index: 0 });
                    if (monsterZones[2] === null) validZones.push({ type: 'MONSTER_ZONE', index: 2 });
                    if (occupant.cardId === 'c028' && monsterZones[1] === null) validZones.push({ type: 'MONSTER_ZONE', index: 1 });
                }
            }

            // EMZ 2 (Right)
            if (extraMonsterZones[1] === null && !emz0Occupied) {
                validZones.push({ type: 'EXTRA_MONSTER_ZONE', index: 1 });
            } else if (extraMonsterZones[1] !== null) {
                const occupant = cards[extraMonsterZones[1]!];
                if (occupant.cardId === 'c017' || occupant.cardId === 'c028') {
                    if (monsterZones[2] === null) validZones.push({ type: 'MONSTER_ZONE', index: 2 });
                    if (monsterZones[4] === null) validZones.push({ type: 'MONSTER_ZONE', index: 4 });
                    if (occupant.cardId === 'c028' && monsterZones[3] === null) validZones.push({ type: 'MONSTER_ZONE', index: 3 });
                }
            }

            if (validZones.length === 0) return;

            startEffectSelection(
                formatLog('prompt_zero_machinex_ss'),
                [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                (choice) => {
                    if (choice === 'yes') {
                        useGameStore.getState().addTurnEffectUsage(usageKey);
                        startZoneSelection(
                            formatLog('prompt_select_zone_machinex'),
                            (type, index) => validZones.some(vz => vz.type === type && vz.index === index),
                            (type, index) => {
                                moveCard(extraDeckId, type, index, undefined, false, true);
                                // const cardName = getCardName(s.cards[extraDeckId], s.language);
                                // addLog(formatLog('log_sp_summon', { card: cardName }));
                                useGameStore.getState().startEffectSelection(
                                    formatLog('prompt_destroy_card'),
                                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                                    (dChoiceValue) => {
                                        if (dChoiceValue === 'yes') {

                                            useGameStore.getState().startTargeting(
                                                (targetCard) => {
                                                    const ss = useGameStore.getState();
                                                    return ss.monsterZones.includes(targetCard.id) ||
                                                        ss.spellTrapZones.includes(targetCard.id) ||
                                                        ss.fieldZone === targetCard.id ||
                                                        ss.extraMonsterZones.includes(targetCard.id);
                                                },
                                                (targetCardId) => {
                                                    useGameStore.setState({ lastEffectSourceId: extraDeckId });
                                                    moveCard(targetCardId, 'GRAVEYARD');
                                                    addLog(formatLog('log_destroy', { card: getCardName(s.cards[targetCardId], s.language) }));
                                                }
                                            );

                                        }
                                    }
                                );
                            }
                        );
                    }
                }
            );
        };
        useGameStore.setState(prev => ({ modalQueue: [...prev.modalQueue, execute] }));
    },
};

// Placeholder for card database lookup
interface CardDatabase {
    [cardId: string]: Omit<Card, 'id'>;
}

interface GameStore extends GameState {
    cards: { [id: string]: Card }; // All card instances by ID
    isDragging: boolean;
    activeDragId: string | null;

    // Search State
    // isSearching: boolean; // Replaced by searchState.isOpen
    // searchFilter: ((card: Card) => boolean) | null; // Replaced by searchState.filter
    // onSearchSelect: ((cardId: string) => void) | null; // Replaced by searchState.onSelect
    // searchPrompt?: string; // Replaced by searchState.prompt
    // searchSource?: string[]; // Replaced by searchState.source
    searchState: {
        isOpen: boolean;
        filter: ((card: Card) => boolean) | null;
        onSelect: ((cardId: string) => void) | null;
        prompt?: string;
        source?: string[];
    };

    // Effect Selection State
    // isChoosingEffect: boolean; // Replaced by effectSelectionState.isOpen
    // effectPrompt: string; // Replaced by effectSelectionState.title
    // effectOptions: { label: string; value: string }[]; // Replaced by effectSelectionState.options
    // onEffectChoice: ((value: string) => void) | null; // Replaced by effectSelectionState.onSelect
    effectSelectionState: {
        isOpen: boolean;
        title: string;
        options: { label: string; value: string; imageUrl?: string }[];
        onSelect: ((value: string) => void) | null;
    };

    // Targeting State
    // isTargeting: boolean; // Replaced by targetingState.isOpen
    // targetFilter: ((card: Card) => boolean) | null; // Replaced by targetingState.filter
    // onTargetSelect: ((cardId: string) => void) | null; // Replaced by targetingState.onSelect
    targetingState: {
        isOpen: boolean;
        filter: ((card: Card) => boolean) | null;
        onSelect: ((cardId: string) => void) | null;
        mode: 'normal' | 'red';
    };

    // Zone Selection State
    // isSelectingZone: boolean; // Replaced by zoneSelectionState.isOpen
    // zoneSelectionPrompt: string; // Replaced by zoneSelectionState.title
    // zoneSelectionFilter: ((type: ZoneType, index: number) => boolean) | null; // Replaced by zoneSelectionState.filter
    // onZoneSelect: ((type: ZoneType, index: number) => void) | null; // Replaced by zoneSelectionState.onSelect
    zoneSelectionState: {
        isOpen: boolean;
        title: string;
        filter: ((type: ZoneType, index: number) => boolean) | null;
        onSelect: ((type: ZoneType, index: number) => void) | null;
    };

    targetingMode: 'normal' | 'red';
    selectedCards: string[]; // Cards explicitly selected (e.g. materials)
    addSelectedCard: (id: string) => void;
    clearSelectedCards: () => void;

    // History Actions
    pushHistory: () => void;
    undo: () => void;

    // Actions
    initializeGame: (cardDefs: CardDatabase, deckList: string[]) => void;
    // Move Card Generic Action
    moveCard: (cardId: string, toZone: ZoneType, toIndex?: number, fromLocation?: string, suppressTrigger?: boolean, isSpecialSummon?: boolean, summonVariant?: string) => void;
    changeLP: (amount: number) => void;
    addLog: (message: string) => void;
    setDragState: (isDragging: boolean, id: string | null) => void;
    startSearch: (filter: (card: Card) => boolean, onSelect: (cardId: string) => void, prompt?: string, sourceList?: string[]) => void;
    resolveSearch: (cardId: string) => void;
    cancelSearch: () => void;
    drawCard: () => void;
    setDeck: (newDeck: string[]) => void;
    shuffleDeck: () => void;
    sortDeck: () => void;
    activateEffect: (cardId: string) => void;
    // Synchro Summon Actions
    startSynchroSummon: (extraDeckCardId: string) => void;
    resolveSynchroSummon: (tunerId: string, nonTunerId: string, synchroCardId: string, toZoneType: ZoneType, toZoneIndex: number) => void;
    startXyzSummon: (extraDeckCardId: string) => void;
    resolveXyzSummon: (xyzCardId: string, materialIds: string[], toZoneType: ZoneType, toZoneIndex: number) => void;

    startEffectSelection: (prompt: string, options: { label: string, value: string }[], onChoice: (val: string) => void) => void;
    resolveEffectSelection: (val: string) => void;

    startTargeting: (filter: (card: Card) => boolean, onSelect: (cardId: string) => void, mode?: 'normal' | 'red') => void;
    resolveTarget: (cardId: string) => void;
    resolveTrigger: (cardId: string) => void;

    startZoneSelection: (prompt: string, filter: (type: ZoneType, index: number) => boolean, onSelect: (type: ZoneType, index: number) => void) => void;
    resolveZoneSelection: (type: ZoneType, index: number) => void;

    // New features
    setBackgroundColor: (color: string) => void;
    setFieldColor: (color: string) => void;
    showPendulumCutIn: boolean;
    replaySpeed: number;
    setReplaySpeed: (speed: number) => void;
    cycleReplaySpeed: () => void;
    logOrder: 'newest' | 'oldest';
    toggleLogOrder: () => void;
    fieldColor: string;

    setCardFlag: (cardId: string, flag: string) => void;
    cardFlags: { [cardId: string]: string[] }; // Flags for individual card instances
    triggerCandidates: string[]; // List of card IDs that have pending optional triggers

    // Pendulum Summon State & Actions
    pendulumSummonCount: number;
    pendulumSummonLimit: number;
    incrementPendulumSummonLimit: () => void;
    // Card Property Modifiers
    cardPropertyModifiers: { [cardId: string]: { level?: number, attack?: number, defense?: number, isNegated?: boolean } };
    modifyCardProperty: (cardId: string, property: 'level' | 'attack' | 'defense', value: number, operation: 'set' | 'add') => void;

    isPendulumSummoning: boolean;
    pendulumCandidates: string[]; // IDs available to summon
    startPendulumSummon: () => void;
    addCardCopy: (targetId: string) => void;
    removeCardCopy: (targetId: string) => void;
    addExtraDeckCopy: (cardId: string) => void;
    removeExtraDeckCopy: (cardId: string) => void;
    resetGame: () => void;

    cancelPendulumSummon: () => void;
    resolvePendulumSelection: (selectedIds: string[]) => void;
    turnEffectUsage: { [key: string]: number };
    addTurnEffectUsage: (usageKey: string, highlightCardId?: string) => void;

    // --- Chain & UI Queue System ---
    modalQueue: Array<() => void>; // Functions to execute when UI is free
    pendingChain: Array<{ id: string, label: string, execute: () => void }>; // Triggered effects waiting for order selection
    pendingEffects: Array<() => void>;
    isBatching: boolean; // If true, triggers are captured into pendingChain instead of executing
    processPendingEffects: () => void;
    processUiQueue: () => void;
    isLinkSummoningActive: boolean;
    isMaterialMove: boolean;
    isTellBuffActive: boolean;
    isEffectActivated: boolean;
    initialExtraDeckCardIds: string[]; // Card IDs (not instance IDs) from initial Extra Deck
    jumpToLog: (logIndex: number) => void;
    returnFromJump: () => void; // Return to state before jump
    jumpHistory: Partial<GameState>[]; // Stack of states before jumps
    isReplaying: boolean;
    activeEffectCardId: string | null;
    setActiveEffectCard: (cardId: string | null) => void;
    replay: () => void;
    stopReplay: () => void;
    originalZoneOrder: string[] | null; // For GY/Banished display reset
    isHistoryBatching: boolean;
    currentStepIndex: number; // Added for replay functionality
    language: 'en' | 'ja';
    toggleLanguage: () => void;
    setLanguage: (lang: 'en' | 'ja') => void;

    // Setters for new features
    setUseGradient: (use: boolean) => void;
    loadArchive: (archive: any) => void;
}


export const useGameStore = create<GameStore>((set, get) => ({
    // Initial State
    deck: [],
    hand: [],
    graveyard: [],
    banished: [],
    extraDeck: [],
    monsterZones: [null, null, null, null, null],
    spellTrapZones: [null, null, null, null, null],
    fieldZone: null,
    extraMonsterZones: [null, null],
    lp: 8000,
    normalSummonUsed: false,
    materials: {},
    backgroundColor: '#FFFFFF', // Default White
    fieldColor: 'rgb(80, 80, 80)', // Default R80 G80 B80
    useGradient: false, // Default No Gradient
    showPendulumCutIn: false,
    setBackgroundColor: (color) => set({ backgroundColor: color }),
    setFieldColor: (color) => set({ fieldColor: color }),
    setUseGradient: (use) => set({ useGradient: use }),
    activeDragId: null,

    logOrder: 'newest', // 'newest' (descending indices) or 'oldest' (ascending indices)
    toggleLogOrder: () => set((state) => ({ logOrder: state.logOrder === 'newest' ? 'oldest' : 'newest' })),

    logs: [],
    cards: {},
    turnEffectUsage: {},
    cardFlags: {}, // Initialize cardFlags
    triggerCandidates: [], // Initialize triggerCandidates
    history: [], // Initialize history
    pendulumCandidates: [], // Initialize pendulumCandidates
    cardPropertyModifiers: {}, // Initialize cardPropertyModifiers

    isDragging: false,

    isLinkSummoningActive: false,
    isMaterialMove: false,
    isTellBuffActive: false,
    isEffectActivated: false,
    isPendulumProcessing: false,
    initialExtraDeckCardIds: [],
    lastEffectSourceId: null,
    isReplaying: false,
    isHistoryBatching: false,
    replaySpeed: 5, // Default Speed 5
    cycleReplaySpeed: () => set((state) => ({ replaySpeed: state.replaySpeed >= 5 ? 1 : state.replaySpeed + 1 })),
    activeEffectCardId: null, // Initialize activeEffectCardId
    originalZoneOrder: null, // Initialize originalZoneOrder
    currentStepIndex: -1, // Initialize currentStepIndex
    jumpHistory: [],
    language: 'ja',
    toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'ja' : 'en' })),
    setLanguage: (lang) => set({ language: lang }),


    // Queue State
    modalQueue: [],
    pendingChain: [],
    pendingEffects: [],
    isBatching: false,

    // New UI State Objects
    searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
    effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
    targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
    zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },

    // Old flags removed
    // isSearching: false,
    // searchFilter: null,
    // onSearchSelect: null,
    // isChoosingEffect: false,
    // effectPrompt: '',
    // effectOptions: [],
    // onEffectChoice: null,
    // isTargeting: false,
    // targetFilter: null,

    onTargetSelect: null,
    targetingMode: 'normal',
    selectedCards: [],
    addSelectedCard: (id) => set((state) => ({ selectedCards: [...state.selectedCards, id] })),
    clearSelectedCards: () => set({ selectedCards: [] }),



    // Old flags removed
    // isSelectingZone: false,
    // zoneSelectionPrompt: '',
    // zoneSelectionFilter: null,
    // onZoneSelect: null,

    pendulumSummonCount: 0,
    pendulumSummonLimit: 1,
    incrementPendulumSummonLimit: () => {
        get().pushHistory();
        set((state) => ({ pendulumSummonLimit: state.pendulumSummonLimit + 1 }));
    },

    modifyCardProperty: (cardId, property, value, operation) => {
        get().pushHistory();
        set((state) => {
            const modifiers = { ...state.cardPropertyModifiers };
            if (!modifiers[cardId]) modifiers[cardId] = {};

            const currentMod = modifiers[cardId];
            const baseValue = state.cards[cardId][property] || 0;
            const prevModVal = currentMod[property] !== undefined ? currentMod[property] : baseValue;

            let newValue = operation === 'set' ? value : (prevModVal! + value);

            if (property === 'level' && newValue < 1) newValue = 1;

            modifiers[cardId] = { ...currentMod, [property]: newValue };
            return { cardPropertyModifiers: modifiers };
        });
    },

    processPendingEffects: () => {
        const effects = get().pendingEffects;
        if (effects.length > 0) {
            useGameStore.setState({ pendingEffects: [] });
            effects.forEach(e => e());
        }
    },

    isPendulumSummoning: false,

    processUiQueue: () => {
        const state = get();
        if (state.effectSelectionState.isOpen || state.targetingState.isOpen || state.searchState.isOpen || state.zoneSelectionState.isOpen || state.isPendulumSummoning) {
            return; // UI is busy
        }

        // Check Pending Chain
        if (state.pendingChain.length > 0) {
            if (state.pendingChain.length === 1) {
                // Auto execute last remaining
                const next = state.pendingChain[0];
                useGameStore.setState({ pendingChain: [] });
                next.execute();
            } else {
                // Multiple triggers: Prompt User
                // We open Effect Selection to choose which to activate NEXT.
                // Sort Pending Chain for UI (Chain Blocking Support: Count Surveyor > Scale Surveyor)
                // This puts Count Surveyor first, so user picks it as Chain 1 (protected), and Scale as Chain 2.
                const priority = ['Count Surveyor', 'Scale Surveyor'];
                const sortedChain = [...state.pendingChain].sort((a, b) => {
                    const pA = priority.findIndex(p => a.label.includes(p));
                    const pB = priority.findIndex(p => b.label.includes(p));
                    if (pA !== -1 && pB !== -1) return pA - pB;
                    if (pA !== -1) return -1;
                    if (pB !== -1) return 1;
                    return 0;
                });

                const options = sortedChain.map(item => ({ label: item.label, value: item.id }));

                useGameStore.setState({
                    effectSelectionState: {
                        isOpen: true,
                        title: formatLog('prompt_chain_order'),
                        options,
                        onSelect: (selectedId) => {
                            const selected = state.pendingChain.find(p => p.id === selectedId);
                            const remaining = state.pendingChain.filter(p => p.id !== selectedId);

                            // Close modal (handled by onSelect wrapper usually, but here we set state directly?)
                            // startEffectSelection wrapper logic:
                            // onSelect: (val) => { close; onSelect(val); processUiQueue(); }
                            // BUT here we are skipping startEffectSelection wrapper and setting state directly.
                            // So we must handle close/execute manually?
                            // Actually, let's use the standard `startEffectSelection` logic?
                            // No, `startEffectSelection` would QUEUE it if `isBatching` is true (it shouldn't be here) or if UI is busy (it is, we are opening it).
                            // We are `processUiQueue`. We are the manager.
                            // We just set State.

                            useGameStore.setState({
                                effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
                                pendingChain: remaining
                            });

                            if (selected) {
                                selected.execute();
                            } else {
                                get().processUiQueue(); // Fallback
                            }
                        }
                    }
                });
            }
            return;
        }

        // Check Modal Queue
        if (state.modalQueue.length > 0) {
            const next = state.modalQueue[0];
            useGameStore.setState({ modalQueue: state.modalQueue.slice(1) });
            next();
            return;
        }

        // If we reach here, the Queue is empty and UI is not busy.
        // Release the Global Lock.
        if (state.isEffectActivated) {
            useGameStore.setState({ isEffectActivated: false, activeEffectCardId: null });
        }
    },







    initializeGame: (cardDefs, deckList) => {
        // Generate instances
        const cards: { [id: string]: Card } = {};
        const deck: string[] = [];
        const extraDeck: string[] = [];
        const initialExtraDeckCardIds: string[] = [];

        deckList.forEach((cid, index) => {
            const instanceId = `inst_${cid}_${index}`;
            const def = cardDefs[cid];
            if (def) {
                cards[instanceId] = {
                    ...def,
                    id: instanceId,
                    cardId: cid
                };

                // Extra Deck Logic
                const st = def.subType ? def.subType.toUpperCase() : '';
                if (st.includes('FUSION') || st.includes('SYNCHRO') || st.includes('XYZ') || st.includes('LINK')) {
                    extraDeck.push(instanceId);
                    // Track the cardId (not instance) as initial EX deck card
                    if (!initialExtraDeckCardIds.includes(cid)) {
                        initialExtraDeckCardIds.push(cid);
                    }
                } else {
                    deck.push(instanceId);
                }
            }
        });

        // Shuffle deck - REMOVED per user request to maintain initial sorting

        const sortedExtraDeck = sortExtraDeck(extraDeck, cards);

        set({
            cards,
            deck,
            hand: [],
            graveyard: [],
            banished: [],
            extraDeck: sortedExtraDeck,
            monsterZones: [null, null, null, null, null],
            spellTrapZones: [null, null, null, null, null],
            fieldZone: null,
            extraMonsterZones: [null, null],
            lp: 8000,
            normalSummonUsed: false,
            materials: {},
            backgroundColor: '#FFFFFF', // Default White
            fieldColor: 'rgb(80, 80, 80)', // Default R80 G80 B80
            useGradient: false, // Default No Gradient
            // selectedCardForMove: null, // REMOVED
            cardPropertyModifiers: {},
            pendulumSummonLimit: 1, // Default Limit
            pendulumSummonCount: 0,
            isPendulumSummoning: false,
            logs: [],
            turnEffectUsage: {},
            isLinkSummoningActive: false,
            isMaterialMove: false,
            isTellBuffActive: false,
            lastEffectSourceId: null,
            initialExtraDeckCardIds, // Set initial EX deck card IDs

            cardFlags: {},
            triggerCandidates: [], // Reset triggers
            modalQueue: [],
            pendingChain: [],
            isBatching: false,
            searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
            effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
            targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
            zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
            history: [], // Reset history
            currentStepIndex: -1, // Initialize currentStepIndex
        });
    },


    moveCard: (cardId, toZone, toIndex = 0, fromLocation = undefined, suppressTrigger = false, isSpecialSummon = false, summonVariant = undefined) => {
        get().pushHistory();
        const startState = get(); // Fresh state before move
        const state = startState; // Alias for compatibility with existing code
        const { isDragging, activeDragId } = startState;

        // Infer fromLocation if not provided (Hoisted for accurate Effect Logic)
        let determinedFromLocation = fromLocation;
        if (!determinedFromLocation) {
            if (startState.hand.includes(cardId)) determinedFromLocation = 'HAND';
            else if (startState.deck.includes(cardId)) determinedFromLocation = 'DECK';
            else if (startState.graveyard.includes(cardId)) determinedFromLocation = 'GRAVEYARD';
            else if (startState.banished.includes(cardId)) determinedFromLocation = 'BANISHED';
            else if (startState.extraDeck.includes(cardId)) determinedFromLocation = 'EXTRA_DECK';
            else if (startState.monsterZones.includes(cardId)) determinedFromLocation = 'MONSTER_ZONE';
            else if (startState.spellTrapZones.includes(cardId)) determinedFromLocation = 'SPELL_TRAP_ZONE';
            else if (startState.fieldZone === cardId) determinedFromLocation = 'FIELD_ZONE';
            else if (startState.extraMonsterZones.includes(cardId)) determinedFromLocation = 'EXTRA_MONSTER_ZONE';
            else if (Object.values(startState.materials).some(mats => mats.includes(cardId))) determinedFromLocation = 'MATERIAL';
            else determinedFromLocation = 'DECK'; // Fallback

            if (!determinedFromLocation || determinedFromLocation === 'HAND') {
                // console.log(`Debug moveCard Inference: Card ${cardId} (${startState.cards[cardId]?.name}) detected in ${determinedFromLocation}. Hand includes? ${startState.hand.includes(cardId)}`);
            }
        }

        // 1. Block Graveyard <-> Banished Drag (User Request)
        if (isDragging && determinedFromLocation === 'GRAVEYARD' && toZone === 'BANISHED') {
            const s = get();
            s.addLog(formatLog('log_error_condition'));
            return;
        }
        if (isDragging && determinedFromLocation === 'BANISHED' && toZone === 'GRAVEYARD') {
            const s = get();
            s.addLog(formatLog('log_error_condition'));
            return;
        }

        // Logic to clear c030_locked flag if moving out of P-Zone (or field)
        // ... (existing logic)

        // Reset Orthros (c011) HOPT when placed in P-Zone (Manual or Effect)
        const movingCard = state.cards[cardId];
        if (movingCard?.cardId === 'c011' && toZone === 'SPELL_TRAP_ZONE') {
            const usage = { ...state.turnEffectUsage };
            delete usage['c011'];
            useGameStore.setState({ turnEffectUsage: usage });
        }

        // Clear Trigger Candidates logic REMOVED (Ensures Temujin/Ragnarok triggers persist during complex effect resolutions like Gilgamesh)
        // if (startState.triggerCandidates.length > 0 && !suppressTrigger) {
        //     useGameStore.setState({ triggerCandidates: [] });
        // }


        // 0. EMZ Restriction (Block drag if other is occupied)
        if (toZone === 'EXTRA_MONSTER_ZONE' && !isSpecialSummon && !suppressTrigger) {
            const otherIdx = toIndex === 0 ? 1 : 0;
            if (startState.extraMonsterZones[otherIdx] !== null) {
                const s = get();
                s.addLog(formatLog('log_emz_restriction'));
                return;
            }
        }

        // --- START BATCHING ---
        const wasBatching = state.isBatching;
        if (!wasBatching) {
            useGameStore.setState({ isBatching: true, isLinkSummoningActive: false });
        }

        try {
            // Intercept Manual Link Summon (Async Check)
            // Gilgamesh (c017) Logic: Link-2 (2 DD Monsters)
            const store = get(); // Use get() to ensure fresh state within the try block
            const cardDef = store.cards[cardId];

            if (!isSpecialSummon && !suppressTrigger && toZone === 'EXTRA_MONSTER_ZONE' && store.extraDeck.includes(cardId) && cardDef?.cardId === 'c017') {
                // Check Materials (2 DD Monsters)
                // Valid locations for materials: Monster Zones only? Link Summon uses face-up monsters.
                const candidates = [...store.monsterZones, ...store.extraMonsterZones]
                    .filter(id => id && store.cards[id].name.includes('DD'));

                if (candidates.length < 2) {
                    const s = get();
                    s.addLog(formatLog('log_gilgamesh_req_fail'));
                    return; // Abort
                }

                store.startTargeting(
                    (c) => (store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id)) && c.name.includes('DD'),
                    (mat1) => {
                        store.startTargeting(
                            (c) => (store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id)) && c.name.includes('DD') && c.id !== mat1,
                            (mat2) => {
                                const s = get();
                                s.addLog(formatLog('log_link_material_select', { card: getCardName(store.cards[mat2], store.language) }));

                                const m1Loc = store.monsterZones.includes(mat1) ? 'MONSTER_ZONE' : 'EXTRA_MONSTER_ZONE';
                                const m2Loc = store.monsterZones.includes(mat2) ? 'MONSTER_ZONE' : 'EXTRA_MONSTER_ZONE';

                                set({ isHistoryBatching: true });
                                try {
                                    set({ isLinkSummoningActive: true, isMaterialMove: true });
                                    get().moveCard(mat1, 'GRAVEYARD', 0, m1Loc);
                                    get().moveCard(mat2, 'GRAVEYARD', 0, m2Loc);
                                    // Suppress manual log control, let moveCard handle it with variant 'link'
                                    get().moveCard(cardId, toZone, toIndex, 'EXTRA_DECK', false, true, 'link');
                                    set({ isLinkSummoningActive: false, isMaterialMove: false });

                                    // const gilgameshName = getCardName(get().cards[cardId], get().language);
                                    // get().addLog(formatLog('log_link_summon_success', { card: gilgameshName }));
                                    const matNames = [mat1, mat2].map(id => getCardName(get().cards[id], get().language)).join(', ');
                                    get().addLog(formatLog('log_summon_materials', { materials: matNames }));

                                } finally {
                                    set({ isHistoryBatching: false });
                                    get().pushHistory();
                                }

                                // Trigger Check: Orthros in Hand?
                                const s2 = get();
                                const orthrosId = s2.hand.find(id => s2.cards[id].cardId === 'c011');
                                if (orthrosId) {
                                    useGameStore.setState(prev => ({ triggerCandidates: [...prev.triggerCandidates, orthrosId] }));
                                }
                            }
                        );
                    }
                );
                return; // Abort initial move
            }

            // Intercept Manual Link Summon (Async Check) - DDD Sky King Zeus Ragnarok (c028)
            // Requirements: 2+ "DD" Monsters. Link-3.
            // Custom Rule: Can use "Gilgamesh + 1 DD Monster" (Gilgamesh treated as 2).
            if (!isSpecialSummon && !suppressTrigger && toZone === 'EXTRA_MONSTER_ZONE' && store.extraDeck.includes(cardId) && cardDef?.cardId === 'c028') {
                const candidates = [...store.monsterZones, ...store.extraMonsterZones]
                    .filter((id): id is string => id !== null && store.cards[id].name.includes('DD'));

                // Auto-detect Gilgamesh combo capability
                const gilgameshId = candidates.find(id => store.cards[id].cardId === 'c017');

                if (!gilgameshId && candidates.length < 3) {
                    get().addLog(formatLog('log_ragnarok_req_fail'));
                    return;
                }

                // Recursive Selection Logic
                const selectedMaterials: string[] = [];
                let currentRating = 0;

                const checkCompletion = () => {
                    return currentRating === 3 && selectedMaterials.length >= 2;
                };

                const selectNext = () => {
                    if (checkCompletion()) {
                        // Execute Summon
                        const s = get();
                        s.addLog(formatLog('log_ragnarok_link_start', { materials: selectedMaterials.map(id => s.cards[id].name).join(', ') }));

                        set({ isHistoryBatching: true });
                        try {
                            // 1. Send Materials to GY
                            set({ isLinkSummoningActive: true, isMaterialMove: true });
                            selectedMaterials.forEach(mid => {
                                const loc = s.monsterZones.includes(mid) ? 'MONSTER_ZONE' : 'EXTRA_MONSTER_ZONE';
                                get().moveCard(mid, 'GRAVEYARD', 0, loc);
                            });
                            // 2. Summon Zeus
                            get().moveCard(cardId, toZone, toIndex, 'EXTRA_DECK', false, true);
                            set({ isLinkSummoningActive: false, isMaterialMove: false });

                            const ragnarokName = getCardName(get().cards[cardId], get().language);
                            // Log handled by moveCard
                            const matNames = selectedMaterials.map(id => getCardName(get().cards[id], get().language)).join(', ');
                            get().addLog(formatLog('log_summon_materials', { materials: matNames }));

                        } finally {
                            set({ isHistoryBatching: false });
                            get().pushHistory();
                        }
                        return;
                    }

                    if (currentRating >= 3) {
                        get().addLog(formatLog('log_error_condition'));
                        return;
                    }

                    const currentS = useGameStore.getState();
                    currentS.addLog(formatLog('prompt_select_link_material', { current: currentRating.toString(), max: '3' }));
                    currentS.startTargeting(
                        (c) => {
                            const cs = useGameStore.getState();
                            const onField = cs.monsterZones.includes(c.id) || cs.extraMonsterZones.includes(c.id);
                            if (!onField) return false;
                            if (!c.name.includes('DD')) return false;
                            if (selectedMaterials.includes(c.id)) return false;
                            return true;
                        },
                        (mid) => {
                            const cs = useGameStore.getState();
                            const card = cs.cards[mid];
                            selectedMaterials.push(mid);

                            if (card.cardId === 'c017') {
                                if (selectedMaterials.length >= 3) {
                                    currentRating += 1;
                                    selectNext();
                                } else {
                                    if (currentRating === 2) {
                                        currentRating += 1;
                                        selectNext();
                                    } else {
                                        cs.startEffectSelection(
                                            formatLog('prompt_gilgamesh_count_as_2'),
                                            [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                                            (choice) => {
                                                if (choice === 'yes') {
                                                    currentRating += 2;
                                                } else {
                                                    currentRating += 1;
                                                }
                                                selectNext();
                                            }
                                        );
                                    }
                                }
                            } else {
                                currentRating += 1;
                                selectNext();
                            }
                        }
                    );
                };

                selectNext();
                return; // Abort initial move
            }

            // Trigger Flags (to be used post-flush)
            let isDestructionEvt = false;
            let isDDDOrContractDestroyed = false;
            let isArkCrisisDestroyed = false;
            let isCaesarGraveEvt = false;
            let detachedMaterials: string[] = [];

            set((state) => {
                const { cards } = state;
                const card = cards[cardId];
                if (!card) return state;

                let isNormalSummon = false;
                let logWarnings = '';
                // --- Rules Check ---
                // Normal Summon Limit & Tribute Logic
                if (toZone === 'MONSTER_ZONE' && state.hand.includes(cardId)) {
                    // Determine if this is a Normal Summon (Monster from Hand to MZ)
                    // Exception: Special Summon effects (handled by effects, not raw moveCard usually?)
                    // Assuming Drag&Drop from Hand to MZ is Normal Summon / Set.

                    // 1. Check if already Normal Summoned this turn
                    // 1. Check if already Normal Summoned this turn
                    // 1. Check if already Normal Summoned this turn
                    if (state.normalSummonUsed && !isSpecialSummon) {
                        return state;
                    }

                    // 2. Tribute Logic
                    if (!isSpecialSummon && card.level && card.level >= 5) {
                        const tributeCount = state.monsterZones.filter(id => id).length;
                        const req = card.level >= 7 ? 2 : 1;
                        if (tributeCount < req) {
                            // User Request: Allow SS-like behavior via Drag.
                            // Instead of blocking, we just Log a warning.
                            logWarnings += ` ${formatLog('log_warn_tribute', { level: card.level?.toString() || '0' })}`;
                        } else {
                            if (!isSpecialSummon) {
                                isNormalSummon = true;
                            }
                            // Warn to tribute
                            // We can't easily auto-tribute.
                            // We will Allow the move, but Log instruction.
                            // "Please manually send X monsters to GY."
                            logWarnings += ` ${formatLog('log_warn_manual_tribute')}`;
                        }
                    } else {
                        if (!isSpecialSummon) {
                            isNormalSummon = true;
                        }
                    }
                }

                // Helper to remove from source
                const removeFromSource = (s: GameState, cId: string) => {
                    const newDeck = s.deck.filter(id => id !== cId);
                    const newHand = s.hand.filter(id => id !== cId);
                    const newGrave = s.graveyard.filter(id => id !== cId);
                    const newBanished = s.banished.filter(id => id !== cId);
                    const newExtra = s.extraDeck.filter(id => id !== cId);
                    const newMZ = s.monsterZones.map(id => id === cId ? null : id);
                    const newSTZ = s.spellTrapZones.map(id => id === cId ? null : id);
                    const newFZ = s.fieldZone === cId ? null : s.fieldZone;
                    const newEMZ = s.extraMonsterZones.map(id => id === cId ? null : id);

                    // Update Materials: Remove cId from ANY material list
                    const newMaterials: { [key: string]: string[] } = {};
                    Object.keys(s.materials).forEach(hostId => {
                        const list = s.materials[hostId];
                        if (list.includes(cId)) {
                            newMaterials[hostId] = list.filter(m => m !== cId);
                        } else {
                            newMaterials[hostId] = list;
                        }
                        // If Host is the one being moved? Materials stay with it usually unless rule says otherwise.
                        // Xyz Summon logic handles transfer (deleting old host entry).
                        // MoveCard logic: If Host moves (e.g. to GY), materials go to GY.
                        // But that is 'Recursive' logic not implemented in 'removeFromSource'.
                        // 'removeFromSource' just removes 'cId' from wherever it is.
                        // If 'cId' is a Host, it is removed from Zones. Its materials remain in map?
                        // Yes, they become 'orphaned' in map technically until something clears them.
                        // Ideally we should clear materials of cId if it leaves field?
                        // For now, let's just ensure cId is removed FROM materials lists if it WAS a material.
                    });

                    return {
                        deck: newDeck,
                        hand: newHand,
                        graveyard: newGrave,
                        banished: newBanished,
                        extraDeck: newExtra,
                        monsterZones: newMZ,
                        spellTrapZones: newSTZ,
                        fieldZone: newFZ,
                        extraMonsterZones: newEMZ,
                        materials: newMaterials // Update materials
                    };
                };

                // Detect Source Zone
                // let fromZone: ZoneType = 'DECK'; // Default - now passed as param
                // Check Materials Map for Source
                // IMPORTANT: FIX for Material Detachment
                // We need to know if cardId is in ANY list in Object.values(materials)
                // AND we need to know WHICH host it belongs to if we want to remove it properly?
                // Actually removeFromSource logic below just filters all material lists.
                // But we need to set 'fromZone' correctly for triggers.
                const isMaterial = Object.values(state.materials).some(mats => mats.includes(cardId));

                if (!fromLocation) {
                    fromLocation = determinedFromLocation;
                }

                // Suppress log if moving within field-related zones during drag
                const fieldZones = ['MONSTER_ZONE', 'EXTRA_MONSTER_ZONE', 'SPELL_TRAP_ZONE', 'FIELD_ZONE'];
                const isFromField = fieldZones.includes(fromLocation);
                const isToField = fieldZones.includes(toZone);
                const skipLogging = isDragging && isFromField && isToField;

                const leavingField = isFromField && !isToField;


                // Redirect to Banished if BANISH_ON_LEAVE flag is set
                if (['MONSTER_ZONE', 'SPELL_TRAP_ZONE', 'FIELD_ZONE', 'EXTRA_MONSTER_ZONE'].includes(fromLocation) &&
                    !['MONSTER_ZONE', 'SPELL_TRAP_ZONE', 'FIELD_ZONE', 'EXTRA_MONSTER_ZONE'].includes(toZone)) {
                    // Fix: Check state.cardFlags explicitly (transient flags)
                    if (state.cardFlags[cardId]?.includes('BANISH_ON_LEAVE')) {
                        toZone = 'BANISHED';
                    }
                }

                const cleanState = removeFromSource(state, cardId);
                let newState: GameState = { ...state, ...cleanState };

                // Always remove from triggerCandidates when moving (Absolute Cleanup)
                newState.triggerCandidates = newState.triggerCandidates.filter(id => id !== cardId);

                if (isNormalSummon) {
                    newState.normalSummonUsed = true;
                }

                let logMsg = ''; // Reset, we will construct localized log below
                let actualDestination = toZone; // Track actual destination (may differ for P-Rule)
                if (isNormalSummon) { } // Handled below using localized format

                // Clean Flags if leaving Field/P-Zone?
                // Zero Machinex Rule: Resets if "that Zero Machinex leaves the field".
                // Actually if it moves anywhere else (GY, Hand, Deck), flags should clear.
                // We clear flags for ANY move to ensure state cleanliness only if simulating "New Card".
                // But if it moves P-Zone -> Monster Zone (SS), does it keep flag? No, different context.
                // Flags are generally transient to the current existence on field.
                // So clear flags on any move.
                // Clean Flags if leaving Field/P-Zone
                const currentFlags = state.cardFlags;
                if (currentFlags[cardId]) {
                    const newFlags = { ...currentFlags };
                    delete newFlags[cardId];
                    newState.cardFlags = newFlags;
                }

                // Apply Summon Variant Flags (e.g. Pendulum Summon)
                if (summonVariant === 'PENDULUM') {
                    const flags = newState.cardFlags || {};
                    const idFlags = flags[cardId] || []; // Should be empty after delete, but safe check
                    newState.cardFlags = {
                        ...flags,
                        [cardId]: [...idFlags, 'isPendulumSummoned']
                    };
                }

                // Status Reset (Level/ATK/DEF) if leaving field
                if (leavingField) {
                    const currentModifiers = { ...state.cardPropertyModifiers };
                    if (currentModifiers[cardId]) {
                        const newModifiers = { ...currentModifiers };
                        delete newModifiers[cardId];
                        newState.cardPropertyModifiers = newModifiers;
                    }
                }

                // Helper: Is Extra Deck Monster Type?
                const isExtraDeckType = (c: Card) => {
                    const st = c.subType || '';
                    return st.includes('FUSION') || st.includes('SYNCHRO') || st.includes('XYZ') || st.includes('LINK');
                    // Note: Main Deck Pendulums are NOT Extra Deck Type here. They go to Hand/Deck normally.
                };

                // Add to destination
                switch (toZone) {
                    case 'HAND':
                        if (isExtraDeckType(card)) {
                            // Redirect to Extra Deck (Face-Down)
                            // "Return to Extra Deck" rule.
                            newState.extraDeck = sortExtraDeck([...newState.extraDeck, cardId], state.cards);
                            actualDestination = 'EXTRA_DECK';

                            // Ensure Face-Down
                            if (card.faceUp) {
                                const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                                newState.cards = newCards;
                            }
                        } else {
                            // Normal
                            // Reset faceUp if present (e.g. valid P-Monster returned from field to hand)
                            if (card.faceUp) {
                                const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                                newState.cards = newCards;
                            }
                            newState.hand = [...newState.hand, cardId];
                        }
                        break;
                    case 'DECK':
                        if (isExtraDeckType(card)) {
                            // Redirect to Extra Deck (Face-Down)
                            newState.extraDeck = sortExtraDeck([...newState.extraDeck, cardId], state.cards);
                            actualDestination = 'EXTRA_DECK';

                            if (card.faceUp) {
                                const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                                newState.cards = newCards;
                            }
                        } else {
                            // Normal
                            if (card.faceUp) {
                                const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                                newState.cards = newCards;
                            }
                            newState.deck = [cardId, ...newState.deck]; // Top of deck is index 0
                        }
                        break;
                    case 'GRAVEYARD':
                        // Rule: Block Banished -> GY drag-drop (Redundant check for certainty)
                        if (fromLocation === 'BANISHED' && isDragging) {
                            return { ...state, logs: [formatLog('log_error_condition'), ...state.logs] };
                        }

                        // P-Rule: If P-Monster from Field, go to Extra Deck face-up.
                        // Exception: Xyz Material
                        const isPendulum = card.subType?.includes('PENDULUM');
                        const wasOnField = isFromField;
                        const isMaterialFrom = fromLocation === 'MATERIAL';

                        if (isPendulum && wasOnField && !isMaterialFrom) {
                            // Set Face-Up
                            const newCards = { ...state.cards, [cardId]: { ...card, faceUp: true } };
                            newState.cards = newCards;
                            newState.extraDeck = sortExtraDeck([...newState.extraDeck, cardId], newCards);
                            actualDestination = 'EXTRA_DECK'; // P-Rule redirect
                        } else {
                            // Reset Face-Up (enter GY Face-Up technically, but property mainly relevant for EX)
                            if (card.faceUp) {
                                const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                                newState.cards = newCards;
                            }
                            newState.graveyard = [...newState.graveyard, cardId];
                        }

                        break;
                    case 'BANISHED':
                        // Reset Face-Up (Banished cards are face-up usually, but we don't track it yet unless facedown banish)
                        if (card.faceUp) {
                            const newCards = { ...state.cards, [cardId]: { ...card, faceUp: false } };
                            newState.cards = newCards;
                        }
                        newState.banished = [...newState.banished, cardId];
                        break;
                    case 'EXTRA_DECK':
                        // Direct Move to Extra Deck.
                        // If it's a Main Deck P-Monster, it's always Face-Up?
                        // If it's a Hybrid (Fusion/Synchro/Xyz/Link):
                        //   - If bounced to hand -> returns to Extra Deck (Face-Down).
                        //   - If explicit effect says "add to Extra Deck face-up", use Face-Up.
                        // Context: 'moveCard' is generic.
                        // Assumption: If 'faceUp' property isn't explicitly passed in args (we don't have it yet),
                        // we should default to Face-Down (false) for standard returns, 
                        // BUT if it's already Face-Up (e.g. from Field P-Rule above), it's handled.
                        // This block is for DIRECT target to EXTRA_DECK.
                        // Scale Surveyor (c014) effect moves itself to EX Deck Face-Up?
                        // Check c014 logic later.
                        // For now, reset to Face-Down by default unless it's a Main Deck P-Monster?
                        // Main Deck P-Monsters can only be in EX Deck Face-Up.
                        const isMainDeckP = card.subType?.includes('PENDULUM') && !['FUSION', 'SYNCHRO', 'XYZ', 'LINK'].some(t => card.subType?.includes(t));
                        const isPendulumAny = card.subType?.includes('PENDULUM');

                        let newFaceUpState = false;
                        if (isMainDeckP) {
                            newFaceUpState = true;
                        } else if (isPendulumAny && isFromField) {
                            // Hybrid Pendulum moving from Field -> Extra Deck (Face-Up)
                            // This covers rules where they are placed in EX Deck face-up.
                            newFaceUpState = true;
                        }

                        // If we want to support "Add to Extra Deck Face-Up" for hybrids, we might need a flag.
                        // But relying on existing 'faceUp' state might be flakey if it wasn't set.
                        // Let's rely on card type for Main Deck Ps.
                        // For Hybrids, they default to Face-Down unless context sets it?
                        // If we move from Field to Extra Deck directly (not via GY redirect), is that possible?
                        // "Return to Extra Deck" effects.

                        const newCardsEX = { ...state.cards, [cardId]: { ...card, faceUp: newFaceUpState } };
                        newState.cards = newCardsEX;
                        newState.extraDeck = sortExtraDeck([...newState.extraDeck, cardId], newCardsEX);
                        break;
                    case 'MONSTER_ZONE':
                        if (typeof toIndex === 'number' && toIndex >= 0 && toIndex < 5) {
                            // Check occupancy handling
                            if (newState.monsterZones[toIndex] !== null) {
                                // Previously: Overwrite.
                                // New Rule: Prevent stacking unless Xyz.
                                // Since we don't have Xyz Logic in Drag-Drop yet, we just BLOCK.
                                // The user can use effects to Xyz.
                                const msg = formatLog('log_error_zone');
                                return { ...state, logs: [msg, ...state.logs] };
                            }
                            newState.monsterZones[toIndex] = cardId;
                        }
                        break;
                    case 'SPELL_TRAP_ZONE':
                        if (typeof toIndex === 'number' && toIndex >= 0 && toIndex < 5) {
                            // Restriction Check: Monsters in S/T
                            if (card.type === 'MONSTER') {
                                if (!card.subType?.includes('PENDULUM')) {
                                    // STRICT CHECK: No non-Pendulum monsters in S/T Zone.
                                    // User Report: Solomon (Xyz) was able to go there.
                                    // This block prevents it.
                                    return { ...state, logs: [formatLog('log_rule_p_zone'), ...state.logs] };
                                }
                                // Pendulum Monsters -> Only P-Zones (0 and 4)
                                // User Requirement: P-Zone is S/T 1 and S/T 5. (Indices 0 and 4).
                                if (toIndex !== 0 && toIndex !== 4) {
                                    const msg = formatLog('log_error_condition');
                                    return { ...state, logs: [msg, ...state.logs] };
                                }
                            }

                            if (newState.spellTrapZones[toIndex] !== null) {
                                return { ...state, logs: [formatLog('log_error_zone_occupied'), ...state.logs] };
                            }
                            if (newState.spellTrapZones[toIndex] !== null) {
                                return { ...state, logs: [formatLog('log_error_zone_occupied'), ...state.logs] };
                            }
                            newState.spellTrapZones[toIndex] = cardId;
                        }
                        break;
                    case 'EXTRA_MONSTER_ZONE':
                        if (typeof toIndex === 'number' && (toIndex === 0 || toIndex === 1)) {
                            if (newState.extraMonsterZones[toIndex] !== null) {
                                // Check stacking? Normally no.
                                const msg = formatLog('log_error_zone');
                                return { ...state, logs: [msg, ...state.logs] };
                            }
                            newState.extraMonsterZones[toIndex] = cardId;
                        }
                        break;
                    // ... Handle others
                }

                // -- AUTO EFFECT PROCESSING CHECK --
                // Trigger effects if moved to Field, Graveyard, or Extra Deck
                // Trigger effects if moved to Field, Graveyard, or Extra Deck
                // User Request: P-Zone (S/T Zone) does NOT auto-trigger. Ignition.
                const shouldTrigger = ['MONSTER_ZONE', 'EXTRA_MONSTER_ZONE', 'FIELD_ZONE', 'GRAVEYARD', 'EXTRA_DECK'].includes(toZone);

                const nextState = {
                    ...state,
                    ...newState,
                    logs: [] // Will be populated in final block
                };

                // --- MATERIAL DETACHMENT LOGIC ---
                // If a card leaves the field, detach its materials to GY
                const hasMaterials = state.materials[cardId] && state.materials[cardId].length > 0;

                let materialUpdates = {};
                if (hasMaterials && leavingField) {
                    // We need to move materials to Graveyard.
                    // Since we are inside 'set', we can update state directly (GY + remove from materials prop).
                    // However, 'removeFromSource' helper logic keeps materials 'orphaned' usually.
                    // We should actively clean them.
                    const materialsToDetach = state.materials[cardId];
                    detachedMaterials = materialsToDetach;

                    // Add to GY
                    const newGrave = [...newState.graveyard, ...materialsToDetach];
                    newState.graveyard = newGrave;

                    // Remove from Materials Map (Delete key)
                    const newMaterialsMap = { ...newState.materials };
                    delete newMaterialsMap[cardId];
                    newState.materials = newMaterialsMap;

                    // Log (Only if not during automated material move)
                    if (!state.isMaterialMove && !state.isLinkSummoningActive) {
                        // Log accumulation handled by final block
                    }
                }

                // --- LEVEL RESET ON LEAVING FIELD ---
                // Reset level modifiers for Scale Surveyor (c014) and Lance Soldier (c032) when leaving field
                // EXCEPT when used as Xyz material (they'll be attached to the Xyz monster)
                const isUsedAsXyzMaterial = state.isMaterialMove;
                if (leavingField && !isUsedAsXyzMaterial) {
                    const cardDef = card.cardId;
                    if (cardDef === 'c014' || cardDef === 'c032') {
                        // Remove level modifier
                        const newModifiers = { ...newState.cardPropertyModifiers };
                        if (newModifiers[cardId]) {
                            delete newModifiers[cardId].level;
                            // If no modifiers left, remove the entry entirely
                            if (Object.keys(newModifiers[cardId]).length === 0) {
                                delete newModifiers[cardId];
                            }
                        }
                        newState.cardPropertyModifiers = newModifiers;
                    }
                }

                // 2. Machinex (Destruction Check Logic)
                const wasOnField = isFromField;
                const isDestruction = wasOnField && (toZone === 'GRAVEYARD' || (toZone === 'EXTRA_DECK' && fromLocation !== 'MATERIAL'));
                const isUsedAsMaterial = (toZone === 'GRAVEYARD' || toZone === 'EXTRA_DECK') && (state.isLinkSummoningActive || state.isMaterialMove);

                // Zero Machinex (c030) trigger: Trigger if DDD or Dark Contract destroyed by effect
                // Zero Machinex (c030) trigger: Trigger if DDD or Dark Contract destroyed by effect
                const lowerName = card.name.toLowerCase();
                // Fix: Usage strictly requires "DDD" or "Dark Contract". "DD" is NOT sufficient.
                const isDDDOrContract = lowerName.includes('ddd') || lowerName.includes('contract') || lowerName.includes('契約書');

                if (isDestruction && !isUsedAsMaterial) {
                    isDestructionEvt = true;
                    if (isDDDOrContract && card.cardId !== 'c030') isDDDOrContractDestroyed = true;
                    if (card.cardId === 'c029' || card.cardId === 'c035') isArkCrisisDestroyed = true;
                }

                const isCaesar = card.cardId === 'c022' || card.cardId === 'c023';
                const sentToGY = toZone === 'GRAVEYARD' && isFromField;
                if (isCaesar && sentToGY && !state.isLinkSummoningActive && !state.isMaterialMove) {
                    isCaesarGraveEvt = true;
                }

                // --- Localized Move Logging Logic ---
                // Construct the appropriate log key and properties based on the destination
                let logKey = '';
                let logParams: any = { card: getCardName(card, state.language), index: (typeof toIndex === 'number' ? toIndex + 1 : 0).toString() };

                // 1. Determine Key
                if (isNormalSummon) {
                    logKey = 'log_ns';
                } else if (actualDestination === 'HAND') {
                    logKey = 'log_move_to_hand';
                } else if (actualDestination === 'DECK') {
                    logKey = 'log_move_to_deck_top';
                } else if (actualDestination === 'GRAVEYARD') {
                    logKey = 'log_move_to_gy';
                } else if (actualDestination === 'BANISHED') {
                    logKey = 'log_move_to_banish';
                } else if (actualDestination === 'EXTRA_DECK') {
                    logKey = 'log_move_to_ex';
                } else if (actualDestination === 'MONSTER_ZONE' || actualDestination === 'EXTRA_MONSTER_ZONE') {
                    if (isNormalSummon) {
                        logKey = 'log_ns';
                    } else if (isSpecialSummon) {
                        const variant = summonVariant?.toLowerCase();
                        if (variant === 'fusion') logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_fusion_summon_to_emz' : 'log_fusion_summon_to_mz';
                        else if (variant === 'synchro') logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_synchro_summon_to_emz' : 'log_synchro_summon_to_mz';
                        else if (variant === 'xyz') logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_xyz_summon_to_emz' : 'log_xyz_summon_to_mz';
                        else if (variant === 'link') logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_link_summon_to_emz' : 'log_link_summon_to_mz';
                        else logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_sp_summon_to_emz' : 'log_sp_summon_to_mz';
                    } else {
                        logKey = actualDestination === 'EXTRA_MONSTER_ZONE' ? 'log_move_to_emz' : 'log_move_to_mz';
                    }
                } else if (actualDestination === 'SPELL_TRAP_ZONE') {
                    // Start of Change: Added logging for S/T Zone
                    logKey = 'log_move_to_stz';
                    // End of Change
                } else if (actualDestination === 'FIELD_ZONE') {
                    // Start of Change: Added logging for Field Zone
                    logKey = 'log_place_card'; // Reusing generic place log or create new one? 'log_move_to_stz' has index.
                    // Let's use 'log_move_to_stz' for consistency or 'log_activate_spell'?
                    // But 'moveCard' is generic.
                    // 'log_move_to_stz' expects {index}. FIELD_ZONE has no index usually displayed 1-5?
                    // Let's use 'log_activate_spell' if it's face-up? We don't track face-up/down in moveCard args yet.
                    // Let's use a generic 'log_place_card' for Field Zone if defined, or 'log_set' if set?
                    // LOCALE_JA has 'log_place_card': '{card}をPゾーンに置きました。' -> Specific to P-Zone?
                    // Let's use 'log_move_to_hand' style but for Field.
                    // Actually, let's just use 'log_activate_spell' assuming it's activation given the context of this sim (mostly open state).
                    // Or better, define 'log_move_to_field_zone'.
                    // For now, let's use 'log_move_to_stz' but with index 'Field'?
                    // No, {index} expects number string.
                    // Let's use `log_activate_spell` (発動しました).
                    // Wait, c001 is Continuous Spell.
                    logKey = 'log_activate_spell';
                }
                // End of Change

                // 2. Append Warnings/Extras
                // In Japanese/Localized, we might want to just append strings similarly?
                // The current Localization structure for keys implies full sentences.
                // We should append the warnings AFTER the main sentence.
                // logWarnings is now a string of localized warnings (or empty).

                let combinedLog = formatLog(logKey, logParams);
                if (logWarnings) combinedLog += logWarnings;

                // Materials detached warning
                if (hasMaterials && leavingField && !state.isMaterialMove && !state.isLinkSummoningActive) {
                    combinedLog += ` ${formatLog('log_materials_detached')}`;
                }

                const logs = (skipLogging || state.isMaterialMove || suppressTrigger) ? state.logs : [combinedLog, ...state.logs];

                return {
                    ...nextState,
                    ...newState,
                    logs
                };
            });

            // Trigger Generic EFFECT_LOGIC for the moved card (Async/Post-State Update)
            const s = get();

            // --- DEFERRED TRIGGER PROCESSING ---
            if (isDestructionEvt) {
                const movedCard = s.cards[cardId];
                // Machinex Trigger
                if (isDDDOrContractDestroyed && s.lastEffectSourceId) {
                    const usage = s.turnEffectUsage['c030_ss_reaction'] || 0;
                    if (usage < 1) {
                        s.extraDeck.forEach(edId => {
                            const edCard = s.cards[edId];
                            if (edCard.cardId === 'c030' && (s.turnEffectUsage['c030_ss_reaction'] || 0) < 1) {
                                const logic: any = EFFECT_LOGIC;
                                if (logic['c030_reaction']) {
                                    logic['c030_reaction'](s, edId);
                                }
                            }
                        });
                    }
                }
                // Ark Crisis P-Zone Placement
                if (isArkCrisisDestroyed) {
                    const pZones = [0, 4];
                    const availablePZone = pZones.find(idx => s.spellTrapZones[idx] === null);
                    if (availablePZone !== undefined) {
                        s.startEffectSelection(
                            formatLog('prompt_activate_effect', { name: getCardName(movedCard, s.language) }),
                            [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                            (choice) => {
                                if (choice === 'yes') {
                                    get().moveCard(cardId, 'SPELL_TRAP_ZONE', availablePZone);
                                    get().addLog(formatLog('log_place_card', { card: movedCard.name }));
                                }
                            }
                        );
                    }
                }
            }
            // Caesar GY Trigger
            if (isCaesarGraveEvt) {
                const movedCard = s.cards[cardId];
                s.startEffectSelection(
                    formatLog('prompt_activate_effect', { name: getCardName(movedCard, s.language) }),
                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                    (choice) => {
                        if (choice === 'yes') {
                            const ss = get();
                            ss.startSearch(
                                (c: Card) => c.name.includes('Dark Contract') || c.name.includes('契約書'),
                                (foundId: string) => {
                                    const sss = get();
                                    sss.moveCard(foundId, 'HAND');
                                    // Log handled by moveCard
                                },
                                formatLog('prompt_contract_search'),
                                ss.deck
                            );
                        }
                    }
                );
            }

            // --- DETACHED MATERIALS TRANSITION LOGIC ---
            // Trigger effects for cards that were detached and sent to GY
            if (detachedMaterials.length > 0) {
                detachedMaterials.forEach(matId => {
                    const matDef = s.cards[matId];
                    if (matDef && EFFECT_LOGIC[matDef.cardId]) {
                        // Check for "Sent to GY" triggers regardless of being a material
                        // We pass 'MATERIAL' as fromLocation to satisfy truthy check in triggers like c014
                        const logic = EFFECT_LOGIC[matDef.cardId];

                        // Scale Surveyor (c014) Explicit Check:
                        // "If sent to GY/Extra". Logic checks fromLocation truthiness.
                        // We use the same 'pendingEffects' batching if needed, but since this is usually 'after' the main move,
                        // we can just execute or queue.
                        // Note: If multiples, they queue up via startEffectSelection/modalQueue.

                        // We specifically target known cards that trigger from GY even if material
                        const triggersFromMaterial = ['c014', 'c021', 'c022', 'c023'];
                        if (triggersFromMaterial.includes(matDef.cardId)) {
                            // Use 'MATERIAL' as location signature
                            logic(s, matId, 'MATERIAL');
                        }
                    }
                });
            }


            // --- VISUAL CUE LOGIC (Genghis/Ragnarok) ---
            // --- VISUAL CUE LOGIC (Genghis/Ragnarok) ---
            // Determine if Normal Summon occurred (re-derived since local var inside set() is inaccessible)
            // Note: startState is the state BEFORE the move.
            const isNormalSummonTrigger = toZone === 'MONSTER_ZONE' && determinedFromLocation === 'HAND' && !isSpecialSummon && !startState.normalSummonUsed;

            if (isSpecialSummon || isNormalSummonTrigger) {
                const movedCard = s.cards[cardId];
                if (movedCard && movedCard.name.includes('DD')) {
                    const candidates: string[] = [];
                    // Check Genghis (c007, c019) in Monster Zones & EMZ
                    [...s.monsterZones, ...s.extraMonsterZones].forEach(mid => {
                        if (!mid) return;
                        if (s.cardPropertyModifiers[mid]?.isNegated) return; // Skip if negated
                        const card = s.cards[mid];
                        if (card.cardId === 'c007') {
                            // Flame King Genghis: Special Summon Only
                            if (!isSpecialSummon) return;

                            const optKey = `${card.name}_opt`;
                            if (mid !== cardId && !s.turnEffectUsage[optKey] && s.graveyard.some(g => s.cards[g].name.includes('DD') && s.cards[g].type === 'MONSTER')) {
                                candidates.push(mid);
                            }
                        } else if (card.cardId === 'c019') {
                            // High King Genghis: Normal OR Special Summon
                            // (Condition is handled by outer if)

                            const optKey = `${card.name}_opt`;
                            if (mid !== cardId && !s.turnEffectUsage[optKey] && s.graveyard.some(g => s.cards[g].name.includes('DD') && s.cards[g].type === 'MONSTER')) {
                                candidates.push(mid);
                            }
                        }

                        // Check Ragnarok (c008) in Monster Zones & EMZ
                        if (card.cardId === 'c008') {
                            const name = card.name;
                            if (mid === cardId) {
                                // Summon Effect (c008) - Own Summon (Normal or Special usually? No, "If this card is Normal or Special Summoned")
                                // Wait, Ragnarok is: "If this card is Normal or Special Summoned".
                                // Existing logic was checking `isSpecialSummon` only?
                                // Let's check card text for c008. "If this card is Normal or Special Summoned".
                                // So we should allow NS for Ragnarok too!
                                if (!s.turnEffectUsage[`${name}_summon_opt`] && s.graveyard.some(g => s.cards[g].name.includes('DDD') && s.cards[g].type === 'MONSTER')) {
                                    candidates.push(mid);
                                }
                            }
                        }
                    });

                    // Check Ragnarok (c008) in P-Zones (Effect: If another DD is SS)
                    [0, 4].forEach(pid => {
                        const mid = s.spellTrapZones[pid];
                        if (mid && s.cards[mid].cardId === 'c008') {
                            if (s.cardPropertyModifiers[mid]?.isNegated) return; // Skip if negated
                            const name = s.cards[mid].name;
                            if (cardId !== mid) { // Another DD
                                if (!s.turnEffectUsage[`${name}_peffect_opt`] && s.graveyard.some(g => s.cards[g].name.includes('DD'))) {
                                    candidates.push(mid);
                                }
                            }
                        }
                    });

                    if (candidates.length > 0) {
                        useGameStore.setState(prev => ({ triggerCandidates: [...prev.triggerCandidates, ...candidates] }));
                    } else {
                        // Debug log if needed
                        // console.log('No trigger candidates found for Genghis/Ragnarok.');
                    }
                }
            }

            const movedCardDef = s.cards[cardId];
            if (movedCardDef && EFFECT_LOGIC[movedCardDef.cardId]) {
                const cid = movedCardDef.cardId;
                const hoptExempt = ['c021', 'c012', 'c009']; // Tell, Count Surveyor, and Copernicus manage own HOPT
                const usage = s.turnEffectUsage[cid] || 0;

                // Recalculate isUsedAsMaterial for scope access
                const isUsedAsMaterialForLogic = (toZone === 'GRAVEYARD' || toZone === 'EXTRA_DECK') && (s.isLinkSummoningActive || s.isMaterialMove);

                if (hoptExempt.includes(cid) || usage < 1) {
                    const finalLoc = determinedFromLocation;
                    useGameStore.setState({ isEffectActivated: false }); // Reset before call

                    if (state.isBatching) {
                        useGameStore.setState(prev => ({
                            pendingEffects: [...prev.pendingEffects, () => {
                                useGameStore.getState().setActiveEffectCard(cardId);
                                (EFFECT_LOGIC as any)[cid](get(), cardId, finalLoc, summonVariant, isUsedAsMaterialForLogic);
                            }]
                        }));
                    } else {
                        get().setActiveEffectCard(cardId);
                        (EFFECT_LOGIC as any)[cid](get(), cardId, finalLoc, summonVariant, isUsedAsMaterialForLogic);
                    }

                    // Legacy check: We used to auto-increment usage here.
                    // But most effects now handle their own usage tracking (addTurnEffectUsage) inside the logic
                    // especially for interactive effects (startEffectSelection).
                    // Calling it here causes double-counting and premature highlighting for prompts.
                    // Removed to rely on internal logic.
                    // if (!hoptExempt.includes(cid) && get().isEffectActivated) {
                    //    get().addTurnEffectUsage(cid);
                    // }
                }
            } else {
                // Triggers usually don't log HOPT failure to avoid noise
            }
        } finally {
            if (!wasBatching) {
                get().processPendingEffects();
                get().processUiQueue();
                useGameStore.setState({ isBatching: false, isLinkSummoningActive: false, lastEffectSourceId: null });
            }
        }
    },

    addTurnEffectUsage: (usageKey, highlightCardId) => {
        set((state) => {
            const current = state.turnEffectUsage[usageKey] || 0;
            return {
                turnEffectUsage: {
                    ...state.turnEffectUsage,
                    [usageKey]: current + 1
                },
                // Highlight for Replay: Prefer highlightCardId (instance ID), 
                // fallback to usageKey if it looks like a cardId (e.g. 'c012')
                activeEffectCardId: highlightCardId || (usageKey.startsWith('c') && !usageKey.includes('_') ? usageKey : null)
            };
        });
        get().pushHistory();
        // Clear highlight unless it's an interactive effect (managed by startTargeting/startSearch etc.)
        const state = get();
        if (!state.targetingState.isOpen && !state.searchState.isOpen && !state.effectSelectionState.isOpen && !state.zoneSelectionState.isOpen) {
            get().setActiveEffectCard(null);
        }
    },

    addLog: (message) => set((state) => ({ logs: [message, ...state.logs] })),

    setDragState: (isDragging, id) => set({ isDragging, activeDragId: id }),

    startSearch: (filter, onSelect, prompt, sourceList) => {
        set({ isEffectActivated: true });
        const execute = () => {
            useGameStore.setState({
                searchState: {
                    isOpen: true,
                    filter: filter,
                    onSelect: (id) => {
                        useGameStore.setState({ searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined } });
                        onSelect(id);
                        get().processUiQueue();
                    },
                    prompt: prompt || formatLog('ui_search_deck'),
                    source: sourceList
                }
            });
        };

        const state = get();
        const isUiBusy = state.effectSelectionState.isOpen || state.targetingState.isOpen || state.searchState.isOpen || state.zoneSelectionState.isOpen;
        if (isUiBusy) {
            useGameStore.setState({ modalQueue: [...state.modalQueue, execute] });
        } else {
            execute();
        }
    },

    resolveSearch: (cardId) => {
        const { searchState } = get();
        if (searchState.onSelect) {
            searchState.onSelect(cardId);
        }
    },

    cancelSearch: () => {
        set({ searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined } });
        get().processUiQueue();
    },

    drawCard: () => {
        get().pushHistory();
        set((state) => {
            if (state.deck.length === 0) return state;
            const topCard = state.deck[0];
            const s = get();
            const logMsg = formatLog('log_draw');
            return { deck: state.deck.slice(1), hand: [...state.hand, topCard], logs: [logMsg, ...state.logs] };
        });
    },

    setDeck: (newDeck) => {
        get().pushHistory();
        set({ deck: newDeck });
    },

    shuffleDeck: () => set((state) => {
        const newDeck = [...state.deck];
        // Fisher-Yates Shuffle
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        return {
            deck: newDeck,
            logs: [formatLog('log_deck_shuffled'), ...state.logs]
        };
    }),


    sortDeck: () => set((state) => {
        // Sort by ID/Type to return to "original" state
        // Initial sorting logic from page.tsx:
        // P-Monsters (Level Asc), Non-P Monsters, Spells, Traps
        // We need to access CARD_DATABASE or just sort by current cards data?
        // state.cards has the data.

        const newDeck = [...state.deck].sort((a, b) => {
            const cardA = state.cards[a];
            const cardB = state.cards[b];
            if (!cardA || !cardB) return 0;

            const getOrder = (c: any) => {
                if (c.type === 'MONSTER') {
                    if (c.subType?.includes('PENDULUM')) return 1;
                    return 2;
                }
                if (c.type === 'SPELL') return 3;
                if (c.type === 'TRAP') return 4;
                return 5;
            };

            const orderA = getOrder(cardA);
            const orderB = getOrder(cardB);

            if (orderA !== orderB) return orderA - orderB;

            // Same category
            if (orderA === 1) { // P-Monsters
                const levelDiff = (cardA.level || 0) - (cardB.level || 0);
                if (levelDiff !== 0) return levelDiff;
            }

            // Fallback to ID (Canonical Order)
            // Specific Swap for User Request: Necro Slime (c015) vs Defense Soldier (c033)
            // Request: "Swap them". So Defense < Necro.
            if (a === 'c015' && b === 'c033') return 1;
            if (a === 'c033' && b === 'c015') return -1;

            // Specific Swap for User Request: Swamp King (c006) vs Zero King (c034)
            // Natural: c006 < c034. Swap -> Zero King (c034) First.
            if (a === 'c006' && b === 'c034') return 1;
            if (a === 'c034' && b === 'c006') return -1;

            return (cardA.cardId || a).localeCompare(cardB.cardId || b);
        });

        return {
            deck: newDeck,
            logs: [formatLog('log_deck_sorted'), ...state.logs]
        };
    }),



    addCardCopy: (targetId) => {
        const state = get();
        const card = state.cards[targetId];
        if (!card) return;

        const copies = state.deck.filter(id => state.cards[id].cardId === card.cardId).length;
        if (copies >= 3) {
            state.addLog(formatLog('log_max_copies_reached', { card: card.name }));
            return;
        }

        const newInstanceId = `inst_${card.cardId}_${Date.now()}`;
        const newCards = {
            ...state.cards,
            [newInstanceId]: { ...card, id: newInstanceId }
        };

        const targetIndex = state.deck.indexOf(targetId);
        const newDeck = [...state.deck];
        newDeck.splice(targetIndex + 1, 0, newInstanceId);

        get().pushHistory();
        set({ cards: newCards, deck: newDeck });
    },

    removeCardCopy: (targetId) => {
        const state = get();
        const card = state.cards[targetId];
        if (!card) return;

        const copies = state.deck.filter(id => state.cards[id].cardId === card.cardId).length;
        if (copies <= 1) {
            state.addLog(formatLog('log_min_copies_reached', { card: card.name }));
            return;
        }

        const newDeck = state.deck.filter(id => id !== targetId);
        const newCards = { ...state.cards };
        delete newCards[targetId];

        get().pushHistory();
        set({ cards: newCards, deck: newDeck });
    },

    addExtraDeckCopy: (cardId: string) => {
        const state = get();
        // Find an instance with this cardId in extraDeck
        const existingInstance = state.extraDeck.find(id => state.cards[id].cardId === cardId);
        if (!existingInstance) return;

        const card = state.cards[existingInstance];
        const copies = state.extraDeck.filter(id => state.cards[id].cardId === cardId).length;
        if (copies >= 3) {
            state.addLog(formatLog('log_max_copies_reached', { card: card.name }));
            return;
        }

        const newInstanceId = `inst_${cardId}_${Date.now()}`;
        const newCards = {
            ...state.cards,
            [newInstanceId]: { ...card, id: newInstanceId }
        };

        // Insert after the last instance of this cardId
        const lastIndex = state.extraDeck.map((id, i) => state.cards[id].cardId === cardId ? i : -1)
            .filter(i => i >= 0)
            .pop() ?? state.extraDeck.length - 1;

        const newExtraDeck = sortExtraDeck([...state.extraDeck, newInstanceId], newCards);

        get().pushHistory();
        set({
            cards: newCards,
            extraDeck: newExtraDeck
        });
    },


    removeExtraDeckCopy: (cardId: string, instanceId?: string) => {
        const state = get();
        // Find instances with this cardId in extraDeck
        const instancesToRemove = state.extraDeck.filter(id => state.cards[id].cardId === cardId);

        if (instancesToRemove.length <= 1) {
            // If we only have 1 copy left, we might want to check if the user is trying to remove the last copy. 
            // Requirement says "1~3枚の範囲". So minimum is 1.
            const card = state.cards[instancesToRemove[0]];
            state.addLog(formatLog('log_min_copies_reached', { card: card?.name || 'this card' }));
            return;
        }

        let toRemove = '';
        if (instanceId && instancesToRemove.includes(instanceId)) {
            toRemove = instanceId;
        } else {
            toRemove = instancesToRemove[instancesToRemove.length - 1]; // Remove last if no specific instance
        }

        const card = state.cards[toRemove];
        const newExtraDeck = state.extraDeck.filter(id => id !== toRemove);
        const newCards = { ...state.cards };
        delete newCards[toRemove];

        get().pushHistory();
        set({
            cards: newCards,
            extraDeck: newExtraDeck
        });
    },

    resetGame: () => {
        const state = get();
        // Collect all card instances that are NOT in the deck/extraDeck (to return them)
        // Actually, simpler: return all cards to their initial 'deck' or 'extraDeck' pool.
        // We know which cards are Extra Deck by their subType.

        const allInstanceIds = Object.keys(state.cards);
        const newDeck: string[] = [];
        const newExtraDeck: string[] = [];

        // We need to maintain the current 'copies' and 'order' of the deck if it wasn't moved.
        // If the user sorted the deck, we should keep that order.
        // Strategy: 
        // 1. Identify all instances currently in Deck.
        // 2. Identify all instances that WERE in Deck but are now elsewhere (Hand, GY, Field, Materials).
        // 3. Re-assemble Main Deck: [Current Deck] + [Other Main Deck Instances].
        // 4. Re-assemble Extra Deck: [All Extra Deck Instances].

        const isExtra = (id: string) => {
            const def = state.cards[id];
            if (!def || !def.subType) return false;
            const st = def.subType.toUpperCase();
            return st.includes('FUSION') || st.includes('SYNCHRO') || st.includes('XYZ') || st.includes('LINK');
        };

        const extraInstances = allInstanceIds.filter(id => isExtra(id));
        const mainInstances = allInstanceIds.filter(id => !isExtra(id));

        // The current 'deck' array in state is the MASTER order for Main Deck.
        // But some instances might be in Hand/Field/GY.
        // Let's find all main instances NOT in the current deck array.
        const offDeckMain = mainInstances.filter(id => !state.deck.includes(id));

        // Final Deck = Current Deck + Off-Deck cards (appended to top/index 0 for simplicity, or just anywhere).
        // User wants "Deck contents not reset", implying the custom set-up remains.
        const finalizedDeck = [...offDeckMain, ...state.deck];
        const sortedExtraDeck = sortExtraDeck(extraInstances, state.cards);

        set({
            deck: finalizedDeck,
            extraDeck: sortedExtraDeck,
            hand: [],
            graveyard: [],
            banished: [],
            monsterZones: [null, null, null, null, null],
            spellTrapZones: [null, null, null, null, null],
            fieldZone: null,
            extraMonsterZones: [null, null],
            materials: {},
            lp: 8000,
            normalSummonUsed: false,
            turnEffectUsage: {},
            cardFlags: {},
            triggerCandidates: [],
            pendulumSummonCount: 0,
            cardPropertyModifiers: {},
            history: [],
            logs: [],
            isEffectActivated: false, // Initialize the flag
            currentStepIndex: -1, // Reset currentStepIndex
        });
    },

    startSynchroSummon: (extraDeckCardId) => {
        const store = get();
        const card = store.cards[extraDeckCardId];
        const level = card.level || 0;

        // Helper for Effective Level
        const getEffLevel = (cId: string) => {
            const mod = store.cardPropertyModifiers[cId]?.level;
            return mod !== undefined ? mod : (store.cards[cId].level || 0);
        };

        store.startTargeting(
            (c) => {
                const isField = store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id);
                if (!isField) return false;
                if (!c.subType?.includes('TUNER')) return false;

                // c035 Tuner Requirement: "DD" Tuner
                if (extraDeckCardId === 'c035' && !c.name.includes('DD')) return false;

                return true;
            },
            (tunerId) => {
                const tunerLv = getEffLevel(tunerId);
                store.startTargeting(
                    (c) => {
                        const isField = store.monsterZones.includes(c.id) || store.extraMonsterZones.includes(c.id);
                        if (!isField) return false;
                        if (c.id === tunerId) return false;
                        if (c.subType?.includes('TUNER')) return false;

                        // Check Level Match (User Friendly: Only highlight valid levels)
                        const nonTunerLv = getEffLevel(c.id);
                        if (tunerLv + nonTunerLv !== level) return false;

                        // c035 Requirement: "DDD" non-Tuner
                        if (extraDeckCardId === 'c035' && !c.name.includes('DDD')) return false;

                        return true;
                    },
                    (nonTunerId) => {
                        const nonTunerLv = getEffLevel(nonTunerId);
                        if (tunerLv + nonTunerLv === level) {
                            store.startZoneSelection(formatLog('prompt_select_zone_synchro'),
                                (t, i) => {
                                    if (t === 'MONSTER_ZONE') {
                                        return store.monsterZones[i] === null || [tunerId, nonTunerId].includes(store.monsterZones[i]!);
                                    }
                                    if (t === 'EXTRA_MONSTER_ZONE') {
                                        // Rule: EMZ can only be used if:
                                        // 1. Both EMZs are empty, OR
                                        // 2. The target EMZ is occupied by a material, OR
                                        // 3. The other EMZ is occupied AND at least one material is from EMZ
                                        const otherEmzIdx = 1 - i;
                                        const otherEmzId = store.extraMonsterZones[otherEmzIdx];
                                        const currentEmzId = store.extraMonsterZones[i];
                                        const materialIds = [tunerId, nonTunerId];

                                        // Check if any material is from EMZ
                                        const materialFromEMZ = materialIds.some(mid => store.extraMonsterZones.includes(mid));

                                        // If other EMZ is occupied by non-material AND no material from EMZ -> forbidden
                                        const isOtherOccupiedByNonMaterial = otherEmzId !== null && !materialIds.includes(otherEmzId);
                                        if (isOtherOccupiedByNonMaterial && !materialFromEMZ) return false;

                                        return currentEmzId === null || materialIds.includes(currentEmzId);
                                    }

                                    return false;
                                },
                                (t, i) => {
                                    store.resolveSynchroSummon(tunerId, nonTunerId, extraDeckCardId, t, i);
                                }
                            );
                        } else {
                            store.addLog(formatLog('log_synchro_level_mismatch', { target: level.toString(), used: `${tunerLv} + ${nonTunerLv} = ${tunerLv + nonTunerLv}` }));
                        }
                    }
                );
            }
        );
    },



    startXyzSummon: (extraDeckCardId) => {
        set({ isEffectActivated: true });
        const store = get();
        const card = store.cards[extraDeckCardId];
        const rank = card.rank || card.level || 0;
        const options: { label: string, value: string }[] = [];

        // Default Standard Xyz (Rank check)
        // Tell (c021) Exception: User wants ONLY Rank-Up. Remove standard.
        // Machinex (c018) Exception: User wants ONLY Overlay. Remove standard.
        // Fix: Use card.cardId to check definition, not extraDeckCardId (instance ID).
        if (card.cardId !== 'c021' && card.cardId !== 'c018' && !options.some(o => o.value === 'standard')) {
            options.push({ label: formatLog('ui_xyz_summon_rank', { rank: rank.toString() }), value: 'standard' });
        }

        // Machinex
        if (card.cardId === 'c018') {
            const hasDDD = [...store.monsterZones, ...store.extraMonsterZones].some(id => id && store.cards[id].name.includes('DDD'));
            if (hasDDD) options.push({ label: formatLog('ui_xyz_overlay_ddd'), value: 'machinex_special' });
        }
        // Tell
        const isTell = card.cardId === 'c021';
        if (isTell) {
            // Rank-Up on Rank 4 "DD" Xyz (Solomon c025, Caesar c022)
            // Data check: Rank 4, Name includes 'DD', SubType includes 'XYZ'.
            const rank4DD = [...store.monsterZones, ...store.extraMonsterZones].some(id => {
                if (!id) return false;
                const c = store.cards[id];
                const r = c.rank || c.level || 0; // Fallback just in case, but we added rank.
                return r === 4 && c.name.includes('DD') && (c.subType?.includes('XYZ') || false);
            });
            if (rank4DD) options.push({ label: formatLog('ui_xyz_rank_up'), value: 'tell_rankup' });
        }

        // Ark Crisis (c029)
        // Requirement: 4 Materials (Fusion + Synchro + Xyz + Pendulum)
        // This is a Special Summon procedure, separate from Xyz/Fusion.
        // We add it here allowing invocation via "Special Summon" (which Xyz btn simulates for now).
        if (card.cardId === 'c029') {
            options.push({ label: formatLog('ui_special_summon_4_mats'), value: 'ark_crisis_special' });
        }

        if (options.length === 0) {
            store.addLog(formatLog('log_xyz_no_options'));
            return;
        }

        if (options.length === 1) {
            doXyz(options[0].value);
        } else {
            store.startEffectSelection(formatLog('prompt_select_xyz_type'), options, (val) => doXyz(val));
        }

        function doXyz(mode: string) {
            const currentStore = get(); // Get fresh state
            const getEffectiveLevel = (c: Card) => {
                const mod = currentStore.cardPropertyModifiers[c.id]?.level;
                return mod !== undefined ? mod : (c.level || 0);
            };

            if (mode === 'standard') {
                const materials: string[] = [];
                const required = 2; // Default for now. Could interpret from card description if parsed, but 2 is standard.
                store.clearSelectedCards();

                const selectNext = () => {
                    console.log('selectNext called. Materials:', materials);
                    if (materials.length >= required) {
                        console.log('Materials complete. Proceeding to Zone Selection.');
                        // Select Zone
                        store.startZoneSelection(formatLog('prompt_select_zone_xyz'),
                            (t, i) => {
                                if (t === 'SPELL_TRAP_ZONE' || t === 'FIELD_ZONE') return false;
                                const s = get();
                                if (t === 'MONSTER_ZONE') {
                                    return s.monsterZones[i] === null || materials.includes(s.monsterZones[i]!);
                                }
                                if (t === 'EXTRA_MONSTER_ZONE') {
                                    const otherEmzIdx = 1 - i;
                                    const otherEmzId = s.extraMonsterZones[otherEmzIdx];
                                    const currentEmzId = s.extraMonsterZones[i];

                                    // Check if any material is from EMZ
                                    const materialFromEMZ = materials.some(mid => s.extraMonsterZones.includes(mid));

                                    // If other EMZ is occupied by non-material AND no material from EMZ -> forbidden
                                    const isOtherOccupiedByNonMaterial = otherEmzId !== null && !materials.includes(otherEmzId);
                                    if (isOtherOccupiedByNonMaterial && !materialFromEMZ) return false;

                                    return currentEmzId === null || materials.includes(currentEmzId);
                                }
                                return false;
                            },
                            (t, i) => {
                                console.log('Zone selected. resolving Xyz Summon.');
                                store.resolveXyzSummon(extraDeckCardId, materials, t, i);
                                store.clearSelectedCards();
                            }
                        );
                        return;
                    }



                    store.startTargeting(
                        (c) => {
                            const s = get();
                            const onField = s.monsterZones.includes(c.id) || s.extraMonsterZones.includes(c.id);
                            if (!onField) return false;
                            if (materials.includes(c.id)) return false;
                            const effLevel = (() => {
                                const mod = s.cardPropertyModifiers[c.id]?.level;
                                return mod !== undefined ? mod : c.level;
                            })();
                            if (effLevel === undefined) return false; // Must have Level
                            const match = effLevel === rank;
                            console.log(`Checking ${c.name} (${c.id}): Level ${effLevel} vs Rank ${rank}. Match: ${match}`);
                            return match;
                        },
                        (id) => {
                            console.log('Material selected:', id);
                            materials.push(id);
                            store.addSelectedCard(id);
                            // Avoid potential recursion stack issues or state batching by deferring slightly?
                            // setTimeout(selectNext, 0);
                            // Direct call is usually fine in event handlers, but startTargeting toggles state.
                            selectNext();
                        }
                    );
                };
                console.log('Starting Xyz Selection. Rank:', rank);
                selectNext();
            } else if (mode === 'machinex_special') {
                store.startTargeting(
                    (c) => (currentStore.monsterZones.includes(c.id) || currentStore.extraMonsterZones.includes(c.id)) && c.name.includes('DDD'), // Fixed: User Requirement "DDD" not just "DD"

                    (targetId) => {
                        store.startZoneSelection(formatLog('prompt_select_zone_machinex'),
                            (t, i) => {
                                const s = get();
                                if (t === 'MONSTER_ZONE') {
                                    return s.monsterZones[i] === null || targetId === s.monsterZones[i];
                                }
                                if (t === 'EXTRA_MONSTER_ZONE') {
                                    // DEUS MACHINEX Exception: Allow if replacing the target (Overlay)
                                    // If the zone has the target material, it's valid validation.
                                    if (s.extraMonsterZones[i] === targetId) return true;

                                    // Otherwise, apply standard EMZ rules? 
                                    // If we are summoning to a DIFFERENT zone, we need to check occupancy.
                                    // Standard Rule: Can only use EMZ if empty (or valid linked).
                                    // And we must respect "1 EMZ per player" rule loosely.

                                    // If occupied by someone else, return false
                                    if (s.extraMonsterZones[i] !== null) return false;

                                    // If empty, allow? 
                                    // Only if we are not "stealing" the slot while holding another?
                                    // Simplified: If target is in MMZ, we can maybe move to EMZ?
                                    // But typically Overlay stays in same zone. 
                                    // Let's just allow Empty EMZ + Target EMZ.
                                    return true;
                                }
                                return false;
                            },
                            (t, i) => {
                                store.resolveXyzSummon(extraDeckCardId, [targetId], t, i);
                            }
                        );
                    }
                );
            } else if (mode === 'tell_rankup') {
                store.startTargeting(
                    (c) => (currentStore.monsterZones.includes(c.id) || currentStore.extraMonsterZones.includes(c.id)) && (c.rank === 4) && c.name.includes('DD') && (c.subType?.includes('XYZ') || false),
                    (targetId) => {
                        store.startZoneSelection(formatLog('prompt_select_zone_tell'),
                            (t, i) => {
                                const s = get();
                                if (t === 'MONSTER_ZONE') {
                                    return s.monsterZones[i] === null || targetId === s.monsterZones[i];
                                }
                                if (t === 'EXTRA_MONSTER_ZONE') {
                                    // EMZ Rule: If target is in MMZ (not EMZ), cannot use other empty EMZ
                                    const targetInEMZ = s.extraMonsterZones.includes(targetId);
                                    const otherEmzIdx = 1 - i;
                                    const otherEmzId = s.extraMonsterZones[otherEmzIdx];
                                    const currentEmzId = s.extraMonsterZones[i];

                                    // If other EMZ is occupied by non-target AND target is NOT in EMZ -> forbidden
                                    if (otherEmzId !== null && otherEmzId !== targetId && !targetInEMZ) {
                                        return false;
                                    }

                                    return currentEmzId === null || targetId === currentEmzId;
                                }
                                return false;
                            },

                            (t, i) => {
                                store.resolveXyzSummon(extraDeckCardId, [targetId], t, i);
                            }
                        );
                    }
                );
            } else if (mode === 'ark_crisis_special') {
                const materials: string[] = [];
                const required = 4;
                store.clearSelectedCards(); // Reuse Xyz helper if available, or just standard strings
                // We use standard logic but 4 times.

                const selectNext = () => {
                    if (materials.length >= required) {
                        // Validate
                        const isComputable = checkArkCrisisMaterials(materials.map(id => currentStore.cards[id]));
                        if (!isComputable) {
                            store.addLog(formatLog('log_arc_crisis_req_fail'));
                            // Reset?
                            // materials.length = 0; 
                            // store.clearSelectedCards();
                            // We should arguably cancel or retry. For now, abort log.
                            return;
                        }

                        // Select Zone
                        store.startZoneSelection(formatLog('prompt_select_zone_arc_crisis'),
                            (t, i) => t === 'MONSTER_ZONE' && currentStore.monsterZones[i] === null, // Only Monster Zone? Or EMZ? ED SS logic allows EMZ.
                            // Standard Rule: SS from ED -> EMZ or Linked Zone.
                            // For Sim simplicity: Limit to Monster Zone if we want, or allow EMZ.
                            // Let's use standard logic from doXyz Standard: check EMZ occupancy.
                            // But Ark Crisis doesn't use Xyz rules (materials are sent to GY).
                            // Let's default to Monster Zone for simplicity unless user requests EMZ logic for it.
                            // Actually, let's allow "Any Empty Monster Zone" to be safe.

                            (t, i) => {
                                store.resolveXyzSummon(extraDeckCardId, materials, t, i);
                                store.clearSelectedCards();
                            }
                        );
                        return;
                    }

                    store.addLog(formatLog('log_arc_crisis_select_material', { current: (materials.length + 1).toString(), requirements: formatLog('label_fusion_synchro_xyz_p') }));
                    store.startTargeting(
                        (c) => {
                            // STRICT FILTER: On Field (Monster Zones only). NOT P-Zones.
                            const s = get();
                            const onField = s.monsterZones.includes(c.id) || s.extraMonsterZones.includes(c.id);
                            if (!onField) return false;
                            // Implicitly excludes Spell/Trap Zones (P-Zones)

                            // Don't select self (impossible as in ED)
                            // Don't select already selected
                            if (materials.includes(c.id)) return false;
                            return true;
                        },
                        (id) => {
                            materials.push(id);
                            store.addSelectedCard(id); // Visual
                            selectNext();
                        }
                    );
                };

                selectNext();
            }
        }
    },



    resolveSynchroSummon: (tunerId, nonTunerId, synchroCardId, toZoneType, toZoneIndex) => {
        const store = get();
        set({ isHistoryBatching: true });

        try {
            set({ isMaterialMove: true });
            store.addLog(formatLog('log_synchro_start', { card: getCardName(store.cards[synchroCardId], store.language) }));
            store.moveCard(tunerId, 'GRAVEYARD');
            store.moveCard(nonTunerId, 'GRAVEYARD');
            set({ isMaterialMove: false });

            // Move Synchro Monster to Field
            // Move Synchro Monster to Field
            store.moveCard(synchroCardId, toZoneType, toZoneIndex, 'EXTRA_DECK', false, true);

            // store.addLog(formatLog('log_synchro_success', { card: getCardName(store.cards[synchroCardId], store.language) }));
            const matNames = [tunerId, nonTunerId].map(id => getCardName(store.cards[id], store.language)).join(', ');
            store.addLog(formatLog('log_summon_materials', { materials: matNames }));

        } finally {
            set({ isHistoryBatching: false });
            get().pushHistory();
        }
    },

    resolveXyzSummon: (xyzCardId, materialIds, toZoneType, toZoneIndex) => {
        set({ isHistoryBatching: true });
        try {
            // Fix: Perform ALL updates in a SINGLE set() call to avoid state sync issues
            // This ensures:
            // 1. Materials are removed from zones
            // 2. Xyz monster is placed in the target zone
            // 3. Materials map is updated
            // All atomically, preventing race conditions or stale state references

            set((state) => {
                const xyzCard = state.cards[xyzCardId];
                const isXyzMonster = xyzCard.subType?.includes('XYZ') || xyzCardId === 'c018'; // Machinex is Xyz-like
                const isArkCrisis = xyzCard.cardId === 'c029';

                // Determine if materials should be attached (Xyz) or sent to GY (Fusion/Synchro style)
                const shouldAttach = isXyzMonster && !isArkCrisis;

                const newMaterials = { ...state.materials };
                let allMaterials: string[] = [];
                let materialsToSendToGY: string[] = [];

                materialIds.forEach(matId => {
                    // Inherit existing materials (Transfer) if attached
                    // If sending to GY, materials of materials also go to GY? 
                    // Rule: If Xyz material is sent to GY, its materials go to GY.
                    // We handle "top-level" materials here.

                    if (shouldAttach) {
                        allMaterials.push(matId);
                        if (newMaterials[matId]) {
                            allMaterials.push(...newMaterials[matId]);
                            delete newMaterials[matId];
                        }
                    } else {
                        // Send to GY
                        materialsToSendToGY.push(matId);
                        // If it had materials, they also go to GY (implicitly or explicitly?)
                        // In Sim, "materials" map holds them. We should clear them.
                        if (newMaterials[matId]) {
                            materialsToSendToGY.push(...newMaterials[matId]);
                            delete newMaterials[matId];
                        }
                    }

                    // Reset Property Modifiers (Level/ATK/DEF) since becoming material = leaving field
                    // Modifiers don't persist on Xyz Materials.
                });

                // Create mutable copy of modifiers to update
                const newCardPropertyModifiers = { ...state.cardPropertyModifiers };
                materialIds.forEach(matId => {
                    if (newCardPropertyModifiers[matId]) {
                        delete newCardPropertyModifiers[matId];
                    }
                });

                // Update Materials Map (Attach)
                if (shouldAttach) {
                    newMaterials[xyzCardId] = allMaterials;
                }

                // Create new zone arrays
                let newMonsterZones = [...state.monsterZones];
                let newExtraMonsterZones = [...state.extraMonsterZones];

                // Clean materials from zones
                materialIds.forEach(matId => {
                    newMonsterZones = newMonsterZones.map(id => id === matId ? null : id);
                    newExtraMonsterZones = newExtraMonsterZones.map(id => id === matId ? null : id);
                });

                // Remove Xyz card from Extra Deck
                const newExtraDeck = state.extraDeck.filter(id => id !== xyzCardId);

                // Place Xyz monster in the target zone
                if (toZoneType === 'MONSTER_ZONE' && typeof toZoneIndex === 'number' && toZoneIndex >= 0 && toZoneIndex < 5) {
                    newMonsterZones[toZoneIndex] = xyzCardId;
                } else if (toZoneType === 'EXTRA_MONSTER_ZONE' && typeof toZoneIndex === 'number' && (toZoneIndex === 0 || toZoneIndex === 1)) {
                    newExtraMonsterZones[toZoneIndex] = xyzCardId;
                }

                // Update GY if materials were sent there
                let newGraveyard = [...state.graveyard];
                if (!shouldAttach && materialsToSendToGY.length > 0) {
                    newGraveyard = [...newGraveyard, ...materialsToSendToGY];
                }

                // Log
                let logs = [...state.logs];
                const matNames = materialIds.map(id => getCardName(state.cards[id], state.language)).join(', ');
                logs = [formatLog('log_summon_materials', { materials: matNames }), ...logs];

                if (shouldAttach) {
                    logs = [formatLog('log_xyz_summon_success', { card: getCardName(state.cards[xyzCardId], state.language) }), ...logs];
                } else {

                    logs = [formatLog('log_special_summon_success_gy', { card: getCardName(state.cards[xyzCardId], state.language) }), ...logs];
                }

                return {
                    ...state,
                    monsterZones: newMonsterZones,
                    extraMonsterZones: newExtraMonsterZones,
                    extraDeck: newExtraDeck,
                    graveyard: newGraveyard,
                    materials: newMaterials,
                    cardPropertyModifiers: newCardPropertyModifiers,
                    logs: logs,
                    // Trigger Check: Ark Crisis Effect (on Summon)
                    // We should add it to turnEffectUsage or similar if it's trigger on Summon?
                    // For now, simple state update.
                };
            });
        } finally {
            set({ isHistoryBatching: false });
            get().pushHistory();
        }
    },

    startEffectSelection: (title, options, onSelect) => {
        set({ isEffectActivated: true });
        const execute = () => {
            useGameStore.setState({
                effectSelectionState: {
                    isOpen: true,
                    title,
                    options,
                    onSelect: (val) => {
                        useGameStore.setState({ effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null } });
                        onSelect(val);
                        get().processUiQueue();
                    }
                }
            });
        };

        const state = get();

        if (state.isBatching) {
            const id = Math.random().toString(36).substr(2, 9);
            useGameStore.setState({
                pendingChain: [...state.pendingChain, { id, label: title, execute }]
            });
            return;
        }

        const isUiBusy = state.effectSelectionState.isOpen || state.targetingState.isOpen || state.searchState.isOpen || state.zoneSelectionState.isOpen;
        if (isUiBusy) {
            useGameStore.setState({ modalQueue: [...state.modalQueue, execute] });
        } else {
            execute();
        }
    },

    resolveEffectSelection: (value) => {
        const { effectSelectionState } = get();
        if (effectSelectionState.onSelect) {
            effectSelectionState.onSelect(value);
        }
    },

    startTargeting: (filter, onSelect, mode = 'normal') => {
        set({ isEffectActivated: true });
        const execute = () => {
            useGameStore.setState({
                targetingState: {
                    isOpen: true,
                    filter: filter,
                    onSelect: (id) => {
                        useGameStore.setState({ targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' } });
                        onSelect(id);
                        get().processUiQueue();
                    },
                    mode
                }
            });
        };

        const state = get();
        const isUiBusy = state.effectSelectionState.isOpen || state.targetingState.isOpen || state.searchState.isOpen || state.zoneSelectionState.isOpen;
        if (isUiBusy) {
            useGameStore.setState({ modalQueue: [...state.modalQueue, execute] });
        } else {
            execute();
        }
    },

    resolveTarget: (cardId) => {

        const { targetingState } = get();
        if (targetingState.onSelect) {
            targetingState.onSelect(cardId);
        }
    },

    startZoneSelection: (prompt, filter, onSelect) => {
        set({ isEffectActivated: true });
        const execute = () => {
            useGameStore.setState({
                zoneSelectionState: {
                    isOpen: true,
                    title: prompt || formatLog('ui_select_zone'),
                    filter: filter,
                    onSelect: (type, index) => {
                        useGameStore.setState({ zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null } });
                        onSelect(type, index);
                        get().processUiQueue();
                    }
                }
                // Log removed as requested
                // logs: [prompt, ...get().logs]
            });
        };

        const state = get();
        const isUiBusy = state.effectSelectionState.isOpen || state.targetingState.isOpen || state.searchState.isOpen || state.zoneSelectionState.isOpen;
        if (isUiBusy) {
            useGameStore.setState({ modalQueue: [...state.modalQueue, execute] });
        } else {
            execute();
        }
    },

    resolveZoneSelection: (type, index) => {
        const { zoneSelectionState } = get();
        if (zoneSelectionState.filter && !zoneSelectionState.filter(type, index)) return;
        if (zoneSelectionState.onSelect) {
            zoneSelectionState.onSelect(type, index);
        }
    },

    changeLP: (amount) => {
        get().pushHistory();
        set((state) => ({ lp: state.lp + amount }));
    },

    setCardFlag: (cardId, flag) => set((state) => {
        const currentFlags = state.cardFlags[cardId] || [];
        if (currentFlags.includes(flag)) return state;
        return {
            cardFlags: {
                ...state.cardFlags,
                [cardId]: [...currentFlags, flag]
            }
        };
    }),

    activateEffect: (cardId) => {
        // Highlight for Replay
        set({ activeEffectCardId: cardId });
        get().pushHistory();
        set({ activeEffectCardId: null });
        get().pushHistory(); // Force clear highlight snapshot for Replay

        const { cards, hand, normalSummonUsed, monsterZones, extraMonsterZones } = get();
        const card = cards[cardId];

        // --- Helper: Run Standard Effect Logic ---
        const runStandardEffect = () => {
            // Trigger Persistence Rule: Activation of other effects does not clear pending triggers.
            if (card && EFFECT_LOGIC[card.cardId]) {
                const cid = card.cardId;
                const hoptExempt = ['c021', 'c014', 'c030', 'c032', 'c012', 'c010'];

                const usage = get().turnEffectUsage[cid] || 0;
                const isNegated = get().cardPropertyModifiers[cardId]?.isNegated;

                if (isNegated) {
                    get().addLog(formatLog('log_effect_negated', { card: getCardName(card, get().language) }));
                    return;
                }

                if (hoptExempt.includes(cid) || usage < 1) {
                    useGameStore.setState({ isEffectActivated: false });
                    EFFECT_LOGIC[cid](get(), cardId);
                } else {
                    get().addLog(formatLog('log_hopt_used', { card: getCardName(card, get().language) }));
                }
            } else {
                // Deus Machinex (c018) has no manual activation effect, so suppress the warning
                if (card && card.cardId === 'c018') return;
                if (card) get().addLog(formatLog('log_no_effect_defined', { card: getCardName(card, get().language) }));
            }
        };

        // --- Tribute Summon Intercept ---
        // Condition: Monster, Level 5+, In Hand, Normal Summon Available, Sufficient Tributes
        const inHand = hand.includes(cardId);
        if (inHand && card?.type === 'MONSTER' && (card.level || 0) >= 5 && !normalSummonUsed) {
            const requiredTributes = (card.level || 0) >= 7 ? 2 : 1;
            const availableTributes = [...monsterZones, ...extraMonsterZones].filter(id => id !== null);

            // If we have enough tributes, ask user
            if (availableTributes.length >= requiredTributes) {
                get().startEffectSelection(formatLog('prompt_tribute_summon', { card: getCardName(card, get().language) }),
                    [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
                    (choice) => {
                        if (choice === 'yes') {
                            // Start Tribute Selection
                            const tributes: string[] = [];
                            const selectNextTribute = () => {
                                if (tributes.length === requiredTributes) {
                                    // Execute Summon with Batching
                                    useGameStore.setState({ isBatching: true, isHistoryBatching: true });
                                    try {
                                        // 1. Send Tributes to GY (or ED if Pendulum)
                                        tributes.forEach(tid => {
                                            const tc = get().cards[tid];
                                            const dest = tc.subType?.includes('PENDULUM') ? 'EXTRA_DECK' : 'GRAVEYARD';
                                            // Use fresh state move logic (moveCard handles history)
                                            useGameStore.getState().moveCard(tid, dest);
                                        });

                                        // 2. Refresh State and Select Zone
                                        const s = useGameStore.getState();
                                        const freshEmpty = s.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

                                        if (freshEmpty.length > 0) {
                                            s.startZoneSelection(formatLog('prompt_select_zone_tribute'), (t, i) => t === 'MONSTER_ZONE' && freshEmpty.includes(i), (t, i) => {
                                                const finalState = useGameStore.getState();
                                                // Move from Hand to Field (Normal Summon) -> moveCard handles normalSummonUsed flag
                                                finalState.moveCard(cardId, 'MONSTER_ZONE', i, 'HAND', false, false);
                                                finalState.addLog(formatLog('log_tribute_summon', { card: getCardName(card, finalState.language) }));

                                                useGameStore.setState({ isBatching: false, isHistoryBatching: false });
                                                get().pushHistory();
                                                finalState.processPendingEffects();
                                                finalState.processUiQueue();
                                            });
                                        } else {
                                            s.addLog(formatLog('log_tribute_error_zone'));
                                            useGameStore.setState({ isBatching: false });
                                            s.processUiQueue();
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        useGameStore.setState({ isBatching: false });
                                    }
                                } else {
                                    const s = useGameStore.getState();
                                    s.addLog(formatLog('log_select_tribute', { current: (tributes.length + 1).toString(), required: requiredTributes.toString() }));
                                    s.startTargeting(
                                        (c) => (s.monsterZones.includes(c.id) || s.extraMonsterZones.includes(c.id)) && !tributes.includes(c.id),
                                        (tid) => {
                                            tributes.push(tid);
                                            selectNextTribute();
                                        },
                                        'red' // Visual cue for "tribute/graveyard"
                                    );
                                }
                            };
                            selectNextTribute();
                        } else {
                            runStandardEffect();
                        }
                    }
                );
                return; // Stop and wait for selection
            }
        }

        // If not intercepted or condition failed, run standard
        runStandardEffect();

        // Finalize highlight if no async/UI logic was triggered
        if (!get().effectSelectionState.isOpen && !get().targetingState.isOpen && !get().searchState.isOpen && !get().zoneSelectionState.isOpen) {
            set({ activeEffectCardId: null });
            get().pushHistory();
        }
    },

    pushHistory: () => {
        const state = get();
        // If batching history, do not push yet.
        if (state.isHistoryBatching) return;

        set((state) => {
            // Snapshot
            const { history, ...rest } = state;

            const snapshot: Partial<GameState> = {
                deck: state.deck,
                cards: state.cards,
                hand: state.hand,
                graveyard: state.graveyard,
                banished: state.banished,
                extraDeck: state.extraDeck,
                monsterZones: [...state.monsterZones],
                spellTrapZones: [...state.spellTrapZones],
                fieldZone: state.fieldZone,
                extraMonsterZones: [...state.extraMonsterZones],
                lp: state.lp,
                normalSummonUsed: state.normalSummonUsed,
                materials: JSON.parse(JSON.stringify(state.materials)), // Deep copy needed
                logs: [...state.logs],
                turnEffectUsage: { ...state.turnEffectUsage },
                cardFlags: JSON.parse(JSON.stringify(state.cardFlags)),
                pendulumSummonCount: state.pendulumSummonCount,
                pendulumSummonLimit: state.pendulumSummonLimit,
                cardPropertyModifiers: JSON.parse(JSON.stringify(state.cardPropertyModifiers)),
                isLinkSummoningActive: state.isLinkSummoningActive,
                isTellBuffActive: state.isTellBuffActive,
                lastEffectSourceId: state.lastEffectSourceId, // Save this for replay highlighting
                activeEffectCardId: state.activeEffectCardId, // Save active effect card for replay
                logCount: state.logs ? state.logs.length : 0, // Store log count instead of full logs array
            };

            const newHistory = [...(state.history || []), snapshot];
            if (newHistory.length > 1000) newHistory.shift(); // Increased limit to 1000 for Replay
            return { history: newHistory };
        });
    },

    startPendulumSummon: () => {
        const state = get();
        // Get Scales
        // Scales are at 0 and 4.
        const p1Id = state.spellTrapZones[0];
        const p2Id = state.spellTrapZones[4];
        if (!p1Id || !p2Id) return;

        const p1 = state.cards[p1Id];
        const p2 = state.cards[p2Id];

        const min = Math.min(p1.scale || 0, p2.scale || 0);
        const max = Math.max(p1.scale || 0, p2.scale || 0);

        const handCandidates = state.hand.filter(id => {
            const c = state.cards[id];
            return c.type === 'MONSTER' && (c.level || 0) > min && (c.level || 0) < max;
        });

        // Face-up Pendulums in Extra Deck
        const edCandidates = state.extraDeck.filter(id => {
            const c = state.cards[id];
            // Must be Pendulum type (though usually only Pendulums are face-up in ED in Sims, but here we track all ED. Only P-types return to ED face-up?)
            // Logic for "Face-up" in ED is implicit in this sim? Or do we track face-up/down?
            // Assuming all P-monsters in ED are face-up for summoning.
            return c.subType?.includes('PENDULUM') && (c.level || 0) > min && (c.level || 0) < max;
        });

        const candidates = [...handCandidates, ...edCandidates];

        if (candidates.length === 0) {
            state.addLog(formatLog('log_no_pendulum_monsters'));
            return;
        }

        set({
            isPendulumSummoning: true,
            pendulumCandidates: candidates
        });
    },

    cancelPendulumSummon: () => {
        set({ isPendulumSummoning: false, isPendulumProcessing: false, pendulumCandidates: [] });
    },

    resolvePendulumSelection: (selectedIds) => {
        set({
            isHistoryBatching: true,
            activeEffectCardId: null,
            isPendulumSummoning: false,
            isPendulumProcessing: true,
            pendulumCandidates: []
        });

        if (selectedIds.length === 0) {
            set({ isHistoryBatching: false });
            return;
        }

        const processNext = (remainingIds: string[], placements: { id: string, zoneIndex: number, type: ZoneType }[]) => {
            if (remainingIds.length === 0) {
                // Execute all moves
                const store = get();
                store.addLog(formatLog('log_pendulum_summoning', { count: placements.length.toString() }));

                // Sorting for triggers (optional but good practice)
                const cards = get().cards;
                const sortedPlacements = [...placements].sort((a, b) => {
                    const cA = cards[a.id];
                    const cB = cards[b.id];
                    if (cA.cardId === 'c009' && cB.cardId !== 'c009') return -1;
                    if (cB.cardId === 'c009' && cA.cardId !== 'c009') return 1;
                    if (cA.cardId === 'c013' && cB.cardId !== 'c013') return 1;
                    if (cB.cardId === 'c013' && cA.cardId !== 'c013') return -1;
                    return 0;
                });

                set({ isBatching: true, isHistoryBatching: true });
                try {
                    sortedPlacements.forEach(p => {
                        const fromLoc = get().hand.includes(p.id) ? 'HAND' : 'EXTRA_DECK';
                        get().moveCard(p.id, p.type, p.zoneIndex, fromLoc, false, true, 'PENDULUM');
                    });
                    set((state) => ({ pendulumSummonCount: state.pendulumSummonCount + 1 }));
                } finally {
                    get().processPendingEffects();
                    set({ isBatching: false, isHistoryBatching: false, isPendulumProcessing: false });
                    get().pushHistory();
                }
                return;
            }

            const currentId = remainingIds[0];
            const state = get();
            const card = state.cards[currentId];
            const isFromExtra = state.extraDeck.includes(currentId);

            // Calculate valid indices
            // Trigger Cut-in for Live Play
            set({ showPendulumCutIn: true });
            setTimeout(() => set({ showPendulumCutIn: false }), 2000);

            let validIndices: { type: ZoneType, index: number }[] = [];
            const emptyMMZs = state.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

            if (isFromExtra) {
                // EMZs (Left=0, Right=1)
                // Rule: If one EMZ is occupied (on field or in current selection), the other is NOT available for P-Summon from Extra.
                const isEMZ0Occupied = state.extraMonsterZones[0] !== null || placements.some(p => p.type === 'EXTRA_MONSTER_ZONE' && p.zoneIndex === 0);
                const isEMZ1Occupied = state.extraMonsterZones[1] !== null || placements.some(p => p.type === 'EXTRA_MONSTER_ZONE' && p.zoneIndex === 1);

                // If neither is occupied, BOTH are valid. If one IS occupied, NEITHER (other) is valid for a NEW placement.
                const anyEMZOccupied = isEMZ0Occupied || isEMZ1Occupied;

                if (!anyEMZOccupied) {
                    if (state.extraMonsterZones[0] === null) validIndices.push({ type: 'EXTRA_MONSTER_ZONE', index: 0 });
                    if (state.extraMonsterZones[1] === null) validIndices.push({ type: 'EXTRA_MONSTER_ZONE', index: 1 });
                } else {
                    // One is already occupied. Check which one.
                    // If EMZ0 is occupied, we cannot use EMZ1 for Extra Deck P-Summon (Standard Rule).
                    // If EMZ1 is occupied, we cannot use EMZ0.
                    // So we add NOTHING to validIndices for EMZs if either is occupied.
                }

                // Linked zones from Link Monsters (Still allowed even if one EMZ is used?)
                // Standard Rule: You can only use one EMZ. Summoning to MMZ via Link Markers is always allowed.
                const checkMarkers = (originType: ZoneType, originIdx: number, markers: string[]) => {
                    const getTargetMMZ = (m: string): number | null => {
                        if (originType === 'EXTRA_MONSTER_ZONE') {
                            if (originIdx === 0) { // Left
                                if (m === 'BOTTOM_LEFT') return 0;
                                if (m === 'BOTTOM') return 1;
                                if (m === 'BOTTOM_RIGHT') return 2;
                            } else { // Right
                                if (m === 'BOTTOM_LEFT') return 2;
                                if (m === 'BOTTOM') return 3;
                                if (m === 'BOTTOM_RIGHT') return 4;
                            }
                        } else { // MMZ
                            if (m === 'LEFT') return originIdx > 0 ? originIdx - 1 : null;
                            if (m === 'RIGHT') return originIdx < 4 ? originIdx + 1 : null;
                        }
                        return null;
                    };
                    markers.forEach(m => {
                        const tid = getTargetMMZ(m);
                        if (tid !== null && state.monsterZones[tid] === null && !placements.some(p => p.type === 'MONSTER_ZONE' && p.zoneIndex === tid)) {
                            if (!validIndices.some(v => v.type === 'MONSTER_ZONE' && v.index === tid)) {
                                validIndices.push({ type: 'MONSTER_ZONE', index: tid });
                            }
                        }
                    });
                };

                state.extraMonsterZones.forEach((id, i) => { if (id && state.cards[id].linkMarkers) checkMarkers('EXTRA_MONSTER_ZONE', i, state.cards[id].linkMarkers!); });
                state.monsterZones.forEach((id, i) => { if (id && state.cards[id].linkMarkers) checkMarkers('MONSTER_ZONE', i, state.cards[id].linkMarkers!); });

            } else {
                // Hand -> Any empty MMZ
                validIndices = emptyMMZs.filter(i => !placements.some(p => p.type === 'MONSTER_ZONE' && p.zoneIndex === i))
                    .map(i => ({ type: 'MONSTER_ZONE', index: i }));
            }

            if (validIndices.length === 0) {
                state.addLog(formatLog('log_no_valid_zones_for_card', { card: getCardName(card, state.language) }));
                processNext(remainingIds.slice(1), placements);
                return;
            }

            // Prompt for zone
            state.startZoneSelection(
                formatLog('prompt_select_zone_for_card', { card: getCardName(card, get().language) }),
                (t, i) => validIndices.some(v => v.type === t && v.index === i),
                (t, i) => {
                    processNext(remainingIds.slice(1), [...placements, { id: currentId, zoneIndex: i, type: t }]);
                }
            );
        };

        processNext(selectedIds, []);
    },

    undo: () => {
        const state = get();
        if (!state.history || state.history.length === 0) {
            get().addLog(formatLog('log_undo_empty'));
            return;
        }
        const previous = state.history[state.history.length - 1];
        const newHistory = state.history.slice(0, -1);

        set({
            ...previous,
            history: newHistory,
            // Ensure UI states are reset to clean
            isDragging: false,
            activeDragId: null,
            searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
            effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
            targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
            zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
            modalQueue: [],
            pendingChain: [],
            isBatching: false,
            currentStepIndex: -1, // Reset currentStepIndex on undo
            useGradient: false,
            fieldColor: '#000000',
        });
    },

    returnFromJump: () => {
        const state = get();
        if (state.jumpHistory.length === 0) return;

        const previousState = state.jumpHistory[state.jumpHistory.length - 1];
        const newJumpHistory = state.jumpHistory.slice(0, -1);

        set({
            ...previousState,
            // Explicitly restore critical state references if needed, but spread matches structure
            jumpHistory: newJumpHistory,
            // Ensure UI cleans up
            isReplaying: false,
            currentStepIndex: -1,
            // Clean UI
            isDragging: false,
            activeDragId: null,
            searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
            effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
            targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
            zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
            modalQueue: [],
            pendingChain: [],
            isBatching: false,
        });
        get().addLog(formatLog('log_return_from_jump'));
    },

    jumpToLog: (logIndex: number) => {
        const state = get();
        const fullHistory = [...(state.history || [])];

        // Search for the state where logs.length === logIndex + 1
        // We look for the FIRST state that satisfies this.
        const targetState = fullHistory.find(h => h.logs && h.logs.length === logIndex + 1);

        if (targetState) {
            // Check if we are already in a jump?
            // If so, we should probably append to the existing jumpHistory OR just keeping it implies a stack.
            // If we jump FROM a jump, we push the current (already reverted) state.
            // This allows multi-level Return.

            // Save CURRENT state as a snapshot to jumpHistory
            const currentSnapshot: Partial<GameState> = {
                deck: state.deck,
                hand: state.hand,
                graveyard: state.graveyard,
                banished: state.banished,
                extraDeck: state.extraDeck,
                monsterZones: [...state.monsterZones],
                spellTrapZones: [...state.spellTrapZones],
                fieldZone: state.fieldZone,
                extraMonsterZones: [...state.extraMonsterZones],
                lp: state.lp,
                normalSummonUsed: state.normalSummonUsed,
                materials: JSON.parse(JSON.stringify(state.materials)),
                logs: [...state.logs],
                turnEffectUsage: { ...state.turnEffectUsage },
                cardFlags: JSON.parse(JSON.stringify(state.cardFlags)),
                pendulumSummonCount: state.pendulumSummonCount,
                pendulumSummonLimit: state.pendulumSummonLimit,
                cardPropertyModifiers: JSON.parse(JSON.stringify(state.cardPropertyModifiers)),
                isLinkSummoningActive: state.isLinkSummoningActive,
                isTellBuffActive: state.isTellBuffActive,
                lastEffectSourceId: state.lastEffectSourceId,
                activeEffectCardId: state.activeEffectCardId,
                history: fullHistory // Save FULL history to restore
            };

            const historyIndex = fullHistory.indexOf(targetState);
            const newHistory = fullHistory.slice(0, historyIndex);

            set({
                ...targetState,
                history: newHistory,
                jumpHistory: [...state.jumpHistory, currentSnapshot],
                // Clean UI
                isDragging: false,
                activeDragId: null,
                searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
                effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
                targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
                zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
                modalQueue: [],
                pendingChain: [],
                isBatching: false,
                currentStepIndex: historyIndex, // Set currentStepIndex to the jumped-to index
                isReplaying: false, // Ensure we are in interactive mode after jump
            });
            get().addLog(formatLog('log_replay_jump', { index: (logIndex + 1).toString() }));
        } else {
            // Maybe it's the current state?
            if (state.logs.length === logIndex + 1) {
                get().addLog(formatLog('log_sys_already_at_step'));
            } else {
                get().addLog(formatLog('log_sys_state_not_found'));
            }
        }
    },

    setReplaySpeed: (speed) => set({ replaySpeed: speed }),
    setActiveEffectCard: (cardId) => set({ activeEffectCardId: cardId }),
    stopReplay: () => set({ isReplaying: false }),
    replay: async (skipSnapshot = false) => {
        // Ensure the latest action is captured in history before starting replay
        if (!skipSnapshot && !get().isHistoryBatching) {
            get().pushHistory();
        }

        const { history, replaySpeed } = get();
        if (get().isReplaying || history.length === 0) return;

        set({ isReplaying: true, logs: [], currentStepIndex: -1 });

        // Track previous state to detect changes
        let prevPendulumSummonCount = history[0]?.pendulumSummonCount || 0;

        for (let i = 0; i < history.length; i++) {
            if (!get().isReplaying) break; // Allow stop

            const snapshot = history[i];

            // Detect Pendulum Summon (Count increased in this snapshot compared to prev)
            // Show Cut-In BEFORE updating board to new state (so we see the previous board + cut-in -> then new board with monsters)
            const p1 = snapshot.spellTrapZones[0];
            const p4 = snapshot.spellTrapZones[4];
            if (snapshot.pendulumSummonCount > prevPendulumSummonCount && p1 && p4) {
                // Trigger Cut-in
                set({ showPendulumCutIn: true });
                // Wait for cut-in animation (Speed 1.5x: 2000ms -> ~1333ms)
                await new Promise(resolve => setTimeout(resolve, 1333));
                set({ showPendulumCutIn: false });
            }
            prevPendulumSummonCount = snapshot.pendulumSummonCount || 0;

            // Reconstruct logs from the master logs array based on logCount
            const logCount = snapshot.logCount || 0;
            const fullLogs = get().logs || [];
            const currentLogs = fullLogs.slice(fullLogs.length - logCount);

            set({
                ...snapshot,
                logs: currentLogs,
                currentStepIndex: i,
                // Ensure UI state from snapshot is respected, but maybe force some things?
                // Clean UI states that shouldn't persist during replay
                searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
                effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
                targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
                zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
                modalQueue: [],
                pendingChain: [],
                isBatching: false,
                isReplaying: true, // Keep this true during replay
            });

            // Calculate Delay: Base 1000ms / Speed. 
            // Speed 1 = 1000ms
            // Speed 5 = 200ms
            const baseDelay = 1000;
            const delay = baseDelay / (replaySpeed || 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        set({ isReplaying: false, activeEffectCardId: null, showPendulumCutIn: false });
    },

    setBackgroundColor: (color: string) => set({ backgroundColor: color }),
    setUseGradient: (use: boolean) => set({ useGradient: use }),
    setFieldColor: (color: string) => set({ fieldColor: color }),

    // ... existing actions ...

    resolveTrigger: (cardId) => {
        const store = get();
        if (store.triggerCandidates.includes(cardId)) {
            // Highlight for Replay
            useGameStore.setState({ activeEffectCardId: cardId });
            get().pushHistory();

            // Clear highlight after snapshot so it doesn't persist to next steps (resolution/summon)
            useGameStore.setState({ activeEffectCardId: null });
            get().pushHistory(); // Force clear highlight snapshot for Replay

            // Only remove the current card from candidates
            useGameStore.setState(prev => ({ triggerCandidates: prev.triggerCandidates.filter(id => id !== cardId) }));
            const cardDef = store.cards[cardId];
            if (cardDef && EFFECT_LOGIC[cardDef.cardId]) {
                store.addLog(formatLog('log_trigger_activated', { card: getCardName(cardDef, store.language) }));
                // Execute logic as 'TRIGGER'
                try {
                    EFFECT_LOGIC[cardDef.cardId](get(), cardId, 'TRIGGER');
                } finally {
                    // Finalize highlight if no async/UI logic was triggered
                    if (!get().effectSelectionState.isOpen && !get().targetingState.isOpen && !get().searchState.isOpen && !get().zoneSelectionState.isOpen) {
                        set({ activeEffectCardId: null });
                        get().pushHistory();
                    }
                }
            }
        }
    },

    addExtraDeckCopy: (cardId: string) => {
        set((state) => {
            // Check if this card is allowed to be added (must be in initial Extra Deck)
            if (!state.initialExtraDeckCardIds.includes(cardId)) {
                return state;
            }

            // Find template card (any existing instance)
            const templateCard = Object.values(state.cards).find(c => c.cardId === cardId);

            if (!templateCard) return state;

            const newId = `${cardId}_copy_${Math.random().toString(36).substr(2, 5)}`;
            const newCard = { ...templateCard, id: newId, faceUp: false }; // Ensure Face-Down

            return {
                cards: { ...state.cards, [newId]: newCard },
                extraDeck: sortExtraDeck([...state.extraDeck, newId], { ...state.cards, [newId]: newCard })
            };
        });
    },

    removeExtraDeckCopy: (cardId: string) => {
        set((state) => {
            // Find last instance to remove (LIFOish)
            const instances = state.extraDeck.filter(id => state.cards[id].cardId === cardId);
            if (instances.length <= 1) return state; // Keep at least 1

            const toRemove = instances[instances.length - 1];
            const newExtraDeck = state.extraDeck.filter(id => id !== toRemove);
            const newCards = { ...state.cards };
            delete newCards[toRemove];

            return {
                cards: newCards,
                extraDeck: newExtraDeck
            };
        });
    },

    loadArchive: (archive: any) => {
        const { history } = archive;
        if (!history || !Array.isArray(history) || history.length === 0) return;

        // Reset to final state of the replay per user request
        const initialState = history[history.length - 1];
        set({
            ...initialState,
            history: history,
            // Ensure derived state / UI is clean
            isReplaying: false,
            currentStepIndex: history.length - 1,
            logs: archive.logs || initialState.logs || [],

            // Clean UI
            searchState: { isOpen: false, filter: null, onSelect: null, prompt: undefined, source: undefined },
            effectSelectionState: { isOpen: false, title: '', options: [], onSelect: null },
            targetingState: { isOpen: false, filter: null, onSelect: null, mode: 'normal' },
            zoneSelectionState: { isOpen: false, title: '', filter: null, onSelect: null },
            modalQueue: [],
            pendingChain: [],
            isBatching: false,
            activeEffectCardId: null,
            lastEffectSourceId: null
        });
    }
}));


