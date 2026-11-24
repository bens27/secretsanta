import { useMemo } from 'react';
import { ThemeDefinition } from '../themes';

const COUNT = 28;

/** Decorative emoji drifting behind the content. Hidden for reduced motion. */
export function ThemeParticles({ theme }: { theme: ThemeDefinition }) {
  const particles = useMemo(() => Array.from({ length: theme.particles.length > 0 ? COUNT : 0 }, (_, i) => ({
    id: i,
    emoji: theme.particles[i % theme.particles.length],
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.2 + 1,
    duration: Math.random() * 10 + 10,
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
