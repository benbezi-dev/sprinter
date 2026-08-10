import React from 'react';
import { SprinterApp, useGameStore } from '@/game/engine';
import { motion } from 'framer-motion';

export function ResultScreen() {
  const { 
    levelIdx, player, runTime, ranking, badge
  } = useGameStore();
  const { N } = SprinterApp;

  const startRecap = () => {
    if (!player || player.reaction === null) return N.t('no_start');
    const g = player.transGrade === null ? 0 : player.transGrade;
    return N.t('start_line', { r: player.jumped ? '--' : player.reaction.toFixed(3), g: N.t('trans_' + g) });
  };

  const handleNext = () => {
    SprinterApp.startLevel(levelIdx + 1);
  };
  
  const handleHome = () => {
    SprinterApp.G.state = 'title';
    SprinterApp.buildLevel(0);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-auto bg-black/80 backdrop-blur-sm p-4 sm:p-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center max-w-2xl w-full">
        
        <h1 className="text-4xl sm:text-5xl font-black font-display text-emerald-400 tracking-tight uppercase text-center mb-2 drop-shadow-md">
          {N.t('stage_done', { n: levelIdx + 1 })}
        </h1>
        
        <div className="text-center text-sm sm:text-base font-medium text-foreground/80 mb-2 tracking-wide">
          {N.t('first_in')}<span className="text-white font-bold">{player?.finishTime?.toFixed(2)}s</span>
          {N.t('total_of')}<span className="text-white font-bold">{runTime.toFixed(2)}s</span>
        </div>
        
        <div className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase mb-8">
          {startRecap()}
        </div>

        {/* Leaderboard Card */}
        <div className="w-full bg-card/70 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl mb-8">
          <div className="flex flex-col gap-2">
            {ranking.map((r, i) => {
              const isMe = r.isPlayer;
              const mc = i === 0 ? 'text-primary' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-muted-foreground';
              const nc = isMe ? 'text-primary' : r.name === SprinterApp.G.champion ? 'text-fuchsia-400' : 'text-foreground';
              const tc = r.finishTime ? 'text-foreground' : 'text-destructive';
              
              return (
                <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isMe ? 'bg-primary/10 border-primary/30' : 'border-white/5 bg-black/20'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold w-8 ${mc}`}>{N.ord(i + 1)}</span>
                    <span className={`font-bold tracking-wide ${nc}`}>{isMe ? N.t('you') : r.name}</span>
                  </div>
                  <span className={`font-mono font-bold ${tc}`}>
                    {r.finishTime ? `${r.finishTime.toFixed(2)} s` : N.t('dnf')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badge */}
        {badge && (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8 bg-primary text-background font-black font-display tracking-widest uppercase px-6 py-3 rounded-xl text-xl sm:text-2xl shadow-[0_0_30px_rgba(248,205,74,0.4)]">
            {N.t(badge[0])}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-4 w-full max-w-md">
          <button onClick={handleNext} className="flex-1 py-4 rounded-xl font-black font-display text-xl sm:text-2xl tracking-widest text-background bg-primary hover:bg-primary/90 transition-all border-b-4 border-amber-600 active:border-b-0 active:translate-y-1">
            {N.t('next_stage', { n: levelIdx + 2 })}
          </button>
          <button onClick={handleHome} className="flex-1 py-4 rounded-xl font-bold tracking-widest text-foreground bg-secondary hover:bg-secondary/80 transition-all border-b-4 border-black active:border-b-0 active:translate-y-1">
            {N.t('home')}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
