import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

// Hooks & page imports
import { useGlobalData } from './api/hooks/useGlobalData';
import Landing from './pages/Landing';
import CommandCenter from './pages/CommandCenter';

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [targetTab, setTargetTab] = useState<string>('MONITOR');
  const [targetCorridor, setTargetCorridor] = useState<string | null>('HORMUZ');

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
          onReturnToLanding={() => setShowLanding(true)}
        />
      )}
    </AnimatePresence>
  );
}
