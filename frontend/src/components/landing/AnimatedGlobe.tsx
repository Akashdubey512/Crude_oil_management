export default function AnimatedGlobe() {
  // Let's create an vector-radar display focusing on the North Indian Ocean & Mid East
  // Coordinates are mapped onto a 500x400 coordinate space
  // Suez: (50, 80)
  // Bab el-Mandeb: (100, 240)
  // Hormuz: (240, 100)
  // India (West Coast): (430, 200)

  return (
    <div className="relative w-full h-[450px] flex items-center justify-center overflow-hidden bg-gray-950/40 rounded-xl border border-gray-900/50 backdrop-blur-sm">
      {/* Background Grid & Radar Sweep */}
      <div className="absolute inset-0 flex items-center justify-center opacity-25">
        <div className="w-[450px] h-[450px] rounded-full border border-cyan-500/20 relative animate-[spin_20s_linear_infinite]">
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/10 scale-75" />
          <div className="absolute inset-0 rounded-full border border-cyan-500/5 scale-50" />
          {/* Radar Sweep Gradient */}
          <div className="absolute inset-0 bg-conic-gradient from-cyan-500/10 via-transparent to-transparent rounded-full" />
        </div>
      </div>

      <svg viewBox="0 0 500 400" className="w-full h-full max-w-[550px] relative z-10">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Lat/Long Grid Lines */}
        <g stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5">
          <line x1="50" y1="0" x2="50" y2="400" />
          <line x1="150" y1="0" x2="150" y2="400" />
          <line x1="250" y1="0" x2="250" y2="400" />
          <line x1="350" y1="0" x2="350" y2="400" />
          <line x1="450" y1="0" x2="450" y2="400" />
          <line x1="0" y1="100" x2="500" y2="100" />
          <line x1="0" y1="200" x2="500" y2="200" />
          <line x1="0" y1="300" x2="500" y2="300" />
        </g>

        {/* India Vector Outline Reference */}
        <path
          d="M 430,130 L 440,160 L 450,180 L 460,195 L 430,220 L 415,250 L 435,270 L 450,230 L 470,210 L 485,180 Z"
          fill="#1e293b"
          fillOpacity="0.3"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* East Africa Outline Reference */}
        <path
          d="M 10,380 L 40,360 L 50,330 L 70,300 L 90,280 L 80,260 L 60,250 L 50,220 L 70,190"
          fill="none"
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="2,2"
        />

        {/* Shipping Routes (Animated Dash Array paths) */}
        {/* Route 1: Hormuz (240, 100) -> West India (430, 200) */}
        <path
          id="route-hormuz"
          d="M 240,100 C 300,120 360,150 430,200"
          fill="none"
          stroke="url(#route-gradient)"
          strokeWidth="2"
          opacity="0.8"
        />
        <path
          d="M 240,100 C 300,120 360,150 430,200"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="3"
          strokeDasharray="8, 20"
          strokeDashoffset="0"
          opacity="0.9"
          className="animate-[dash_6s_linear_infinite]"
        />

        {/* Route 2: Bab el-Mandeb (100, 240) -> West India (430, 200) */}
        <path
          id="route-bab"
          d="M 100,240 C 200,260 320,240 430,200"
          fill="none"
          stroke="url(#route-gradient)"
          strokeWidth="2"
          opacity="0.8"
        />
        <path
          d="M 100,240 C 200,260 320,240 430,200"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeDasharray="10, 25"
          strokeDashoffset="0"
          opacity="0.9"
          className="animate-[dash_8s_linear_infinite]"
        />

        {/* Route 3: Suez (50, 80) -> Bab el-Mandeb (100, 240) */}
        <path
          id="route-suez"
          d="M 50,80 L 100,240"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          opacity="0.6"
          strokeDasharray="4,4"
        />

        {/* Chokepoint Pulses & Nodes */}
        {/* Suez */}
        <circle cx="50" cy="80" r="12" fill="url(#glow)" className="animate-pulse" />
        <circle cx="50" cy="80" r="4" fill="#f59e0b" />
        <text x="45" y="65" fill="#f59e0b" className="text-[9px] font-mono font-bold tracking-wider">SUEZ</text>

        {/* Bab el-Mandeb */}
        <circle cx="100" cy="240" r="18" fill="url(#glow)" className="animate-pulse" />
        <circle cx="100" cy="240" r="5" fill="#ef4444" />
        <text x="70" y="260" fill="#ef4444" className="text-[9px] font-mono font-bold tracking-wider">BAB EL-MANDEB</text>

        {/* Hormuz */}
        <circle cx="240" cy="100" r="18" fill="url(#glow)" className="animate-pulse" />
        <circle cx="240" cy="100" r="5" fill="#ef4444" />
        <text x="210" y="85" fill="#ef4444" className="text-[9px] font-mono font-bold tracking-wider">STRAIT OF HORMUZ</text>

        {/* India Destination Node */}
        <circle cx="430" cy="200" r="22" fill="url(#glow)" className="animate-pulse" />
        <circle cx="430" cy="200" r="6" fill="#10b981" />
        <text x="445" y="205" fill="#10b981" className="text-[10px] font-bold tracking-wider">INDIA HUB</text>
      </svg>

      {/* Corridor HUD Card overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2 z-20">
        <div className="glass-panel px-3 py-2 rounded text-[10px] font-mono border border-gray-800 text-gray-400">
          <span className="text-cyan-400 font-bold block mb-1">SCAN OVERVIEW</span>
          <span>SYS STATUS: </span><span className="text-emerald-500 font-bold">OPERATIONAL</span>
          <br />
          <span>SCAN AREA: </span><span className="text-white">INDIAN OCEAN / RED SEA</span>
        </div>
        <div className="glass-panel px-3 py-2 rounded text-[10px] font-mono border border-gray-800 text-right text-gray-400">
          <span className="text-cyan-400 font-bold block mb-1">DATA CHANNELS</span>
          <span>AIS FLOWS: </span><span className="text-cyan-500 font-bold">ACTIVE</span>
          <br />
          <span>GPR DECODER: </span><span className="text-cyan-500 font-bold">ONLINE</span>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -120;
          }
        }
      `}</style>
    </div>
  );
}
