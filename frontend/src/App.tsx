import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

// Hooks & page imports
import { useGlobalData } from './api/hooks/useGlobalData';
import Landing from './pages/Landing';
import CommandCenter from './pages/CommandCenter';

export default function App() {
  const [showLanding, setShowLanding] = useState<boolean>(true);

  // Load global states to feeds landing page status bar
  const {
    health,
    corridors,
    brentPrices,
    dataStatuses,
  } = useGlobalData();

  return (
    <AnimatePresence mode="wait">
      {showLanding ? (
        <Landing
          key="landing"
          health={health}
          dataStatuses={dataStatuses}
          brentPrices={brentPrices}
          corridorsCount={corridors.length}
          onEnter={() => setShowLanding(false)}
        />
      ) : (
        <CommandCenter key="dashboard" />
      )}
    </AnimatePresence>
  );
}
