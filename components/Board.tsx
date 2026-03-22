import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zone } from './Zone';
import { useGameStore } from '@/store/gameStore';
import { Card } from './Card';
import { ExtraDeckModal } from './ExtraDeckModal';
import { PendulumSummonModal } from './PendulumSummonModal';
import { formatLog } from '@/data/locales';

export function Board() {
    const router = useRouter();
    const { undo, resetGame, monsterZones, spellTrapZones, fieldZone, extraMonsterZones, graveyard, banished, extraDeck, cards, startSearch, targetingState, zoneSelectionState, startPendulumSummon, pendulumSummonCount, pendulumSummonLimit, activeEffectCardId, spellTrapZones: stZones, isReplaying, summonCount, activateNibiru, resetSummonCount, nibiruSimulationEnabled, nibiruUsed, cardPropertyModifiers } = useGameStore();
    const isTargeting = targetingState.isOpen;
    const isSelectingZone = zoneSelectionState.isOpen;
    const [showExtra, setShowExtra] = useState(false);


    // Check P-Summon availability for button visibility
    // Condition: 2 Scales present, Count < Limit.
    // Scales are at 0 and 4.
    const p1Id = stZones[0];
    const p2Id = stZones[4];
    const p1 = p1Id ? cards[p1Id] : null;
    const p2 = p2Id ? cards[p2Id] : null;

    const getScale = (id: string | null) => {
        if (!id) return 0;
        const mod = cardPropertyModifiers[id]?.scale;
        return mod !== undefined ? mod : (cards[id].scale || 0);
    };

    const s1 = getScale(p1Id);
    const s2 = getScale(p2Id);
    const scaleDiff = (p1Id && p2Id) ? Math.abs(s1 - s2) : 0;
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
                    {formatLog('ui_undo')}
                </button>

                <button
                    onClick={() => {
                        resetGame();
                        router.replace('/');
                    }}
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
                    {formatLog('ui_reset_game')}
                </button>
            </div>

            {/* Field Zone (Col 1) */}
            <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3' }}>
                <Zone id="field-zone" type="FIELD_ZONE" label={formatLog('ui_field')}>
                    {renderCard(fieldZone)}
                </Zone>
            </div>

            {/* Extra Monster Zones (Col 3 and 5) */}
            <div style={{ gridColumn: '3 / 4', gridRow: '1 / 2' }}>
                <Zone id="emz-1" type="EXTRA_MONSTER_ZONE" index={0} label={`${formatLog('ui_emz')} 1`}>
                    {renderCard(extraMonsterZones[0])}
                </Zone>
            </div>
            <div style={{ gridColumn: '5 / 6', gridRow: '1 / 2' }}>
                <Zone id="emz-2" type="EXTRA_MONSTER_ZONE" index={1} label={`${formatLog('ui_emz')} 2`}>
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
                        {formatLog('ui_pendulum_summon')}
                    </button>
                </div>
            )}

            {/* Nibiru Activation Button (Col 7, Row 1 - Above Banished) */}
            {nibiruSimulationEnabled && !nibiruUsed && (
                <div style={{
                    gridColumn: '7 / 8',
                    gridRow: '1 / 2',
                    display: 'flex',
                    alignItems: 'center', // Centered vertically instead of flex-end
                    justifyContent: 'center',
                    padding: '4px' // Reduced padding to expand width to 90px bounds
                }}>
                    <button
                        onClick={(e) => {
                            if (summonCount < 5) return;
                            e.stopPropagation();
                            activateNibiru();
                        }}
                        disabled={summonCount < 5}
                        style={{
                            width: '80px', // Fixed width for circle
                            height: '80px', // Fixed height for circle (same as width)
                            background: summonCount >= 5 ? 'linear-gradient(45deg, #f57c00, #d84315)' : '#333',
                            color: 'white',
                            border: summonCount >= 5 ? '2px solid #ff9800' : '2px solid #000',
                            borderRadius: '50%', // Make it perfectly round
                            fontSize: '12px',
                            cursor: summonCount >= 5 ? 'pointer' : 'not-allowed',
                            boxShadow: summonCount >= 5 ? '0 0 15px rgba(245, 124, 0, 0.6)' : '0 2px 5px rgba(0,0,0,0.5)',
                            fontWeight: 'bold',
                            animation: summonCount >= 5 ? 'pulseGlow 2s infinite' : 'none',
                            opacity: summonCount >= 5 ? 1 : 0.6,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            zIndex: 100
                        }}
                    >
                        <span style={{ fontSize: '13px', lineHeight: '1.2', textAlign: 'center' }}>
                            ニビル<br />
                            発動
                        </span>
                        <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '10px' }}>{summonCount} / 5</span>
                    </button>
                    <style jsx>{`
                        @keyframes pulseGlow {
                            0% { box-shadow: 0 0 5px rgba(245, 124, 0, 0.5); transform: scale(1); }
                            50% { box-shadow: 0 0 20px rgba(245, 124, 0, 0.8); transform: scale(1.05); }
                            100% { box-shadow: 0 0 5px rgba(245, 124, 0, 0.5); transform: scale(1); }
                        }
                    `}</style>
                </div>
            )}

            {/* Banished (Col 7, Row 2 - shifted down) */}
            <div style={{
                gridColumn: '7 / 8',
                gridRow: '2 / 3',
                cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer',
                boxShadow: (isReplaying && activeEffectCardId && banished.includes(activeEffectCardId)) ? '0 0 15px 5px rgba(0, 255, 255, 0.8)' : 'none',
                borderRadius: '8px',
                transition: 'box-shadow 0.3s ease'
            }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    startSearch(() => true, (cid) => {
                        const store = useGameStore.getState();
                        store.activateEffect(cid);
                    }, formatLog('ui_banished_zone'), banished);
                }}
            >
                <Zone id="banished-zone" type="BANISHED" label={formatLog('ui_banished')} bgLabel="除外">
                    {banished.length > 0 && renderCard(banished[banished.length - 1], false)}
                    {banished.length > 0 && <div style={{ position: 'absolute', top: -5, right: -5, background: 'blue', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', zIndex: 10 }}>{banished.length}</div>}
                </Zone>
            </div>

            {/* Graveyard (Col 7, Row 3 - shifted down) */}
            <div style={{
                gridColumn: '7 / 8',
                gridRow: '3 / 4',
                cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer',
                boxShadow: (isReplaying && activeEffectCardId && graveyard.includes(activeEffectCardId)) ? '0 0 15px 5px rgba(255, 0, 0, 0.8)' : 'none',
                borderRadius: '8px',
                transition: 'box-shadow 0.3s ease'
            }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    startSearch(() => true, (cid) => {
                        const store = useGameStore.getState();
                        store.activateEffect(cid);
                    }, formatLog('ui_graveyard_zone'), graveyard);
                }}
            >
                <Zone id="graveyard-zone" type="GRAVEYARD" label={formatLog('ui_graveyard')} bgLabel="墓地">
                    {graveyard.length > 0 && renderCard(graveyard[graveyard.length - 1], false)}
                    {graveyard.length > 0 && <div style={{ position: 'absolute', top: -5, right: -5, background: 'red', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white', zIndex: 10 }}>{graveyard.length}</div>}
                </Zone>
            </div>

            {/* --- Row 2: Monsters (Cols 2-6) --- */}
            {monsterZones.map((cardId, i) => (
                <div key={`mz-${i}`} style={{ gridColumn: `${2 + i} / ${3 + i}`, gridRow: '2 / 3' }}>
                    <Zone id={`mz-${i}`} type="MONSTER_ZONE" index={i} label={formatLog('ui_monster_zone_n', { index: (i + 1).toString() })}>
                        {renderCard(cardId)}
                    </Zone>
                </div>
            ))}

            {/* --- Row 3: Extra Deck & S/T (Cols 2-6) --- */}

            {/* Extra Deck (Col 1, Row 3) */}
            <div style={{
                gridColumn: '1 / 2',
                gridRow: '3 / 4',
                cursor: (isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer',
                boxShadow: 'none',
                borderRadius: '8px',
                transition: 'box-shadow 0.3s ease'
            }}
                onClick={() => {
                    if (isTargeting || isSelectingZone) return;
                    setShowExtra(true);
                }}
            >
                <Zone id="extra-deck-zone" type="EXTRA_DECK" label={formatLog('ui_extra_deck')}>
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
