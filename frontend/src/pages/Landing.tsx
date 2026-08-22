import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import AnimatedGlobe from '../components/landing/AnimatedGlobe';
import LiveIntelStrip from '../components/landing/LiveIntelStrip';
import type { HealthResponse, SourceStatusResponse, BrentPriceResponse } from '../types';
import { pageTransition } from '../design-system/animations';

interface LandingProps {
  onEnter: () => void;
  health: HealthResponse | null;
  dataStatuses: SourceStatusResponse[];
  brentPrices: BrentPriceResponse | null;
  corridorsCount: number;
}

export default function Landing({ onEnter, health, dataStatuses, brentPrices, corridorsCount }: LandingProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between overflow-x-hidden"
    >
      {/* Top Banner Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-red-500 via-amber-500 to-cyan-500" />

      {/* Landing Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2.5">
          <Globe className="w-6 h-6 text-cyan-400" />
          <span className="font-mono font-black tracking-widest text-sm text-white uppercase">
            ENERGY RESILIENCE INTEL
          </span>
        </div>
        <button
          onClick={onEnter}
          className="text-xs font-mono text-gray-400 hover:text-white transition duration-200"
        >
          Skip Intro
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow py-12 z-20">
        {/* Left Hand: Hero Headline Copy */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LIVE SECURITY OPERATIONS ACTIVE
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight uppercase">
            MARITIME ENERGY
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
              RISK INTELLIGENCE
            </span>
          </h2>

          <h3 className="text-lg md:text-xl font-bold text-cyan-300">
            AI-powered situational awareness for global energy corridors.
          </h3>

          <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-xl">
            Monitor maritime traffic, geopolitical disruption, infrastructure exposure and commodity risk through one explainable intelligence platform. Protect supply chain corridors via dynamic explainable AI digital twin simulations.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={onEnter}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg text-sm uppercase tracking-wider hover:cursor-pointer transition duration-300 transform hover:scale-[1.02]"
            >
              <span>Enter Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onEnter}
              className="border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 text-gray-300 px-6 py-3 rounded-lg text-sm uppercase tracking-wider transition duration-300"
            >
              Explore Intelligence
            </button>
          </div>
        </div>

        {/* Right Hand: 2.5D Geo Vector Globe Projection */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <AnimatedGlobe />
        </div>
      </main>

      {/* Live Operations Strip */}
      <LiveIntelStrip
        health={health}
        dataStatuses={dataStatuses}
        brentPrices={brentPrices}
        corridorsCount={corridorsCount}
      />
    </motion.div>
  );
}
