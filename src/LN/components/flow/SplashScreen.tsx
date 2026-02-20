
import React from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface Props {
  onNewGame: () => void;
  onContinue?: () => void;
  canContinue?: boolean;
}

const SplashScreen: React.FC<Props> = ({ onNewGame, onContinue, canContinue = true }) => {
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-[#050505] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 ln-cubes animate-pulse"></div>
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-900/10 to-black"></div>
      </div>

      {/* Main Content */}
      <div className="z-10 w-full max-w-md p-8 flex flex-col items-center relative">
          
          {/* Logo */}
          <div className="mb-12 text-center relative">
              <h1 className="text-6xl font-black font-sans tracking-tighter text-white mb-2 glitch-text relative z-10" style={{ textShadow: '4px 4px 0px rgba(6,182,212,0.4)' }}>
                  NEURAL
                  <span className="block text-cyan-500">DECAY</span>
              </h1>
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
              <p className="mt-2 text-xs font-mono text-slate-400 tracking-[0.3em] uppercase">
                  沉浸式赛博朋克生存模拟
              </p>
          </div>

          {/* Menu Buttons */}
          <div className="w-full space-y-4">
              <button 
                  onClick={onNewGame}
                  className="w-full group relative bg-cyan-950/20 hover:bg-cyan-900/40 border border-cyan-900 hover:border-cyan-500 px-6 py-4 flex items-center justify-between transition-all duration-300"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-1 h-8 bg-cyan-500 group-hover:shadow-[0_0_10px_#22d3ee] transition-all"></div>
                      <div className="text-left">
                          <div className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">建立连接 (INITIATE)</div>
                          <div className="text-[10px] text-slate-500 font-mono">启动新的模拟进程</div>
                      </div>
                  </div>
                  <Play className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              <button 
                  onClick={onContinue}
                  disabled={!canContinue}
                  className="w-full group relative bg-black/20 hover:bg-slate-900/40 border border-slate-800 hover:border-slate-600 px-6 py-4 flex items-center justify-between transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                  <div className="flex items-center gap-4">
                      <div className="w-1 h-8 bg-slate-700 group-hover:bg-slate-500 transition-all"></div>
                      <div className="text-left">
                          <div className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors">恢复连接 (RESUME)</div>
                          <div className="text-[10px] text-slate-600 group-hover:text-slate-500 font-mono">继续上次中断的记忆</div>
                      </div>
                  </div>
                  <RotateCcw className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </button>
          </div>

          {/* Footer */}
          <div className="mt-16 text-[10px] text-slate-600 text-center font-mono">
              <p>© 2077 荒坂公司 (ARASAKA CORP). 未经授权的访问属重罪。</p>
          </div>
      </div>
    </div>
  );
};

export default SplashScreen;
