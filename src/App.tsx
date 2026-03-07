import { useGameStore } from './store/gameStore.ts';
import { MenuScreen } from './components/MenuScreen.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { GameScreen } from './components/GameScreen.tsx';

function App() {
  const phase = useGameStore(s => s.phase);

  return (
    <div className="app" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAF7FB 0%, #F5E6F0 50%, #EDE4F5 100%)',
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {phase === 'menu' && <MenuScreen />}
      {phase === 'lobby' && <LobbyScreen />}
      {(phase === 'playing' || phase === 'roundEnd' || phase === 'matchEnd') && <GameScreen />}
    </div>
  );
}

export default App;
