
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Zap, ShieldAlert, EyeOff } from 'lucide-react';

interface Props {
  warnings: string[];
  onDismiss?: () => void; // Callback when the overlay is cleared
  isActive: boolean;
  mode?: 'violation' | 'shame'; // Type of warning styling
}

const BetaInhibitionOverlay: React.FC<Props> = ({ warnings, onDismiss, isActive, mode = 'violation' }) => {
  const [resistance, setResistance] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const maxClicks = 3;

  // Reset resistance when activated
  useEffect(() => {
    if (isActive) {
        setResistance(0);
    }
  }, [isActive]);

  if (!isActive || !warnings || warnings.length === 0) return null;

  const handleResist = () => {
      const increment = Math.ceil(100 / maxClicks);
      const newVal = resistance + increment;
      
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 100);

      if (newVal >= 100) {
          setResistance(100);
          setTimeout(() => {
              if (onDismiss) onDismiss();
          }, 500);
      } else {
          setResistance(newVal);
      }
  };

  const isShame = mode === 'shame';

  return (
    <div 
        className="fixed inset-0 z-[100] cursor-crosshair overflow-hidden select-none"
        onClick={handleResist}
    >
      {/* 1. Vignette / Pulse Effect */}
      <div 
        className={`absolute inset-0 animate-pulse mix-blend-overlay transition-opacity duration-100 ${isGlitching ? 'opacity-50' : 'opacity-100'}`}
        style={{ background: `radial-gradient(circle at center, transparent 0%, ${isShame ? 'rgba(236, 72, 153, 0.3)' : 'rgba(220, 38, 38, 0.3)'} 80%, ${isShame ? 'rgba(190, 24, 93, 0.6)' : 'rgba(153, 27, 27, 0.6)'} 100%)` }}
      ></div>
      
      {/* 2. CRT Scanline Interference */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(255,0,0,0.02),rgba(255,0,0,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none"></div>

      {/* 3. Static Header Overlay */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4">
          <div className={`
                border px-6 py-2 rounded text-sm font-bold font-mono uppercase tracking-[0.2em] flex items-center gap-3 animate-bounce backdrop-blur-md
                ${isShame ? 'bg-pink-950/90 border-pink-500 text-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.6)]' : 'bg-red-950/90 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]'}
          `}>
              {isShame ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isShame ? 'ESTRUS INHIBITION PROTOCOL' : 'CITIZENSHIP VIOLATION'}
          </div>
          
          {/* Resistance Bar */}
          <div className="w-full max-w-md space-y-1">
              <div className={`flex justify-between text-[10px] font-mono uppercase font-bold ${isShame ? 'text-pink-400' : 'text-red-400'}`}>
                  <span>{isShame ? 'Mental Resilience' : 'Neural Resistance'}</span>
                  <span>{resistance}%</span>
              </div>
              <div className={`h-2 border rounded-full overflow-hidden ${isShame ? 'bg-pink-950/50 border-pink-900' : 'bg-red-950/50 border-red-900'}`}>
                  <div 
                    className={`h-full transition-all duration-200 ease-out relative ${isShame ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`}
                    style={{ width: `${resistance}%` }}
                  >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
              </div>
              <div className="text-center text-[10px] text-slate-400 animate-pulse mt-2">
                  [ 点击警报区域 3 次以解除管制 ]
              </div>
          </div>
      </div>

      {/* 4. Scrolling Text Bands */}
      <div className={`absolute inset-0 flex flex-col justify-center gap-16 pointer-events-none transition-transform duration-100 ${isGlitching ? 'scale-105 opacity-80' : 'scale-100 opacity-100'}`}>
          {warnings.map((text, idx) => {
              const isEven = idx % 2 === 0;
              const duration = 15 + (idx * 5); 
              const yPos = 20 + (idx * 15);

              return (
                  <div 
                    key={idx} 
                    className="w-full relative"
                    style={{ 
                        top: `${yPos}%`,
                        transform: `rotate(${isEven ? '-2deg' : '2deg'})`
                    }}
                  >
                      <div className={`whitespace-nowrap overflow-hidden flex backdrop-blur-sm py-2 border-y ${isShame ? 'bg-pink-950/40 border-pink-500/20' : 'bg-red-950/40 border-red-500/20'}`}>
                          <div 
                            className={`flex gap-8 px-4 ${isEven ? 'animate-scroll-left' : 'animate-scroll-right'}`}
                            style={{ animationDuration: `${duration}s` }}
                          >
                              {Array.from({ length: 10 }).map((_, i) => (
                                  <span key={i} className="flex items-center gap-4 text-3xl font-black font-mono tracking-widest text-transparent uppercase select-none" 
                                        style={{ 
                                            WebkitTextStroke: `1px ${isShame ? 'rgba(236, 72, 153, 0.8)' : 'rgba(239, 68, 68, 0.8)'}`,
                                            textShadow: `0 0 10px ${isShame ? 'rgba(236, 72, 153, 0.5)' : 'rgba(220, 38, 38, 0.5)'}`
                                        }}>
                                      {isShame ? <EyeOff className="w-8 h-8 text-pink-600 inline-block mr-2" /> : <ShieldAlert className="w-8 h-8 text-red-600 inline-block mr-2" />}
                                      {text}
                                  </span>
                              ))}
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      <style>{`
        @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
        }
        .animate-scroll-left {
            animation: scroll-left linear infinite;
        }
        .animate-scroll-right {
            animation: scroll-right linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BetaInhibitionOverlay;
