import { Card } from '@/types';

// Simplified Card Database
export const CARD_DATABASE: { [key: string]: Omit<Card, 'id'> } = {



    'c004': {
        cardId: 'c004',
        name: 'DD Savant Kepler',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 10. [Monster Effect] If Summoned: You can target 1 other "DD" card; return it to hand. OR Add 1 "Dark Contract" card from Deck to Hand.',
        attack: 0,
        defense: 0,
        level: 1,
        scale: 10,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314205042.png'
    },
    'c009': {
        cardId: 'c009',
        name: 'DD Savant Copernicus',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 1. [Monster Effect] If Summoned: You can send 1 "DD" or "Dark Contract" card from Deck to GY.',
        attack: 0,
        defense: 0,
        level: 4,
        scale: 1,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314205111.png'
    },
    'c005': {
        cardId: 'c005',
        name: 'Dark Contract with the Gate',
        type: 'SPELL',
        subType: 'CONTINUOUS',
        description: 'During your main phase: You can add 1 DD monster from Deck to Hand.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314230459.png'
    },
    'c006': {
        cardId: 'c006',
        name: 'Dark Contract with the Swamp King',
        type: 'SPELL',
        subType: 'CONTINUOUS',
        description: '[1] Main Phase: Fusion Summon 1 Fiend Fusion Monster using material from hand/field. If Summoning "DD", can also banish material from GY.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314230251.png'
    },
    'c007': {
        cardId: 'c007',
        name: 'DDD Flame King Genghis',
        type: 'MONSTER',
        subType: 'FUSION/EFFECT',
        description: 'Level 6 Fusion. Materials: 2 "DD" monsters. [Effect] If another "DD" is SS: Target 1 "DD" in GY; SS it.',
        attack: 2000,
        defense: 1500,
        level: 6,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314232418.png'
    },
    'c008': {
        cardId: 'c008',
        name: 'DDD Oblivion King Abyss Ragnarok',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 5. [P Effect] If "DD" SS: Target "DD" in GY; SS it, take 1000 dmg. [Monster Effect] (1) If Summoned: Target "DDD" in GY; SS it. (2) Tribute other "DD", Target opponent monster; Banish it.',
        attack: 2200,
        defense: 3000,
        level: 8,
        scale: 5,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314225718.png'
    },
    'c010': {
        cardId: 'c010',
        name: 'DD Savant Thomas',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 6. [P Effect] Add 1 face-up "DD" P-Monster from Extra Deck to Hand. [Monster Effect] Target 1 "DD" card in P-Zone; destroy it, and SS 1 Level 8 "DDD" from Deck.',
        attack: 1800,
        defense: 2600,
        level: 8,
        scale: 6,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314230158.png'
    },
    'c011': {
        cardId: 'c011',
        name: 'DD Orthros',
        type: 'MONSTER',
        subType: 'TUNER/PENDULUM/EFFECT',
        description: 'Pendulum Scale: 3. [P Effect] Target 1 "DD" or "Dark Contract" card and 1 Spell/Trap; destroy them. [Monster Effect] SS from hand upon taking damage.',
        attack: 600,
        defense: 1800,
        level: 4,
        scale: 3,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314205154.png'
    },
    'c012': {
        cardId: 'c012',
        name: 'DD Count Surveyor',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 1. [Monster Effect] (1) Discard 1 other "DD" to SS from hand. (2) If Summoned: Add 1 "DD" monster with 0 ATK or 0 DEF from Deck to Hand.',
        attack: 2000,
        defense: 2000,
        level: 8,
        scale: 1,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314232712.png'
    },
    'c013': {
        cardId: 'c013',
        name: 'DD Gryphon',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 1. [Monster Effect] (1) You can Special Summon this card from your Hand. (2) If SS from GY: Add 1 "DD" card. (3) If P-Summon: Discard "DD" or "Contract" to Draw 1. [P Effect] Target Fiend; ATK up, destroy this card.',
        attack: 1200,
        defense: 1200,
        level: 4,
        scale: 1,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314225644.png'
    },
    'c014': {
        cardId: 'c014',
        name: 'DD Scale Surveyor',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Pendulum Scale: 9. [P Effect] Target P-Card; Scale becomes 0. [Monster Effect] (1) If you control a "DD" P-Card: Special Summon from Hand. (2) Change Level to 4. (3) If sent to GY/Extra: Return "DD" P-Card to hand.',
        attack: 0,
        defense: 1000,
        level: 2,
        scale: 9,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314232508.jpg'
    },
    'c015': {
        cardId: 'c015',
        name: 'DD Necro Slime',
        type: 'MONSTER',
        subType: 'EFFECT',
        description: '[Ignition-GY] Banish this and another DD from GY; Fusion Summon DDD from Extra Deck.',
        attack: 300,
        defense: 300,
        level: 1,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314203249.png'
    },
    'c016': {
        cardId: 'c016',
        name: 'Dark Contract with the Witch',
        type: 'TRAP',
        subType: 'CONTINUOUS',
        description: '[1] Send 1 "DD" or "Dark Contract" from Hand to GY, Target 1 card; Destroy it. [2] Fiends gain 1000 ATK during opp turn.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250325/20250325170033.png'
    },
    'c017': {
        cardId: 'c017',
        name: 'DDD Abyss King Gilgamesh',
        type: 'MONSTER',
        subType: 'LINK/EFFECT',
        description: 'Link-2. [1] If Special Summoned: Place 2 "DD" P-Monsters from Deck in Zones, take 1000 dmg.',
        attack: 1800,
        defense: 0,
        level: 0, // Link has no level
        linkMarkers: ['BOTTOM_LEFT', 'BOTTOM_RIGHT'],
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231042.png'
    },
    'c018': {
        cardId: 'c018',
        name: 'DDD Deviser King Deus Machinex',
        type: 'MONSTER',
        subType: 'XYZ/PENDULUM/EFFECT',
        description: 'Rank 10. Scale 10. [P-Effect] If P-Card in other zone: Special Summon it, place Target P-Monster in P-Zone. [Monster Effect] (Quick): Detach 2 materials or destroy Dark Contract; Attach opponent card as material.',
        attack: 3000,
        defense: 3000,
        rank: 10,
        scale: 10,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231803.png'
    },
    'c019': {
        cardId: 'c019',
        name: 'DDD Flame High King Genghis',
        type: 'MONSTER',
        subType: 'FUSION/EFFECT',
        description: 'Level 8 Fusion. [1] If another "DD" is SS: Target 1 "DD" in GY; SS it. [2] Manual trigger: Negate S/T effect during your turn.',
        attack: 2800,
        defense: 2400,
        level: 8,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231842.png'
    },
    'c020': {
        cardId: 'c020',
        name: 'DDD Cursed King Siegfried',
        type: 'MONSTER',
        subType: 'SYNCHRO/EFFECT',
        description: 'Level 8 Synchro. Tuner + non-Tuner "DD". [1] Quick Effect: Target 1 face-up S/T; negate effect until next Standby. [2] If destroyed: Gain 1000 LP per "Dark Contract".',
        attack: 2800,
        defense: 2200,
        level: 8,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231147.png'
    },
    'c021': {
        cardId: 'c021',
        name: 'DDD Marksman King Tell',
        type: 'MONSTER',
        subType: 'XYZ/EFFECT',
        description: 'Rank 5 Xyz. 2 Level 5 monsters. Can Xyz Summon on "DDD" Rank 4. [1] Once per turn, if you take effect dmg: Detach 1, Target 1 monster; -1000 ATK/DEF, inflict 1000 dmg. [2] If sent to GY: Send 1 "DD" or "Dark Contract" from Deck to GY.',
        attack: 2300,
        defense: 2000,
        rank: 5,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231536.png'
    },
    'c022': {
        cardId: 'c022',
        name: 'DDD Wave King Caesar',
        type: 'MONSTER',
        subType: 'XYZ/EFFECT',
        description: 'Rank 4 Xyz. 2 Level 4 Fiend monsters. [1] Quick Effect: Detach 1; At end of Battle Phase, SS monsters destroyed this turn from GY. Next Standby, take 1000 dmg per monster. [2] If sent to GY: Add 1 "Dark Contract" card from Deck to Hand.',
        attack: 2400,
        defense: 1200,
        rank: 4,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231447.png'
    },
    'c023': {
        cardId: 'c023',
        name: 'DDD Wave High King Caesar',
        type: 'MONSTER',
        subType: 'XYZ/EFFECT',
        description: 'Rank 6 Xyz. 2 Level 6 Fiends. [1] Quick Effect: When effect that SS monster activates: Detach 1; negate activation, destroy it. Then you can make this and 1 "DD" gain 1800 ATK. [2] If sent to GY: Add 1 "Dark Contract" card from Deck to Hand.',
        attack: 2800,
        defense: 1800,
        rank: 6,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314231220.png'
    },
    'c024': {
        cardId: 'c024',
        name: 'Dark Contract with the Eternal Darkness',
        type: 'TRAP',
        subType: 'CONTINUOUS',
        description: '[1] While you have 2 "DD" cards in P-Zones: Opponent cannot target monsters on field with Spells/Traps, tribute them for Tribute Summon, or use as material for Fusion/Synchro/Xyz. [2] Standby Phase: Take 1000 dmg.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250325/20250325170216.png'
    },
    'c025': {
        cardId: 'c025',
        name: 'DDD Wise King Solomon',
        type: 'MONSTER',
        subType: 'XYZ/EFFECT',
        description: 'Rank 4 Xyz. 2 Level 4 "DD" monsters. [1] Detach 1; Add 1 "DD" card from Deck to Hand. [2] If banished: Target 1 "DD" monster; it gains effect "If this card destroys monster by battle: Inflict damage equal to destroyed monster\'s original ATK".',
        attack: 1800,
        defense: 2500,
        rank: 4,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193141.png'
    },
    'c026': {
        cardId: 'c026',
        name: 'DDD First King Clovis',
        type: 'MONSTER',
        subType: 'SYNCHRO/EFFECT',
        description: 'Level 6 Synchro. Tuner + non-Tuner. [1] If Synchro Summoned: Target 1 banished "DD" monster; Special Summon it. If you have "Dark Contract", can target from GY instead. [2] If banished: This turn, your "DD" monsters inflict piercing battle damage.',
        attack: 2100,
        defense: 1900,
        level: 6,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193829.png'
    },
    'c027': {
        cardId: 'c027',
        name: 'DDD Alfred the Divine Sage King',
        type: 'MONSTER',
        subType: 'FUSION/EFFECT',
        description: 'Level 6 Fusion. 2 "DD" monsters. [1] Main Phase: Fusion Summon 1 "DDD" Fusion Monster from Extra Deck, by returning materials from Hand/Field/Banished to Deck. [2] If banished: Target "Dark Contract" Continuous S/T in GY/Banished up to # of "DDD" monsters you control; Place them face-up on field.',
        attack: 1500,
        defense: 2000,
        level: 6,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193017.png'
    },
    'c028': {
        cardId: 'c028',
        name: 'DDD Sky King Zeus Ragnarok',
        type: 'MONSTER',
        subType: 'LINK/EFFECT',
        description: 'Link-3. 2+ "DD" monsters. [1] Target 1 "DD" or "Dark Contract" you control; destroy it, and if you do, treat this as an extra Pendulum Summon allowing you to P-Summon "DD" monsters. [2] When opp activates monster effect from Hand: Banish 1 "DD" and 1 "Dark Contract" from GY; Negate activation.',
        attack: 2200,
        level: 0, // Link has no level
        linkMarkers: ['BOTTOM_LEFT', 'BOTTOM', 'BOTTOM_RIGHT'],
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193118.png'
    },
    'c029': {
        cardId: 'c029',
        name: 'DDDD Dimensional King Arc Crisis',
        type: 'MONSTER',
        subType: 'FUSION/PENDULUM/EFFECT',
        description: 'Level 12 Fusion Pendulum. Scale 13. [P-Effect] [1] Once per turn: Target any number of "Dark Contract" cards you control; destroy them, and SS "Super Doom King" P-Monsters from Deck/Extra Deck equal to destroyed number. [Monster Effect] (This card is always treated as "Super Doom King"). [1] If SS: Negate effects of all face-up monsters opponent controls. [2] Attacks all opponent monsters once each. [3] If destroyed in Monster Zone: Place in P-Zone.',
        attack: 4000,
        defense: 4000,
        level: 12,
        scale: 13,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193217.png'
    },
    'c030': {
        cardId: 'c030',
        name: 'DDD Zero Doom Queen Machinex',
        type: 'MONSTER',
        subType: 'PENDULUM/EFFECT',
        description: 'Level 8 Pendulum. Scale 0. [P-Effect] [1] Once per turn: During your Main Phase if this card was activated this turn: Place 1 "Dark Contract" Continuous S/T from Deck face-up in your S/T Zone. [Monster Effect] [1] If this is face-up in Extra Deck and your "DDD" or "Dark Contract" is destroyed: SS this card, then destroy 1 card on field. [2] If destroyed in Monster Zone: Place in P-Zone.',
        attack: 3000,
        defense: 0,
        level: 8,
        scale: 0,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193037.png'
    },
    'c031': {
        cardId: 'c031',
        name: 'DDD Headhunt',
        type: 'TRAP',
        subType: 'NORMAL',
        description: '[1] While you control a "DDD" monster: Target 1 face-up monster opponent controls; take control of it until the End Phase of the next turn. Its effects are negated, it cannot attack. If it was SS from Extra Deck, it is also treated as a "DDD" monster.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20250314/20250314230639.png'
    },
    'c032': {
        cardId: 'c032',
        name: 'DD Lance Soldier',
        type: 'MONSTER',
        subType: 'TUNER/EFFECT',
        description: 'Level 2 Tuner. [1] Once per turn: Target 1 "DD" monster you control; increase its Level by number of "Dark Contract" cards on your field/GY. [2] If in GY: Target 1 "Dark Contract" card you control; destroy it, and SS this card. Banish it when it leaves field.',
        attack: 400,
        defense: 400,
        level: 2,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193528.png'
    },
    'c033': {
        cardId: 'c033',
        name: 'DD Defense Soldier',
        type: 'MONSTER',
        subType: 'EFFECT',
        description: 'Level 4. [1] Activate 1 effect: ● Target "DD" in P-Zone; Special Summon it. ● Banish "DD" from GY; your "DDD" monsters cannot be responded to during Battle Phase this turn. [2] Banish this from GY; Add 1 "DD" P-Monster from face-up Extra Deck or GY to Hand.',
        attack: 0,
        defense: 1800,
        level: 4,
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193257.png'
    },
    'c034': {
        cardId: 'c034',
        name: 'Dark Contract with the Zero King',
        type: 'SPELL',
        subType: 'CONTINUOUS',
        description: '(This card is always treated as a "DD" card). [1] Once per turn: Target 1 other "DD" card you control; destroy it, and SS 1 "DD" monster from Deck. Lock into "DD" SS for rest of turn.',
        imageUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260203/20260203193404.png'
    },
    // Add more fillers to reach ~30 if needed, or duplicates in deck

};
