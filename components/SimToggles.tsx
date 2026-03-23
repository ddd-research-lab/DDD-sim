import React from 'react';
import { useGameStore } from '@/store/gameStore';

export function SimToggles() {
    const {
        ashBlossomSimulationEnabled, setAshBlossomSimulationEnabled,
        drollSimulationEnabled, setDrollSimulationEnabled,
        infiniteImpermanenceSimulationEnabled, setInfiniteImpermanenceSimulationEnabled,
        nibiruSimulationEnabled, setNibiruSimulationEnabled,
        impulseSimulationEnabled, setImpulseSimulationEnabled
    } = useGameStore();

    const buttonStyle = (active: boolean, activeColor: string, hoverColor: string) => ({
        padding: '4px 10px',
        background: active ? activeColor : 'transparent',
        border: '1px solid #000',
        color: '#000',
        borderRadius: '6px',
        fontSize: '11px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s ease',
        fontWeight: (active ? 'bold' : 'normal') as 'bold' | 'normal',
        boxShadow: active ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)'
    });

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            padding: '5px 0',
            width: '100%',
            maxWidth: '900px',
            margin: '0 auto'
        }}>
            {/* Ash Blossom Simulation Toggle */}
            <button
                onClick={() => setAshBlossomSimulationEnabled(!ashBlossomSimulationEnabled)}
                style={buttonStyle(ashBlossomSimulationEnabled, '#ffc0cb', '#ffb1c1')}
                title={ashBlossomSimulationEnabled ? '灰流うらら割り込みあり' : '灰流うらら割り込みなし'}
            >
                {ashBlossomSimulationEnabled ? 'うらら ON' : 'うらら OFF'}
            </button>

            {/* Droll & Lock Bird Simulation Toggle */}
            <button
                onClick={() => setDrollSimulationEnabled(!drollSimulationEnabled)}
                style={buttonStyle(drollSimulationEnabled, '#90ee90', '#98fb98')}
                title={drollSimulationEnabled ? 'ドロール&ロックバード割り込みあり' : 'ドロール&ロックバード割り込みなし'}
            >
                {drollSimulationEnabled ? 'ドロール ON' : 'ドロール OFF'}
            </button>

            {/* Infinite Impermanence Simulation Toggle */}
            <button
                onClick={() => setInfiniteImpermanenceSimulationEnabled(!infiniteImpermanenceSimulationEnabled)}
                style={buttonStyle(infiniteImpermanenceSimulationEnabled, '#f8bbd0', '#f48fb1')}
                title={infiniteImpermanenceSimulationEnabled ? '無限泡影割り込みあり' : '無限泡影割り込みなし'}
            >
                {infiniteImpermanenceSimulationEnabled ? '泡影 ON' : '泡影 OFF'}
            </button>

            {/* Impulse Simulation Toggle */}
            <button
                onClick={() => setImpulseSimulationEnabled(!impulseSimulationEnabled)}
                style={buttonStyle(impulseSimulationEnabled, '#e1bee7', '#ce93d8')}
                title={impulseSimulationEnabled ? '霊王の波動割り込みあり' : '霊王の波動割り込みなし'}
            >
                {impulseSimulationEnabled ? 'インパルス ON' : 'インパルス OFF'}
            </button>

            {/* Nibiru Simulation Toggle */}
            <button
                onClick={() => setNibiruSimulationEnabled(!nibiruSimulationEnabled)}
                style={buttonStyle(nibiruSimulationEnabled, '#ffe0b2', '#ffcc80')}
                title={nibiruSimulationEnabled ? '原始生命態ニビル割り込みあり' : '原始生命態ニビル割り込みなし'}
            >
                {nibiruSimulationEnabled ? 'ニビル ON' : 'ニビル OFF'}
            </button>
        </div>
    );
}
