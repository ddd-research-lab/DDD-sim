import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatLog } from '@/data/locales';
import html2canvas from 'html2canvas'; // Allow import from html2canvas
import { ScreenshotPreview } from './ScreenshotPreview';
import { getUserId } from '@/lib/userId';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
    const { history, logs } = useGameStore();
    const [initialSetup, setInitialSetup] = useState('');
    const [explanation, setExplanation] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSending, setIsSending] = useState(false);
    const screenshotRef = React.useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleSend = async () => {
        setIsSending(true);

        try {
            let imageBase64 = '';
            if (screenshotRef.current) {
                try {
                    const canvas = await html2canvas(screenshotRef.current, {
                        useCORS: true,
                        backgroundColor: null, // Transparent if needed, or matches container
                        scale: 1, // Capture at 1:1 scale (1280px width)
                        logging: true
                    });
                    imageBase64 = canvas.toDataURL('image/png');
                } catch (e) {
                    console.error('Screenshot failed:', e);
                }
            }

            const payload = {
                nickname,
                initialSetup,
                explanation,
                history,
                logs,
                image: imageBase64,
                authorId: getUserId()
            };

            const res = await fetch('/api/archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || errorData.error || 'API failed');
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
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', textAlign: 'center' }}>
                        {formatLog('ui_share_modal_title')}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '14px', color: '#ccc' }}>
                            {formatLog('ui_initial_setup')}
                        </label>
                        <input
                            type="text"
                            value={initialSetup}
                            onChange={(e) => setInitialSetup(e.target.value)}
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
