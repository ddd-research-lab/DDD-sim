import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatLog } from '@/data/locales';

interface LogWindowProps {
    onClose?: () => void;
}

export function LogWindow({ onClose }: LogWindowProps) {
    const { logs, jumpToLog, isReplaying, logOrder } = useGameStore();

    // 'newest' = descending (latest first), 'oldest' = ascending (oldest first)
    const isAscending = logOrder === 'oldest';

    const displayedLogs = isAscending
        ? logs.map((log, originalIndex) => ({ log, displayIndex: logs.length - originalIndex, originalIndex }))
        : logs.map((log, originalIndex) => ({ log, displayIndex: logs.length - originalIndex, originalIndex })).reverse();

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
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #555',
                paddingBottom: '5px',
                marginBottom: '5px',
                gap: '8px'
            }}>
                <button
                    onClick={() => useGameStore.getState().toggleLogOrder()}
                    style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        backgroundColor: '#555',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                    title="Toggle Log Order"
                >
                    {logOrder === 'newest' ? '▼' : '▲'}
                </button>
                <h3 style={{ margin: 0 }}>{formatLog('ui_duel_log')}</h3>
                {useGameStore.getState().jumpHistory?.length > 0 && (
                    <button
                        onClick={() => useGameStore.getState().returnFromJump()}
                        style={{
                            marginLeft: 'auto',
                            padding: '1px 6px',
                            fontSize: '9px',
                            backgroundColor: '#d32f2f',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                        title="Return to latest state"
                    >
                        ↩ Return
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                {displayedLogs.map(({ log, displayIndex, originalIndex }, i) => (
                    <div
                        key={i}
                        onClick={() => !isReplaying && jumpToLog(originalIndex)}
                        style={{
                            borderBottom: '1px solid #333',
                            paddingBottom: '2px',
                            cursor: isReplaying ? 'default' : 'pointer',
                            opacity: isReplaying ? 0.7 : 1,
                        }}
                        className={!isReplaying ? "hover:bg-white/10 hover:text-white transition-colors" : ""}
                    >
                        <span style={{ color: '#888' }}>[{displayIndex}]</span> {log}
                    </div>
                ))}
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    style={{
                        backgroundColor: '#444',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '8px',
                        marginTop: '8px',
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '12px'
                    }}
                >
                    {formatLog('ui_close')}
                </button>
            )}
        </div>
    );
}
