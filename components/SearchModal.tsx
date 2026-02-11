import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card } from './Card';

export function SearchModal() {
    const { searchState, resolveSearch, cancelSearch, deck, cards } = useGameStore();
    const { isOpen: isSearching, filter: searchFilter, prompt: searchPrompt, source: searchSource } = searchState;

    if (!isSearching) return null;

    const sourceIds = searchSource || deck;

    const validTargets = sourceIds.filter((id) => {
        const card = cards[id];
        return card && (!searchFilter || searchFilter(card));
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ marginBottom: '20px', color: '#fff', fontSize: '20px' }}>
                {searchPrompt || 'Select a Card to Add to Hand'}
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                maxWidth: '900px',
                justifyContent: 'center',
                overflowY: 'auto',
                maxHeight: '80vh',
                padding: '20px',
                border: '1px solid #444',
                borderRadius: '8px',
                background: 'rgba(20,20,20,0.9)'
            }}>
                {validTargets.length === 0 ? (
                    <div style={{ color: '#aaa' }}>No targets found.</div>
                ) : (
                    validTargets.map((id) => {
                        // Determine Location
                        let loc = 'Unknown';
                        let color = '#777';
                        const s = useGameStore.getState(); // Fresh state check
                        if (s.hand.includes(id)) { loc = 'Hand'; color = '#2196F3'; }
                        else if (s.monsterZones.includes(id) || s.extraMonsterZones.includes(id)) { loc = 'Field (M)'; color = '#4CAF50'; }
                        else if (s.spellTrapZones.includes(id) || s.fieldZone === id) { loc = 'Field (S/T)'; color = '#8BC34A'; }
                        else if (s.graveyard.includes(id)) { loc = 'Graveyard'; color = '#9E9E9E'; }
                        else if (s.banished.includes(id)) { loc = 'Banished'; color = '#F44336'; }
                        else if (s.extraDeck.includes(id)) { loc = 'Extra Deck'; color = '#673AB7'; }
                        else if (s.deck.includes(id)) { loc = 'Main Deck'; color = '#FFC107'; }

                        return (
                            <div key={id} onClick={() => resolveSearch(id)} style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    marginBottom: '4px',
                                    padding: '2px 6px',
                                    background: color,
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    textShadow: '0 1px 2px black'
                                }}>
                                    {loc}
                                </div>
                                <Card card={cards[id]} isInteractive={false} disableDrag={true} dragId={`search_${id}`} />
                            </div>
                        );
                    })
                )}
            </div>

            <button onClick={cancelSearch} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px' }}>
                Cancel
            </button>
        </div>
    );
}
