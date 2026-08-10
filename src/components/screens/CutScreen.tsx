import React, { useEffect, useState } from 'react';
import { SprinterApp, useGameStore } from '@/game/engine';
import { motion, AnimatePresence } from 'framer-motion';

export function CutScreen() {
  const { cut, skipArm } = useGameStore();
  const { N } = SprinterApp;
  
  if (!cut) return null;
  
  const ct = cut.t;
  const intro = cut.kind === 'intro';
  const champ = cut.kind === 'champion';

  // State text overlays
  const showTitle = ct > 0.35;
  const titleAlpha = SprinterApp.clamp((ct - 0.35) / 0.4, 0, 1);
  
  return (
    <div 
      className="w-full h-full absolute inset-0 pointer-events-auto"
      onClick={() => {
        if (skipArm > 0) SprinterApp.nextCut(); 
        else SprinterApp.G.skipArm = 1.6;
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      
      {/* Title block */}
      {showTitle && (
        <div 
          className="absolute left-6 md:left-[46vw] top-[60vh] md:top-[120px] max-w-lg w-[calc(100vw-48px)] flex flex-col items-start"
          style={{ opacity: titleAlpha }}
        >
          <div className="text-xs sm:text-sm font-bold tracking-widest uppercase mb-2" style={{ color: champ ? '#F8CD4A' : '#38BDF8' }}>
            {champ ? N.t('crowned') : intro ? N.t('rival') : N.t('after_race')}
          </div>
          <h2 className={`text-4xl sm:text-5xl font-black font-display tracking-tight uppercase ${champ ? 'text-primary' : 'text-foreground'}`}>
            {champ ? N.t('fastest_1') : cut.name}
          </h2>
          <div className="h-1 w-11/12 mt-2" style={{ backgroundColor: champ ? '#F8CD4A' : '#38BDF8' }} />
          
          {champ && (
            <div className="mt-4">
              <div className="text-xl sm:text-2xl font-medium text-foreground/90">{N.t('fastest_2')}</div>
              <div className="text-base sm:text-lg font-bold text-primary mt-2">
                {N.t('full_run_in')} {SprinterApp.G.runTime.toFixed(2)} s
              </div>
            </div>
          )}
          {!champ && intro && (
            <div className="mt-4 text-base sm:text-lg font-bold text-primary">
              {N.t('announced')} {SprinterApp.G.championTime.toFixed(2)} s
            </div>
          )}
        </div>
      )}

      {/* Story lines */}
      <div className="absolute left-6 md:left-[46vw] top-[75vh] md:top-[300px] max-w-lg w-[calc(100vw-48px)] flex flex-col gap-3">
        {cut.lines.map((line: string, i: number) => {
          const lt = ct - (1.3 + i * 2.6);
          if (lt <= 0) return null;
          const a = SprinterApp.clamp(lt / 0.45, 0, 1);
          return (
            <div 
              key={i} 
              className="text-sm sm:text-base font-medium text-foreground/90 leading-snug drop-shadow-md"
              style={{ opacity: a }}
            >
              {line}
            </div>
          );
        })}
      </div>
      
      {/* Top and Bottom hints */}
      <div className="absolute top-10 w-full text-center">
        <span className={`text-sm font-bold tracking-widest uppercase ${champ ? 'text-primary' : 'text-muted-foreground'}`}>
          {champ ? N.t('six_cleared') : `${N.t('stage_up')}${SprinterApp.G.levelIdx + 1}  —  ${N.levelName(SprinterApp.G.levelIdx)}`}
        </span>
      </div>

      <div className="absolute bottom-8 w-full text-center">
        <span className={`text-sm sm:text-base font-bold tracking-widest ${skipArm > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}>
          {skipArm > 0 ? N.t('skip_now') : N.t('skip_twice')}
        </span>
      </div>
      
    </div>
  );
}
