'use client';

import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Board } from '@/components/Board';
import { Hand } from '@/components/Hand';
import { LogWindow } from '@/components/LogWindow';
import { Card } from '@/components/Card';
import { SearchModal } from '@/components/SearchModal';
import { useGameStore } from '@/store/gameStore';
import { CARD_DATABASE } from '@/data/cards';
import { Card as CardType, ZoneType } from '@/types';
import { DeckArea } from '@/components/DeckArea';
import { EffectSelectionModal } from '@/components/EffectSelectionModal';

export default function Home() {
  const { initializeGame, moveCard, deck, setDeck, cards, activeDragId, setDragState } = useGameStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    // Initialize Game
    // Filter Card Database
    const allCardIds = Object.keys(CARD_DATABASE);
    const extraDeckTypes = ['FUSION', 'SYNCHRO', 'XYZ', 'LINK'];

    const extraDeckList: string[] = [];
    const mainDeckCandidates: string[] = [];

    allCardIds.forEach(id => {
      const def = CARD_DATABASE[id];
      const st = def.subType ? def.subType.toUpperCase() : '';
      const isExtra = extraDeckTypes.some(t => st.includes(t));

      // Machinex Exception: Known as Xyz/Pendulum (Extra Deck) logic handled in store, 
      // but for list building we just pass IDs. 
      // We want exactly 1 of each Extra Deck card.
      if (isExtra) {
        extraDeckList.push(id);
        // User Request: Gilgamesh (c017) should have 2 copies in Extra Deck
        if (id === 'c017') {
          extraDeckList.push(id); // Add second copy
        }
      } else {
        mainDeckCandidates.push(id);
      }
    });

    // Sort Extra Deck: Fusion -> Synchro -> Xyz -> Link
    const getExtraDeckOrder = (cardId: string): number => {
      const def = CARD_DATABASE[cardId];
      const st = def.subType ? def.subType.toUpperCase() : '';
      if (st.includes('FUSION')) return 1;
      if (st.includes('SYNCHRO')) return 2;
      if (st.includes('XYZ')) return 3;
      if (st.includes('LINK')) return 4;
      return 5;
    };
    extraDeckList.sort((a, b) => getExtraDeckOrder(a) - getExtraDeckOrder(b));


    // Build Final Deck List passed to initializeGame
    // initializeGame splits them, so we just provide a flat list.
    // However, we want 1 of each Extra Deck card, and ~40 Main Deck cards.

    // 1. Add Single Copy of each Extra Deck Card
    const finalDeckList = [...extraDeckList];

    // 2. Fill Main Deck
    // User Request: Fix Main Deck duplicates (Singleton display).
    // Sorting Order: P-Monsters (Level Asc), Non-P Monsters, Spells, Traps
    const sortedMain = [...mainDeckCandidates].sort((a, idB) => {
      const cardA = CARD_DATABASE[a];
      const cardB = CARD_DATABASE[idB];

      const getOrder = (c: any) => {
        if (c.type === 'MONSTER') {
          if (c.subType?.includes('PENDULUM')) return 1;
          return 2;
        }
        if (c.type === 'SPELL') return 3;
        if (c.type === 'TRAP') return 4;
        return 5;
      };

      const orderA = getOrder(cardA);
      const orderB = getOrder(cardB);

      if (orderA !== orderB) return orderA - orderB;

      // Same category: For P-Monsters, sort by Level
      if (orderA === 1) {
        const levelDiff = (cardA.level || 0) - (cardB.level || 0);
        if (levelDiff !== 0) return levelDiff;
      }

      // Specific Swap for User Request: Necro Slime (c015) vs Defense Soldier (c033)
      // User wants Defense Soldier first? Or Necro Slime first?
      // Current ID sort: c015 < c033. (Necro < Defense).
      // Request: "Swap them". So Defense < Necro.
      if (a === 'c015' && idB === 'c033') return 1;
      if (a === 'c033' && idB === 'c015') return -1;

      // Specific Swap for User Request: Swamp King (c006) vs Zero King (c034)
      // Natural: c006 < c034. Swap -> Zero King (c034) First.
      if (a === 'c006' && idB === 'c034') return 1;
      if (a === 'c034' && idB === 'c006') return -1;

      // Secondary sort by ID to ensure deterministic order
      return a.localeCompare(idB);
    });
    finalDeckList.push(...sortedMain);

    initializeGame(CARD_DATABASE, finalDeckList);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as CardType;
    if (card) {
      setActiveCard(card);
      setDragState(true, card.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Always reset drag state
    setDragState(false, null);
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if both IDs are in the deck - if so, it's a sort operation
    const currentDeck = useGameStore.getState().deck;
    if (currentDeck.includes(activeId) && (currentDeck.includes(overId) || overId === 'deck-zone')) {
      const oldIndex = currentDeck.indexOf(activeId);
      const newIndex = currentDeck.includes(overId) ? currentDeck.indexOf(overId) : currentDeck.length - 1;

      if (oldIndex !== -1 && oldIndex !== newIndex) {
        const hMove = arrayMove(currentDeck, oldIndex, newIndex);
        setDeck(hMove);
      }
      return;
    }

    const targetData = over.data.current;

    if (targetData && targetData.type) {
      const zoneType = targetData.type as ZoneType;
      const index = targetData.index; // might be undefined

      const store = useGameStore.getState();

      // Rule: Block drag from Hand to Extra Deck/Graveyard/Banished (must use effects)
      const fromHand = store.hand.includes(activeId);
      if (fromHand && (zoneType === 'EXTRA_DECK' || zoneType === 'GRAVEYARD' || zoneType === 'BANISHED')) {
        console.warn('Cannot drag from Hand to Extra Deck/GY/Banished.');
        setDragState(false, null);
        setActiveCard(null);
        return;
      }

      // Rule: Block Hand to EMZ (Extra Deck monsters only)
      if (fromHand && zoneType === 'EXTRA_MONSTER_ZONE') {
        console.warn('Cannot Summon from Hand to EMZ.');
        store.addLog('Cannot Summon from Hand to Extra Monster Zone.');
        setDragState(false, null);
        setActiveCard(null);
        return;
      }

      // Rule: Block Monster Zone <-> Graveyard/Banished D&D
      const fromMonsterZone = store.monsterZones.includes(activeId) || store.extraMonsterZones.includes(activeId);
      const fromGYorBanished = store.graveyard.includes(activeId) || store.banished.includes(activeId);
      const toGYorBanished = zoneType === 'GRAVEYARD' || zoneType === 'BANISHED';
      const toMonsterZone = zoneType === 'MONSTER_ZONE' || zoneType === 'EXTRA_MONSTER_ZONE';

      if (fromMonsterZone && toGYorBanished) {
        console.warn('Cannot drag Monster Zone card to GY/Banished.');
        // Log removed per user request
        setDragState(false, null);
        setActiveCard(null);
        return;
      }

      if (fromGYorBanished && toMonsterZone) {
        console.warn('Cannot drag GY/Banished card to Monster Zone.');
        // Log removed per user request
        setDragState(false, null);
        setActiveCard(null);
        return;
      }

      console.log('Dropped', activeId, 'on', zoneType, index);
      moveCard(activeId, zoneType, index);
    }

  };

  if (!deck) return <div>Loading...</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main style={{
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        background: 'radial-gradient(circle at center, #1a1a1a, #000)',
        overflow: 'hidden', // Main container hidden, children scroll
        display: 'flex',
        flexDirection: 'row', // Horizontal layout
      }}>

        {/* Main Game Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 20px',
          overflowY: 'auto',
          height: '100vh'
        }}>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '10px', width: '100%', maxWidth: '900px' }}>
            Yu-Gi-Oh! Simulator (Solo)
          </div>

          {/* 1. Board Area */}
          <Board />

          {/* 2. Hand Area */}
          <Hand />

          {/* 3. Deck Area */}
          <DeckArea />
        </div>

        {/* Sidebar Log Area */}
        <div style={{
          width: '320px',
          borderLeft: '1px solid #333',
          background: 'rgba(0,0,0,0.5)',
          padding: '20px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <LogWindow />
        </div>

        <SearchModal />
        <EffectSelectionModal />

        <DragOverlay>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>
      </main>
    </DndContext>
  );
}
