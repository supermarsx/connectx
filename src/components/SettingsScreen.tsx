import React from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { useProfileStore } from '../store/profileStore.ts';
import { PIECE_COLOR_PALETTE } from '../engine/types.ts';

export const SettingsScreen: React.FC = () => {
  const setPhase = useGameStore(s => s.setPhase);

  const volume = useSettingsStore(s => s.volume);
  const setVolume = useSettingsStore(s => s.setVolume);
  const muted = useSettingsStore(s => s.muted);
  const toggleMute = useSettingsStore(s => s.toggleMute);
  const highContrast = useSettingsStore(s => s.highContrast);
  const toggleHighContrast = useSettingsStore(s => s.toggleHighContrast);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const toggleReduceMotion = useSettingsStore(s => s.toggleReduceMotion);
  const colorblindPatterns = useSettingsStore(s => s.colorblindPatterns);
  const toggleColorblindPatterns = useSettingsStore(s => s.toggleColorblindPatterns);
  const theme = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);

  const favoriteColor = useProfileStore(s => s.favoriteColor);
  const setFavoriteColor = useProfileStore(s => s.setFavoriteColor);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '24px',
      padding: '32px',
    }}>
      <h1 style={{
        fontSize: '36px', fontWeight: 800, color: 'var(--color-neutral-900)',
        margin: 0, fontFamily: 'var(--font-display)',
      }}>
        Settings
      </h1>

      {/* Audio */}
      <Section title="Audio">
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <span style={labelStyle}>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#FF6FAF' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-neutral-400)', minWidth: '36px', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </label>
        <ToggleRow label="Mute" checked={muted} onToggle={toggleMute} />
      </Section>

      {/* Accessibility */}
      <Section title="Accessibility">
        <ToggleRow label="High Contrast" checked={highContrast} onToggle={toggleHighContrast} />
        <ToggleRow label="Colorblind Patterns" checked={colorblindPatterns} onToggle={toggleColorblindPatterns} />
        <ToggleRow label="Reduce Motion" checked={reduceMotion} onToggle={toggleReduceMotion} />
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['light', 'system', 'dark'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setTheme(opt)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: '20px',
                border: '2px solid var(--color-neutral-900)', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                backgroundColor: theme === opt ? '#FF6FAF' : 'var(--color-bg-base)',
                color: theme === opt ? '#fff' : 'var(--color-neutral-900)',
                boxShadow: theme === opt ? '2px 2px 0 var(--color-neutral-900)' : 'none',
              }}
            >
              {opt === 'light' ? '☀️ Light' : opt === 'dark' ? '🌙 Dark' : '💻 System'}
            </button>
          ))}
        </div>
      </Section>

      {/* Preferred Color */}
      <Section title="Preferred Color">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {PIECE_COLOR_PALETTE.map(color => (
            <button
              key={color}
              onClick={() => setFavoriteColor(color)}
              aria-label={`Select color ${color}`}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: color, cursor: 'pointer',
                border: color === favoriteColor ? '3px solid var(--color-neutral-900)' : '2px solid transparent',
                boxShadow: color === favoriteColor ? '0 0 0 2px #FFD36B' : 'none',
                transition: 'border 0.15s ease, box-shadow 0.15s ease',
              }}
            />
          ))}
        </div>
      </Section>

      {/* Back */}
      <button
        onClick={() => setPhase('menu')}
        style={{
          padding: '10px 28px', borderRadius: '24px',
          border: '2px solid var(--color-neutral-900)', backgroundColor: '#fff',
          color: 'var(--color-neutral-900)', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >
        ← Back
      </button>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 600, color: 'var(--color-neutral-900)', minWidth: '100px',
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    width: '100%', maxWidth: '360px', padding: '20px 24px',
    backgroundColor: 'var(--color-bg-card)', borderRadius: '16px',
    border: '2px solid var(--color-neutral-900)', boxShadow: '4px 4px 0 var(--color-neutral-900)',
    display: 'flex', flexDirection: 'column', gap: '14px',
  }}>
    <h2 style={{
      fontSize: '16px', fontWeight: 700, color: '#FF6FAF',
      margin: 0, fontFamily: 'var(--font-display)',
    }}>
      {title}
    </h2>
    {children}
  </div>
);

const ToggleRow: React.FC<{ label: string; checked: boolean; onToggle: () => void }> = ({ label, checked, onToggle }) => (
  <label style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', width: '100%',
  }}>
    <span style={labelStyle}>{label}</span>
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        border: '2px solid var(--color-neutral-900)', cursor: 'pointer',
        backgroundColor: checked ? '#FF6FAF' : 'var(--color-neutral-50)',
        position: 'relative', transition: 'background-color 0.15s ease',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '2px',
        left: checked ? '20px' : '2px',
        width: '16px', height: '16px', borderRadius: '50%',
        backgroundColor: '#fff', border: '1px solid var(--color-neutral-900)',
        transition: 'left 0.15s ease',
      }} />
    </button>
  </label>
);
