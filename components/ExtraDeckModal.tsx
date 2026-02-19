import { ComponentType } from 'react';
import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/Card';
import { Card as CardType } from '@/types';
import { formatLog, getCardName } from '@/data/locales';

interface ExtraDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ExtraDeckModal({ isOpen, onClose }: ExtraDeckModalProps) {
    const { extraDeck, cards, monsterZones, spellTrapZones, graveyard, fieldZone, moveCard, addLog, startSynchroSummon, banished, extraMonsterZones, language } = useGameStore();

    // State for selected card ID (for +/- buttons) - Must be before early return
    const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);

    // Get unique cardIds in extraDeck (for display with count) - Must be before early return
    // We now just want to display ALL cards in the Extra Deck, sorted (which they are in store).
    // so we don't need uniqueCardIds anymore.
    // However, we might want to keep the "isSummonable" check efficient.


    if (!isOpen) return null;


    // Helper: Check if summonable (Heuristic)
    const isSummonable = (cardId: string): boolean => {
        const card = cards[cardId];
        if (!card) return false;

        // Safety check for levels
        const { cardPropertyModifiers } = useGameStore.getState();
        const getLevel = (c: CardType) => {
            const mod = cardPropertyModifiers[c.id]?.level;
            return mod !== undefined ? mod : (c.level || 0);
        };

        // ... (Fusion, Synchro, Xyz logic remains same or simplified if needed)
        // For brevity, keeping generic checks, upgrading Link check.

        // 1. Fusion (Disabled highlight per user request, except for Arc Crisis)
        if (card.subType?.includes('FUSION') && card.cardId !== 'c029') {
            return false;
        }

        // 2. Synchro
        if (card.subType?.includes('SYNCHRO')) {
            const monsterIds = [...monsterZones, ...useGameStore.getState().extraMonsterZones].filter((id): id is string => id !== null);
            const monsters = monsterIds.map(id => cards[id]);
            const tuners = monsters.filter(m => m.subType?.includes('TUNER'));
            const nonTuners = monsters.filter(m => !m.subType?.includes('TUNER'));
            const targetLevel = card.level || 0;
            return tuners.some(t => nonTuners.some(nt => (getLevel(t) + getLevel(nt)) === targetLevel));
        }

        // 3. Xyz
        if (card.subType?.includes('XYZ')) {
            const rank = card.rank || 0;
            const monsterIds = [...monsterZones, ...useGameStore.getState().extraMonsterZones].filter((id): id is string => id !== null);
            const monsters = monsterIds.map(id => cards[id]);

            // Deus Machinex (c018) Special Highlight: Glow if any "DDD" monster is on the field (Overlay condition)
            if (card.cardId === 'c018') {
                const hasDDD = monsters.some(m => m.name.includes('DDD'));
                return hasDDD;
            }

            const matchingLevelCount = monsters.filter(m => {
                const mRank = m.rank || 0;
                const mLv = getLevel(m);
                return mLv === rank || mRank === rank;
            }).length;
            if (card.name.includes('Marksman King Tell')) {
                const hasRank4DDD = monsters.some(m => m.subType?.includes('XYZ') && (m.rank === 4 || m.level === 4) && m.name.includes('DDD'));
                if (hasRank4DDD) return true;
            }
            return matchingLevelCount >= 2;
        }

        // 4. Link (Refined for Gilgamesh)
        if (card.subType?.includes('LINK')) {
            const monsterIds = [...monsterZones, ...useGameStore.getState().extraMonsterZones].filter((id): id is string => id !== null);
            const monsters = monsterIds.map(id => cards[id]);

            if (card.cardId === 'c028') {
                // Zeus Ragnarok (c028)
                // Glow if monsters on field >= 3, OR >= 2 and one is Gilgamesh
                const hasGilgamesh = monsters.some(m => m.cardId === 'c017');
                return monsters.length >= 3 || (monsters.length >= 2 && hasGilgamesh);
            }

            if (card.name.includes('Gilgamesh')) {
                // Check for 2 DD Monsters
                const ddCount = monsters.filter(m => m.name.includes('DD')).length;
                return ddCount >= 2;
            }

            // Generic fallback
            return monsters.length >= 2;
        }

        // 6. Arc Crisis (c029) - Special Summon by banishing DDD Xyz, Synchro, Fusion, Pendulum
        if (card.cardId === 'c029') {
            // Check if we can find the required 4 materials from field or graveyard
            // Check if we can find the required 4 materials from field or graveyard
            const fieldMonsterIds = [...monsterZones, ...useGameStore.getState().extraMonsterZones].filter((id): id is string => id !== null);
            const pZoneIds = [spellTrapZones[0], spellTrapZones[4]].filter((id): id is string => id !== null);
            const gyMonsterIds = graveyard.filter(id => cards[id]?.type === 'MONSTER');
            const allCandidates = [...fieldMonsterIds, ...pZoneIds, ...gyMonsterIds];

            // Need: 1 Fusion, 1 Synchro, 1 Xyz, 1 Pendulum (Deus Machinex c018 can be Xyz OR Pendulum)
            const candidateCards = allCandidates.map(id => cards[id]);

            const requirements = ['FUSION', 'SYNCHRO', 'XYZ', 'PENDULUM'];
            const canSatisfy = (c: CardType, req: string): boolean => {
                const sub = (c.subType || '').toUpperCase();
                if (req === 'FUSION') return sub.includes('FUSION');
                if (req === 'SYNCHRO') return sub.includes('SYNCHRO');
                if (req === 'XYZ') return sub.includes('XYZ') || c.cardId === 'c018';
                if (req === 'PENDULUM') return sub.includes('PENDULUM') || c.cardId === 'c018';
                return false;
            };

            // Check if we can assign 4 unique cards to 4 requirements
            const solve = (cardIdx: number, usedCards: Set<string>, usedReqs: Set<string>, mats: CardType[]): boolean => {
                if (usedReqs.size === 4) return true;
                if (cardIdx >= mats.length) return false;

                for (let i = cardIdx; i < mats.length; i++) {
                    if (usedCards.has(mats[i].id)) continue;
                    for (const req of requirements) {
                        if (!usedReqs.has(req) && canSatisfy(mats[i], req)) {
                            usedCards.add(mats[i].id);
                            usedReqs.add(req);
                            if (solve(i + 1, usedCards, usedReqs, mats)) return true;
                            usedCards.delete(mats[i].id);
                            usedReqs.delete(req);
                        }
                    }
                }
                return false;
            };

            return candidateCards.length >= 4 && solve(0, new Set<string>(), new Set<string>(), candidateCards);
        }

        // 5. Pendulum
        if (card.subType?.includes('PENDULUM')) {
            const isHybrid = card.subType.includes('FUSION') || card.subType.includes('SYNCHRO') || card.subType.includes('XYZ');
            if (!isHybrid) {
                const scaleIds = [spellTrapZones[0], spellTrapZones[4]];
                if (scaleIds[0] && scaleIds[4]) {
                    const s1 = cards[scaleIds[0]].scale || 0;
                    const s2 = cards[scaleIds[4]].scale || 0;
                    const min = Math.min(s1, s2);
                    const max = Math.max(s1, s2);
                    const lv = card.level || 0;
                    return lv > min && lv < max;
                }
            }
        }

        return false;
    };

    const handleCardClick = (cardId: string) => {
        const card = cards[cardId];

        // Link Summon Logic (Gilgamesh / generic Link)
        if (card.subType?.includes('LINK')) {
            // ... (Link Logic)
            // Gilgamesh Setup
            const requiredMaterials = 2;

            // 1. Confirm & Close Modal
            onClose();
            addLog(formatLog('log_link_init', { card: getCardName(card, language) }));

            // 2. Select Materials First
            useGameStore.getState().clearSelectedCards(); // Reset
            const mats: string[] = [];
            const { startTargeting, startZoneSelection, extraMonsterZones, monsterZones, cards: storeCards, addSelectedCard, clearSelectedCards } = useGameStore.getState();

            const selectNextMaterial = () => {
                if (mats.length >= requiredMaterials) {
                    // Materials Selected -> Proceed to Zone Selection
                    selectZone(mats);
                    return;
                }



                startTargeting(
                    (tCard) => {
                        // Filter
                        if (mats.includes(tCard.id)) return false; // Already selected

                        // Strict specific logic for Gilgamesh
                        if (card.name.includes('Gilgamesh') && !tCard.name.includes('DD')) return false;

                        // Must be on field (MZ or EMZ)
                        const isOnField = monsterZones.includes(tCard.id) || extraMonsterZones.includes(tCard.id);
                        return isOnField;
                    },
                    (selectedId) => {
                        mats.push(selectedId);
                        addSelectedCard(selectedId); // Highlight Red
                        selectNextMaterial();
                    }
                );
            };

            const selectZone = (selectedMaterials: string[]) => {
                const store = useGameStore.getState();
                const { extraMonsterZones, monsterZones, cards } = store;

                // EMZ Restriction Case:
                // If Zeus Ragnarok (c028) is being summoned AND a material was in an EMZ,
                // Zeus MUST be summoned to an EMZ (Extra Deck summon rule when using EMZ column).
                // Actually simplified: If you use a material in EMZ, the Link monster MUST go to EMZ (or a linked zone).
                // User specifically requested: If Gilgamesh in EMZ is used, Zeus MUST go to EMZ.
                const materialInEMZ = selectedMaterials.some(mid => extraMonsterZones.includes(mid));
                const isZeusRagnarok = card.cardId === 'c028';
                const restrictToEMZ = isZeusRagnarok && materialInEMZ;

                store.startZoneSelection(
                    formatLog('prompt_select_zone_link'),
                    (type, index) => {
                        // Logic:
                        // 1. Any Empty EMZ is valid.
                        // 2. Any Occupied EMZ is valid IF the occupant is one of the materials (it will leave).
                        // 3. Main Monster Zone is valid IF an EMZ has a Link Monster (simplified "Linked Zone" rule).
                        // 4. Also standard: If you have NO links, you MUST use EMZ.
                        //    If you HAVE a link, you can use Linked Zone.

                        // Simplified implementation:
                        if (restrictToEMZ && type === 'MONSTER_ZONE') return false;

                        if (type === 'EXTRA_MONSTER_ZONE') {
                            const occupant = extraMonsterZones[index];
                            const otherEmzIdx = 1 - index;
                            const otherOccupant = extraMonsterZones[otherEmzIdx];

                            // Check if any material is from EMZ
                            const materialFromEMZ = selectedMaterials.some(mid => extraMonsterZones.includes(mid));

                            // If other EMZ is occupied by non-material AND no material from EMZ -> forbidden
                            if (otherOccupant !== null && !selectedMaterials.includes(otherOccupant) && !materialFromEMZ) {
                                return false;
                            }

                            if (occupant === null) return true; // Empty
                            if (selectedMaterials.includes(occupant)) return true; // Occupied by material (will free up)
                            return false; // Occupied by non-material
                        }


                        if (type === 'MONSTER_ZONE') {
                            // Link Arrow Logic
                            const store = useGameStore.getState();

                            // 1. Get Link Monsters (EMZ + MMZ)
                            const occupiedEMZ = store.extraMonsterZones.map((id, i) => ({ id, index: i, type: 'EXTRA_MONSTER_ZONE' })).filter(x => x.id);
                            const occupiedMMZ = store.monsterZones.map((id, i) => ({ id, index: i, type: 'MONSTER_ZONE' })).filter(x => x.id);

                            const links = [...occupiedEMZ, ...occupiedMMZ].filter(x => store.cards[x.id!].subType?.includes('LINK'));

                            // Check if 'index' is pointed to by any 'links'
                            const isLinked = links.some(l => {
                                const c = store.cards[l.id!];
                                const markers = c.linkMarkers || [];

                                const originType = l.type;
                                const originIdx = l.index;

                                return markers.some(m => {
                                    let target = -1;
                                    if (originType === 'EXTRA_MONSTER_ZONE') {
                                        if (originIdx === 0) { // Left EMZ
                                            if (m === 'BOTTOM_LEFT') target = 0;
                                            if (m === 'BOTTOM') target = 1;
                                            if (m === 'BOTTOM_RIGHT') target = 2;
                                        } else { // Right EMZ
                                            if (m === 'BOTTOM_LEFT') target = 2;
                                            if (m === 'BOTTOM') target = 3;
                                            if (m === 'BOTTOM_RIGHT') target = 4;
                                        }
                                    } else {
                                        // MMZ
                                        if (m === 'LEFT') target = originIdx > 0 ? originIdx - 1 : -1;
                                        if (m === 'RIGHT') target = originIdx < 4 ? originIdx + 1 : -1;
                                    }
                                    return target === index;
                                });
                            });

                            return isLinked;
                        }
                        return false;
                    },
                    (type, index) => {
                        // Validation
                        // Handled by moveCard or implicit trust in this Sim mode.

                        // Execute
                        finishLinkSummon(cardId, selectedMaterials, type, index);
                    }
                );
            };

            selectNextMaterial();


        } else if (card.cardId === 'c029') {
            // Arc Crisis Special Summon Logic
            onClose();
            startArcCrisisSummon(cardId);
        } else if (card.subType?.includes('SYNCHRO')) {
            // Synchro Summon Logic
            onClose();
            startSynchroSummon(cardId);
        } else if (card.subType?.includes('XYZ')) {
            // Xyz Summon Logic
            onClose();
            const { startXyzSummon } = useGameStore.getState();
            if (startXyzSummon) {
                startXyzSummon(cardId);
            } else {
                console.error("startXyzSummon not implemented in store yet");
            }
        } else {
            addLog(formatLog('log_extra_deck_click', { card: getCardName(cards[cardId], language) }));
        }
    };

    const finishLinkSummon = (linkCardId: string, matIds: string[], zoneType: any, zoneIndex: number) => {
        const { moveCard, addLog, cards } = useGameStore.getState();

        // Set material move flag to suppress triggers like Zero Machinex
        useGameStore.setState({ isMaterialMove: true });

        // 1. Send Materials (Sync)
        matIds.forEach(id => {
            const c = cards[id];
            // P-Rule: Field P-Monster -> Extra Deck Face-Up
            if (c.subType?.includes('PENDULUM')) {
                moveCard(id, 'EXTRA_DECK');
                addLog(formatLog('log_material_to_extra', { card: getCardName(c, useGameStore.getState().language) }));
            } else {
                moveCard(id, 'GRAVEYARD');
                addLog(formatLog('log_material_to_gy', { card: getCardName(c, useGameStore.getState().language) }));
            }
        });

        // Reset material move flag
        useGameStore.setState({ isMaterialMove: false });

        // 2. Summon Link Monster
        moveCard(linkCardId, zoneType, zoneIndex, undefined, false, true);
        const freshCards = useGameStore.getState().cards;


        useGameStore.getState().clearSelectedCards(); // Cleanup
    };

    // Arc Crisis Summon Logic
    const startArcCrisisSummon = (arcCrisisId: string) => {
        const store = useGameStore.getState();
        store.addLog(formatLog('log_arc_crisis_init'));

        // Collect candidates from field (Monsters + P-Zones) and graveyard
        const fieldMonsterIds = [...store.monsterZones, ...store.extraMonsterZones].filter((id): id is string => id !== null);
        const pZoneIds = [store.spellTrapZones[0], store.spellTrapZones[4]].filter((id): id is string => id !== null);
        const gyMonsterIds = store.graveyard.filter(id => store.cards[id]?.type === 'MONSTER');
        const allCandidates = [...fieldMonsterIds, ...pZoneIds, ...gyMonsterIds];


        const requirements = ['FUSION', 'SYNCHRO', 'XYZ', 'PENDULUM'];
        const selectedMaterials: string[] = [];
        const usedRequirements = new Set<string>();

        const canSatisfyReq = (card: CardType, req: string): boolean => {
            const sub = (card.subType || '').toUpperCase();
            if (req === 'FUSION') return sub.includes('FUSION');
            if (req === 'SYNCHRO') return sub.includes('SYNCHRO');
            if (req === 'XYZ') return sub.includes('XYZ') || card.cardId === 'c018';
            if (req === 'PENDULUM') return sub.includes('PENDULUM') || card.cardId === 'c018';
            return false;
        };

        const selectNextMaterial = () => {
            if (selectedMaterials.length >= 4) {
                // All 4 selected, proceed to zone selection
                finishArcCrisisSummon(arcCrisisId, selectedMaterials);
                return;
            }

            const currentStore = useGameStore.getState();
            const remainingReqs = requirements.filter(r => !usedRequirements.has(r));
            const reqLabels = remainingReqs.map(r => {
                if (r === 'FUSION') return formatLog('label_fusion');
                if (r === 'SYNCHRO') return formatLog('label_synchro');
                if (r === 'XYZ') return formatLog('label_xyz');
                if (r === 'PENDULUM') return formatLog('label_pendulum');
                return r;
            }).join('/');

            currentStore.addLog(formatLog('log_arc_crisis_select_material', { current: (selectedMaterials.length + 1).toString(), requirements: reqLabels }));

            // Filter valid candidates
            const validCandidates = allCandidates.filter(id => {
                if (selectedMaterials.includes(id)) return false;
                const card = currentStore.cards[id];
                return remainingReqs.some(req => canSatisfyReq(card, req));
            });

            if (validCandidates.length === 0) {
                currentStore.addLog(formatLog('log_arc_crisis_fail'));
                currentStore.clearSelectedCards();
                return;
            }

            const selectMaterialById = (selectedId: string) => {
                const selectedCard = currentStore.cards[selectedId];
                const possibleReqs = remainingReqs.filter(req => canSatisfyReq(selectedCard, req));

                if (possibleReqs.length === 1) {
                    usedRequirements.add(possibleReqs[0]);
                    selectedMaterials.push(selectedId);
                    currentStore.addSelectedCard(selectedId);
                    selectNextMaterial();
                } else {
                    currentStore.startEffectSelection(
                        formatLog('prompt_treat_as', { card: selectedCard.name }),
                        possibleReqs.map(r => ({ label: r === 'XYZ' ? formatLog('label_xyz') : formatLog('label_pendulum'), value: r })),
                        (assignedReq) => {
                            usedRequirements.add(assignedReq);
                            selectedMaterials.push(selectedId);
                            currentStore.addSelectedCard(selectedId);
                            selectNextMaterial();
                        }
                    );
                }
            };

            // Alfred-Style Consolidated Selection
            const allFieldIds = [
                ...currentStore.monsterZones,
                ...currentStore.extraMonsterZones,
                ...currentStore.spellTrapZones,
                currentStore.fieldZone
            ].filter((id): id is string => id !== null);

            currentStore.startSearch(
                (c) => validCandidates.includes(c.id),
                (sid) => selectMaterialById(sid),
                formatLog('log_arc_crisis_select_material', { current: (selectedMaterials.length + 1).toString(), requirements: (selectedMaterials.length + 1).toString() }), // Re-using existing if feasible or generalize
                [...allFieldIds, ...currentStore.graveyard]
            );
        };

        selectNextMaterial();
    };

    const finishArcCrisisSummon = (arcCrisisId: string, materialIds: string[]) => {
        const store = useGameStore.getState();

        // Check for Alfred (c027) in the materials for its banish trigger
        const hasAlfred = materialIds.some(id => store.cards[id].cardId === 'c027');
        const alfredId = materialIds.find(id => store.cards[id].cardId === 'c027');

        // Zone selection for Arc Crisis
        const emptyMZ = store.monsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
        const emptyEMZ = store.extraMonsterZones.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

        if (emptyMZ.length === 0 && emptyEMZ.length === 0) {
            store.addLog(formatLog('log_arc_crisis_no_zone'));
            store.clearSelectedCards();
            return;
        }

        store.startZoneSelection(
            formatLog('prompt_select_zone'),
            (type, index) => {
                if (type === 'EXTRA_MONSTER_ZONE') {
                    const occupant = store.extraMonsterZones[index];
                    const otherEMZIdx = 1 - index;
                    const otherOccupant = store.extraMonsterZones[otherEMZIdx];

                    // 1. Must be empty or material (will leave)
                    const isSelfAvailable = occupant === null || materialIds.includes(occupant);
                    if (!isSelfAvailable) return false;

                    // 2. Extra Deck Summon Restriction (Simplified):
                    // If you have another EMZ occupied by a monitor that IS NOT a material,
                    // you can only use THIS EMZ if you are freeing up an EMZ with your materials.
                    const otherOccupantPermanent = otherOccupant !== null && !materialIds.includes(otherOccupant);
                    const usingMaterialFromEMZ = materialIds.some(id => store.extraMonsterZones.includes(id));

                    if (otherOccupantPermanent && !usingMaterialFromEMZ) {
                        return false;
                    }

                    return true;
                }
                if (type === 'MONSTER_ZONE') {
                    // Check if any Link points to this zone
                    const links = [...store.extraMonsterZones, ...store.monsterZones]
                        .filter((id): id is string => id !== null && !!store.cards[id].subType?.includes('LINK'));


                    // Simplified: Allow if empty and linked
                    const isLinked = links.some(linkId => {
                        const linkCard = store.cards[linkId];
                        const markers = linkCard.linkMarkers || [];
                        const linkIdx = store.extraMonsterZones.includes(linkId)
                            ? store.extraMonsterZones.indexOf(linkId)
                            : -1;

                        if (linkIdx !== -1) {
                            // EMZ link
                            if (linkIdx === 0) {
                                if (markers.includes('BOTTOM_LEFT') && index === 0) return true;
                                if (markers.includes('BOTTOM') && index === 1) return true;
                                if (markers.includes('BOTTOM_RIGHT') && index === 2) return true;
                            } else {
                                if (markers.includes('BOTTOM_LEFT') && index === 2) return true;
                                if (markers.includes('BOTTOM') && index === 3) return true;
                                if (markers.includes('BOTTOM_RIGHT') && index === 4) return true;
                            }
                        }
                        return false;
                    });

                    return (store.monsterZones[index] === null || materialIds.includes(store.monsterZones[index]!)) && (isLinked || emptyEMZ.length > 0);
                }
                return false;
            },
            (type, index) => {
                const finalStore = useGameStore.getState();

                // Set material move flag
                useGameStore.setState({ isMaterialMove: true });

                // Banish all materials
                materialIds.forEach(id => {
                    finalStore.moveCard(id, 'BANISHED');
                    finalStore.addLog(formatLog('log_banished', { card: getCardName(finalStore.cards[id], finalStore.language) }));
                });

                // Reset material move flag
                useGameStore.setState({ isMaterialMove: false });

                // Summon Arc Crisis
                finalStore.moveCard(arcCrisisId, type, index, undefined, false, true);


                finalStore.clearSelectedCards();

                // Trigger Alfred's effect if banished
                if (hasAlfred && alfredId) {
                    setTimeout(() => {
                        const s = useGameStore.getState();
                        if (s.banished.includes(alfredId)) {
                            // Trigger Alfred's banish effect
                            const EFFECT_LOGIC = (s as any).EFFECT_LOGIC || {};
                            if (typeof EFFECT_LOGIC['c027_banished'] === 'function') {
                                EFFECT_LOGIC['c027_banished'](s, alfredId);
                            } else {
                                // Inline implementation
                                triggerAlfredBanishEffect(alfredId);
                            }
                        }
                    }, 300);
                }
            }
        );
    };

    const triggerAlfredBanishEffect = (alfredId: string) => {
        const store = useGameStore.getState();
        // Alfred (c027): If banished: Target "Dark Contract" Continuous S/T in GY/Banished up to # of "DDD" monsters you control; Place them face-up on field.

        const dddCount = [...store.monsterZones, ...store.extraMonsterZones]
            .filter((id): id is string => id !== null && store.cards[id].name.includes('DDD')).length;

        if (dddCount === 0) {
            store.addLog(formatLog('log_alfred_no_ddd'));
            return;
        }

        // Find Dark Contract Continuous S/T in GY or Banished
        const contractCandidates = [...store.graveyard, ...store.banished].filter(id => {
            const card = store.cards[id];
            return (card.name.includes('Dark Contract') || card.name.includes('契約書')) &&
                (card.subType?.includes('CONTINUOUS') || card.type === 'TRAP');
        });

        if (contractCandidates.length === 0) {
            store.addLog(formatLog('log_alfred_no_contract'));
            return;
        }

        store.startEffectSelection(
            formatLog('prompt_activate_effect', { name: 'Alfred' }),
            [{ label: formatLog('ui_yes'), value: 'yes' }, { label: formatLog('ui_no'), value: 'no' }],
            (choice) => {
                if (choice === 'yes') {
                    const placedCount = { count: 0 };
                    const placeNextContract = () => {
                        if (placedCount.count >= dddCount) {
                            useGameStore.getState().addLog(formatLog('log_alfred_placed_count', { count: placedCount.count.toString() }));
                            return;
                        }

                        const s = useGameStore.getState();
                        const remaining = [...s.graveyard, ...s.banished].filter(id => {
                            const card = s.cards[id];
                            return (card.name.includes('Dark Contract') || card.name.includes('契約書')) &&
                                (card.subType?.includes('CONTINUOUS') || card.type === 'TRAP');
                        });

                        if (remaining.length === 0) {
                            s.addLog(formatLog('log_alfred_placed_card', { count: placedCount.count.toString() }));
                            return;
                        }

                        s.startEffectSelection(
                            formatLog('prompt_select_card'),
                            [
                                ...remaining.map(id => ({ label: s.cards[id].name, value: id, imageUrl: s.cards[id].imageUrl })),
                                { label: formatLog('ui_done'), value: 'done' }
                            ],
                            (selected) => {
                                if (selected === 'done') {
                                    useGameStore.getState().addLog(formatLog('log_alfred_placed_count', { count: placedCount.count.toString() }));
                                    return;
                                }

                                // Find empty S/T zone
                                const s2 = useGameStore.getState();
                                const emptySTIdx = s2.spellTrapZones.findIndex((v, i) => v === null && i !== 0 && i !== 4);

                                if (emptySTIdx !== -1) {
                                    s2.moveCard(selected, 'SPELL_TRAP_ZONE', emptySTIdx);
                                    s2.addLog(formatLog('log_alfred_placed_card', { card: getCardName(s2.cards[selected], s2.language) }));
                                    placedCount.count++;
                                    placeNextContract();
                                } else {
                                    s2.addLog(formatLog('log_alfred_no_zone'));
                                }
                            }
                        );
                    };
                    placeNextContract();
                }
            }
        );
    };

    // Get copy count for a cardId
    const getCopyCount = (cardId: string) => {
        return extraDeck.filter(id => cards[id]?.cardId === cardId).length;
    };


    const handleAddCopy = (cardId: string) => {
        useGameStore.getState().addExtraDeckCopy(cardId);
    };

    const handleRemoveCopy = (cardId: string) => {
        useGameStore.getState().removeExtraDeckCopy(cardId);
    };

    // Check if cardId is in initial Extra Deck
    const isInitialCard = (cardId: string) => {
        return useGameStore.getState().initialExtraDeckCardIds.includes(cardId);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: '#222',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '900px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
                border: '1px solid #444',
                boxShadow: '0 0 20px rgba(0,0,0,0.8)'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, color: '#ddd' }}>{formatLog('ui_extra_deck')}</h3>

                {/* Copy Management Bar - Only for initial cards */}
                {selectedCardId && isInitialCard(selectedCardId) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '15px',
                        padding: '10px',
                        background: '#333',
                        borderRadius: '6px'
                    }}>
                        <span style={{ color: '#fff' }}>
                            {getCardName(cards[extraDeck.find(id => cards[id].cardId === selectedCardId) || ''], language)}: {getCopyCount(selectedCardId)} {formatLog('ui_copies')}
                        </span>
                        <button
                            onClick={() => handleRemoveCopy(selectedCardId)}
                            disabled={getCopyCount(selectedCardId) <= 1}
                            style={{
                                padding: '4px 12px',
                                background: getCopyCount(selectedCardId) <= 1 ? '#555' : '#d44',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: getCopyCount(selectedCardId) <= 1 ? 'not-allowed' : 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            −
                        </button>
                        <button
                            onClick={() => handleAddCopy(selectedCardId)}
                            disabled={getCopyCount(selectedCardId) >= 3}
                            style={{

                                padding: '4px 12px',
                                background: getCopyCount(selectedCardId) >= 3 ? '#555' : '#4a4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: getCopyCount(selectedCardId) >= 3 ? 'not-allowed' : 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            +
                        </button>
                        <button
                            onClick={() => setSelectedCardId(null)}
                            style={{
                                padding: '4px 8px',
                                background: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginLeft: 'auto'
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '15px',
                    justifyContent: 'center',
                    paddingBottom: '40px'
                }}>
                    {extraDeck.map((instanceId) => {
                        const card = cards[instanceId];
                        if (!card) return null;
                        const cardId = card.cardId;

                        const glow = isSummonable(instanceId);
                        const isSelected = selectedCardId === cardId; // Keep selection logic? Or remove?
                        // User wants to see ALL cards.
                        // And buttons to add/remove copies.

                        const copies = getCopyCount(cardId);
                        const isInitial = isInitialCard(cardId);

                        return (
                            <div
                                key={instanceId}
                                onClick={(e) => {
                                    // If clicking the card itself (not buttons), trigger summon or select
                                    if (glow) {
                                        handleCardClick(instanceId);
                                    } else {
                                        // Just select it maybe? or nothing.
                                        // keeping selection for potential future use or consistency
                                        setSelectedCardId(cardId);
                                    }
                                }}
                                style={{
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transform: glow ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'transform 0.2s',
                                    border: isSelected ? '3px solid #00bfff' : glow ? '3px solid #00ff00' : 'none',
                                    borderRadius: '6px',
                                    opacity: glow ? 1 : 0.7
                                }}
                            >
                                <Card card={cards[instanceId]} />


                            </div>
                        );
                    })}
                    {extraDeck.length === 0 && <span style={{ color: '#666' }}>{formatLog('ui_extra_deck_empty')}</span>}
                </div>
                <button onClick={onClose} style={{
                    marginTop: '20px',
                    padding: '8px 16px',
                    background: '#444',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                }}>
                    {formatLog('ui_close')}
                </button>
            </div>
        </div>
    );
}
