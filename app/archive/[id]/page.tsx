'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatLog, getCardName } from '@/data/locales';
import { getUserId } from '@/lib/userId';
import { CARD_DATABASE } from '@/data/cards';

interface ArchiveDetail {
    id: string;
    nickname: string;
    initialSetup: string;
    explanation: string;
    createdAt: string;
    imagePath?: string;
    history: any[];
    logs: string[];
    likes?: number;
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
    'DDD烈火王テムジン': 'テムジン',
    'DDD聖賢王アルフレッド': 'アルフレッド',
    'DDD烈火大王エグゼクティブ・テムジン': '大王テムジン',
    'DDDD偉次元元王アーク・クライシス': 'クライシス',
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
};

const applyAbbreviations = (text: string): string => {
    let result = text;
    const sortedKeys = Object.keys(CARD_ABBREVIATIONS).sort((a, b) => b.length - a.length);
    for (const fullName of sortedKeys) {
        result = result.replaceAll(fullName, CARD_ABBREVIATIONS[fullName]);
    }
    return result;
};

const cleanLog = (text: string): string => {
    let cleaned = text;
    // Remove zone information like "をモンスターゾーン1に", "をフィールドゾーンに", etc.
    cleaned = cleaned
        .replace(/をモンスターゾーン\d+に/, 'を')
        .replace(/をEXモンスターゾーン\d+に/, 'を')
        .replace(/を魔法・罠ゾーン\d+に/, 'を')
        .replace(/をフィールドゾーンに/, 'を');

    // Standardize verbs for cleaner look
    let result = cleaned
        .replace(/を?置きました。?/, 'を置く')
        .replace(/手札に加えました。?/, '手札に加える')
        .replace(/墓地へ送りました。?/, '墓地へ送る')
        .replace(/しました。?/, '');

    return result.replace(/[。\.]$/, '').trim();
};

