'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Card as CardType } from '@/types';

export interface ReplayCardMove {
    cardId: string;
    card: CardType;
    fromRect: DOMRect;
    toRect: DOMRect;
}

// This component renders flying card overlays during replay animation.
export function ReplayCardAnimationOverlay() {
    const replayAnimations = useGameStore(state => state.replayAnimations);

    return (
        <AnimatePresence>
            {replayAnimations && replayAnimations.map((anim) => (
                <FlyingCard key={anim.cardId} move={anim} />
            ))}
        </AnimatePresence>
    );
}

function FlyingCard({ move }: { move: ReplayCardMove }) {
    const { card, fromRect, toRect } = move;
    const animDuration = useGameStore.getState().replayAnimDuration / 1000;

    // Helper to normalize the target rect if it is a large container (like HAND or DECK)
    // and center the card size inside it.
    const normalizeRect = (rect: DOMRect) => {
        const CARD_W = 90;
        const CARD_H = 130;
        if (rect.width > 150 || rect.height > 200) {
            return {
                left: rect.left + (rect.width - CARD_W) / 2,
                top: rect.top + (rect.height - CARD_H) / 2,
                width: CARD_W,
                height: CARD_H,
            };
        }
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };
    };

    const to = normalizeRect(toRect);
    
    // Maintain constant size during flight to prevent visual size changes.
    // Use the destination's normalized size for the entire animation.
    const fixedWidth = to.width;
    const fixedHeight = to.height;

    const from = {
        left: fromRect.left + (fromRect.width - fixedWidth) / 2,
        top: fromRect.top + (fromRect.height - fixedHeight) / 2,
        width: fixedWidth,
        height: fixedHeight,
    };

    const getCardColor = (type: string) => {
        switch (type) {
            case 'MONSTER': return '#dcb45c';
            case 'SPELL': return '#1d9e74';
            case 'TRAP': return '#bc1a4b';
            default: return '#ccc';
        }
    };

    return (
        <motion.div
            initial={{
                x: from.left,
                y: from.top,
                width: from.width,
                height: from.height,
                opacity: 1,
            }}
            animate={{
                x: to.left,
                y: to.top,
                width: to.width,
                height: to.height,
                opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
                duration: animDuration,
                ease: [0.4, 0.0, 0.2, 1], // Smooth deceleration curve
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                pointerEvents: 'none',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.3)',
            }}
        >
            {card.imageUrl ? (
                <img
                    src={card.imageUrl}
                    alt={card.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }}
                />
            ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: getCardColor(card.type),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    color: '#fff',
                    fontWeight: 'bold',
                    padding: '4px',
                    textAlign: 'center',
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxSizing: 'border-box',
                }}>
                    {card.nameJa || card.name}
                </div>
            )}
        </motion.div>
    );
}
