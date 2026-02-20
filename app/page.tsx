'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { GraveyardBanishedPreview } from '@/components/GraveyardBanishedPreview';
import { Card } from '@/components/Card';
import { SearchModal } from '@/components/SearchModal';
import { useGameStore } from '@/store/gameStore';
import { CARD_DATABASE } from '@/data/cards';
import { Card as CardType, ZoneType } from '@/types';
import { DeckArea } from '@/components/DeckArea';
import { EffectSelectionModal } from '@/components/EffectSelectionModal';
import { ShareModal } from '@/components/ShareModal';
import { formatLog } from '@/data/locales';

function ReplayLoader() {
  const searchParams = useSearchParams();
  const replayId = searchParams.get('replayId');
  const { loadArchive } = useGameStore();

  useEffect(() => {
    if (replayId) {
      fetch(`/api/archive/${replayId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.history) {
            loadArchive(data);
          }
        })
        .catch(err => console.error('Failed to load replay', err));
    }
  }, [replayId, loadArchive]);

  return null;
}

export default function Home() {
  const {
    initializeGame,
    moveCard,
    deck,
    setDeck,
    cards,
    activeDragId,
    setDragState,
    backgroundColor,
    setBackgroundColor,
    fieldColor,
    setFieldColor,
    useGradient,
    setUseGradient,
    replaySpeed,
    setReplaySpeed,
    cycleReplaySpeed,
    showPendulumCutIn,
    logOrder,
    toggleLogOrder,
    stopReplay,
    replay,
    isReplaying,
    logs,
    jumpHistory,
    returnFromJump
  } = useGameStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [showLog, setShowLog] = useState(true); // Toggle between Log and Preview
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Toggle Sidebar Visibility
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<{ total: number; daily: number } | null>(null);

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
      const isExtra = extraDeckTypes.some(type => st.includes(type));

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
      if (a === 'c015' && idB === 'c033') return 1;
      if (a === 'c033' && idB === 'c015') return -1;

      // Specific Swap for User Request: Swamp King (c006) vs Zero King (c034)
      if (a === 'c006' && idB === 'c034') return 1;
      if (a === 'c034' && idB === 'c006') return -1;

      // Primary sort by numeric part of ID
      const numA = parseInt(a.replace(/\D/g, '').padStart(3, '0'));
      const numB = parseInt(idB.replace(/\D/g, '').padStart(3, '0'));
      if (numA !== numB) return numA - numB;

      return a.localeCompare(idB);
    });

    initializeGame(CARD_DATABASE, [...sortedMain, ...extraDeckList]);
  }, [initializeGame]);

  useEffect(() => {
    // Record and Fetch Access Stats
    fetch('/api/analytics', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total === 'number') {
          setAnalytics(data);
        }
      })
      .catch(err => console.error('Failed to update analytics', err));
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
        store.addLog(formatLog('log_error_hand_to_emz'));
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

  if (!deck) return <div>{formatLog('ui_loading')}</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Suspense fallback={null}>
        <ReplayLoader />
      </Suspense>
      <main className="main-container" style={{
        background: useGradient
          ? `radial-gradient(circle at center, ${backgroundColor || '#201025'}, #000)`
          : (backgroundColor || '#000000')
      }}>
        {/* Log Toggle Button */}
        <button
          className="log-toggle-btn"
          onClick={() => {
            if (!isSidebarOpen) {
              setIsSidebarOpen(true);
              // Keep current showLog state (or default to Log?)
            } else {
              // Toggle between Log and Preview
              setShowLog(!showLog);
            }
          }}
          style={{ zIndex: 101, width: '100px' }} // Ensure above log area
        >
          {/* Label Logic: 
              If Closed: "Open Sidebar" (or "Log/Preview")
              If Open & Log: "Show Preview"
              If Open & Preview: "Show Log"
          */}
          {!isSidebarOpen ? 'Log/Preview' : (showLog ? 'Preview' : 'Log')}
        </button>

        {/* Main Game Area */}
        <div className="game-area">
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '10px', width: '100%', maxWidth: '900px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Controls Container (Moved Title out, changed to flex-end) */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

              {/* Replay / Stop Control */}
              {useGameStore.getState().isReplaying ? (
                <button
                  onClick={() => useGameStore.getState().stopReplay()}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    backgroundColor: '#f44336',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ■ {formatLog('ui_stop')}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => useGameStore.getState().replay()}
                    disabled={useGameStore.getState().logs.length === 0}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#4caf50',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: useGameStore.getState().logs.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: useGameStore.getState().logs.length === 0 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ▶ {formatLog('ui_replay')}
                  </button>
                </>
              )}

              {/* Return Jump (Conditional) */}
              {useGameStore.getState().jumpHistory && useGameStore.getState().jumpHistory.length > 0 && (
                <button
                  onClick={() => useGameStore.getState().returnFromJump()}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    backgroundColor: '#2196F3',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  ↩ {formatLog('ui_return_jump')}
                </button>
              )}

              {/* Replay Speed Control (Cycle Button) */}
              <button
                onClick={() => cycleReplaySpeed()}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  backgroundColor: '#ff9800', // Orange
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  minWidth: '60px'
                }}
                title="Cycle Replay Speed (1-5)"
              >
                Speed: x{replaySpeed}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#888' }}>Field:</span>
                <input
                  type="color"
                  value={fieldColor}
                  onChange={(e) => setFieldColor(e.target.value)}
                  style={{ width: '20px', height: '20px', border: 'none', padding: '0', background: 'none', cursor: 'pointer' }}
                  title="Change Field Zone Color"
                />
              </div>

              {/* Background Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Color Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', color: '#888' }}>BG:</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    style={{ width: '20px', height: '20px', border: 'none', padding: '0', background: 'none', cursor: 'pointer' }}
                    title="Change Background Color"
                  />
                </div>

                {/* Gradient Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: '#888' }}>
                  <input
                    type="checkbox"
                    checked={useGradient}
                    onChange={(e) => setUseGradient(e.target.checked)}
                  />
                  Gradient
                </label>
              </div>

              {/* Language Switch */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => useGameStore.getState().setLanguage('en')}
                  style={{
                    background: useGameStore.getState().language === 'en' ? '#fff' : 'none',
                    color: useGameStore.getState().language === 'en' ? '#000' : '#888',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 6px',
                    fontWeight: useGameStore.getState().language === 'en' ? 'bold' : 'normal',
                  }}
                >
                  English
                </button>
                <button
                  onClick={() => useGameStore.getState().setLanguage('ja')}
                  style={{
                    background: useGameStore.getState().language === 'ja' ? '#fff' : 'none',
                    color: useGameStore.getState().language === 'ja' ? '#000' : '#888',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 6px',
                    fontWeight: useGameStore.getState().language === 'ja' ? 'bold' : 'normal',
                  }}
                >
                  日本語
                </button>
              </div>
            </div>
          </div>


          {/* 1. Board Area */}
          <Board />

          {/* 2. Hand Area */}
          <Hand />

          {/* 3. Deck Area */}
          <DeckArea />
        </div>

        {/* Sidebar Log Area */}
        <div
          className={`log-area ${isSidebarOpen ? 'open' : ''}`}
          style={{
            // PC override: if !showLog, hide it. 
            // Mobile uses specific CSS classes/media queries, but 'display: none' works generally if we want to hide it.
            // However, mobile slides it out.
            // Let's use display: none for PC when closed to reclaim space.
            display: isSidebarOpen ? 'flex' : 'none'
          }}
        >
          {showLog ? (
            <LogWindow
              onClose={() => setIsSidebarOpen(false)}
              onOpenShare={() => setIsShareModalOpen(true)}
            />
          ) : (
            <GraveyardBanishedPreview onClose={() => setIsSidebarOpen(false)} />
          )}
        </div>

        <SearchModal />

        <EffectSelectionModal />
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

        <DragOverlay>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        {/* Pendulum Summon Cut-in Overlay */}
        {showPendulumCutIn && (
          <div style={{
            position: 'fixed',
            top: '40%', // Roughly over Monster Zones
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeInOut 2s ease-in-out forwards'
          }}>
            <style jsx>{`
                    @keyframes fadeInOut {
                        0% { opacity: 0; letter-spacing: 0.1em; transform: translate(-50%, -50%) scale(0.9); }
                        20% { opacity: 1; letter-spacing: 0.2em; transform: translate(-50%, -50%) scale(1.0); }
                        80% { opacity: 1; letter-spacing: 0.2em; transform: translate(-50%, -50%) scale(1.0); }
                        100% { opacity: 0; letter-spacing: 0.3em; transform: translate(-50%, -50%) scale(1.1); }
                    }
                `}</style>
            <h1 style={{
              fontSize: '4rem',
              color: 'rgba(0, 0, 0, 0.6)',
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontWeight: 'bold',
              textAlign: 'center',
              margin: 0,
              whiteSpace: 'nowrap',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
            }}>
              PENDULUM SUMMON
            </h1>
          </div>
        )}

        {/* Footer Statistics */}
        {analytics && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '20px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '10px',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <span>{formatLog('ui_total_access')}: {analytics.total}</span>
            <span>{formatLog('ui_daily_access')}: {analytics.daily}</span>
          </div>
        )}
      </main>
    </DndContext>
  );
}
