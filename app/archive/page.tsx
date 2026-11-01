'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatLog, getCardName } from '@/data/locales';
import { CARD_DATABASE } from '@/data/cards';
import { getUserId } from '@/lib/userId';

interface Archive {
    id: string;
    nickname: string;
    initialSetup: string;
    explanation: string;
    createdAt: string;
    imagePath?: string;
    likes: number;
    likedBy?: string[];
    authorId?: string;
}

const CARD_ABBREVIATIONS: Record<string, string> = {
    'DD魔導賢者ケプラー': 'ケプラー',
    'DDスケール・サーベイヤー': 'スケール',
    'DD魔導賢者コペルニクス': 'コペル',
    'DDオルトロス': 'オルトロス',
    'DDグリフォン': 'グリフォン',
    'DDD壊薙王アビス・ラグナロク': 'アビス',
    'DD魔導賢者トーマス': 'トーマス',
    'DDカウント・サーベイヤー': 'カウント',
    'DDD零死王ゼロ・マキナ': 'ゼロマキナ',
    'DDネクロ・スライム': 'ネクロ',
    'DDランス・ソルジャー': 'ランス',
    'DDディフェンス・ソルジャー': 'ディフェンス',
    '地獄門の契約書': '地獄門',
    '魔神王の契約書': '魔神王',
    '零王の契約書': '零王',
    'ワン・フォー・ワン': 'ワンフォ',
    '戦乙女の契約書': '戦乙女',
    '常闇の契約書': '常闇',
    'DDDヘッドハント': 'ヘッドハント',
    '灰流うらら': 'うらら',
    '無限泡影': '泡影',
    '霊王の波動': 'インパルス',
    '原始生命態ニビル': 'ニビル',
    'ドロール＆ロックバード': 'ドロバ',
    'DDD烈火王テムジン': 'テムジン',
    'DDD聖賢王アルフレッド': 'アルフレッド',
    'DDD烈火大王エグゼクティブ・テムジン': '大王テムジン',
    'DDDD偉次元元王アーク・クライシス': 'アーククライシス クライシス',
    'DDDD偉次元王アーク・クライシス': 'アーククライシス クライシス',
    'DDD創始王クロヴィス': 'クロヴィス',
    'DDD呪血王サイフリート': 'サイフリート',
    'DDD超死偉王ホワイテスト・ヘル・アーマゲドン': '白アーマゲドン',
    'DDD怒濤王シーザー': 'シーザー',
    'DDD智慧王ソロモン': 'ソロモン',
    'DDD狙撃王テル': 'テル',
    'DDD怒濤大王エグゼクティブ・シーザー': '大王シーザー',
    'DDD赦俿王デス・マキナ': 'デスマキナ',
    'DDD深淵王ビルガメス': 'ビルガメス',
    'DDD天空王ゼウス・ラグナロク': 'ゼウス',
    'マルチャミー・フワロス': 'フワロス',
    '軌跡の魔術師': 'ビヨンド',
    'DDヴァイス・テュポーン': 'テュポーン',
    'DDリビルド': 'リビルド',
    '契約書のリビルド': 'リビルド',
    'DDD疾風大王エグゼクティブ・アレクサンダー': '大王アレクサンダー',
    'ナイトメア・スローン': 'スローン',
    'ダーク・オカルティズム': 'オカルティズム',
    '異次元の契約書': 'オカルティズム',
    'DDD双暁王カリ・ユガ': 'カリユガ',
    '調和ノ天救竜': 'ハルモニア',
    '魔界特派員デスキャスター': 'デスキャスター',
    'グラヴィティ・コントローラー': 'グラコン',
};

