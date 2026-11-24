import { useEffect, useMemo, useState } from 'react';
import { ThemeDefinition } from '../themes';

const COUNT = 45;
const BURST_COUNT = 60;
const BURST_MS = 2600;

/** Decorative emoji drifting behind the content. Hidden for reduced motion. */
export function ThemeParticles({ theme }: { theme: ThemeDefinition }) {
  const particles = useMemo(() => Array.from({ length: theme.particles.length > 0 ? COUNT : 0 }, (_, i) => ({
    id: i,
    emoji: theme.particles[i % theme.particles.length],
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.8 + 1.2,
    duration: Math.random() * 8 + 7,
    delay: Math.random() * -20,
  })), [theme]);

  if (particles.length === 0)
    return null;

  return (
    <div className="theme-particles fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {particles.map(particle => (
        <span
          key={particle.id}
          className={`theme-particle theme-particle-${theme.motion}`}
          style={{
            left: `${particle.left}%`,
            top: theme.motion === 'twinkle' ? `${particle.top}%` : undefined,
            fontSize: `${particle.size}rem`,
            animationDuration: theme.motion === 'twinkle' ? `${particle.duration / 4}s` : `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}

/** One-off explosion of emoji from the middle of the screen. */
export function ThemeBurst({ theme }: { theme: ThemeDefinition }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), BURST_MS);
    return () => clearTimeout(timer);
  }, []);

  const pieces = useMemo(() => Array.from({ length: theme.particles.length > 0 ? BURST_COUNT : 0 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 45 + 20;
    return {
      id: i,
      emoji: theme.particles[i % theme.particles.length],
      dx: `${Math.cos(angle) * distance}vw`,
      dy: `${Math.sin(angle) * distance}vh`,
      spin: `${Math.round(Math.random() * 1440 - 720)}deg`,
      size: Math.random() * 2 + 1.5,
    };
  }), [theme]);

  if (done || pieces.length === 0)
    return null;

  return (
    <div className="theme-particles fixed inset-0 overflow-hidden pointer-events-none select-none z-50" aria-hidden="true">
      {pieces.map(piece => (
        <span
          key={piece.id}
          className="theme-burst"
          style={{
            fontSize: `${piece.size}rem`,
            ['--dx' as string]: piece.dx,
            ['--dy' as string]: piece.dy,
            ['--spin' as string]: piece.spin,
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}
