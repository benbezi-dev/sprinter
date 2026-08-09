/* -----------------------------------------------------------------------
   SPRINTER — ecrans, boucle de jeu et commandes tactiles.
   ----------------------------------------------------------------------- */
(function () {
  'use strict';
  const K = globalThis.SprinterCore;
  const A = globalThis.SprinterApp;
  const { LEVELS, RACES, C } = K;
  const { G, THEMES, Audio_, clamp } = A;
  const TAU = Math.PI * 2;

  let ctx = null;

  // ---------------------------------------------------------------- outils
  function font(sz, w) {
    return (w || 700) + ' ' + Math.max(9, Math.round(sz * A.ui())) + 'px ' +
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  }
  function text(s, x, y, col, sz, align, weight) {
    ctx.font = font(sz, weight); ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(s, x + 1, y + 2);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function plain(s, x, y, col, sz, align, weight) {
    ctx.font = font(sz, weight || 500); ctx.textAlign = align || 'left';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function card(x, y, w, h, a) {
    const r = 14 * A.ui();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = 'rgba(14,15,26,' + (a === undefined ? 0.70 : a) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function wrap(s, maxW, sz) {
    ctx.font = font(sz, 700);
    const words = s.split(' '); const out = []; let cur = '';
    for (const w of words) {
      const t = (cur + ' ' + w).trim();
      if (ctx.measureText(t).width <= maxW || !cur) cur = t;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out;
  }
  const S = v => v * A.ui();

  // ------------------------------------------------------------ ouverture
  function drawOpening() {
    const t = G.openT;
    const g = ctx.createLinearGradient(0, 0, 0, G.VH);
    g.addColorStop(0, 'rgb(16,17,32)'); g.addColorStop(1, 'rgb(8,9,18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, G.VH);

    if (t < 2.4) {
      const x = -240 + (G.VW + 480) * clamp(t / 1.5, 0, 1);
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = 'rgba(255,232,180,' +
          (0.10 * (1 - Math.abs(i - 11) / 11)).toFixed(3) + ')';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(x + i * 8 - 90, 0);
        ctx.lineTo(x + i * 8 - 260, G.VH); ctx.stroke();
      }
    }
    const zeze = Object.values(K.ZEZE);
    for (let i = 0; i < 3; i++) {
      const st = t - 0.25 * i;
      if (st > 0 && st < 3.4) {
        const man = { look: zeze[i * 2], stride: st * 11, v: 12,
                      maxSpeed: 12, fallAnim: 0, celebrate: 0 };
        const px = G.VW + 120 - (G.VW + 320) * clamp(st / 2.6, 0, 1);
        A.drawIcon(ctx, man, px, G.VH * 0.70 + i * S(24), S(150) - i * S(18));
      }
    }
    const word = 'SPRINTER';
    ctx.font = font(58, 800); ctx.textAlign = 'center';
    const wch = ctx.measureText('M').width * 0.98;
    const bx = G.VW / 2 - wch * (word.length - 1) / 2;
    for (let i = 0; i < word.length; i++) {
      const lt = t - 1.5 - i * 0.085;
      if (lt <= 0) continue;
      const drop = Math.max(0, 1 - lt / 0.42);
      const bounce = Math.sin(Math.min(1, lt / 0.42) * Math.PI) * S(12);
      const y = G.VH * 0.26 - S(300) * drop * drop + bounce;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(word[i], bx + i * wch + 3, y + 4);
      ctx.fillStyle = A.GOLD; ctx.fillText(word[i], bx + i * wch, y);
    }
    if (t > 3.1) {
      ctx.globalAlpha = clamp((t - 3.1) / 0.7, 0, 1);
      text('100 METRES   -   200 METRES', G.VW / 2, G.VH * 0.40, A.CREAM,
           24, 'center');
      ctx.globalAlpha = 1;
    }
    if (t > 4.0) {
      ctx.globalAlpha = clamp((t - 4.0) / 0.6, 0, 1);
      plain('six etapes, un seul chrono a battre', G.VW / 2, G.VH * 0.46,
            A.MUTED, 15, 'center');
      ctx.globalAlpha = 1;
    }
    if (t > 4.6) {
      const p = 0.6 + 0.4 * Math.sin(t * 5);
      ctx.globalAlpha = p;
      text('touche l\'ecran pour commencer', G.VW / 2, G.VH - S(40), A.CREAM,
           17, 'center');
      ctx.globalAlpha = 1;
    }
  }

  // -------------------------------------------------------------- accueil
  function titleButtons() {
    const bw = Math.min(G.VW * 0.62, S(360)), bh = S(66);
    const cx = G.VW / 2;
    return {
      start: { x: cx - bw / 2, y: G.VH - S(150), w: bw, h: bh },
      m100: { x: cx - bw / 2, y: G.VH - S(226), w: bw / 2 - S(6), h: S(48) },
      m200: { x: cx + S(6), y: G.VH - S(226), w: bw / 2 - S(6), h: S(48) },
      sound: { x: G.VW - S(58), y: S(16), w: S(42), h: S(42) }
    };
  }

  function drawTitle() {
    A.drawWorld(ctx, THEMES[LEVELS[0].theme]);
    ctx.fillStyle = 'rgba(10,11,22,0.82)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const tick = performance.now() / 1000;

    card(S(18), S(14), G.VW - S(36), S(96), 0.6);
    text('SPRINTER', G.VW / 2, S(66), A.GOLD, 46, 'center', 800);
    plain(G.race.label + '   -   six etapes', G.VW / 2, S(96), A.CREAM, 15,
          'center', 700);

    // trois athletes qui courent sur place
    const zeze = Object.values(K.ZEZE);
    for (let i = 0; i < 3; i++) {
      const man = { look: zeze[i], stride: tick * 10 + i * 2.1, v: 12,
                    maxSpeed: 12, fallAnim: 0, celebrate: 0 };
      A.drawIcon(ctx, man, G.VW * (G.portrait ? 0.22 : 0.16) + i * S(96),
                 G.VH * (G.portrait ? 0.34 : 0.66), S(160));
    }

    // records
    const px = G.portrait ? S(20) : G.VW * 0.48;
    const pw = G.portrait ? G.VW - S(40) : G.VW * 0.46;
    const py = G.portrait ? G.VH * 0.40 : S(128);
    card(px, py, pw, S(258), 0.72);
    text('MEILLEURS PARCOURS', px + pw / 2, py + S(26), A.GOLD, 15, 'center');
    const runs = G.runs[G.raceKey] || [];
    if (!runs.length) {
      plain('aucun parcours termine pour l\'instant', px + pw / 2,
            py + S(120), A.MUTED, 14, 'center');
      plain('etape la plus loin : ' + G.furthest[G.raceKey] + ' sur 6',
            px + pw / 2, py + S(146), A.CREAM, 15, 'center', 700);
    } else {
      for (let i = 0; i < 10; i++) {
        const y = py + S(52) + i * S(20);
        plain(String(i + 1).padStart(2), px + S(18), y, A.MUTED, 13);
        if (i < runs.length) {
          const col = i === 0 ? A.GOLD : (i < 3 ? A.CYAN : 'rgb(198,202,228)');
          plain(runs[i].toFixed(2) + ' s', px + S(48), y, col, 14, 'left', 700);
          const bw = clamp(runs[0] / runs[i], 0, 1) * (pw - S(150));
          ctx.fillStyle = 'rgba(60,62,90,0.9)';
          ctx.fillRect(px + S(120), y - S(9), pw - S(150), S(7));
          ctx.fillStyle = col;
          ctx.fillRect(px + S(120), y - S(9), bw, S(7));
        } else {
          plain('- - -', px + S(48), y, 'rgb(66,68,92)', 14);
        }
      }
    }

    const B = titleButtons();
    [['100', B.m100], ['200', B.m200]].forEach(([k, b]) => {
      const on = G.raceKey === k;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, S(11));
      ctx.fillStyle = on ? 'rgba(70,58,22,0.95)' : 'rgba(26,28,46,0.9)';
      ctx.fill();
      ctx.strokeStyle = on ? A.GOLD : 'rgba(90,96,130,0.9)';
      ctx.lineWidth = on ? 3 : 1; ctx.stroke();
      text(k + ' M', b.x + b.w / 2, b.y + b.h * 0.66, on ? A.GOLD : A.MUTED,
           19, 'center');
    });

    const p = 0.6 + 0.4 * Math.sin(tick * 3.4);
    const b = B.start;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, S(14));
    ctx.fillStyle = 'rgba(48,40,16,0.95)'; ctx.fill();
    ctx.strokeStyle = A.rgb([248, 205, 74], p); ctx.lineWidth = 3; ctx.stroke();
    text('COMMENCER', b.x + b.w / 2, b.y + b.h * 0.64,
         A.rgb([248, 205, 74], p), 26, 'center');
    plain('son : ' + (Audio_.on ? 'oui' : 'non'), G.VW - S(20), S(40),
          A.MUTED, 13, 'right');
  }

  // ---------------------------------------------------------- cinematique
  function drawCut() {
    const cut = G.cut, t = cut.t;
    const intro = cut.kind === 'intro', champ = cut.kind === 'champion';
    const th = THEMES[LEVELS[G.levelIdx].theme];
    const accent = champ ? [248, 205, 74] : th.accent;
    A.drawWorld(ctx, th);
    ctx.fillStyle = 'rgba(8,8,18,0.92)'; ctx.fillRect(0, 0, G.VW, G.VH);

    // bandes obliques
    ctx.strokeStyle = 'rgba(' + accent.join(',') + ',0.07)';
    ctx.lineWidth = S(26);
    for (let i = -4; i < 24; i++) {
      const x = i * S(62) + (t * S(34)) % S(62);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - S(240), G.VH); ctx.stroke();
    }

    const gx = G.portrait ? G.VW * 0.5 : G.VW * 0.26;
    const gy = G.portrait ? G.VH * 0.46 : G.VH * 0.72;
    const app = clamp(t / 0.55, 0, 1), ease = 1 - Math.pow(1 - app, 3);
    A.drawIcon(ctx, cut.man, gx - S(240) * (1 - ease), gy,
               S(champ ? 300 : (intro ? 280 : 250)), !intro && !champ);

    if (champ) {
      for (let i = 0; i < 70; i++) {
        const sd = (i * 7919) % 997;
        const x = (sd * 13) % G.VW;
        const y = ((t * (60 + sd % 90) + sd * 3) % (G.VH + 120)) - 60;
        if (y < -10) continue;
        const cols = ['rgb(248,205,74)', 'rgb(104,216,236)', 'rgb(232,121,216)',
                      'rgb(108,226,138)', 'rgb(238,240,248)'];
        ctx.fillStyle = cols[sd % 5];
        ctx.fillRect(x + Math.sin(t * 3 + sd) * 5, y, S(4) + sd % 4, S(7));
      }
    }

    const tx = G.portrait ? S(24) : G.VW * 0.46;
    const tw = G.portrait ? G.VW - S(48) : G.VW * 0.50;
    const ty = G.portrait ? G.VH * 0.60 : S(120);
    if (t > 0.35) {
      const a = clamp((t - 0.35) / 0.4, 0, 1);
      ctx.globalAlpha = a;
      plain(champ ? 'SACRE INTER GALACTIQUE'
            : (intro ? 'LE COUREUR A BATTRE' : 'APRES LA COURSE'),
            tx, ty, A.rgb(accent), 12);
      text(champ ? "L'ETRE LE PLUS RAPIDE" : cut.name.toUpperCase(),
           tx, ty + S(44), champ ? A.GOLD : A.CREAM, champ ? 30 : 40, 'left', 800);
      ctx.fillStyle = A.rgb(accent);
      ctx.fillRect(tx, ty + S(58), tw * a * 0.9, S(4));
      if (champ) {
        text('DE TOUTES LES GALAXIES', tx, ty + S(92), A.CREAM, 22);
        plain('parcours complet en ' + G.runTime.toFixed(2) + ' s', tx,
              ty + S(120), A.GOLD, 16, 'left', 700);
      } else if (intro) {
        plain('chrono annonce : ' + G.championTime.toFixed(2) + ' s', tx,
              ty + S(92), A.GOLD, 17, 'left', 700);
      }
      ctx.globalAlpha = 1;
    }

    let y = ty + S(champ ? 156 : 130);
    for (let i = 0; i < cut.lines.length; i++) {
      const lt = t - (1.3 + i * 2.6);
      if (lt <= 0) break;
      const a = clamp(lt / 0.45, 0, 1);
      ctx.globalAlpha = a;
      for (const sub of wrap(cut.lines[i], tw, 15)) {
        plain(sub, tx, y, 'rgb(226,228,246)', 15, 'left', 700);
        y += S(25);
      }
      y += S(9);
      ctx.globalAlpha = 1;
    }

    plain(champ ? 'SIX ETAPES FRANCHIES'
          : 'ETAPE ' + (G.levelIdx + 1) + '   -   ' +
            LEVELS[G.levelIdx].name.toUpperCase(),
          G.VW / 2, S(40), champ ? A.GOLD : A.MUTED, 14, 'center', 700);
    if (G.skipArm > 0) {
      text('touche a nouveau pour passer', G.VW / 2, G.VH - S(28), A.GOLD,
           16, 'center');
    } else {
      plain('touche deux fois pour passer', G.VW / 2, G.VH - S(28), A.MUTED,
            14, 'center');
    }
  }

  // ---------------------------------------------------------------- course
  function drawRace() {
    const th = THEMES[LEVELS[G.levelIdx].theme];
    ctx.save();
    if (G.shake > 0.01) {
      const a = G.shake * S(9);
      ctx.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
    }
    A.drawWorld(ctx, th);
    A.drawAthletes(ctx);
    ctx.restore();
    drawHud(th);
    if (G.state === 'count') drawCountdown(th);
    if (G.stumbleFlash > 0) {
      ctx.globalAlpha = G.stumbleFlash;
      text('TU TREBUCHES', G.VW / 2, G.VH * 0.36, A.RED, 30, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function drawHud(th) {
    const accent = A.rgb(th.accent);
    const order = G.runners.slice().sort((a, b) => {
      const fa = a.finished ? 0 : 1, fb = b.finished ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return a.finished ? a.finishTime - b.finishTime : b.d - a.d;
    });
    const pos = order.indexOf(G.player) + 1;
    const posTxt = pos + (pos === 1 ? 'er' : 'e');
    const posCol = pos === 1 ? A.GOLD : A.CREAM;
    const H = G.portrait ? S(66) : S(50);

    ctx.fillStyle = 'rgba(10,11,22,0.72)'; ctx.fillRect(0, 0, G.VW, H);
    ctx.fillStyle = accent; ctx.fillRect(0, H, G.VW, 2);

    if (G.portrait) {
      // deux lignes : l'etape au-dessus, la place et le chrono en dessous
      plain(LEVELS[G.levelIdx].name.toUpperCase(), S(14), S(20), A.MUTED, 11);
      text(posTxt, S(14), S(50), posCol, 24);
      text(G.elapsed.toFixed(2), G.VW - S(14), S(52), A.GOLD, 32, 'right', 800);
    } else {
      text(LEVELS[G.levelIdx].name.toUpperCase(), S(16), S(32), A.CREAM, 17);
      text(posTxt, G.VW / 2, S(36), posCol, 24, 'center');
      text(G.elapsed.toFixed(2), G.VW - S(16), S(38), A.GOLD, 34, 'right', 800);
    }

    const bw = Math.min(G.VW * (G.portrait ? 0.9 : 0.32), S(280));
    const by = H + S(10);
    ctx.fillStyle = 'rgba(54,46,82,0.85)';
    ctx.fillRect(S(14), by, bw, S(7));
    ctx.fillStyle = accent;
    ctx.fillRect(S(14), by, bw * clamp(G.player.d / G.track.total, 0, 1), S(7));

    if (!G.portrait) {
      card(S(16), by + S(14), S(206), S(20) * order.length + S(12), 0.62);
      order.forEach((r, i) => {
        const col = r.isPlayer ? A.GOLD
          : (r.name === G.champion ? A.MAGENTA : 'rgb(206,210,236)');
        plain((i + 1) + '. ' + (r.isPlayer ? 'TOI' : r.name).slice(0, 15),
              S(28), by + S(34) + i * S(20), col, 12, 'left', 700);
        plain(Math.round(r.d) + ' m', S(212), by + S(34) + i * S(20), col, 12,
              'right', 700);
      });
    } else {
      // en portrait : seulement l'ecart avec le coureur devant ou derriere
      const me = order.indexOf(G.player);
      const other = me === 0 ? order[1] : order[me - 1];
      if (other) {
        const gap = other.d - G.player.d;
        plain((gap >= 0 ? '+' : '') + gap.toFixed(1) + ' m  ' +
              (other.isPlayer ? '' : other.name.split(' ')[0]),
              G.VW - S(14), by + S(24), gap > 0 ? A.RED : A.GREEN, 12, 'right', 700);
      }
    }
  }

  function drawCountdown(th) {
    ctx.fillStyle = 'rgba(0,0,0,0.36)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const left = 3 - G.countT, n = Math.ceil(left);
    const frac = left - Math.floor(left);
    const cx = G.VW / 2, cy = G.VH * 0.44;
    const r = S(74) + S(30) * frac;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = 'rgba(10,11,24,0.55)'; ctx.fill();
    ctx.strokeStyle = A.rgb(th.accent); ctx.lineWidth = 4; ctx.stroke();
    const label = n > 0 ? String(n) : 'PARTEZ';
    text(label, cx, cy + S(22), n > 0 ? '#fff' : A.GOLD,
         (n > 0 ? 96 : 48) * (1 + 0.2 * (1 - frac)), 'center', 800);
    if (G.champion) {
      plain('a battre : ' + G.champion + '  -  ' + G.championTime.toFixed(2) + ' s',
            cx, cy + S(150), A.MAGENTA, 16, 'center', 700);
    }
  }

  // ------------------------------------------------------------- resultats
  function resultButtons() {
    const bw = Math.min(G.VW * 0.36, S(200)), bh = S(54);
    return {
      a: { x: G.VW / 2 - bw - S(10), y: G.VH - S(84), w: bw, h: bh },
      b: { x: G.VW / 2 + S(10), y: G.VH - S(84), w: bw, h: bh }
    };
  }

  function rankTable(x, y, w) {
    G.ranking.forEach((r, i) => {
      const ry = y + i * S(30);
      if (r.isPlayer) {
        ctx.fillStyle = G.won ? 'rgba(78,62,22,0.9)' : 'rgba(74,38,38,0.9)';
        ctx.beginPath(); ctx.roundRect(x, ry - S(18), w, S(26), S(6)); ctx.fill();
      }
      const medal = i < 3 ? ['1er', '2e', '3e'][i] : (i + 1) + 'e';
      const mc = i === 0 ? A.GOLD : (i === 1 ? 'rgb(200,204,222)'
        : (i === 2 ? 'rgb(198,148,96)' : A.MUTED));
      plain(medal, x + S(12), ry, mc, 14, 'left', 700);
      const nc = r.isPlayer ? A.GOLD
        : (r.name === G.champion ? A.MAGENTA : A.CREAM);
      plain(r.isPlayer ? 'TOI' : r.name, x + S(60), ry, nc, 14, 'left', 700);
      plain(r.finishTime ? r.finishTime.toFixed(2) + ' s' : 'abandon',
            x + w - S(12), ry, r.finishTime ? A.CREAM : A.RED, 14, 'right', 700);
    });
  }

  function drawResult() {
    A.drawWorld(ctx, THEMES[LEVELS[G.levelIdx].theme]);
    ctx.fillStyle = 'rgba(9,10,20,0.86)'; ctx.fillRect(0, 0, G.VW, G.VH);
    text('ETAPE ' + (G.levelIdx + 1) + ' FRANCHIE', G.VW / 2, S(58),
         A.GREEN, 34, 'center', 800);
    plain('1re place en ' + G.player.finishTime.toFixed(2) +
          ' s   -   cumul ' + G.runTime.toFixed(2) + ' s',
          G.VW / 2, S(88), 'rgb(198,202,234)', 14, 'center');
    const w = Math.min(G.VW - S(40), S(520));
    card(G.VW / 2 - w / 2, S(104), w, S(268), 0.72);
    rankTable(G.VW / 2 - w / 2 + S(10), S(140), w - S(20));
    if (G.badge) {
      const [lbl, col] = G.badge;
      ctx.font = font(24, 800);
      const bw = ctx.measureText(lbl).width + S(48);
      ctx.beginPath();
      ctx.roundRect(G.VW / 2 - bw / 2, G.VH - S(148), bw, S(44), S(12));
      ctx.fillStyle = col; ctx.fill();
      plain(lbl, G.VW / 2, G.VH - S(118), 'rgb(13,14,24)', 24, 'center', 800);
    }
    const B = resultButtons();
    button(B.a, 'ETAPE ' + (G.levelIdx + 2), A.GOLD, true);
    button(B.b, 'ACCUEIL', A.MUTED, false);
  }

  function drawOver() {
    A.drawWorld(ctx, THEMES[LEVELS[G.levelIdx].theme]);
    ctx.fillStyle = 'rgba(26,8,12,0.88)'; ctx.fillRect(0, 0, G.VW, G.VH);
    const rank = G.ranking.indexOf(G.player) + 1;
    text(rank + (rank === 1 ? 're' : 'e') + ' PLACE', G.VW / 2, S(54),
         A.RED, 34, 'center', 800);
    plain(LEVELS[G.levelIdx].name + '   -   ' +
          (G.player.finishTime ? G.player.finishTime.toFixed(2) + ' s'
            : 'non termine'),
          G.VW / 2, S(84), 'rgb(232,214,214)', 14, 'center');
    const w = Math.min(G.VW - S(40), S(520));
    card(G.VW / 2 - w / 2, S(100), w, S(268), 0.72);
    rankTable(G.VW / 2 - w / 2 + S(10), S(136), w - S(20));
    text('RECOMMENCER ?', G.VW / 2, G.VH - S(104), A.CREAM, 18, 'center');
    const B = resultButtons();
    button(B.a, 'OUI', A.GREEN, G.overChoice === 0);
    button(B.b, 'NON', A.RED, G.overChoice === 1);
  }

  function drawWinAll() {
    A.drawWorld(ctx, THEMES.cosmos);
    ctx.fillStyle = 'rgba(10,8,24,0.86)'; ctx.fillRect(0, 0, G.VW, G.VH);
    text('PARCOURS TERMINE', G.VW / 2, S(58), A.GOLD, 34, 'center', 800);
    plain('six etapes franchies en ' + G.runTime.toFixed(2) + ' s',
          G.VW / 2, S(88), 'rgb(222,216,246)', 15, 'center');
    const w = Math.min(G.VW - S(40), S(460));
    card(G.VW / 2 - w / 2, S(104), w, S(250), 0.72);
    G.runSplits.forEach((t, i) => {
      const y = S(136) + i * S(34);
      plain('etape ' + (i + 1), G.VW / 2 - w / 2 + S(18), y, A.MUTED, 14);
      plain(LEVELS[i].name, G.VW / 2 - w / 2 + S(94), y, A.CREAM, 14, 'left', 700);
      plain(t.toFixed(2) + ' s', G.VW / 2 + w / 2 - S(18), y, A.CREAM, 14,
            'right', 700);
    });
    if (G.runRank) {
      const lbl = G.runRank === 1 ? 'MEILLEUR PARCOURS'
        : (G.runRank <= 3 ? 'TOP 3 DES PARCOURS' : 'TOP 10 DES PARCOURS');
      ctx.font = font(22, 800);
      const bw = ctx.measureText(lbl).width + S(44);
      ctx.beginPath();
      ctx.roundRect(G.VW / 2 - bw / 2, G.VH - S(152), bw, S(42), S(12));
      ctx.fillStyle = A.GOLD; ctx.fill();
      plain(lbl, G.VW / 2, G.VH - S(124), 'rgb(13,14,24)', 22, 'center', 800);
    }
    const B = resultButtons();
    button(B.a, 'REJOUER', A.GOLD, true);
    button(B.b, 'ACCUEIL', A.MUTED, false);
  }

  function button(b, label, col, active) {
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, S(12));
    ctx.fillStyle = active ? 'rgba(40,40,60,0.95)' : 'rgba(22,24,38,0.9)';
    ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = active ? 3 : 1; ctx.stroke();
    text(label, b.x + b.w / 2, b.y + b.h * 0.64, col, 20, 'center');
  }

  // ------------------------------------------------------ boutons de course
  function padRects() {
    const h = G.portrait ? G.VH * 0.20 : G.VH * 0.17;
    const y = G.VH - h;
    return {
      left: { x: 0, y, w: G.VW / 2 - S(4), h },
      right: { x: G.VW / 2 + S(4), y, w: G.VW / 2 - S(4), h }
    };
  }
  function drawPads() {
    if (G.state !== 'race' && G.state !== 'count') return;
    const P = padRects();
    [['left', '<', P.left], ['right', '>', P.right]].forEach(([k, s, r]) => {
      const on = !!G.touches[k];
      ctx.beginPath(); ctx.roundRect(r.x + S(8), r.y, r.w - S(16), r.h - S(10), S(16));
      ctx.fillStyle = on ? 'rgba(58,50,20,0.80)' : 'rgba(12,14,26,0.62)';
      ctx.fill();
      ctx.strokeStyle = on ? A.GOLD : 'rgba(150,156,190,0.45)';
      ctx.lineWidth = on ? 2.5 : 1.2; ctx.stroke();
      text(s, r.x + r.w / 2, r.y + r.h * 0.60, on ? A.GOLD : 'rgb(176,182,214)',
           34, 'center', 800);
    });
    ctx.fillStyle = 'rgba(10,11,22,0.55)';
    ctx.fillRect(0, P.left.y - S(24), G.VW, S(24));
    plain('alterne les deux touches', G.VW / 2, P.left.y - S(8),
          A.MUTED, 12, 'center');
  }

  // ------------------------------------------------------------- entrees
  function inRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function tap(p) {
    Audio_.init();
    if (G.state === 'open') { G.state = 'title'; return; }
    if (G.state === 'cut') {
      if (G.skipArm > 0) A.nextCut(); else G.skipArm = 1.6;
      return;
    }
    if (G.state === 'title') {
      const B = titleButtons();
      if (inRect(p, B.m100)) { G.raceKey = '100'; G.race = RACES['100']; A.buildLevel(0); return; }
      if (inRect(p, B.m200)) { G.raceKey = '200'; G.race = RACES['200']; A.buildLevel(0); return; }
      if (inRect(p, B.sound)) { Audio_.toggle(); return; }
      if (inRect(p, B.start)) { A.startRun(); return; }
      return;
    }
    if (G.state === 'result') {
      const B = resultButtons();
      if (inRect(p, B.a)) A.startLevel(G.levelIdx + 1);
      else if (inRect(p, B.b)) { G.state = 'title'; A.buildLevel(0); }
      return;
    }
    if (G.state === 'over') {
      const B = resultButtons();
      if (inRect(p, B.a)) A.startRun();
      else if (inRect(p, B.b)) { G.state = 'title'; A.buildLevel(0); }
      return;
    }
    if (G.state === 'winall') {
      const B = resultButtons();
      if (inRect(p, B.a)) A.startRun();
      else if (inRect(p, B.b)) { G.state = 'title'; A.buildLevel(0); }
      return;
    }
  }
  // Retour haptique : Capacitor sur telephone, sinon l'API Vibration.
  function buzz(ms) {
    try {
      const cap = window.Capacitor;
      if (cap && cap.Plugins && cap.Plugins.Haptics) {
        cap.Plugins.Haptics.impact({ style: ms > 12 ? 'MEDIUM' : 'LIGHT' });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { }
  }

  function padPress(side) {
    if (G.state !== 'race') return;
    if (G.player.press(side)) {
      G.stumbleFlash = 0.9; G.shake = 1; Audio_.sfx('trip'); buzz(30);
    } else if (G.player.tookStep()) {
      buzz(6);
    }
  }

  // ------------------------------------------------------------- boucle
  function update(dt) {
    G.skipArm = Math.max(0, G.skipArm - dt);
    G.shake = Math.max(0, G.shake - dt * 3.2);
    G.flash = Math.max(0, G.flash - dt * 1.4);
    G.stumbleFlash = Math.max(0, G.stumbleFlash - dt);

    if (G.state === 'title' || G.state === 'open') Audio_.music('menu');
    else if (G.state === 'cut')
      // l'introduction du rival annonce deja l'ambiance de la course
      Audio_.music(G.cut && G.cut.kind === 'intro'
        ? Audio_.raceTrack(G.levelIdx) : 'menu');
    else if (G.state === 'race' || G.state === 'count')
      Audio_.music(Audio_.raceTrack(G.levelIdx));

    if (G.state === 'open') {
      G.openT += dt;
      if (G.openT > 6.4) G.state = 'title';
    } else if (G.state === 'cut') {
      G.cut.t += dt;
      G.cut.man.stride += dt * (G.cut.kind === 'intro' ? 11 : 3.2);
      if (G.cut.t > 15.4) A.nextCut();
    } else if (G.state === 'count') {
      const prev = Math.floor(G.countT);
      G.countT += dt;
      if (Math.floor(G.countT) !== prev && G.countT < 3) Audio_.sfx('beep');
      A.followCam(dt);
      if (G.countT >= 3) { Audio_.sfx('go'); G.state = 'race'; G.elapsed = 0; }
    } else if (G.state === 'race') {
      G.acc += dt;
      const step = 1 / 240;
      while (G.acc >= step) {
        G.acc -= step; G.elapsed += step;
        G.player.stepPlayer(step, G.elapsed);
        for (const r of G.runners) if (!r.isPlayer) r.stepAI(step, G.elapsed);
      }
      A.followCam(dt);
      const out = G.player.finished &&
        G.player.d >= G.track.total + C.RUNOUT;
      const slow = G.player.finished &&
        G.elapsed >= G.player.finishTime + 3;
      if (out || slow || G.elapsed >= 90) {
        for (const r of G.runners)
          if (!r.finished && !r.isPlayer) r.finishTime = r.target;
        A.finishRace();
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - G.last) / 1000 || 0.016);
    G.last = now;
    update(dt);
    ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    ctx.clearRect(0, 0, G.VW, G.VH);
    if (G.state === 'open') drawOpening();
    else if (G.state === 'title') drawTitle();
    else if (G.state === 'cut') drawCut();
    else if (G.state === 'result') drawResult();
    else if (G.state === 'over') drawOver();
    else if (G.state === 'winall') drawWinAll();
    else drawRace();
    drawPads();
    requestAnimationFrame(frame);
  }

  // --------------------------------------------------------------- init
  function resize() {
    // le parent tient compte du retrait applique pour l'encoche
    const box = G.cv.parentNode || G.cv;
    const r = box.getBoundingClientRect ? box.getBoundingClientRect() : null;
    const w = (r && Math.round(r.width)) || window.innerWidth;
    const h = (r && Math.round(r.height)) || window.innerHeight;
    G.dpr = Math.min(window.devicePixelRatio || 1, 2);
    G.cv.width = Math.round(w * G.dpr);
    G.cv.height = Math.round(h * G.dpr);
    G.cv.style.width = w + 'px';
    G.cv.style.height = h + 'px';
    G.VW = w; G.VH = h;
    G.portrait = h > w;
  }

  function start() {
    G.cv = document.getElementById('cv');
    ctx = G.cv.getContext('2d', { alpha: false });
    if (!ctx.roundRect) {
      ctx.roundRect = function (x, y, w, h, r) {
        this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r); this.closePath();
      };
    }
    A.load();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));

    G.race = RACES[G.raceKey];
    A.buildLevel(0);

    const pt = e => {
      const r = G.cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    G.cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = pt(e), P = padRects();
      if ((G.state === 'race' || G.state === 'count') &&
          (inRect(p, P.left) || inRect(p, P.right))) {
        const side = inRect(p, P.left) ? 'left' : 'right';
        G.touches[side] = e.pointerId;
        padPress(side);
      } else tap(p);
    }, { passive: false });
    const release = e => {
      for (const k of ['left', 'right'])
        if (G.touches[k] === e.pointerId) delete G.touches[k];
    };
    G.cv.addEventListener('pointerup', release);
    G.cv.addEventListener('pointercancel', release);

    window.addEventListener('keydown', e => {
      Audio_.init();
      if (e.key === 'ArrowLeft') { padPress('left'); G.touches.left = 1; }
      else if (e.key === 'ArrowRight') { padPress('right'); G.touches.right = 1; }
      else if (e.key === 'Enter' || e.key === ' ') {
        if (G.state === 'title') tap({ x: titleButtons().start.x + 5,
                                       y: titleButtons().start.y + 5 });
        else tap({ x: resultButtons().a.x + 5, y: resultButtons().a.y + 5 });
      } else if (e.key === 's' || e.key === 'S') Audio_.toggle();
      if (e.key.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowLeft') delete G.touches.left;
      if (e.key === 'ArrowRight') delete G.touches.right;
    });

    G.last = performance.now();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();
})();