export default function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [archive, setArchive] = useState<ArchiveDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [useAbbreviation, setUseAbbreviation] = useState(false);
    const router = useRouter();

    // Helper to resolve card IDs to localized names
    const resolveSetupNames = (setup: string): string => {
        if (!setup) return '';
        // Check if it's potentially a list of IDs (c001,c002)
        if (setup.includes('c') && setup.split(',').every(part => part.trim().match(/^c\d+$/))) {
            return setup.split(',')
                .map(id => {
                    const card = CARD_DATABASE[id.trim()];
                    return card ? getCardName(card as any, 'ja') : id;
                })
                .join(', ');
        }
        return setup; // Return as-is if it's legacy text
    };

    useEffect(() => {
        fetch(`/api/archive/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setArchive(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [id]);

    const handleReplay = () => {
        router.push(`/?replayId=${id}`);
    };

    const handleLike = async () => {
        if (!archive) return;
        const userId = getUserId();
        if (archive.likedBy?.includes(userId)) return;

        try {
            const res = await fetch(`/api/archive/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (!res.ok) throw new Error(formatLog('log_share_error'));

            const data = await res.json();
            setArchive({ ...archive, likes: data.likes, likedBy: [...(archive.likedBy || []), userId] });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        const confirmMsg = 'このアーカイブを削除してもよろしいですか？';
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/archive/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authorId: getUserId() })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || formatLog('log_share_error'));
            }

            router.push('/archive');
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : formatLog('log_share_error'));
        }
    };

    const handleDownload = () => {
        if (!archive?.imagePath) return;
        const link = document.createElement('a');
        link.href = archive.imagePath;
        link.download = `board_${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const userId = getUserId();
    const isAuthor = archive?.authorId === userId;
    const hasLiked = archive?.likedBy?.includes(userId);

    if (loading) return <div style={{ color: '#fff', padding: '20px' }}>{formatLog('ui_loading')}</div>;
    if (!archive) return <div style={{ color: '#fff', padding: '20px' }}>アーカイブが見つかりませんでした。</div>;

    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginTop: '20px', padding: '15px', background: '#222', borderRadius: '12px', border: '1px solid #444', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>
                            {formatLog('ui_nickname') || 'ニックネーム'}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>{archive.nickname || formatLog('ui_no_name')}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>投稿日</div>
                        <div style={{ fontSize: '14px', color: '#aaa' }}>{new Date(archive.createdAt).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {archive.imagePath && (
                <div style={{ margin: '20px 0', border: '1px solid #444', padding: '5px', background: '#000', position: 'relative' }}>
                    <img
                        src={archive.imagePath}
                        alt="Board Snapshot"
                        style={{ width: '100%', height: 'auto' }}
                    />
                    <button
                        onClick={handleDownload}
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            border: '1px solid #666',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>💾</span> {formatLog('ui_download_image')}
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {formatLog('ui_initial_setup')}：{resolveSetupNames(archive.initialSetup)}
                    </div>
                </div>

                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                        {formatLog('ui_explanation')}
                    </h3>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{archive.explanation}</p>
                </div>

                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0 }}>{formatLog('ui_duel_log')}</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setUseAbbreviation(!useAbbreviation)}
                                style={{
                                    background: useAbbreviation ? '#444' : '#333',
                                    color: useAbbreviation ? '#fff' : '#aaa',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: useAbbreviation ? 'bold' : 'normal'
                                }}
                            >
                                {formatLog('ui_abbreviate') || '略称'}
                            </button>
                            <button
                                onClick={() => {
                                    const url = window.location.href;
                                    navigator.clipboard.writeText(url).then(() => {
                                        alert('URLをコピーしました');
                                    }).catch(err => {
                                        console.error('Copy failed', err);
                                    });
                                }}
                                style={{
                                    background: '#333',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔗 {formatLog('ui_share') || '共有'}
                            </button>
                            <button
                                onClick={() => {
                                    let displayIdx = 1;
                                    // Process in display order (reversed)
                                    const logText = [...archive.logs].reverse().map((log) => {
                                        const cleaned = cleanLog(log);
                                        const text = useAbbreviation ? applyAbbreviations(cleaned) : cleaned;
                                        if (text.startsWith('初動：')) return text;
                                        return `[${displayIdx++}] ${text}`;
                                    }).join('\n');
                                    navigator.clipboard.writeText(logText).then(() => {
                                        alert('ログをコピーしました');
                                    }).catch(err => {
                                        console.error('Copy failed', err);
                                    });
                                }}
                                style={{
                                    background: '#333',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                📋 {formatLog('ui_copy_log_full') || 'ログをコピー'}
                            </button>
                        </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {(() => {
                            let displayIdx = 1;
                            // Reverse first, then map to apply numbering from the top
                            const displayLogs = [...archive.logs].reverse().map((log) => {
                                const cleaned = cleanLog(log);
                                const text = useAbbreviation ? applyAbbreviations(cleaned) : cleaned;
                                if (text.startsWith('初動：')) return { log: text, index: null };
                                return { log: text, index: displayIdx++ };
                            });

                            return displayLogs.map((item, i) => {
                                return (
                                    <div key={i} style={{ borderBottom: '1px solid #333', padding: '2px 0' }}>
                                        {item.index !== null && (
                                            <span style={{ color: '#888', marginRight: '8px' }}>[{item.index}]</span>
                                        )}
                                        {item.log}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                    <button
                        onClick={handleLike}
                        disabled={hasLiked}
                        style={{
                            padding: '10px 20px',
                            fontSize: '18px',
                            background: hasLiked ? '#444' : '#ff4081',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: hasLiked ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{hasLiked ? '♥' : '♡'}</span>
                        {archive.likes || 0}
                    </button>

                    <button
                        onClick={handleReplay}
                        style={{
                            flex: 1,
                            padding: '10px',
                            fontSize: '18px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {formatLog('ui_replay_in_simulator')}
                    </button>
                </div>

                {isAuthor && (
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '10px',
                            fontSize: '14px',
                            background: 'transparent',
                            color: '#d32f2f',
                            border: '1px solid #d32f2f',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        {formatLog('ui_delete_archive')}
                    </button>
                )}
            </div>
        </div>
    );
}
