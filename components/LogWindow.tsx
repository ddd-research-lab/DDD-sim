import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export function LogWindow() {
    const { logs } = useGameStore();
    const [isAscending, setIsAscending] = useState(false);

    const displayedLogs = isAscending ? [...logs].reverse() : logs;

    return (
        <div style={{
            width: '300px',
            minWidth: '250px',
            height: '100%',
            maxHeight: '80vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: '1px solid #444',
            borderRadius: '8px',
            padding: '10px',
            overflowY: 'auto',
            color: '#eee',
            fontSize: '12px',
            fontFamily: 'monospace',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
                <h3 style={{ margin: 0 }}>Duel Log</h3>
                <button
                    onClick={() => setIsAscending(!isAscending)}
                    style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        backgroundColor: isAscending ? '#4a90d9' : '#555',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    {isAscending ? '↑1234' : '↓New'}
                </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {displayedLogs.map((log, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #333', paddingBottom: '2px' }}>
                        <span style={{ color: '#888' }}>[{isAscending ? i + 1 : logs.length - i}]</span> {log}
                    </div>
                ))}
            </div>
        </div>
    );
}
