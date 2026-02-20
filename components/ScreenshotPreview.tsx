import React, { forwardRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from './Card';
import { formatLog } from '@/data/locales';

export const ScreenshotPreview = forwardRef<HTMLDivElement>((props, ref) => {
    const store = useGameStore();
    const {
        monsterZones,
        spellTrapZones,
        fieldZone,
        extraMonsterZones,
        hand,
        graveyard,
        banished,
        extraDeck,
        cards,
        backgroundColor,
        fieldColor,
        useGradient
    } = store;

    // Filter Extra Deck: Only show cards that are FACE UP (added to EX Deck later)
    // Initial Hidden cards are face-down (undefined or false).
    const filteredExtraDeck = extraDeck.filter(id => cards[id]?.faceUp);

    // Helper to render a card by ID
    const renderCard = (id: string | null) => {
        if (!id) return <div style={{ width: '100%', height: '100%', border: '1px dashed #444', opacity: 0.3 }}></div>;
        const card = cards[id];
        if (!card) return null;

        // Manually render card for screenshot stability (avoid heavy Card component logic/lazy loading)
        return (
            <div style={{
                width: '80px',
                height: '116px',
                backgroundColor: '#000', // Fallback
                border: '1px solid #444',
                borderRadius: '2px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
            }}>
                {card.imageUrl ? (
                    <img
                        src={`/api/proxy-image?url=${encodeURIComponent(card.imageUrl)}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="card"
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div style={{ fontSize: '9px', textAlign: 'center', padding: '2px', color: '#fff' }}>
                        {card.name}
                    </div>
                )}
            </div>
        );
    };

    const renderZone = (id: string | null, label?: string) => (
        <div style={{
            width: '80px', height: '116px',
            position: 'relative',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'rgba(0,0,0,0.2)', border: '1px solid #333', borderRadius: '4px'
        }}>
            {renderCard(id)}
            {label && <div style={{ position: 'absolute', bottom: '-20px', left: 0, width: '100%', textAlign: 'center', fontSize: '10px', color: '#888' }}>{label}</div>}
        </div>
    );

    const renderList = (title: string, ids: string[]) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', minWidth: '300px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid #555', paddingBottom: '5px' }}>{title} ({ids.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {ids.map(id => (
                    <div key={id} style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '64px', height: '93px' }}>
                        {renderCard(id)}
                    </div>
                ))}
                {ids.length === 0 && <span style={{ fontSize: '12px', color: '#666' }}>None</span>}
            </div>
        </div>
    );

    return (
        <div ref={ref} style={{
            width: '1280px',
            background: useGradient
                ? `radial-gradient(circle at center, ${backgroundColor || '#201025'}, #000)`
                : (backgroundColor || '#000000'),
            color: '#fff',
            padding: '40px',
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', borderBottom: '2px solid #444', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0 }}>Yu-Gi-Oh! Simulator Board Snapshot</h1>
                <span style={{ color: '#aaa' }}>{new Date().toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', gap: '40px' }}>
                {/* Left Column: Field & Hand */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '40px' }}>

                    {/* Field Container */}
                    <div style={{
                        position: 'relative',
                        height: '400px',
                        background: fieldColor || '#222',
                        borderRadius: '10px',
                        border: '2px solid #444',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {/* Grid Layout for Field */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 100px)', gap: '20px', padding: '20px' }}>
                            {/* Monster Zones */}
                            {monsterZones.map((id, i) => (
                                <div key={`mz-${i}`} style={{ gridColumn: i + 1, gridRow: 2 }}>{renderZone(id, `M${i + 1}`)}</div>
                            ))}
                            {/* Spell/Trap Zones */}
                            {spellTrapZones.map((id, i) => (
                                <div key={`stz-${i}`} style={{ gridColumn: i + 1, gridRow: 3 }}>{renderZone(id, `S/T${i + 1}`)}</div>
                            ))}
                            {/* EMZs (Roughly placed) */}
                            <div style={{ gridColumn: 2, gridRow: 1 }}>{renderZone(extraMonsterZones[0], 'EMZ1')}</div>
                            <div style={{ gridColumn: 4, gridRow: 1 }}>{renderZone(extraMonsterZones[1], 'EMZ2')}</div>

                            {/* Field Zone */}
                            <div style={{ gridColumn: 1, gridRow: 2, position: 'absolute', left: '20px', top: '50px' }}>{renderZone(fieldZone, 'Field')}</div>
                        </div>
                    </div>

                    {/* Hand Container */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '20px',
                        borderRadius: '10px',
                        minHeight: '150px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px',
                        justifyContent: 'center'
                    }}>
                        {hand.map(id => (
                            <div key={id}>{renderCard(id)}</div>
                        ))}
                        {hand.length === 0 && <span style={{ color: '#666', alignSelf: 'center' }}>Hand Empty</span>}
                    </div>

                </div>

                {/* Right Column: Lists - Reordered: GY -> Banished -> EX */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {renderList("Graveyard", graveyard)}
                    {renderList("Banished", banished)}
                    {renderList("Extra Deck (Face-up)", filteredExtraDeck)}
                </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '12px', color: '#666' }}>
                Generated by DD Solver
            </div>
        </div>
    );
});

ScreenshotPreview.displayName = 'ScreenshotPreview';
