import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ZoneType } from '@/types';

interface ZoneProps {
    id: string; // Unique ID for droppable
    type: ZoneType;
    index?: number; // Index in the zone array
    children?: React.ReactNode;
    isOver?: boolean;
    // Visual props
    label?: string;
    style?: React.CSSProperties;
}

import { useGameStore } from '@/store/gameStore';
// ZoneType is already imported above

export function Zone({ id, type, index, children, label, style: customStyle }: ZoneProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: id,
        data: { type, index },
    });

    const zoneSelectionState = useGameStore((state) => state.zoneSelectionState);
    const resolveZoneSelection = useGameStore((state) => state.resolveZoneSelection);

    const isSelectingZone = zoneSelectionState.isOpen;
    const zoneSelectionFilter = zoneSelectionState.filter;

    const isValidTarget = isSelectingZone && zoneSelectionFilter && typeof index === 'number' && zoneSelectionFilter(type, index);

    const handleClick = () => {
        if (isSelectingZone && zoneSelectionFilter && typeof index === 'number') {
            const check = zoneSelectionFilter(type, index);
            if (!check) return;
        }

        if (isValidTarget && typeof index === 'number') {
            resolveZoneSelection(type, index);
        }
    };

    const style: React.CSSProperties = {
        width: '90px',
        height: '130px',
        border: isValidTarget ? '2px solid #0f0' : '1px dashed var(--zone-border)',
        backgroundColor: isOver ? 'rgba(255, 255, 255, 0.15)' : (isValidTarget ? 'rgba(0, 255, 0, 0.1)' : 'var(--zone-bg)'),
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s, border 0.2s',
        margin: '4px',
        position: 'relative',
        cursor: isValidTarget ? 'pointer' : 'default',
        zIndex: isValidTarget ? 10 : 1, // Bring to front if selectable
    };

    return (
        <div ref={setNodeRef} style={{ ...style, ...customStyle }} onClick={handleClick}>
            {children}
            {!children && label && (
                <span style={{
                    position: 'absolute',
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}
