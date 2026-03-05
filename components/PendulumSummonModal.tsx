import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from './Card';
import { formatLog } from '@/data/locales';

export function PendulumSummonModal() {
    const { isPendulumSummoning, isPendulumProcessing, pendulumCandidates, resolvePendulumSelection, cancelPendulumSummon, cards, spellTrapZones } = useGameStore();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isPendulumSummoning) {
            setSelectedIds([]);
        }
    }, [isPendulumSummoning]);

    // Validation: Ensure we actually have scales to perform P-Summon.
    const p1 = spellTrapZones[0];
    const p2 = spellTrapZones[4];
    const hasScales = p1 && p2;

    if (!isPendulumSummoning || isPendulumProcessing || !hasScales) return null;

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ marginBottom: '20px', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                {formatLog('ui_pendulum_summon_selection')}
            </div>
            <div style={{ marginBottom: '10px', color: '#ccc', fontSize: '16px' }}>
                {formatLog('ui_pendulum_summon_instruction')}
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                maxWidth: '900px',
                justifyContent: 'center',
                overflowY: 'auto',
                maxHeight: '70vh',
                padding: '20px',
                border: '1px solid #444',
                borderRadius: '8px',
                background: 'rgba(20,20,20,0.9)'
            }}>
                {pendulumCandidates.length === 0 ? (
                    <div style={{ color: '#aaa' }}>{formatLog('ui_no_candidates')}</div>
                ) : (
                    pendulumCandidates.map((id) => {
                        const isSelected = selectedIds.includes(id);
                        return (
                            <div
                                key={id}
                                onClick={() => toggleSelection(id)}
                                style={{
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'transform 0.1s',
                                    border: isSelected ? '3px solid #00fff2' : '3px solid transparent',
                                    borderRadius: '8px',
                                    position: 'relative'
                                }}
                            >
                                <Card card={cards[id]} isInteractive={false} />
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        background: '#00fff2',
                                        color: 'black',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
                <button
                    onClick={() => resolvePendulumSelection(selectedIds)}
                    disabled={selectedIds.length === 0}
                    style={{
                        padding: '12px 24px',
                        cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                        background: selectedIds.length > 0 ? 'linear-gradient(45deg, #00fff2, #0088aa)' : '#555',
                        color: selectedIds.length > 0 ? 'black' : '#888',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        boxShadow: selectedIds.length > 0 ? '0 0 15px rgba(0, 255, 242, 0.4)' : 'none'
                    }}
                >
                    {formatLog('ui_summon_selected', { count: selectedIds.length.toString() })}
                </button>

                <button
                    onClick={cancelPendulumSummon}
                    style={{
                        padding: '12px 24px',
                        cursor: 'pointer',
                        background: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '18px'
                    }}
                >
                    {formatLog('ui_cancel')}
                </button>
            </div>
        </div>
    );
}
