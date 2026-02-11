import React, { useState, useEffect } from 'react';
import { Zone } from './Zone';
import { useGameStore } from '@/store/gameStore';
import { Card } from './Card';
import { ExtraDeckModal } from './ExtraDeckModal';
import { PendulumSummonModal } from './PendulumSummonModal';

export function Board() {
    const { undo, resetGame, monsterZones, spellTrapZones, fieldZone, extraMonsterZones, graveyard, banished, extraDeck, cards, startSearch, targetingState, zoneSelectionState, startPendulumSummon, pendulumSummonCount, pendulumSummonLimit, spellTrapZones: stZones } = useGameStore();
    const isTargeting = targetingState.isOpen;
    const isSelectingZone = zoneSelectionState.isOpen;
    const [showExtra, setShowExtra] = useState(false);


    // Check P-Summon availability for button visibility
    // Condition: 2 Scales present, Count < Limit.
    // Scales are at 0 and 4.
    const p1 = stZones[0] ? cards[stZones[0]] : null;
    const p2 = stZones[4] ? cards[stZones[4]] : null;
    const scaleDiff = (p1 && p2) ? Math.abs((p1.scale ?? 0) - (p2.scale ?? 0)) : 0;
    const canPSummon = pendulumSummonCount < pendulumSummonLimit && p1 && p2 && p1.subType?.includes('PENDULUM') && p2.subType?.includes('PENDULUM') && scaleDiff > 1;

    const renderCard = (cardId: string | null, isInteractive = true) => {
        if (!cardId) return null;
        const card = cards[cardId];
        return card ? <Card card={card} isInteractive={isInteractive} /> : null;
    };

    const getDeckCount = (list: string[], label: string) => {
        return list.length > 0 ? (
            <div style={{
                width: '100%', height: '100%',
                background: 'repeating-linear-gradient(45deg, #2c1a0e, #2c1a0e 10px, #1a0f08 10px, #1a0f08 20px)',
                borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #5d4037',
                flexDirection: 'column'
            }}>
                {/* Cover Image Placeholder */}
                <span style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>{label}</span>
                <span style={{ background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', color: 'white' }}>{list.length}</span>
            </div>
        ) : null;
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 90px)', // 7 columns for spacing resemblance
            gridTemplateRows: '130px 130px 130px', // 3 rows: Utility/EX, Monster, S/T
            gap: '10px',
            padding: '20px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            // Center the grid content
            justifyContent: 'center'
        }}>
            {/* --- Row 1: Field, EX Zones, GY, Banished --- */}

            {/* Reset Button (Col 1, Row 1 - Above Field) */}
            {/* Reset Button (Col 1, Row 1 - Above Field) */}
            <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', paddingBottom: '10px', gap: '5px' }}>


                <button
                    onClick={undo}
                    style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#616161',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        width: '100%'
                    }}
                >
                    Undo
                </button>

                <button
                    onClick={resetGame}
                    style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#d32f2f',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        width: '100%'
                    }}
                >
                    Reset Game
                </button>
            </div>

            {/* Field Zone (Col 1) */}
            <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3' }}>
                <Zone id="field-zone" type="FIELD_ZONE" label="Field">
                    {renderCard(fieldZone)}
                </Zone>
            </div>

            {/* Extra Monster Zones (Col 3 and 5) */}
            <div style={{ gridColumn: '3 / 4', gridRow: '1 / 2' }}>
                <Zone id="emz-1" type="EXTRA_MONSTER_ZONE" index={0} label="EMZ 1">
                    {renderCard(extraMonsterZones[0])}
                </Zone>
            </div>
            <div style={{ gridColumn: '5 / 6', gridRow: '1 / 2' }}>
                <Zone id="emz-2" type="EXTRA_MONSTER_ZONE" index={1} label="EMZ 2">
                    {renderCard(extraMonsterZones[1])}
                </Zone>
            </div>

            {/* Pendulum Summon Button (Col 4, Row 1 - Between EMZs) */}
            {canPSummon && (
                <div style={{ gridColumn: '4 / 5', gridRow: '1 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                        onClick={startPendulumSummon}
                        style={{
                            padding: '8px 15px',
                            fontSize: '13px',
                            fontWeight: '900',
                            border: 'none',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            transform: 'scale(0.65)',
                            background: 'linear-gradient(135deg, #00c6ff, #0072ff)',
                            color: 'white',
                            boxShadow: '0 0 10px rgba(0, 114, 255, 0.6)',
                            textShadow: '0 1px 2px black'
                        }}
                    >
                        PENDULUM SUMMON
                    </button>
                </div>
            )}

            {/* Banished (Col 7, Row 2 - shifted down) */}
            <div style={{ gridColumn: '7 / 8', gridRow: '2 / 3', cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    startSearch(() => true, (cid) => {
                        const store = useGameStore.getState();
                        store.activateEffect(cid);
                    }, 'Banished Cards', banished);
                }}
            >
                <Zone id="banished-zone" type="BANISHED" label="Banished">
                    {banished.length > 0 && renderCard(banished[banished.length - 1], false)}
                    {banished.length > 0 && <div style={{ position: 'absolute', top: -5, right: -5, background: 'blue', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>{banished.length}</div>}
                </Zone>
            </div>

            {/* Graveyard (Col 7, Row 3 - shifted down) */}
            <div style={{ gridColumn: '7 / 8', gridRow: '3 / 4', cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    startSearch(() => true, (cid) => {
                        const store = useGameStore.getState();
                        store.activateEffect(cid);
                    }, 'Graveyard Content', graveyard);
                }}
            >
                <Zone id="graveyard-zone" type="GRAVEYARD" label="Graveyard">
                    {graveyard.length > 0 && renderCard(graveyard[graveyard.length - 1], false)}
                    {graveyard.length > 0 && <div style={{ position: 'absolute', top: -5, right: -5, background: 'red', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>{graveyard.length}</div>}
                </Zone>
            </div>

            {/* --- Row 2: Monsters (Cols 2-6) --- */}
            {monsterZones.map((cardId, i) => (
                <div key={`mz-${i}`} style={{ gridColumn: `${2 + i} / ${3 + i}`, gridRow: '2 / 3' }}>
                    <Zone id={`mz-${i}`} type="MONSTER_ZONE" index={i} label={`Monster ${i + 1}`}>
                        {renderCard(cardId)}
                    </Zone>
                </div>
            ))}

            {/* --- Row 3: Extra Deck & S/T (Cols 2-6) --- */}

            {/* Extra Deck (Col 1, Row 3) */}
            <div style={{ gridColumn: '1 / 2', gridRow: '3 / 4', cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    setShowExtra(true);
                }}
            >
                <Zone id="extra-deck-zone" type="EXTRA_DECK" label="Extra Deck">
                    {getDeckCount(extraDeck, 'EX')}
                </Zone>
            </div>

            {/* S/T Zones */}
            {spellTrapZones.map((cardId, i) => (
                <div key={`stz-${i}`} style={{ gridColumn: `${2 + i} / ${3 + i}`, gridRow: '3 / 4' }}>
                    <Zone id={`stz-${i}`} type="SPELL_TRAP_ZONE" index={i} label={`S/T ${i + 1}`}>
                        {renderCard(cardId)}
                    </Zone>
                </div>
            ))}

            <ExtraDeckModal isOpen={showExtra} onClose={() => setShowExtra(false)} />
            <PendulumSummonModal />

        </div>
    );
}
