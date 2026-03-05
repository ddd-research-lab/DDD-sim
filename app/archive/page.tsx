'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatLog, getCardName } from '@/data/locales';
import { CARD_DATABASE } from '@/data/cards';

interface Archive {
    id: string;
    nickname: string;
    initialSetup: string;
    explanation: string;
    createdAt: string;
    imagePath?: string;
    likes: number;
}

export default function ArchiveListPage() {
    const [archives, setArchives] = useState<Archive[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [language, setLanguage] = useState('ja'); // Default to ja
    const xKeyPressed = useRef(false);
    const isAdmin = searchQuery === 'administrator privileges';

    useEffect(() => {
        setLanguage('ja');

        fetch('/api/archive')
            .then(res => res.json())
            .then(data => {
                setArchives(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'x' || e.key === 'X') xKeyPressed.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'x' || e.key === 'X') xKeyPressed.current = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleAdminDelete = async (e: React.MouseEvent, id: string, bypassPrompt = false) => {
        e.preventDefault();
        e.stopPropagation();
        if (!bypassPrompt && !xKeyPressed.current) return;

        let adminKey = '';
        if (bypassPrompt) {
            adminKey = 'administrator privileges';
        } else {
            adminKey = prompt('管理者キーを入力してください:') || '';
        }

        if (!adminKey) return;

        const confirmed = window.confirm(bypassPrompt ? '【管理者権限】このルートを削除しますか？この操作は元に戻せません。' : 'このルートを削除しますか？この操作は元に戻せません。');
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/archive/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`削除に失敗しました: ${err.error || '不明なエラー'}`);
                return;
            }
            // 一覧から即時除去
            setArchives(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
            alert('削除に失敗しました。');
        }
    };

    const handleDownload = (e: React.MouseEvent, imagePath: string, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = imagePath;
        link.download = `board_${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper to resolve card IDs to localized names
    const resolveSetupNames = (setup: string): string => {
        if (!setup) return '';
        // Check if it's potentially a list of IDs (c001,c002)
        if (setup.includes('c') && setup.split(',').every(part => part.trim().match(/^c\d+$/))) {
            return setup.split(',')
                .map(id => {
                    const card = CARD_DATABASE[id.trim()];
                    return card ? getCardName(card as any, language) : id;
                })
                .join(', ');
        }
        return setup; // Return as-is if it's legacy text
    };

    const filteredArchives = archives.filter(archive => {
        if (isAdmin) return true; // Administrator privileges keyword shows all
        if (!searchQuery) return true;
        const resolvedNames = resolveSetupNames(archive.initialSetup).toLowerCase();
        const rawSetup = archive.initialSetup.toLowerCase();
        const query = searchQuery.toLowerCase();
        return resolvedNames.includes(query) || rawSetup.includes(query);
    });

    if (loading) return <div style={{ color: '#fff', padding: '20px' }}>{formatLog('ui_loading')}</div>;

    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ margin: 0 }}>{formatLog('ui_archive')}</h1>

                {/* Search Input */}
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <input
                        type="text"
                        placeholder={`${formatLog('ui_search_initial_setup')}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 15px',
                            paddingLeft: '35px',
                            borderRadius: '25px',
                            border: '1px solid #444',
                            background: '#222',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                        }}
                    />
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}>🔍</span>
                </div>

                <Link
                    href="/"
                    style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#2196F3',
                        color: '#fff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    {formatLog('ui_back_to_simulator')}
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {filteredArchives.map(archive => (
                    <div key={archive.id} style={{
                        background: '#222',
                        padding: '15px',
                        borderRadius: '12px',
                        border: '1px solid #444',
                        position: 'relative',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = '#666';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = '#444';
                        }}>
                        <Link href={`/archive/${archive.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {archive.imagePath && (
                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={archive.imagePath}
                                        alt="Board"
                                        style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                                    />
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleAdminDelete(e, archive.id, true)}
                                            style={{
                                                position: 'absolute',
                                                top: '5px',
                                                right: '5px',
                                                background: 'rgba(255,64,129,0.9)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                zIndex: 20,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                            }}
                                        >
                                            削除
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDownload(e, archive.imagePath!, archive.id)}
                                        style={{
                                            position: 'absolute',
                                            bottom: '15px',
                                            right: '5px',
                                            background: 'rgba(0,0,0,0.7)',
                                            color: '#fff',
                                            border: '1px solid #666',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            zIndex: 10
                                        }}
                                        title={formatLog('ui_download_image')}
                                    >
                                        💾
                                    </button>
                                </div>
                            )}
                            <div style={{ marginTop: '5px', flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2196F3', marginBottom: '4px' }}>
                                    {formatLog('ui_initial_setup')}
                                </div>
                                <div style={{ fontSize: '14px', color: '#eee', whiteSpace: 'pre-wrap', lineHeight: '1.4', marginBottom: '10px' }}>
                                    {resolveSetupNames(archive.initialSetup) || '-'}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                                    {formatLog('ui_explanation')}
                                </div>
                                <div style={{ fontSize: '14px', color: '#bbb', whiteSpace: 'pre-wrap', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {archive.explanation || '-'}
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                    onClick={(e) => handleAdminDelete(e, archive.id)}
                                    title="X を押しながらクリックで削除（管理者専用）"
                                    style={{
                                        color: '#ff4081',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(255,64,129,0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    <span style={{ fontSize: '14px' }}>♥</span> {archive.likes}
                                </button>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {filteredArchives.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                    <div>対象のルートが見つかりませんでした</div>
                </div>
            )}
        </div>
    );
}
