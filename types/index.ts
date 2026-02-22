export type CardType = 'MONSTER' | 'SPELL' | 'TRAP';
export type CardSubType = 'NORMAL' | 'EFFECT' | 'CONTINUOUS' | 'COUNTER' | 'FIELD' | 'QUICK-PLAY' | 'FUSION/EFFECT' | 'SYNCHRO/EFFECT' | 'XYZ/EFFECT' | 'LINK/EFFECT' | 'FUSION/PENDULUM/EFFECT' | 'PENDULUM/EFFECT' | 'TUNER/EFFECT' | 'XYZ/PENDULUM/EFFECT' | 'SYNCHRO/PENDULUM/EFFECT' | 'TUNER/PENDULUM/EFFECT';

export interface Card {
    id: string; // Unique instance ID
    cardId: string; // ID referencing the card definition (e.g. "c1" for "DDD...")
    name: string;
    type: CardType;
    subType?: CardSubType;
    description: string;
    attack?: number;
    defense?: number;
    level?: number;
    rank?: number;
    scale?: number; // Pendulum Scale
    linkMarkers?: string[]; // Link Markers e.g. ['BOTTOM_LEFT', 'BOTTOM_RIGHT']
    imageUrl?: string; // For now can be placeholder or local path
    flags?: string[]; // Dynamic flags like 'BANISH_ON_LEAVE'
    nameJa?: string;
    descriptionJa?: string;
    faceUp?: boolean; // Track Face-Up state (mainly for Extra Deck)
}

export type ZoneType = 'DECK' | 'HAND' | 'GRAVEYARD' | 'BANISHED' | 'EXTRA_DECK' | 'MONSTER_ZONE' | 'SPELL_TRAP_ZONE' | 'FIELD_ZONE' | 'MATERIAL' | 'EXTRA_MONSTER_ZONE';

export interface GameState {
    cards: { [id: string]: Card }; // Map of instance ID to Card data
    deck: string[]; // List of Card Instance IDs
    hand: string[];
    graveyard: string[];
    banished: string[];
    extraDeck: string[];

    // Field Zones (indexed 0-4 for main zones)
    monsterZones: (string | null)[];
    spellTrapZones: (string | null)[];
    fieldZone: string | null;
    extraMonsterZones: (string | null)[]; // [Left, Right]

    // New State
    lp: number;
    language: 'en' | 'ja';
    normalSummonUsed: boolean;
    materials: { [hostId: string]: string[] }; // hostId -> list of attached cardIds
    backgroundColor: string; // User preference
    useGradient: boolean; // Gradient background preference
    fieldColor: string; // Field zone color preference

    // Logs
    logs: string[];

    // Tracking
    turnEffectUsage: { [key: string]: number }; // cardId_effectId -> count
    cardFlags: { [id: string]: string[] }; // id -> list of active flags (e.g. 'c030_locked')
    triggerCandidates: string[]; // List of card IDs that have pending optional triggers (Green Glow)

    // Pendulum State
    pendulumSummonCount: number;
    pendulumSummonLimit: number;

    // Modifiers
    cardPropertyModifiers: { [cardId: string]: Partial<Card> };
    // UI Helpers
    isDragging: boolean;
    activeDragId: string | null;
    activeEffectCardId: string | null; // For Replay Highlighting
    pendulumCandidates: string[];
    history: Partial<GameState>[];
    isLinkSummoningActive: boolean;
    isMaterialMove: boolean;
    isTellBuffActive: boolean;
    lastEffectSourceId: string | null;
    isReplaying: boolean;
    isPendulumProcessing: boolean;
    logCount?: number; // Optional count of logs for optimized history snapshots
}

export interface DragItem {
    id: string; // Instance ID
    fromZone: ZoneType;
    fromIndex?: number;
}
