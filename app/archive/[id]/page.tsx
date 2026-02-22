'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatLog } from '@/data/locales';
import { getUserId } from '@/lib/userId';

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

export default function ArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [archive, setArchive] = useState<ArchiveDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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

    const userId = getUserId();
    const isAuthor = archive?.authorId === userId;
    const hasLiked = archive?.likedBy?.includes(userId);

    if (loading) return <div style={{ color: '#fff', padding: '20px' }}>{formatLog('ui_loading')}</div>;
    if (!archive) return <div style={{ color: '#fff', padding: '20px' }}>アーカイブが見つかりませんでした。</div>;

    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '800px', margin: '0 auto' }}>
            <Link href="/archive" style={{ color: '#aaa', textDecoration: 'underline' }}>&lt; {formatLog('ui_back_to_list')}</Link>

            <h2 style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>{archive.nickname || formatLog('ui_no_name')}</h2>
            <div style={{ color: '#aaa', fontSize: '14px' }}>{new Date(archive.createdAt).toLocaleString()}</div>

            {archive.imagePath && (
                <div style={{ margin: '20px 0', border: '1px solid #444', padding: '5px', background: '#000' }}>
                    <img
                        src={archive.imagePath}
                        alt="Board Snapshot"
                        style={{ width: '100%', height: 'auto' }}
                    />
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
                        {formatLog('ui_initial_setup')}：{archive.initialSetup}
                    </div>
                </div>

                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                        {formatLog('ui_explanation')}
                    </h3>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{archive.explanation}</p>
                </div>

                <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
                    <h3>{formatLog('ui_duel_log')}</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#111', padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
                        {[...archive.logs].reverse().map((log, i) => {
                            const originalIndex = archive.logs.length - 1 - i;
                            return (
                                <div key={originalIndex} style={{ borderBottom: '1px solid #333', padding: '2px 0' }}>
                                    <span style={{ color: '#888', marginRight: '8px' }}>[{originalIndex + 1}]</span>
                                    {log}
                                </div>
                            );
                        })}
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
