import React from 'react';
import { SprinterApp, useGameStore } from '@/game/engine';
import { motion } from 'framer-motion';

export function WinAllScreen() {
  const { runTime, runSplits, runRank } = useGameStore();
  const { N } = SprinterApp;

  const handleReplay = () => {
    SprinterApp.startRun();
  };
  
  const handleHome = () => {
    SprinterApp.G.state = 'title';
    SprinterApp.buildLevel(0);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-auto bg-black/90 backdrop-blur-md p-4 sm:p-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center max-w-2xl w-full">
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black font-display text-primary tracking-tighter uppercase text-center mb-2 drop-shadow-[0_0_30px_rgba(248,205,74,0.4)]">
          {N.t('run_done')}
        </h1>
        
        <div className="text-center text-sm sm:text-base font-medium text-foreground/80 mb-8 tracking-widest uppercase">
          {N.t('six_in')}<span className="text-white font-bold ml-2">{runTime.toFixed(2)} s</span>
        </div>
        
        {/* Splits Card */}
        <div className="w-full bg-card/60 border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col gap-3">
            {runSplits.map((split, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-black/20">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
                  <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    {N.t('stage_low')} {i + 1}
                  </span>
                  <span className="font-bold tracking-wide text-foreground">
                    {N.levelName(i)}
                  </span>
                </div>
                <span className="font-mono font-bold text-primary text-lg">
                  {split.toFixed(2)} s
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center px-4">
            <span className="font-bold tracking-widest text-foreground uppercase">TOTAL</span>
            <span className="font-mono font-black text-2xl text-primary">{runTime.toFixed(2)} s</span>
          </div>
        </div>

        {/* Rank Badge */}
        {runRank && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: { delay: 0.5 } }} className="mb-8 bg-primary text-background font-black font-display tracking-widest uppercase px-8 py-4 rounded-xl text-xl sm:text-2xl shadow-[0_0_30px_rgba(248,205,74,0.4)] text-center">
            {runRank === 1 ? N.t('best_run') : runRank <= 3 ? N.t('top3_runs') : N.t('top10_runs')}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-4 w-full max-w-md">
          <button onClick={handleReplay} className="flex-1 py-4 rounded-xl font-black font-display text-xl sm:text-2xl tracking-widest text-background bg-primary hover:bg-primary/90 transition-all border-b-4 border-amber-600 active:border-b-0 active:translate-y-1">
            {N.t('replay')}
          </button>
          <button onClick={handleHome} className="flex-1 py-4 rounded-xl font-bold tracking-widest text-foreground bg-secondary hover:bg-secondary/80 transition-all border-b-4 border-black active:border-b-0 active:translate-y-1">
            {N.t('home')}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
