import React from 'react';
import { formatLog } from '@/data/locales';

interface SaveConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function SaveConfirmModal({ isOpen, onClose, onConfirm }: SaveConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)'
        }}>
            <div style={{
                background: '#222',
                border: '1px solid #444',
                padding: '24px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '380px',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
            }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#eee',
                    lineHeight: '1.5'
                }}>
                    {formatLog('prompt_save_to_archive_confirm')}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    width: '100%',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '6px',
                            border: '1px solid #555',
                            background: '#333',
                            color: '#ccc',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#444'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#333'}
                    >
                        {formatLog('ui_no')}
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2196F3',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            transition: 'background 0.2s',
                            boxShadow: '0 2px 6px rgba(33, 150, 243, 0.4)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#1976D2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#2196F3'}
                    >
                        {formatLog('ui_yes')}
                    </button>
                </div>
            </div>
        </div>
    );
}
