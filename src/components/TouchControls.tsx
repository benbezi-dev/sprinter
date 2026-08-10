import React from 'react';
import { useInputHandlers } from '@/hooks/use-inputs';
import { useGameStore, SprinterApp } from '@/game/engine';

export function TouchControls() {
  const { handleLeftTouch, handleRightTouch, handleTouchEnd } = useInputHandlers();
  const state = useGameStore(s => s.state);
  
  if (state !== 'race' && state !== 'count') return null;
  
  return (
    <div className="absolute bottom-0 w-full h-[30vh] sm:h-[25vh] flex px-2 pb-2 gap-2 z-50">
      <div 
        className="flex-1 rounded-2xl border-2 border-white/10 bg-card/40 backdrop-blur-sm flex items-end justify-center pb-6 md:pb-8 active:bg-primary/20 active:border-primary/50 transition-colors select-none touch-none"
        onPointerDown={(e) => { e.preventDefault(); handleLeftTouch(); }}
        onPointerUp={() => handleTouchEnd('left')}
        onPointerCancel={() => handleTouchEnd('left')}
      >
        <span className="text-4xl md:text-5xl font-black text-white/30">&lt;</span>
      </div>
      
      <div 
        className="flex-1 rounded-2xl border-2 border-white/10 bg-card/40 backdrop-blur-sm flex items-end justify-center pb-6 md:pb-8 active:bg-primary/20 active:border-primary/50 transition-colors select-none touch-none"
        onPointerDown={(e) => { e.preventDefault(); handleRightTouch(); }}
        onPointerUp={() => handleTouchEnd('right')}
        onPointerCancel={() => handleTouchEnd('right')}
      >
        <span className="text-4xl md:text-5xl font-black text-white/30">&gt;</span>
      </div>
      
      <div className="absolute top-[-30px] w-full text-center pointer-events-none left-0">
        <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase bg-black/40 px-4 py-1 rounded-full">
          {SprinterApp.N.t('alternate')}
        </span>
      </div>
    </div>
  );
}
