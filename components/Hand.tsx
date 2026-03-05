import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from './Card';
import { useGameStore } from '@/store/gameStore';
import { formatLog } from '@/data/locales';

export function Hand() {
    const { hand, cards } = useGameStore();

    const { setNodeRef } = useDroppable({
        id: 'hand-zone',
        data: { type: 'HAND' },
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '160px',
                width: '100%',
                maxWidth: '1000px', // Align with board width approx
                padding: '10px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '20px',
                position: 'relative'
            }}
        >
            <button
                onClick={() => useGameStore.getState().drawCard()}
                disabled={useGameStore.getState().deck.length === 0 || useGameStore.getState().targetingState.isOpen || useGameStore.getState().zoneSelectionState.isOpen}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    padding: '4px 12px',
                    background: '#ed6c02',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    opacity: (useGameStore.getState().deck.length === 0) ? 0.5 : 1,
                    zIndex: 10
                }}
            >
                {formatLog('ui_draw')}
            </button>
            {hand.length === 0 && <span style={{ color: '#555', fontSize: '12px' }}>{formatLog('ui_hand_empty')}</span>}
            {hand.map((cardId) => {
                const card = cards[cardId];
                if (!card) return null;
                return <Card key={cardId} card={card} />;
            })}
        </div>
    );
}