export default function ArchiveListPage() {
    const [archives, setArchives] = useState<Archive[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedBytes, setLoadedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'likes' | 'mine'>('newest');
    const [language, setLanguage] = useState('ja'); // Default to ja
    const xKeyPressed = useRef(false);
    const isAdmin = searchQuery === 'administrator privileges';

    useEffect(() => {
        setLanguage('ja');

        const loadData = async () => {
            try {
                const res = await fetch('/api/archive');
                const contentLength = res.headers.get('content-length');
                const total = contentLength ? parseInt(contentLength, 10) : null;
                setTotalBytes(total);

                const reader = res.body?.getReader();
                if (!reader) {
                    const data = await res.json();
                    setArchives(Array.isArray(data) ? data : []);
                    setLoading(false);
                    return;
                }

                const chunks: Uint8Array[] = [];
                let loaded = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (value) {
                        chunks.push(value);
                        loaded += value.length;
                        setLoadedBytes(loaded);
                    }
                }

                const allChunks = new Uint8Array(loaded);
                let position = 0;
                for (const chunk of chunks) {
                    allChunks.set(chunk, position);
                    position += chunk.length;
                }

                const text = new TextDecoder("utf-8").decode(allChunks);
                const data = JSON.parse(text);
                setArchives(Array.isArray(data) ? data : []);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        loadData();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.isComposing) return;
            if (e.key === 'x' || e.key === 'X') xKeyPressed.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'x' || e.key === 'X') xKeyPressed.current = false;
        };
        const handleBlur = () => {
            xKeyPressed.current = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = window.confirm('このルートを削除しますか？');
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/archive/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authorId: getUserId() }),
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

    const handleLikeAction = async (e: React.MouseEvent, archive: Archive) => {
        e.preventDefault();
        e.stopPropagation();

        if (xKeyPressed.current) {
            xKeyPressed.current = false; // Reset to prevent stuck state from prompt()
            handleAdminDelete(e, archive.id);
            return;
        }

        const userId = getUserId();
        if (archive.likedBy?.includes(userId)) return;

        try {
            const res = await fetch(`/api/archive/${archive.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (!res.ok) throw new Error('Like failed');

            const data = await res.json();
            setArchives(prev => prev.map(a =>
                a.id === archive.id
                    ? { ...a, likes: data.likes, likedBy: [...(a.likedBy || []), userId] }
                    : a
            ));
        } catch (err) {
            console.error(err);
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

    const resolveAbbreviatedNames = (fullText: string): string => {
        let abbr = fullText;
        for (const [fullName, shortName] of Object.entries(CARD_ABBREVIATIONS)) {
            if (abbr.includes(fullName)) {
                abbr += ` ${shortName}`;
            }
        }
        return abbr;
    };

    const userId = getUserId();

    const filteredArchives = archives
        .filter(archive => {
            if (sortBy === 'mine' && archive.authorId !== userId) return false;
            if (isAdmin) return true; // Administrator privileges keyword shows all
            if (!searchQuery.trim()) return true;
            const rawSetup = archive.initialSetup || '';
            const resolvedNames = resolveSetupNames(rawSetup);
            const searchableSetup = resolveAbbreviatedNames(resolvedNames).toLowerCase();
            const explanationText = (archive.explanation || '').toLowerCase();
            const nicknameText = (archive.nickname || '').toLowerCase();
            const query = searchQuery.trim().toLowerCase();
            return (
                searchableSetup.includes(query) ||
                rawSetup.toLowerCase().includes(query) ||
                explanationText.includes(query) ||
                nicknameText.includes(query)
            );
        })
        .sort((a, b) => {
            if (sortBy === 'likes') {
                const diff = (b.likes || 0) - (a.likes || 0);
                if (diff !== 0) return diff;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    if (loading) {
        const percent = totalBytes ? Math.round((loadedBytes / totalBytes) * 100) : 0;
        const loadedMB = (loadedBytes / 1024 / 1024).toFixed(1);
        const totalMB = totalBytes ? (totalBytes / 1024 / 1024).toFixed(1) : null;

        return (
            <div style={{
                color: '#fff',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#121212',
                fontFamily: 'sans-serif'
            }}>
                <div className="spinning-box" style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
                <h2 style={{ fontSize: '18px', fontWeight: 'normal', color: '#ccc', marginBottom: '15px' }}>
                    {formatLog('ui_loading') || '読み込み中...'}
                </h2>
                
                {/* Progress Bar Container */}
                <div style={{
                    width: '300px',
                    height: '6px',
                    backgroundColor: '#333',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    <div style={{
                        width: totalBytes ? `${percent}%` : '100%',
                        height: '100%',
                        borderRadius: '3px',
                        transition: 'width 0.1s ease',
                        background: totalBytes 
                            ? 'linear-gradient(90deg, #2196F3, #00BCD4)'
                            : 'linear-gradient(90deg, #333, #2196F3, #333)',
                        backgroundSize: '200% 100%',
                        animation: totalBytes ? 'none' : 'shimmer 1.5s infinite linear',
                    }} />
                </div>

                <div style={{ fontSize: '14px', color: '#888', fontFamily: 'monospace' }}>
                    {totalBytes ? (
                        `${percent}% (${loadedMB} / ${totalMB} MB)`
                    ) : (
                        `${loadedMB} MB`
                    )}
                </div>

                <style jsx global>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    .spinning-box {
                        animation: spin 2s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                <h1 style={{ margin: 0 }}>{formatLog('ui_archive')}</h1>

                {/* Search Input */}
                <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
                    <input
                        type="text"
                        placeholder="初動カード・略称・解説・投稿者名で検索..."
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

            {/* Sort / Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {([
                        { key: 'newest', label: '🕒 新着順' },
                        { key: 'likes', label: '♥ いいね順' },
                        { key: 'mine', label: '👤 自分の投稿' }
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setSortBy(tab.key)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                border: sortBy === tab.key ? '1px solid #2196F3' : '1px solid #444',
                                background: sortBy === tab.key ? 'rgba(33, 150, 243, 0.2)' : '#222',
                                color: sortBy === tab.key ? '#64b5f6' : '#aaa',
                                fontSize: '13px',
                                fontWeight: sortBy === tab.key ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '13px', color: '#888' }}>
                    全 {filteredArchives.length} 件
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '10px' }}>
                {filteredArchives.map(archive => {
                    const canAuthorDelete = archive.authorId === userId;
                    const showDeleteBtn = isAdmin || canAuthorDelete;

                    return (
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
                            {showDeleteBtn && (
                                <button
                                    onClick={(e) => isAdmin && !canAuthorDelete ? handleAdminDelete(e, archive.id, true) : handleDelete(e, archive.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '20px',
                                        right: '20px',
                                        background: isAdmin && !canAuthorDelete ? 'rgba(255,64,129,0.9)' : 'rgba(211,47,47,0.9)',
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
                            <Link href={`/archive/${archive.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {archive.imagePath && (
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={archive.imagePath}
                                            alt="Board"
                                            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}
                                        />
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
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2196F3', marginBottom: '4px', paddingRight: (!archive.imagePath && showDeleteBtn) ? '50px' : 0 }}>
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
                                <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #2d2d2d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: '#aaa' }}>{archive.nickname || formatLog('ui_no_name') || 'Anonymous'}</span>
                                        {archive.createdAt && (
                                            <span style={{ marginLeft: '8px', color: '#666' }}>
                                                {new Date(archive.createdAt).toLocaleDateString('ja-JP')}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleLikeAction(e, archive)}
                                        title="いいね（Xキーを押しながらで管理者削除）"
                                        style={{
                                            color: archive.likedBy?.includes(userId) ? '#ff4081' : '#888',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: archive.likedBy?.includes(userId) ? 'rgba(255,64,129,0.1)' : 'rgba(136,136,136,0.1)',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            cursor: archive.likedBy?.includes(userId) ? 'default' : 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            transition: 'all 0.2s',
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '14px' }}>{archive.likedBy?.includes(userId) ? '♥' : '♡'}</span> {archive.likes || 0}
                                    </button>
                                </div>
                            </Link>
                        </div>
                    );
                })}
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
