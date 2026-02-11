import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType } from '@/types';
import { useGameStore } from '@/store/gameStore';

interface CardProps {
    card: CardType;
    isOverlay?: boolean;
    onClickOverride?: (e: React.MouseEvent) => void;
    isInteractive?: boolean;
    disableDrag?: boolean;
    dragId?: string; // Add optional dragId
}

export function Card({ card, isOverlay, onClickOverride, isInteractive = true, disableDrag = false, dragId }: CardProps) {
    const { activateEffect, selectedCards, cardPropertyModifiers, extraDeck } = useGameStore();

    // Destructure new state objects
    const targetingState = useGameStore(state => state.targetingState);
    const zoneSelectionState = useGameStore(state => state.zoneSelectionState);
    const triggerCandidates = useGameStore(state => state.triggerCandidates) || []; // Default to empty if undefined during init
    const resolveTrigger = useGameStore(state => state.resolveTrigger);
    const resolveTarget = useGameStore(state => state.resolveTarget); // Need to keep resolveTarget

    const isTargeting = targetingState.isOpen;
    const targetFilter = targetingState.filter;
    const targetingMode = targetingState.mode; // 'normal' | 'red'
    const isTriggerCandidate = triggerCandidates.includes(card.id);
    const isSelectingZone = zoneSelectionState.isOpen;

    // Disable drag if targeting OR if card is in Extra Deck OR if it's a trigger candidate OR input prop
    const isExtraDeckCard = extraDeck.includes(card.id);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: dragId || card.id, // Use dragId if provided, else card.id
        data: { card }, // Pass card data for event handlers
        disabled: isOverlay || isTargeting || isExtraDeckCard || disableDrag, // Removed isTriggerCandidate to allow Summon/Set (Passing priority)
    });

    const isValidTarget = isTargeting && targetFilter && targetFilter(card);
    const isSelected = selectedCards && selectedCards.includes(card.id);

    // Visuals: Selected = RED, Valid Target = GREEN (unless overridden mode)
    const borderColor = isSelected ? '#ff0000' : (isValidTarget ? (targetingMode === 'red' ? '#ff0000' : '#00ff00') : '#444');
    const shadowColor = isSelected ? '#ff0000' : (isValidTarget ? (targetingMode === 'red' ? '#ff0000' : '#00ff00') : 'rgba(0,0,0,0.3)');

    // Stats Calculation
    const modifiers = cardPropertyModifiers[card.id];
    const baseLevel = card.level;
    const modifiedLevel = modifiers?.level;
    const displayLevel = modifiedLevel !== undefined ? modifiedLevel : baseLevel;
    const isModified = modifiedLevel !== undefined && modifiedLevel !== baseLevel;

    const handleClick = (e: React.MouseEvent) => {
        const store = useGameStore.getState();

        // Overlay cards (materials) should not be clickable for targeting/effects
        if (isOverlay) {
            return;
        }

        if (onClickOverride) {
            e.stopPropagation();
            onClickOverride(e);
            return;
        }

        if (zoneSelectionState.isOpen) {
            store.addLog('Please select a Zone, not a card.');
            return;
        }

        // Trigger Candidate Click
        if (isTriggerCandidate) {
            e.stopPropagation(); // Prevent drag or other clicks
            resolveTrigger(card.id);
            return;
        }

        if (isValidTarget) {
            e.stopPropagation(); // Prevent drag or other clicks
            resolveTarget(card.id);
        } else {
            if (isTargeting) {
                // Invalid target click
            } else if (!isSelectingZone && isInteractive) {
                // Manual Activation
                activateEffect(card.id);
            }
        }
    };

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : (isValidTarget || isTriggerCandidate ? 'crosshair' : 'grab'),
        // Card Visuals
        width: '80px',
        height: '116px',
        backgroundColor: getCardColor(card.type),
        border: (isValidTarget || isSelected) ? `2px solid ${borderColor}` : '2px solid #444', // Highlight target
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        padding: '4px',
        textAlign: 'center',
        boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.5)' : ((isValidTarget || isSelected) ? `0 0 10px ${shadowColor}` : '0 2px 5px rgba(0,0,0,0.3)'),
        userSelect: 'none',
        position: 'relative', // For absolute positioning if needed, or normal flow
        transition: 'box-shadow 0.2s, transform 0.1s',
    };

    if (isOverlay) {
        style.cursor = 'default'; // Overlays shouldn't be draggable individually if standard
        // style.transform is managed by parent logic usually, but here we render inside parent.
        // We actually don't want dnd-kit hooks for materials if they are just visuals?
        // But Card component calls useDraggable unconditionally.
        // We should probably DISABLE drag for purely visual overlays (isOverlay=true).
        // Added disabled: isOverlay to useDraggable call already.

        style.position = 'absolute';
        style.width = '100%';
        style.height = '100%';
        style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)'; // Simpler shadow
        style.scale = '1'; // Reset scale
        delete style.transform; // Remove transform from dnd
    }

    const { materials, cards } = useGameStore();
    const attachedMaterials = materials[card.id] || [];

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`
                relative
                ${isTriggerCandidate ? 'trigger-glow' : ''}
                ${isTargeting && isValidTarget ? 'ring-4 ring-red-500 cursor-pointer z-50' : ''}
                ${isTargeting && !isValidTarget ? 'opacity-50 grayscale' : ''}
                ${isSelected ? 'ring-4 ring-blue-500' : ''}
                ${isDragging ? 'opacity-50' : ''}
                transition-all duration-200
                hover:scale-105
            `}
            onClick={handleClick}
        >
            {/* Render Materials Underneath */}
            {!isOverlay && attachedMaterials.length > 0 && attachedMaterials.map((matId, idx) => (
                <div key={matId} style={{
                    position: 'absolute',
                    top: `-${(idx + 1) * 25}%`,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: -1 - idx,
                }}>
                    <Card card={cards[matId]} isOverlay={true} />
                </div>
            ))}

            {card.imageUrl ? (
                <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    width={80}
                    height={116}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px', pointerEvents: 'none' }}
                />
            ) : (
                <>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '9px', lineHeight: '1.1' }}>
                        {card.name}
                    </div>
                    <div style={{ fontSize: '8px', overflow: 'hidden', height: '100%', wordBreak: 'break-all' }}>
                        {/* Image placeholder or simplified view */}
                        {card.type}
                    </div>
                </>
            )}

            {/* Level/Rank Display for Monsters (Only if modified) */}
            {card.type === 'MONSTER' && isModified && displayLevel !== undefined && (
                <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: '#00ff00',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: '1px solid #00ff00',
                    pointerEvents: 'none'
                }}>
                    {displayLevel}
                </div>
            )}

            {/* Pendulum Scale Display */}
            {card.subType?.includes('PENDULUM') && card.scale !== undefined && (
                <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '2px',
                    backgroundColor: 'rgba(0,50,200,0.7)',
                    color: 'white',
                    padding: '1px 3px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    pointerEvents: 'none'
                }}>
                    <span style={{ fontSize: '7px' }}>P</span>{card.scale}
                </div>
            )}

        </div>
    );
}

function getCardColor(type: string) {
    switch (type) {
        case 'MONSTER': return '#dcb45c'; // Normal Monster Color ish
        case 'SPELL': return '#1d9e74';
        case 'TRAP': return '#bc1a4b';
        default: return '#ccc';
    }
}
