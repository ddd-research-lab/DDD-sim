import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatLog, getCardName } from '@/data/locales';
import html2canvas from 'html2canvas'; // Allow import from html2canvas
import { ScreenshotPreview } from './ScreenshotPreview';
import { getUserId } from '@/lib/userId';
import { CARD_DATABASE } from '@/data/cards';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
    const { history, logs, language } = useGameStore();
    const [initialSetupIds, setInitialSetupIds] = useState<string[]>(['']);
    const [explanation, setExplanation] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSending, setIsSending] = useState(false);
    const screenshotRef = React.useRef<HTMLDivElement>(null);

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

    const handleSend = async () => {
        setIsSending(true);

        try {
            let imageBase64 = '';
            if (screenshotRef.current) {
                try {
                    const canvas = await html2canvas(screenshotRef.current, {
                        useCORS: true,
                        backgroundColor: '#1a1a1a', // Ensure a background for the JPEG
                        scale: 1, // Capture at 1:1 scale (1280px width)
                        logging: false
                    });
                    // Compress as JPEG with 0.6 quality to stay under 4.5MB limit
                    imageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                } catch (e) {
                    console.error('Screenshot failed:', e);
                }
            }

            // Join non-empty IDs with commas
            const initialSetupString = initialSetupIds.filter(id => id !== '').join(',');

            // Compress history data to reduce payload size
            const minifiedHistory = history.map(state => {
                const minifiedState = { ...state };
                if (minifiedState.cards) {
                    const minifiedCards: Record<string, any> = {};
                    for (const [id, card] of Object.entries(minifiedState.cards)) {
                        const { description, pendulumEffect, name, nameJa, image, ...essentialCardData } = card as any;
                        minifiedCards[id] = essentialCardData;
                    }
                    minifiedState.cards = minifiedCards;
                }
                return minifiedState;
            });

            const payload = {
                nickname,
                initialSetup: initialSetupString,
                explanation,
                history: minifiedHistory,
                logs, // Include full logs once at top level
                image: imageBase64,
                authorId: getUserId()
            };

            let body = JSON.stringify(payload);

            // If body is still too large (> 4MB), try more aggressive image compression
            if (body.length > 4 * 1024 * 1024 && screenshotRef.current) {
                console.log('Payload too large, retrying with higher compression...');
                try {
                    const canvas = await html2canvas(screenshotRef.current, {
                        useCORS: true,
                        backgroundColor: '#1a1a1a',
                        scale: 0.8, // Slightly reduce scale
                        logging: false
                    });
                    imageBase64 = canvas.toDataURL('image/jpeg', 0.3); // Lower quality
                    payload.image = imageBase64;
                    body = JSON.stringify(payload);
                } catch (e) {
                    console.error('Re-compression failed:', e);
                }
            }

            const res = await fetch('/api/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            if (!res.ok) {
                let errorMessage = 'API failed';
                const contentType = res.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json();
                    errorMessage = errorData.details || errorData.error || errorMessage;
                } else {
                    // Handle non-JSON error (like 413 Payload Too Large from Vercel)
                    const text = await res.text();
                    if (res.status === 413) {
                        errorMessage = 'データサイズが大きすぎます。履歴を短くするか、スクリーンショットを調整してください。';
                    } else {
                        errorMessage = `Error ${res.status}: ${text.slice(0, 100)}`;
                    }
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            console.log('Saved Archive ID:', data.id);

            alert(formatLog('log_share_success'));
            onClose();
        } catch (error: any) {
            console.error('Share failed:', error);
            alert(`${formatLog('log_share_error')}\n\n詳細: ${error.message}`);
        } finally {
            setIsSending(false);
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
        <>
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
                        {formatLog('ui_share_modal_title')}
                    </h2>

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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '14px', color: '#ccc' }}>
                            {formatLog('ui_nickname')}
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            style={{
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #555',
                                background: '#333',
                                color: '#fff'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '14px', color: '#ccc' }}>
                            {formatLog('ui_explanation')}
                        </label>
                        <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            rows={5}
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
                            disabled={isSending}
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
                            onClick={handleSend}
                            disabled={isSending}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '4px',
                                border: 'none',
                                background: isSending ? '#555' : '#2196F3',
                                color: '#fff',
                                cursor: isSending ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSending ? 'Sending...' : formatLog('ui_send')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Screenshot Area */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                <ScreenshotPreview ref={screenshotRef} />
            </div>
        </>
    );
}
