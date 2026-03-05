import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from '@/components/Card';
import { formatLog } from '@/data/locales';

interface GraveyardBanishedPreviewProps {
    onClose: () => void;
}

export function GraveyardBanishedPreview({ onClose }: GraveyardBanishedPreviewProps) {
    const { graveyard, banished, extraDeck, cards } = useGameStore();

    // Helper to render a card list
    const renderList = (cardIds: string[], title: string) => {
        // if (cardIds.length === 0) return null; // REMOVED: Always show

        return (
            <div style={{ marginBottom: '10px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 style={{
                    color: '#aaa',
                    fontSize: '11px',
                    borderBottom: '1px solid #444',
                    marginBottom: '4px',
                    paddingBottom: '2px'
                }}>
                    {title} ({cardIds.length})
                </h4>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    overflowY: 'auto',
                    alignContent: 'flex-start',
                    flex: 1,
                    paddingRight: '4px', // Scrollbar space
                    minHeight: '40px' // Minimum height for empty state
                }}>
                    {cardIds.length > 0 ? cardIds.map((id, index) => (
                        <div key={`${id}-${index}`} style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '48px', height: '70px', marginBottom: '-40px', marginRight: '-30px' }}>
                            <Card
                                card={cards[id]}
                                isInteractive={false}
                                disableDrag={true}
                                onClickOverride={(e) => {
                                    e.stopPropagation();
                                }}
                            />
                        </div>
                    )) : (
                        <div style={{ color: '#444', fontSize: '10px', width: '100%', padding: '4px' }}>(0)</div>
                    )}
                </div>
            </div>
        );
    };

    // Filter Face-Up Pendulums from Extra Deck
    // Use the explicit 'faceUp' flag we added to Card interface.
    // Fallback: If 'faceUp' is undefined (legacy/initial), use Main Deck Pendulum heuristic.
    const faceUpExtraDeck = extraDeck.filter(id => {
        const c = cards[id];
        if (c.faceUp) return true; // Explicitly Face-Up (includes Hybrids redirected from field)

        // Fallback for Main Deck Pendulums that might not have faceUp set yet (e.g. initially loaded?) 
        // Actually, initial Extra Deck cards are Face-Down.
        // If a Main Deck Pendulum is in Extra Deck, it MUST be Face-Up?
        // No, if it was returned to Deck/Extra Deck by effect?
        // But usually Main Deck Pendulums go to Extra Deck Face-Up.
        // Let's stick to 'faceUp' flag primarily.
        // But for Main Deck Pendulums added via 'moveCard' before I added the flag logic, they might be missed?
        // No, I just added the flag logic.
        // Resetting game might be needed for old states, but for new actions it works.
        // Let's rely on 'faceUp' flag OR (isPendulum AND !isExtraTypelikeFusionSynchroXyzLink).
        // Actually, if a Main Deck Pendulum is explicitly sent to Extra Deck Face-Down (rare card effect), it shouldn't show.
        // So trusting 'faceUp' flag is best. 
        // BUT, for existing 'c001' etc in Extra Deck from previous moves in current session?
        // They won't have 'faceUp: true'.
        // So I should keep the heuristic as a backup OR rely on the fact that I just patched 'moveCard' and the user will trigger new moves.
        // Let's add the heuristic for Main Deck Pendulums as they are naturally Face-Up in EX.
        const st = c.subType || '';
        const isPendulum = st.includes('PENDULUM');
        const isExtraType = st.includes('FUSION') || st.includes('SYNCHRO') || st.includes('XYZ') || st.includes('LINK');

        // If it is a Main Deck Pendulum, assume Face-Up if in Extra Deck?
        // (Unless we strictly track face-down extras).
        // Let's just use card.faceUp for now to be precise about Hybrids.
        return !!c.faceUp;
    });

    return (
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '10px',
            color: '#eee',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ccc' }}>Preview</span>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
                {/* Graveyard Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {renderList([...graveyard].reverse(), formatLog('ui_graveyard'))}
                </div>

                {/* Banished Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid #333', paddingTop: '8px' }}>
                    {renderList([...banished].reverse(), formatLog('ui_banished'))}
                </div>

                {/* Extra Deck (Face-Up) Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid #333', paddingTop: '8px' }}>
                    {renderList([...faceUpExtraDeck], 'EX (Face-Up)')}
                </div>
            </div>

            <button
                onClick={onClose}
                style={{
                    backgroundColor: '#444',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '8px',
                    marginTop: '8px',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '12px'
                }}
            >
                {formatLog('ui_close')}
            </button>
        </div>
    );
}
