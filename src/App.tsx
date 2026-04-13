import { useGameStore } from './store/gameStore.ts';
import { useSettingsStore } from './store/settingsStore.ts';
import { useOnlineStore } from './store/onlineStore.ts';
import { MenuScreen } from './components/MenuScreen.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { GameScreen } from './components/GameScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { OnlineMenuScreen } from './components/OnlineMenuScreen.tsx';
import { QueueScreen } from './components/QueueScreen.tsx';
import { RoomBrowser } from './components/RoomBrowser.tsx';
import { OnlineLobbyScreen } from './components/OnlineLobbyScreen.tsx';
import { OnlineGameScreen } from './components/OnlineGameScreen.tsx';
import { FriendsScreen } from './components/FriendsScreen.tsx';
import { ConnectionStatus } from './components/ConnectionStatus.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { useEffect } from 'react';

function App() {
  const phase = useGameStore(s => s.phase);
  const mode = useGameStore(s => s.config.mode);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const textSize = useSettingsStore(s => s.textSize);
  const resolvedTheme = useSettingsStore(s => s.resolvedTheme);
  const onlinePhase = useOnlineStore(s => s.onlinePhase);
  const isOnlineFlow = useOnlineStore(s => s.isOnlineFlow);
  const checkAuth = useOnlineStore(s => s.checkAuth);

  // On mount, check for stored auth token and reconnect
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const textSizePx = [16, 18, 20][textSize] ?? 16;

  const isPlaying = phase === 'playing' || phase === 'roundEnd' || phase === 'matchEnd';
  const isOnlinePlaying = onlinePhase === 'online-playing' || onlinePhase === 'online-round-end' || onlinePhase === 'online-match-end';

  const isDark = resolvedTheme === 'dark';

  const background = (isPlaying || isOnlinePlaying) && mode === 'classic'
    ? isDark ? 'linear-gradient(180deg, #2D1B4E 0%, #1B2D4E 100%)' : 'linear-gradient(180deg, #C9B6FF 0%, #B6D9FF 100%)'
    : (isPlaying || isOnlinePlaying) && mode === 'fullboard'
      ? isDark ? 'linear-gradient(180deg, #4E1B3D 0%, #4E3D1B 100%)' : 'linear-gradient(180deg, #FFB6C9 0%, #FFD6B6 100%)'
      : isDark ? 'linear-gradient(180deg, #2D1B4E 0%, #1B2D4E 100%)' : 'linear-gradient(180deg, #FFB6C9 0%, #C9B6FF 100%)';

  const renderOnlineScreen = () => {
    switch (onlinePhase) {
      case 'auth': return <AuthScreen />;
      case 'menu': return <OnlineMenuScreen />;
      case 'quickplay-queue': return <QueueScreen />;
      case 'room-browser': return <RoomBrowser />;
      case 'room-lobby': return <OnlineLobbyScreen />;
      case 'friends': return <FriendsScreen />;
      case 'match-loading': return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading match…</div>;
      case 'online-playing':
      case 'online-round-end':
      case 'online-match-end':
        return <OnlineGameScreen />;
      default: return <MenuScreen />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="app" data-reduce-motion={String(reduceMotion)} data-theme={resolvedTheme} style={{
        minHeight: '100vh',
        background,
        transition: 'background 0.5s ease',
        fontFamily: "var(--font-body)",
        fontSize: `${textSizePx}px`,
      }}>
        <ConnectionStatus />
        {isOnlineFlow ? (
          renderOnlineScreen()
        ) : (
          <>
            {phase === 'menu' && <MenuScreen />}
            {phase === 'lobby' && <LobbyScreen />}
            {phase === 'settings' && <SettingsScreen />}
            {(phase === 'playing' || phase === 'roundEnd' || phase === 'matchEnd') && <GameScreen />}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
