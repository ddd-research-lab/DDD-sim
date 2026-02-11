import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from './Card';
import { useGameStore } from '@/store/gameStore';

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
                minHeight: '140px',
                width: '100%',
                maxWidth: '1000px', // Align with board width approx
                padding: '10px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '20px'
            }}
        >
            {hand.length === 0 && <span style={{ color: '#555', fontSize: '12px' }}>Hand Empty</span>}
            {hand.map((cardId) => {
                const card = cards[cardId];
                if (!card) return null;
                return <Card key={cardId} card={card} />;
            })}
        </div>
    );
}
