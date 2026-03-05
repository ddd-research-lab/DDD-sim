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
import { SimToggles } from '@/components/SimToggles';

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
    showAshBlossomCutIn,
    showDrollCutIn,
    showInfiniteImpermanenceCutIn,
    showNibiruCutIn,
    logOrder,
    toggleLogOrder,
    stopReplay,
    replay,
    isReplaying,
    logs,
    jumpHistory,
    returnFromJump,
    activeEffectCardId
  } = useGameStore();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [showLog, setShowLog] = useState(true); // Toggle between Log and Preview
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Toggle Sidebar Visibility
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<{ total: number; daily: number } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [useAbbreviation, setUseAbbreviation] = useState(false);

  const CARD_ABBREVIATIONS: Record<string, string> = {
    'DD魔導賢者ケプラー': 'ケプラー',
    'DDスケール・サーベイヤー': 'スケール',
    'DD魔導賢者コペルニクス': 'コペル',
    'DDオルトロス': 'オルトロス',
    'DDグリフォン': 'グリフォン',
    'DDD壊薙王アビス・ラグナロク': 'アビス',
    'DD魔導賢者トーマス': 'トーマス',
    'DDカウント・サーベイヤー': 'カウント',
    'DDD零死王ゼロ・マキナ': 'ゼロマキナ',
    'DDネクロ・スライム': 'ネクロ',
    'DDランス・ソルジャー': 'ランス',
    'DDディフェンス・ソルジャー': 'ディフェンス',
    '地獄門の契約書': '地獄門',
    '魔神王の契約書': '魔神王',
    '零王の契約書': '零王',
    'ワン・フォー・ワン': 'ワンフォ',
    '戦乙女の契約書': '戦乙女',
    '常闇の契約書': '常闇',
    'DDDヘッドハント': 'ヘッドハント',
    '灰流うらら': 'うらら',
    '無限泡影': '泡影',
    '原始生命態ニビル': 'ニビル',
    'ドロール＆ロックバード': 'ドロバ',
    'ドロール&ロックバード': 'ドロバ',
    'DDD烈火王テムジン': 'テムジン',
    'DDD聖賢王アルフレッド': 'アルフレッド',
    'DDD烈火大王エグゼクティブ・テムジン': '大王テムジン',
    'DDDD偉次元元王アーク・クライシス': 'クライシス',
    'DDD創始王クロヴィス': 'クロヴィス',
    'DDD呪血王サイフリート': 'サイフリート',
    'DDD超死偉王ホワイテスト・ヘル・アーマゲドン': '白アーマゲドン',
    'DDD怒濤王シーザー': 'シーザー',
    'DDD智慧王ソロモン': 'ソロモン',
    'DDD狙撃王テル': 'テル',
    'DDD怒濤大王エグゼクティブ・シーザー': '大王シーザー',
    'DDD赦俿王デス・マキナ': 'デスマキナ',
    'DDD深淵王ビルガメス': 'ビルガメス',
    'DDD天空王ゼウス・ラグナロク': 'ゼウス',
  };

  const applyAbbreviations = (text: string): string => {
    let result = text;
    // Sort by length descending to replace longer names first (e.g., DDD烈火大王... before DDD烈火王...)
    const sortedKeys = Object.keys(CARD_ABBREVIATIONS).sort((a, b) => b.length - a.length);
    for (const fullName of sortedKeys) {
      result = result.replaceAll(fullName, CARD_ABBREVIATIONS[fullName]);
    }
    return result;
  };


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
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
      } else if (id !== 'c_token_nibiru') {
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

      // User Request: Swamp King (c006) vs Zero King (c034)
      if (a === 'c006' && idB === 'c034') return -1;
      if (a === 'c034' && idB === 'c006') return 1;

      // Ensure One for One (c036) is to the right of Swamp King (c006)
      if (a === 'c006' && idB === 'c036') return -1;
      if (a === 'c036' && idB === 'c006') return 1;

      // Explicit Swap: Zero King (c034) should be to the left of One for One (c036)
      if (a === 'c036' && idB === 'c034') return 1; // 036 comes after 034
      if (a === 'c034' && idB === 'c036') return -1;  // 034 comes before 036



      // Primary sort by numeric part of ID
      const numA = parseInt(a.replace(/\D/g, '').padStart(3, '0'));
      const numB = parseInt(idB.replace(/\D/g, '').padStart(3, '0'));
      if (numA !== numB) return numA - numB;

      return a.localeCompare(idB);
    });

    initializeGame(CARD_DATABASE, [...sortedMain, ...extraDeckList]);
  }, [initializeGame]);

  const copyLogsToClipboard = () => {
    const { logs, showZoneInLog } = useGameStore.getState();
    if (logs.length === 0) return;

    const cleanLog = (text: string) => {
      let cleaned = text;
      if (!showZoneInLog) {
        cleaned = cleaned
          .replace(/をモンスターゾーン\d+に/, 'を')
          .replace(/をEXモンスターゾーン\d+に/, 'を')
          .replace(/を魔法・罠ゾーン\d+に/, 'を')
          .replace(/をフィールドゾーンに/, 'を');
      }
      let result = cleaned
        .replace(/を?置きました。?/, 'を置く')
        .replace(/手札に加えました。?/, '手札に加える')
        .replace(/墓地へ送りました。?/, '墓地へ送る')
        .replace(/しました。?/, '');
      return result.replace(/[。\.]$/, '').trim();
    };

    const errorConditionLog = cleanLog(formatLog('log_error_condition'));
    const hoptSuffix = 'の効果は既に使用されています（ターン1回）';
    const startingHandPrefix = '初動：';

    const isTransient = (logText: string) => {
      const cleaned = cleanLog(logText);
      return cleaned === errorConditionLog || cleaned.includes(hoptSuffix) || cleaned.startsWith(startingHandPrefix);
    };

    const activeLogsCount = logs.filter(l => !isTransient(l)).length;
    let currentDisplayIndex = activeLogsCount;

    const exportLogs = logs.map((log) => {
      const transient = isTransient(log);
      const displayIndex = transient ? '' : `[${currentDisplayIndex--}] `;
      const text = useAbbreviation ? applyAbbreviations(cleanLog(log)) : cleanLog(log);
      return `${displayIndex}${text}`;
    });

    // Copy in chronological order (LogWindow's 'oldest' order)
    const textToCopy = [...exportLogs].reverse().join('\n');

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    });
  };

  const mainRef = React.useRef<HTMLDivElement>(null);

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

      // Rule: c036 (One for One) placement validation
      if (store.cards[activeId]?.cardId === 'c036' && zoneType === 'SPELL_TRAP_ZONE' && fromHand) {
        const hasLevel1InDeck = store.deck.some((id: string) => store.cards[id]?.level === 1 && store.cards[id]?.type === 'MONSTER');
        const hasOtherMonsterInHand = store.hand.some((id: string) => id !== activeId && store.cards[id]?.type === 'MONSTER');

        if (!hasLevel1InDeck || !hasOtherMonsterInHand) {
          store.addLog(store.language === 'ja' ? '発動条件を満たしていません。' : 'Activation conditions not met.');
          setDragState(false, null);
          setActiveCard(null);
          return;
        }
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
      <main
        ref={mainRef}
        className="main-container"
        style={{
          background: useGameStore.getState().useGradient
            ? `radial-gradient(circle at center, ${backgroundColor || '#201025'}, #000)`
            : (backgroundColor || '#000000'),
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
                  <a
                    href="/archive"
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#2196F3',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    📂 {formatLog('ui_archive')}
                  </a>
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

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '900px', margin: '5px auto' }}>
            <SimToggles />
          </div>

          {/* 3. Deck Area */}
          <DeckArea />

          {/* Footer Statistics (Moved inside left column to fix flex layout) */}
          {analytics && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginTop: '10px',
              paddingBottom: '20px'
            }}>
              <span>{formatLog('ui_total_access')}: {analytics.total}</span>
              <span>{formatLog('ui_daily_access')}: {analytics.daily}</span>
            </div>
          )}
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
              onCopyLogs={copyLogsToClipboard}
              copiedFeedback={copiedFeedback}
              useAbbreviation={useAbbreviation}
              onToggleAbbreviation={() => setUseAbbreviation(v => !v)}
              applyAbbreviations={applyAbbreviations}
            />
          ) : (
            <GraveyardBanishedPreview onClose={() => setIsSidebarOpen(false)} />
          )}
        </div>

        <SearchModal />

        <EffectSelectionModal />
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

        <DragOverlay dropAnimation={null}>
          {activeCard ? <Card card={activeCard} isOverlay /> : null}
        </DragOverlay>

        {/* Ash Blossom Cut-in Overlay */}
        {showAshBlossomCutIn && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            overflow: 'hidden'
          }}>
            <style jsx>{`
                    @keyframes blossomSlashFade {
                0% { transform: translateX(100%) skewX(-20deg); opacity: 0; }
                15% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                85% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                100% { transform: translateX(0) skewX(-20deg); opacity: 0; }
            }
            @keyframes blossomFadeOut {
                0% { opacity: 0; transform: scale(0.9); }
                15% { opacity: 1; transform: scale(1); }
                85% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(1); }
            }
                `}</style>

            {/* Background Slash */}
            <div style={{
              position: 'absolute',
              width: '120%',
              height: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 182, 193, 0.4), transparent)',
              animation: 'blossomSlashFade 1.333s ease-in-out forwards',
              zIndex: 1
            }} />

            {/* Ash Blossom Image */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              animation: 'blossomFadeOut 1.333s ease-in-out forwards',
              textAlign: 'center'
            }}>
              <img
                src="https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260223/20260223103939.png"
                alt="Ash Blossom"
                style={{
                  height: '300px',
                  boxShadow: '0 0 50px rgba(255, 182, 193, 0.5)',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
              <h2 style={{
                color: '#fff',
                marginTop: '20px',
                fontSize: '2rem',
                fontWeight: 'bold',
                textShadow: '0 0 10px #ff69b4, 0 0 20px #ff69b4',
                fontFamily: 'serif',
                letterSpacing: '0.1em'
              }}>
                灰流うらら
              </h2>
            </div>
          </div>
        )}

        {/* Infinite Impermanence Cut-in Overlay */}
        {showInfiniteImpermanenceCutIn && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            overflow: 'hidden'
          }}>
            <style jsx>{`
              @keyframes impermanenceSlashFade {
                0% { transform: translateX(100%) skewX(-20deg); opacity: 0; }
                15% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                85% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                100% { transform: translateX(0) skewX(-20deg); opacity: 0; }
              }
              @keyframes impermanenceFadeOut {
                0% { opacity: 0; transform: scale(0.9); }
                15% { opacity: 1; transform: scale(1); }
                85% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(1); }
              }
            `}</style>

            {/* Background Slash (Red) */}
            <div style={{
              position: 'absolute',
              width: '120%',
              height: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.4), transparent)',
              animation: 'impermanenceSlashFade 1.333s ease-in-out forwards',
              zIndex: 1
            }} />

            {/* Infinite Impermanence Image Area */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              animation: 'impermanenceFadeOut 1.333s ease-in-out forwards',
              textAlign: 'center'
            }}>
              <img
                src="https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260224/20260224114430.png"
                alt="Infinite Impermanence"
                style={{
                  height: '300px',
                  boxShadow: '0 0 50px rgba(255, 0, 0, 0.6)',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
              <h2 style={{
                color: '#fff',
                marginTop: '12px',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000',
                fontFamily: 'serif',
                letterSpacing: '0.2em'
              }}>
                無限泡影
              </h2>
            </div>
          </div>
        )}

        {/* Droll & Lock Bird Cut-in Overlay */}
        {showDrollCutIn && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            overflow: 'hidden'
          }}>
            <style jsx>{`
              @keyframes drollSlashFade {
                0% { transform: translateX(-100%) skewX(20deg); opacity: 0; }
                15% { transform: translateX(0) skewX(20deg); opacity: 1; }
                85% { transform: translateX(0) skewX(20deg); opacity: 1; }
                100% { transform: translateX(0) skewX(20deg); opacity: 0; }
              }
              @keyframes drollFadeOut {
                0% { opacity: 0; transform: scale(0.9); }
                15% { opacity: 1; transform: scale(1); }
                85% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(1); }
              }
            `}</style>

            {/* Background Slash */}
            <div style={{
              position: 'absolute',
              width: '120%',
              height: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(76, 200, 120, 0.4), transparent)',
              animation: 'drollSlashFade 1.333s ease-in-out forwards',
              zIndex: 1
            }} />

            {/* Droll & Lock Bird Card Image Area */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              animation: 'drollFadeOut 1.333s ease-in-out forwards',
              textAlign: 'center'
            }}>
              <img
                src="https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260224/20260224100813.png"
                alt="Droll & Lock Bird"
                style={{
                  height: '300px',
                  boxShadow: '0 0 50px rgba(76, 200, 120, 0.6)',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
              <h2 style={{
                color: '#fff',
                marginTop: '12px',
                fontSize: '1.6rem',
                fontWeight: 'bold',
                textShadow: '0 0 10px #4caf50, 0 0 20px #4caf50',
                fontFamily: 'serif',
                letterSpacing: '0.05em'
              }}>
                ドロール＆ロックバード
              </h2>
            </div>
          </div>
        )}


        {/* Pendulum Summon Cut-in Overlay */}
        {showPendulumCutIn && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            overflow: 'hidden'
          }}>
            <style jsx>{`
              @keyframes pendulumTextIn {
                0% { opacity: 0; transform: scale(0.5) letter-spacing(2em); filter: blur(10px); }
                20% { opacity: 1; transform: scale(1.1) letter-spacing(0.2em); filter: blur(0); }
                30% { transform: scale(1) letter-spacing(0.1em); }
                80% { opacity: 1; transform: scale(1) letter-spacing(0.1em); filter: blur(0); }
                100% { opacity: 0; transform: scale(1.5) letter-spacing(0.5em); filter: blur(20px); }
              }
              @keyframes pendulumBgIn {
                0% { opacity: 0; transform: scaleY(0); }
                15% { opacity: 1; transform: scaleY(1); }
                85% { opacity: 1; transform: scaleY(1); }
                100% { opacity: 0; transform: scaleY(0); }
              }
            `}</style>

            {/* Horizontal Energy Bar */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '120px',
              background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), rgba(0, 255, 0, 0.4), rgba(0, 255, 255, 0.2), transparent)',
              boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)',
              animation: 'pendulumBgIn 2s ease-in-out forwards',
              zIndex: 1
            }} />

            {/* Pendulum Summon Text */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              animation: 'pendulumTextIn 2s ease-in-out forwards',
              textAlign: 'center'
            }}>
              <h1 style={{
                color: '#fff',
                fontSize: '5rem',
                fontWeight: '900',
                textShadow: '0 0 10px #00ffff, 0 0 20px #00ff00, 0 0 40px #00ff00',
                fontFamily: 'serif',
                fontStyle: 'italic',
                margin: 0,
                padding: '0 20px',
                borderTop: '2px solid rgba(0, 255, 255, 0.5)',
                borderBottom: '2px solid rgba(0, 255, 255, 0.5)',
                background: 'rgba(0, 0, 0, 0.3)',
                WebkitTextStroke: '1px rgba(255, 255, 255, 0.2)'
              }}>
                ペンデュラム召喚！
              </h1>
            </div>
          </div>
        )}
        {showNibiruCutIn && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            overflow: 'hidden'
          }}>
            <style jsx>{`
              @keyframes nibiruSlashFade {
                0% { transform: translateX(100%) skewX(-20deg); opacity: 0; }
                15% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                85% { transform: translateX(0) skewX(-20deg); opacity: 1; }
                100% { transform: translateX(0) skewX(-20deg); opacity: 0; }
              }
              @keyframes nibiruFadeOut {
                0% { opacity: 0; transform: scale(0.9); }
                15% { opacity: 1; transform: scale(1); }
                85% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(1); }
              }
            `}</style>

            {/* Background Slash */}
            <div style={{
              position: 'absolute',
              width: '120%',
              height: '40%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 128, 0, 0.4), transparent)',
              animation: 'nibiruSlashFade 0.75s ease-in-out forwards',
              zIndex: 1
            }} />

            {/* Nibiru Image */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              animation: 'nibiruFadeOut 0.75s ease-in-out forwards',
              textAlign: 'center'
            }}>
              <img
                src="https://cdn-ak.f.st-hatena.com/images/fotolife/D/DEYE/20260224/20260224111729.png"
                alt="Nibiru"
                style={{
                  height: '300px',
                  boxShadow: '0 0 50px rgba(255, 128, 0, 0.5)',
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
              <h2 style={{
                color: '#fff',
                marginTop: '20px',
                fontSize: '2rem',
                fontWeight: 'bold',
                textShadow: '0 0 10px #ff8c00, 0 0 20px #ff8c00',
                fontFamily: 'serif',
                letterSpacing: '0.1em'
              }}>
                原始生命態ニビル
              </h2>
            </div>
          </div>
        )}
      </main>
    </DndContext>
  );
}
