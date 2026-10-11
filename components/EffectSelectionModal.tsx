import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export function EffectSelectionModal() {
    const { effectSelectionState, resolveEffectSelection, dialogSize, setDialogSize } = useGameStore();
    const { isOpen: isChoosingEffect, title: effectPrompt, options: effectOptions } = effectSelectionState;
    const [isMinimized, setIsMinimized] = useState(false);

    // Reset minimized state when modal is closed / reopened
    useEffect(() => {
        if (!isChoosingEffect) {
            setIsMinimized(false);
        }
    }, [isChoosingEffect]);

    if (!isChoosingEffect) return null;

    const hasImages = effectOptions.some(opt => opt.imageUrl);

    if (isMinimized) {
        // Floating Mini Bar/Badge on the bottom-right corner (placed higher than search bar)
        return (
            <div style={{
                position: 'fixed',
                bottom: '160px', // place above search bar (100px)
                right: '20px',
                zIndex: 2100,
            }}>
                <button 
                    onClick={() => setIsMinimized(false)}
                    style={{
                        padding: '12px 18px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span>⚡</span> {effectPrompt ? (effectPrompt.length > 12 ? effectPrompt.slice(0, 12) + '...' : effectPrompt) : '効果を選択'}
                </button>
            </div>
        );
    }

    // Determine dimensions based on dialogSize setting
    let modalWidth = '90%';
    let modalMaxWidth = hasImages ? '600px' : '350px';
    let contentMaxHeight = '70vh';
    let paddingSize = '20px';
    let buttonPadding = '10px 15px';
    let fontSize = '14px';

    if (dialogSize === 'small') {
        modalWidth = '65%';
        modalMaxWidth = hasImages ? '420px' : '260px';
        contentMaxHeight = '48vh';
        paddingSize = '12px';
        buttonPadding = '6px 10px';
        fontSize = '12px';
    } else if (dialogSize === 'large') {
        modalWidth = '95%';
        modalMaxWidth = hasImages ? '750px' : '450px';
        contentMaxHeight = '82vh';
        paddingSize = '28px';
        buttonPadding = '14px 20px';
        fontSize = '16px';
    }

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
            {/* Top Bar Controls */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                zIndex: 2010
            }}>
                {/* Size Swapper */}
                <div style={{
                    display: 'flex',
                    background: '#1e1e2f',
                    padding: '2px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                        <button
                            key={sz}
                            onClick={() => setDialogSize(sz)}
                            style={{
                                padding: '6px 12px',
                                background: dialogSize === sz ? '#10b981' : 'transparent',
                                color: dialogSize === sz ? 'white' : '#aaa',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {sz === 'small' ? '小' : sz === 'medium' ? '中' : '大'}
                        </button>
                    ))}
                </div>

                {/* Minimizer Toggle Button */}
                <button 
                    onClick={() => setIsMinimized(true)}
                    style={{
                        padding: '8px 16px',
                        background: '#4b5563',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}
                >
                    🗕 盤面を確認
                </button>
            </div>

            <div style={{
                background: 'linear-gradient(135deg, #1e1e2e 0%, #11111b 100%)',
                padding: paddingSize,
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                maxWidth: modalMaxWidth,
                width: modalWidth,
                maxHeight: contentMaxHeight,
                overflowY: 'auto'
            }}>
                <h3 style={{
                    marginBottom: '15px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    paddingTop: '10px'
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
                            disabled={opt.disabled}
                            onClick={() => !opt.disabled && resolveEffectSelection(opt.value)}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                padding: opt.imageUrl ? '10px' : buttonPadding,
                                background: opt.disabled ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                                color: opt.disabled ? '#777' : 'white',
                                border: opt.disabled ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                                opacity: opt.disabled ? 0.35 : 1,
                                fontSize: fontSize,
                                transition: 'background 0.3s, border-color 0.3s, transform 0.3s, box-shadow 0.3s',
                                textAlign: opt.imageUrl ? 'center' : 'left',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                if (opt.disabled) return;
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseOut={(e) => {
                                if (opt.disabled) return;
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
                            <div className="shiny-overlay" style={{
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '50%',
                                height: '100%',
                                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)',
                                transition: 'all 0.5s',
                                transform: 'skewX(-25deg)',
                                pointerEvents: 'none'
                            }} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
