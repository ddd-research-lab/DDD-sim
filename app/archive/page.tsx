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

    if (loading) return <div style={{ color: '#fff', padding: '20px' }}>{formatLog('ui_loading')}</div>;

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>ルート倉庫</h1>
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
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#888' }}>{archive.nickname || formatLog('ui_no_name')}</div>
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
