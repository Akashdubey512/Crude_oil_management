import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';

// Hooks & page imports
import { useGlobalData } from './api/hooks/useGlobalData';
import Landing from './pages/Landing';
import CommandCenter from './pages/CommandCenter';

export default function App() {
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

  // Load global states to feed landing page status bar & live cards
  const {
    health,
    corridors,
    risks,
    brentPrices,
    dataStatuses,
  } = useGlobalData();

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
          health={health}
          dataStatuses={dataStatuses}
          brentPrices={brentPrices}
          risks={risks}
          corridorsCount={corridors.length}
          onEnter={handleEnter}
        />
      ) : (
        <CommandCenter
          key="dashboard"
          initialTab={targetTab}
          initialCorridor={targetCorridor}
          onReturnToLanding={handleReturnToLanding}
        />
      )}
    </AnimatePresence>
  );
}
