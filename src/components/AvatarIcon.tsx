import React from 'react';
import type { PlayerAvatar } from '../engine/types.ts';

const AVATAR_EMOJI: Record<PlayerAvatar, string> = {
  cat: '🐱',
  dog: '🐶',
  bear: '🐻',
  fox: '🦊',
  owl: '🦉',
  bunny: '🐰',
  panda: '🐼',
  frog: '🐸',
};

interface AvatarIconProps {
  avatar: PlayerAvatar;
  size: number;
  color?: string;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({ avatar, size, color }) => (
  <div style={{
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: color ?? '#FAF7FB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.55,
    lineHeight: 1,
    flexShrink: 0,
  }}>
    {AVATAR_EMOJI[avatar]}
  </div>
);
