import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatLog } from '@/data/locales';

interface LogWindowProps {
    onClose?: () => void;
    onOpenShare?: () => void;
    onCopyLogs?: () => void;
    copiedFeedback?: boolean;
    useAbbreviation?: boolean;
    onToggleAbbreviation?: () => void;
    applyAbbreviations?: (text: string) => string;
}

export function LogWindow({ onClose, onOpenShare, onCopyLogs, copiedFeedback, useAbbreviation, onToggleAbbreviation, applyAbbreviations }: LogWindowProps) {
    const { logs, jumpToLog, isReplaying, logOrder, showZoneInLog, toggleShowZoneInLog } = useGameStore();

    // 'newest' = descending (latest first), 'oldest' = ascending (oldest first)
    const isAscending = logOrder === 'oldest';

    const cleanLog = (text: string) => {
        let cleaned = text;
        if (!showZoneInLog) {
            // Regex to remove zone information:
            cleaned = cleaned
                .replace(/をモンスターゾーン\d+に/, 'を')
                .replace(/をEXモンスターゾーン\d+に/, 'を')
                .replace(/を魔法・罠ゾーン\d+に/, 'を')
                .replace(/をフィールドゾーンに/, 'を');
        }
        // Remove "しました" suffix or replace "置きました"
        // Remove "しました" suffix or replace "置きました"
        let result = cleaned
            .replace(/を?置きました。?/, 'を置く')
            .replace(/手札に加えました。?/, '手札に加える')
            .replace(/墓地へ送りました。?/, '墓地へ送る')
            .replace(/しました。?/, '');

        // Final trim: Remove any trailing period from any log
        return result.replace(/[。\.]$/, '').trim();
    };

    const errorConditionLog = cleanLog(formatLog('log_error_condition'));
    const hoptSuffix = 'の効果は既に使用されています（ターン1回）';
    const startingHandPrefix = '初動：';

    const isTransient = (logText: string) => {
        const cleaned = cleanLog(logText);
        return cleaned === errorConditionLog || cleaned.includes(hoptSuffix) || cleaned.startsWith(startingHandPrefix);
    };

    let currentDisplayIndex = logs.filter(l => !isTransient(l)).length;

    const displayedLogs = logs.map((log, i) => {
        const transient = isTransient(log);
        const displayIndex = transient ? null : currentDisplayIndex--;
        const cleaned = cleanLog(log);
        const displayText = (useAbbreviation && applyAbbreviations) ? applyAbbreviations(cleaned) : cleaned;
        return {
            log: displayText,
            displayIndex,
            originalIndex: i,
            transient
        };
    });

    if (isAscending) {
        displayedLogs.reverse(); // Show oldest (index 1) first
    }

    return (
        <div style={{
            width: '300px',
            minWidth: '250px',
            height: '100%',
            margin: 0,
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
                    {logOrder === 'newest' ? '▽' : '△'}
                </button>
                <h3 style={{ margin: 0, flex: 1 }}>{formatLog('ui_duel_log')}</h3>
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
                        {displayIndex !== null && <span style={{ color: '#888' }}>[{displayIndex}] </span>}
                        {log}
                    </div>
                ))}
            </div>

            {/* Action Buttons: Save & Archive */}
            {!isReplaying && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                        onClick={onOpenShare}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#9C27B0',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}
                    >
                        {formatLog('ui_save')}
                    </button>
                    {onCopyLogs && (
                        <button
                            onClick={onCopyLogs}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: copiedFeedback ? '#4caf50' : '#2196F3',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: 'background-color 0.3s ease'
                            }}
                        >
                            {copiedFeedback ? '✓' : '📋'} {formatLog('ui_copy_log')}
                        </button>
                    )}
                    {onToggleAbbreviation && (
                        <button
                            onClick={onToggleAbbreviation}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: useAbbreviation ? '#ff9800' : '#555',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            {formatLog('ui_abbreviate')}
                        </button>
                    )}
                </div>
            )}

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
