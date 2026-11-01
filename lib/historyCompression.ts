import { GameState } from '@/types';
import { CARD_DATABASE } from '@/data/cards';

// UI専用フィールド（再生・ロードに不要なフィールド）
const UI_ONLY_FIELDS: (keyof GameState)[] = [
    'isDragging',
    'activeDragId',
    'pendulumCandidates',
    'isPendulumProcessing',
    'isReplaying',
    'history',           // 入れ子の history は不要
    'logs',              // スナップショット内の logs は logCount で代用可能
    'isEffectActivated',
    'showAshBlossomCutIn',
    'showDrollCutIn',
    'showInfiniteImpermanenceCutIn',
    'showNibiruCutIn',
    'isLinkSummoningActive',
    'isMaterialMove',
    'isTellBuffActive',
    'isHistoryBatching',
];

export interface CompressedHistory {
    /** 全スナップショット共通のカードデータ（最後のスナップショットから取得） */
    cards: GameState['cards'];
    /** cards を除いた軽量スナップショット配列 */
    snapshots: Omit<Partial<GameState>, 'cards'>[];
    /** トップレベルのログ（スナップショット内の logs は logCount のみ使用） */
    version: number;
}

/**
 * history を圧縮してサイズを削減する。
 * - cards は全スナップショットで共通のため最後の1枚のみ保存し、各スナップショットからは削除
 * - UI専用フィールドを削除
 */
export function compressHistory(history: Partial<GameState>[]): CompressedHistory {
    if (history.length === 0) {
        return { cards: {}, snapshots: [], version: 1 };
    }

    // 最後のスナップショットの cards を共有データとして取り出す
    const sharedCards = (history[history.length - 1].cards ?? {}) as GameState['cards'];

    const snapshots = history.map(snap => {
        const slim: Partial<GameState> = { ...snap };

        // cards を削除（共有データとして別途保存）
        delete slim.cards;

        // UI専用フィールドを削除
        for (const field of UI_ONLY_FIELDS) {
            delete slim[field];
        }

        return slim;
    });

    return { cards: sharedCards, snapshots, version: 1 };
}

/**
 * 圧縮された history を復元する。
 * 各スナップショットに共有 cards を再付与し、CARD_DATABASE から省略されたフィールドを復元する。
 */
export function decompressHistory(compressed: CompressedHistory): Partial<GameState>[] {
    const { cards, snapshots } = compressed;
    const enrichedCards: GameState['cards'] = {};
    if (cards) {
        for (const [id, card] of Object.entries(cards)) {
            if (!card) continue;
            const dbDef = (card.cardId && CARD_DATABASE[card.cardId]) ? CARD_DATABASE[card.cardId] : null;
            enrichedCards[id] = {
                ...(dbDef || {}),
                ...card,
                imageUrl: card.imageUrl || dbDef?.imageUrl,
                name: card.name || dbDef?.name || '',
                nameJa: card.nameJa || dbDef?.nameJa || '',
                description: card.description || dbDef?.description || '',
                descriptionJa: card.descriptionJa || dbDef?.descriptionJa || '',
            };
        }
    }
    return snapshots.map(snap => ({
        ...snap,
        cards: enrichedCards,
    }));
}

/**
 * 古い形式（生の history 配列）か新しい圧縮形式かを判定する。
 */
export function isCompressedHistory(data: any): data is CompressedHistory {
    return (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'snapshots' in data &&
        'cards' in data &&
        data.version === 1
    );
}
