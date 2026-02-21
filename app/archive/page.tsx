'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatLog } from '@/data/locales';

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

    useEffect(() => {
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
    }, []);

    if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <h1>ルート倉庫</h1>
            <Link href="/" style={{ color: '#aaa', textDecoration: 'underline' }}>Back to Simulator</Link>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {archives.map(archive => (
                    <div key={archive.id} style={{ background: '#222', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
                        <Link href={`/archive/${archive.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            {archive.imagePath && (
                                <img
                                    src={archive.imagePath}
                                    alt="Board"
                                    style={{ width: '100%', height: 'auto', borderRadius: '4px', marginBottom: '10px' }}
                                />
                            )}
                            <div style={{ marginTop: '10px', fontSize: '16px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
                                <span style={{ fontWeight: 'bold', color: '#aaa', fontSize: '12px' }}>{formatLog('ui_initial_setup')}：</span><br />
                                {archive.initialSetup}
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#888' }}>{archive.nickname || 'No Name'}</div>
                                <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{new Date(archive.createdAt).toLocaleString()}</span>
                                    <span style={{ color: '#ff4081', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '14px' }}>♥</span> {archive.likes}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
