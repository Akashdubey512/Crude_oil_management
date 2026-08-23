import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTheme } from './api/hooks/useTheme';

// Page imports
import Landing from './pages/Landing';
import CommandCenter from './pages/CommandCenter';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const getInitialTabFromPath = () => {
    const path = window.location.pathname.replace('/', '').toUpperCase();
    if (!path || path === 'LANDING') return null;
    return path;
  };

  const initialTabFromPath = getInitialTabFromPath();
  const [showLanding, setShowLanding] = useState<boolean>(!initialTabFromPath);
  const [targetTab, setTargetTab] = useState<string>(initialTabFromPath || 'MONITOR');
  const [targetCorridor, setTargetCorridor] = useState<string | null>('HORMUZ');

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.replace('/', '').toUpperCase();
      if (!path || path === 'LANDING') {
        setShowLanding(true);
      } else {
        setTargetTab(path);
        setShowLanding(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleEnter = (tab = 'MONITOR', corridorId: string | null = null) => {
    setTargetTab(tab);
    if (corridorId) setTargetCorridor(corridorId);
    setShowLanding(false);
    window.history.pushState({}, '', `/${tab.toLowerCase()}`);
  };

  const handleReturnToLanding = () => {
    setShowLanding(true);
    window.history.pushState({}, '', '/');
  };

  return (
    <AnimatePresence mode="wait">
      {showLanding ? (
        <Landing
          key="landing"
          theme={theme}
          onToggleTheme={toggleTheme}
          onEnterDashboard={handleEnter}
        />
      ) : (
        <CommandCenter
          key="dashboard"
          theme={theme}
          onToggleTheme={toggleTheme}
          initialTab={targetTab}
          initialCorridor={targetCorridor}
          onReturnToLanding={handleReturnToLanding}
        />
      )}
    </AnimatePresence>
  );
}
