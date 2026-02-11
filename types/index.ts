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
}

export type ZoneType = 'DECK' | 'HAND' | 'GRAVEYARD' | 'BANISHED' | 'EXTRA_DECK' | 'MONSTER_ZONE' | 'SPELL_TRAP_ZONE' | 'FIELD_ZONE' | 'MATERIAL' | 'EXTRA_MONSTER_ZONE';

export interface GameState {
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
    normalSummonUsed: boolean;
    materials: { [hostId: string]: string[] }; // hostId -> list of attached cardIds

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
    cardPropertyModifiers: { [cardId: string]: { level?: number, attack?: number, defense?: number } };

    history: Partial<GameState>[];
    isLinkSummoningActive: boolean;
    isMaterialMove: boolean;
    isTellBuffActive: boolean;
    lastEffectSourceId: string | null;
}

export interface DragItem {
    id: string; // Instance ID
    fromZone: ZoneType;
    fromIndex?: number;
}
