import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatLog } from '@/data/locales';

export function LogWindow() {
    const { logs, jumpToLog, replay, stopReplay, isReplaying, replaySpeed, toggleReplaySpeed, jumpHistory, returnFromJump } = useGameStore();
    const [isAscending, setIsAscending] = useState(true);

    const displayedLogs = isAscending
        ? logs.map((log, originalIndex) => ({ log, displayIndex: logs.length - originalIndex, originalIndex })).reverse()
        : logs.map((log, originalIndex) => ({ log, displayIndex: logs.length - originalIndex, originalIndex }));

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
                <h3 style={{ margin: 0 }}>{formatLog('ui_duel_log')}</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                    {isReplaying ? (
                        <button
                            onClick={() => stopReplay()}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                backgroundColor: '#f44336',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            ■ {formatLog('ui_stop')}
                        </button>
                    ) : (
                        <button
                            onClick={() => replay()}
                            disabled={logs.length === 0}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                backgroundColor: '#4caf50',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: logs.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: logs.length === 0 ? 0.5 : 1
                            }}
                        >
                            ▶ {formatLog('ui_replay')}
                        </button>
                    )}

                    {jumpHistory && jumpHistory.length > 0 && (
                        <button
                            onClick={() => returnFromJump()}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                backgroundColor: '#2196F3', // Blue
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            ↩ {formatLog('ui_return_jump')}
                        </button>
                    )}

                    {isReplaying && (
                        <button
                            onClick={() => toggleReplaySpeed()}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                backgroundColor: '#ff9800',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer',
                                minWidth: '30px'
                            }}
                        >
                            {replaySpeed}x
                        </button>
                    )}

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
                        {isAscending ? formatLog('ui_new') : formatLog('ui_old')}
                    </button>
                </div>
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
        </div>
    );
}
