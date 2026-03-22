import React, { useState, useEffect } from 'react';
import { formatLog, getCardName } from '@/data/locales';
import { CARD_DATABASE } from '@/data/cards';

interface EditArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSetup: string;
    explanation: string;
    nickname: string;
    onSave: (data: { initialSetup: string; explanation: string; nickname: string }) => Promise<void>;
    language: string;
}

export function EditArchiveModal({ isOpen, onClose, initialSetup, explanation, nickname: initialNickname, onSave, language }: EditArchiveModalProps) {
    const [initialSetupIds, setInitialSetupIds] = useState<string[]>(['']);
    const [currentExplanation, setCurrentExplanation] = useState('');
    const [currentNickname, setCurrentNickname] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Parse initialSetup (comma separated IDs)
            if (initialSetup && initialSetup.includes('c')) {
                setInitialSetupIds(initialSetup.split(',').map(s => s.trim()));
            } else {
                setInitialSetupIds(['']);
            }
            setCurrentExplanation(explanation || '');
            setCurrentNickname(initialNickname || '');
        }
    }, [isOpen, initialSetup, explanation, initialNickname]);

    // Initial Setup Candidates (Main Deck Cards only)
    const mainDeckCandidates = Object.values(CARD_DATABASE).filter(c => {
        const sub = c.subType || '';
        return !sub.includes('FUSION') && !sub.includes('SYNCHRO') && !sub.includes('XYZ') && !sub.includes('LINK');
    }).sort((a, b) => {
        const nameA = getCardName(a as any, language);
        const nameB = getCardName(b as any, language);
        return nameA.localeCompare(nameB, language === 'ja' ? 'ja' : 'en');
    });

    if (!isOpen) return null;

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            const initialSetupString = initialSetupIds.filter(id => id !== '').join(',');
            await onSave({
                initialSetup: initialSetupString,
                explanation: currentExplanation,
                nickname: currentNickname
            });
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const addInitialSetup = () => {
        setInitialSetupIds([...initialSetupIds, '']);
    };

    const updateInitialSetup = (index: number, id: string) => {
        const next = [...initialSetupIds];
        next[index] = id;
        setInitialSetupIds(next);
    };

    const removeInitialSetup = (index: number) => {
        if (initialSetupIds.length <= 1) {
            setInitialSetupIds(['']);
            return;
        }
        const next = initialSetupIds.filter((_, i) => i !== index);
        setInitialSetupIds(next);
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
            <div style={{
                background: '#222',
                padding: '20px',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '500px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <h2 style={{ margin: 0, fontSize: '18px', textAlign: 'center' }}>
                    アーカイブの編集
                </h2>

                {/* Nickname Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '14px', color: '#ccc' }}>
                        {formatLog('ui_nickname')}
                    </label>
                    <input
                        type="text"
                        value={currentNickname}
                        onChange={(e) => setCurrentNickname(e.target.value)}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            background: '#333',
                            color: '#fff'
                        }}
                    />
                </div>

                {/* Initial Setup Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: '#ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {formatLog('ui_initial_setup')}
                        <button
                            onClick={addInitialSetup}
                            style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                border: '1px solid #2196F3',
                                background: 'transparent',
                                color: '#2196F3',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            + {formatLog('ui_add_initial_setup')}
                        </button>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {initialSetupIds.map((selectedId, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '5px' }}>
                                <select
                                    value={selectedId}
                                    onChange={(e) => updateInitialSetup(idx, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #555',
                                        background: '#333',
                                        color: '#fff'
                                    }}
                                >
                                    <option value="">-- {formatLog('prompt_select_card')} --</option>
                                    {mainDeckCandidates.map(c => (
                                        <option key={c.cardId} value={c.cardId}>
                                            {getCardName(c as any, language)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeInitialSetup(idx)}
                                    style={{
                                        padding: '0 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #555',
                                        background: '#444',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Explanation Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '14px', color: '#ccc' }}>
                        {formatLog('ui_explanation')}
                    </label>
                    <textarea
                        value={currentExplanation}
                        onChange={(e) => setCurrentExplanation(e.target.value)}
                        rows={8}
                        style={{
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            background: '#333',
                            color: '#fff',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: 'none',
                            background: '#666',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        {formatLog('ui_cancel')}
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: 'none',
                            background: isSaving ? '#555' : '#2196F3',
                            color: '#fff',
                            cursor: isSaving ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSaving ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
