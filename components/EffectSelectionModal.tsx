import React from 'react';
import { useGameStore } from '@/store/gameStore';

export function EffectSelectionModal() {
    const { effectSelectionState, resolveEffectSelection } = useGameStore();
    const { isOpen: isChoosingEffect, title: effectPrompt, options: effectOptions } = effectSelectionState;

    if (!isChoosingEffect) return null;

    const hasImages = effectOptions.some(opt => opt.imageUrl);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1e1e2e 0%, #11111b 100%)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                maxWidth: hasImages ? '600px' : '350px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <h3 style={{
                    marginBottom: '15px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>{effectPrompt}</h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: hasImages ? 'repeat(auto-fit, minmax(100px, 1fr))' : '1fr',
                    gap: '10px',
                    justifyContent: 'center'
                }}>
                    {effectOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => resolveEffectSelection(opt.value)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px', // Reduced from 15px
                                padding: opt.imageUrl ? '10px' : '10px 15px', // Reduced padding
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '14px', // Reduced from 16px
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                textAlign: opt.imageUrl ? 'center' : 'left',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.transform = 'translateY(-3px)'; // Reduced from -5px
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.3)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {opt.imageUrl && (
                                <img
                                    src={opt.imageUrl}
                                    alt={opt.label}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '0.7',
                                        objectFit: 'cover',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                    }}
                                />
                            )}
                            <span style={{ fontWeight: '500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{opt.label}</span>
                            {/* Shiny overlay effect on hover */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '50%',
                                height: '100%',
                                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)',
                                transition: 'all 0.5s',
                                transform: 'skewX(-25deg)',
                                pointerEvents: 'none'
                            }} className="shiny-overlay" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
