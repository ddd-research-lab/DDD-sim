import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Zone } from './Zone';
import { formatLog, getCardName } from '@/data/locales';

interface SortableCardProps {
  id: string;
  card: {
    name: string;
    imageUrl?: string;
  };
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SortableCard({ id, card, index, isSelected, onSelect }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '80px',
    height: '116px',
    borderRadius: '4px',
    overflow: 'hidden',
    border: isSelected ? '3px solid #ff9800' : '1px solid #ed6c02',
    background: '#1a1a1a',
    position: 'relative',
    cursor: 'grab',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : (isSelected ? 50 : 1),
    boxShadow: isSelected ? '0 0 15px rgba(255, 152, 0, 0.6)' : '0 2px 4px rgba(0,0,0,0.5)',
    flexShrink: 0,
    marginLeft: index === 0 ? 0 : '-40px', // Overlap
    marginTop: isSelected ? '-10px' : '0', // Lift up
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <img
        src={card.imageUrl || 'https://via.placeholder.com/80x116?text=' + getCardName(card as any, useGameStore.getState().language)}
        alt={getCardName(card as any, useGameStore.getState().language)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        fontSize: '10px',
        padding: '1px 3px',
        borderBottomRightRadius: '4px'
      }}>
        {index + 1}
      </div>
    </div>
  );
}

export function DeckArea() {
  const {
    deck, cards, drawCard, selectedDeckCardId, setSelectedDeckCardId, addCardCopy, removeCardCopy, shuffleDeck, sortDeck,
    targetingState, zoneSelectionState
  } = useGameStore();
  const isTargeting = targetingState.isOpen;
  const isSelectingZone = zoneSelectionState.isOpen;

  const handleDraw = () => {
    if (isTargeting || isSelectingZone) return;
    drawCard();
  };

  const currentCopies = selectedDeckCardId ? deck.filter(id => cards[id]?.cardId === cards[selectedDeckCardId]?.cardId).length : 0;

  return (
    <div style={{
      marginTop: '8px',
      padding: '24px',
      border: 'none',
      borderRadius: '12px',
      background: 'rgba(0,0,0,0.4)',
      width: '100%',
      maxWidth: '1000px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }} onClick={() => setSelectedDeckCardId(null)}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h3 style={{ margin: 0, color: '#ed6c02', fontSize: '18px', letterSpacing: '1px' }}>{formatLog('ui_main_deck')}</h3>
          <span style={{
            background: '#ed6c02',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {deck.length} {formatLog('ui_copies')}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); shuffleDeck(); }}
            disabled={deck.length <= 1 || isTargeting || isSelectingZone}
            style={{
              marginLeft: '12px',
              padding: '2px 8px',
              background: 'transparent',
              border: '1px solid #000',
              color: '#000',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: (deck.length <= 1 || isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer',
              opacity: (deck.length <= 1 || isTargeting || isSelectingZone) ? 0.5 : 1
            }}
          >
            {formatLog('ui_shuffle')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); sortDeck(); }}
            disabled={deck.length <= 1 || isTargeting || isSelectingZone}
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              background: 'transparent',
              border: '1px solid #000',
              color: '#000',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: (deck.length <= 1 || isTargeting || isSelectingZone) ? 'not-allowed' : 'pointer',
              opacity: (deck.length <= 1 || isTargeting || isSelectingZone) ? 0.5 : 1
            }}
          >
            {formatLog('ui_sort')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedDeckCardId && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '6px', border: '1px solid #444', marginRight: '16px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); removeCardCopy(selectedDeckCardId); }}
                disabled={currentCopies <= 1}
                style={{
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#c62828', color: 'white', border: 'none', borderRadius: '4px', cursor: currentCopies <= 1 ? 'not-allowed' : 'pointer',
                  opacity: currentCopies <= 1 ? 0.3 : 1
                }}
              >
                -
              </button>
              <span style={{ color: 'white', width: '24px', textAlign: 'center', lineHeight: '28px', fontSize: '14px', fontWeight: 'bold' }}>
                {currentCopies}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); addCardCopy(selectedDeckCardId); }}
                disabled={currentCopies >= 3}
                style={{
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: currentCopies >= 3 ? 'not-allowed' : 'pointer',
                  opacity: currentCopies >= 3 ? 0.3 : 1
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <div data-zone-id="DECK">
      <Zone id="deck-zone" type="DECK" label={formatLog('ui_main_deck_area')} style={{ width: '100%', height: 'auto', minHeight: '140px', margin: 0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: '140px',
          maxHeight: '180px',
          overflowX: 'auto',
          padding: '20px 40px', // Extra horizontal padding for overlapping edges
          width: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#ed6c02 transparent'
        }}>
          <SortableContext items={deck} strategy={horizontalListSortingStrategy}>
            {deck.map((id, index) => (
              <SortableCard
                key={id}
                id={id}
                card={cards[id]}
                index={index}
                isSelected={selectedDeckCardId === id}
                onSelect={(selected) => setSelectedDeckCardId(selected)}
              />
            ))}
          </SortableContext>
          {deck.length === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100px',
              color: '#666',
              fontStyle: 'italic',
              gap: '10px'
            }}>
              <span>{formatLog('ui_no_deck_cards')}</span>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  background: 'rgba(237, 108, 2, 0.2)',
                  border: '1px solid #ed6c02',
                  color: '#ed6c02',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {formatLog('ui_reload_page')}
              </button>
            </div>
          )}
        </div>
      </Zone>
      </div>

    </div >
  );
}
