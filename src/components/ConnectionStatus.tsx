import React from 'react';
import { useOnlineStore } from '../store/onlineStore.ts';

export const ConnectionStatus: React.FC = () => {
  const isConnected = useOnlineStore(s => s.isConnected);
  const isOnlineFlow = useOnlineStore(s => s.isOnlineFlow);

  if (!isOnlineFlow || isConnected) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '8px 16px',
      backgroundColor: 'var(--color-warning, #FFC155)',
      color: 'var(--color-neutral-900, #17171F)',
      fontWeight: 700,
      fontSize: '13px',
      textAlign: 'center',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }}>
      <span style={{
        width: '8px', height: '8px', borderRadius: '50%',
        backgroundColor: 'var(--color-error, #FF4B6E)',
        display: 'inline-block',
      }} />
      Connection lost — reconnecting...
    </div>
  );
};
