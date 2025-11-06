'use client';

import { useRouter, usePathname } from 'next/navigation';

type Mode = 'chat' | 'explore' | 'swipe' | 'hopscotch';

interface ModeNavigationProps {
  currentMode: Mode;
}

export default function ModeNavigation({ currentMode }: ModeNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const modes: { key: Mode; label: string; path: string }[] = [
    { key: 'chat', label: 'CHAT', path: '/chat/new' },
    { key: 'explore', label: 'DIG DEEPER', path: '/explore/new' },
    { key: 'swipe', label: 'SWIPE DEEPER', path: '/swipe/new' },
    { key: 'hopscotch', label: 'HOPSCOTCH', path: '/hopscotch/new' },
  ];

  const handleModeSwitch = (path: string) => {
    router.push(path);
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex gap-2">
      {modes
        .filter((mode) => mode.key !== currentMode)
        .map((mode) => (
          <button
            key={mode.key}
            onClick={() => handleModeSwitch(mode.path)}
            className="px-4 py-2 text-sm font-medium text-[#dbdbd4] hover:text-[#c5c5ba] transition-colors"
            style={{ transitionDuration: '250ms' }}
          >
            {mode.label}
          </button>
        ))}
    </div>
  );
}
