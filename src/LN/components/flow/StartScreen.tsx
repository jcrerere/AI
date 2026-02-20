import React from 'react';
import { Power } from 'lucide-react';

interface Props {
  onStart: () => void;
}

const StartScreen: React.FC<Props> = ({ onStart }) => {
  const handleStart = async () => {
    // Attempt fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen blocked or not supported:', err);
    }
    
    onStart();
  };

  return (
    <div 
        className="w-full h-full flex flex-col items-center justify-center bg-black text-white cursor-pointer relative overflow-hidden"
        onClick={handleStart}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)]"></div>
      
      <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
          <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Power className="w-10 h-10 text-cyan-500" />
              </div>
              <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-ping"></div>
          </div>
          
          <div className="text-center space-y-2">
              <h1 className="text-3xl font-mono font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                  系统初始化中...
              </h1>
              <p className="text-sm font-mono text-slate-500 animate-pulse">
                  [ 点击任意处建立神经连接 ]
              </p>
          </div>
      </div>

      <div className="absolute bottom-8 text-[9px] text-slate-700 font-mono">
          神经腐朽 NEURAL DECAY v0.9.2-BETA
      </div>
    </div>
  );
};

export default StartScreen;