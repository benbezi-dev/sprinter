/* -----------------------------------------------------------------------
   SPRINTER — couche navigateur : rendu, ecrans, tactile, son.
   ----------------------------------------------------------------------- */
(function () {
  'use strict';
  const K = globalThis.SprinterCore;
  const { TAU, C, RACES, LEVELS, Track, Runner, pose, ZEZE, PLAYER_LOOK,
          CUBE, FACES, LIGHT } = K;

  const THEMES = {
    day: {
      skyTop: [38, 92, 182], skyBot: [146, 196, 240], stars: 0,
      grass: [46, 112, 58], grassEdge: [32, 84, 44],
      trackA: [172, 64, 34], trackB: [154, 54, 26],
      lane: [246, 242, 234], kerb: [252, 252, 252],
      tread: [176, 178, 186], riser: [132, 136, 148], roof: [78, 82, 98],
      barrier: [232, 234, 238],
      panels: [[214, 74, 62], [44, 108, 186], [240, 196, 70], [60, 152, 118]],
      crowdLo: [44, 40, 54], crowdHi: [250, 242, 232],
      accent: [240, 158, 46], dust: [226, 190, 160]
    },
    cosmos: {
      skyTop: [11, 7, 26], skyBot: [58, 24, 92], stars: 220,
      grass: [24, 16, 44], grassEdge: [44, 28, 74],
      trackA: [98, 40, 134], trackB: [83, 31, 118],
      lane: [228, 204, 255], kerb: [234, 216, 250],
      tread: [58, 38, 88], riser: [40, 24, 64], roof: [26, 15, 44],
      barrier: [120, 84, 168],
      panels: [[196, 72, 190], [86, 92, 220], [52, 190, 196], [236, 158, 72]],
      crowdLo: [56, 44, 78], crowdHi: [214, 188, 244],
      accent: [232, 121, 216], dust: [216, 196, 236]
    }
  };

  const GOLD = 'rgb(248,205,74)', CREAM = 'rgb(238,240,248)';
  const MUTED = 'rgb(140,146,182)', CYAN = 'rgb(104,216,236)';
  const GREEN = 'rgb(108,226,138)', RED = 'rgb(250,106,106)';
  const MAGENTA = 'rgb(232,121,216)';
  const rgb = (c, f) => 'rgb(' + Math.min(255, c[0] * (f || 1) | 0) + ',' +
    Math.min(255, c[1] * (f || 1) | 0) + ',' + Math.min(255, c[2] * (f || 1) | 0) + ')';
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t),
                            lerp(a[2], b[2], t)];

  // -------------------------------------------------------------------
  // TEXTES : ils vivent tous dans sprinter-i18n.js, en francais et en
  // anglais. On ne garde ici que les raccourcis.
  // -------------------------------------------------------------------
  const N = globalThis.SprinterI18N;
  const t = (k, v) => N.t(k, v);
  const CUT_INTRO = N.CUT_INTRO, CUT_DEFEAT = N.CUT_DEFEAT;
  const CUT_CHAMPION = N.CUT_CHAMPION;
  // chaque variante est un couple [francais, anglais]
  const pickLang = a => a[Math.floor(Math.random() * a.length)][N.index()];

  // -------------------------------------------------------------------
  // SON
  // -------------------------------------------------------------------
  const Audio_ = {
    ok: false, on: true, ctx: null, buf: {}, src: null, cur: null, gain: null,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.34;
        this.gain.connect(this.ctx.destination);
        this.build();
        this.ok = true;
      } catch (e) { this.ok = false; }
    },
    tone(d, t0, dur, f, amp, wave, decay) {
      const sr = d.sampleRate, ch = d.getChannelData(0);
      const i0 = (t0 * sr) | 0, n = (dur * sr) | 0;
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const k = i0 + i; if (k >= ch.length) break;
        ph += f / sr; const p = ph - (ph | 0);
        let s;
        if (wave === 'sq') s = p < 0.5 ? 1 : -1;
        else if (wave === 'saw') s = 2 * p - 1;
        else if (wave === 'tri') s = 4 * Math.abs(p - 0.5) - 1;
        else if (wave === 'pulse') s = p < 0.25 ? 1 : -1;
        else s = Math.sin(TAU * p);
        let env = Math.exp(-decay * i / sr);
        if (i < 120) env *= i / 120;
        ch[k] += amp * env * s;
      }
    },
    drum(d, t0, kind) {
      const sr = d.sampleRate, ch = d.getChannelData(0);
      const i0 = (t0 * sr) | 0;
      const n = ((kind === 'k' ? 0.16 : kind === 's' ? 0.13 : 0.05) * sr) | 0;
      let ph = 0, seed = 12345;
      for (let i = 0; i < n; i++) {
        const k = i0 + i; if (k >= ch.length) break;
        const q = i / n;
        seed = (Math.imul(1103515245, seed) + 12345) & 0x7fffffff;
        const nz = seed / 0x3fffffff - 1;
        if (kind === 'k') {
          ph += (118 * Math.exp(-5.2 * q) + 42) / sr;
          ch[k] += 0.9 * Math.exp(-7 * q) * Math.sin(TAU * ph);
        } else if (kind === 's') {
          ph += 190 / sr;
          ch[k] += 0.42 * Math.exp(-13 * q) * (0.72 * nz + 0.28 * Math.sin(TAU * ph));
        } else {
          ch[k] += 0.15 * Math.exp(-42 * i / sr) * nz;
        }
      }
    },
    norm(d) {
      const ch = d.getChannelData(0);
      let pk = 0;
      for (let i = 0; i < ch.length; i++) pk = Math.max(pk, Math.abs(ch[i]));
      const g = pk > 0.001 ? 0.86 / pk : 1;
      const fade = (0.006 * d.sampleRate) | 0;
      for (let i = 0; i < ch.length; i++) {
        let v = ch[i] * g;
        if (v > 1) v = 1; else if (v < -1) v = -1;
        if (i < fade) v *= i / fade;
        else if (i > ch.length - fade) v *= (ch.length - i) / fade;
        ch[i] = v;
      }
      return d;
    },
    note(name, oct) {
      const N = { A: 0, B: 2, C: 3, D: 5, E: 7, F: 8, G: 10 };
      return 55 * Math.pow(2, oct - 1) * Math.pow(2, N[name] / 12);
    },
    // frequence a partir d'un ecart en demi-tons depuis le la de l'octave
    semi(s, oct) { return 55 * Math.pow(2, (oct || 2) - 1) * Math.pow(2, s / 12); },

    // Une seule fabrique pour les quatre musiques de course. La tension
    // monte par le tempo, l'harmonie (mineur simple -> dominante -> napolitain
    // -> accords diminues chromatiques), la densite rythmique et un bourdon
    // grave qui n'apparait qu'a partir du championnat du monde.
    buildRace(cfg) {
      const sr = this.ctx.sampleRate;
      const beat = 60 / cfg.bpm, bar = beat * 4, tot = bar * 4;
      const d = this.ctx.createBuffer(1, (tot * sr) | 0, sr);
      const F = (s, o) => this.semi(s, o);
      cfg.prog.forEach((ch, b) => {
        const t = b * bar, root = ch[0], tri = ch[1];
        // grosse caisse et caisse claire
        cfg.kick.forEach(x => this.drum(d, t + x * beat, 'k'));
        cfg.snare.forEach(x => this.drum(d, t + x * beat, 's'));
        for (let i = 0; i < cfg.hats; i++)
          this.drum(d, t + i * beat * 4 / cfg.hats, 'h');
        // basse
        const div = cfg.bassDiv, bl = beat * 4 / div;
        for (let i = 0; i < div; i++) {
          const sm = cfg.bassPat[i % cfg.bassPat.length];
          this.tone(d, t + i * bl, bl * 0.92, F(root + sm, 2),
                    cfg.bassAmp, 'saw', 5);
        }
        // nappe d'accord
        tri.forEach(n => this.tone(d, t, bar * 0.94, F(root + n, 3),
                                   cfg.padAmp, 'tri', 1.1));
        // bourdon grave, seulement quand la tension monte
        if (cfg.drone > 0) {
          this.tone(d, t, bar * 0.99, F(cfg.droneSemi, 1), cfg.drone, 'sin', 0.22);
          this.tone(d, t, bar * 0.99, F(cfg.droneSemi + 0.14, 1), cfg.drone * 0.7,
                    'sin', 0.22);   // battement lent, effet d'oppression
        }
        // arpege aigu
        const n2 = cfg.arp;
        for (let i = 0; i < n2; i++)
          this.tone(d, t + i * bar / n2, bar / n2 * 0.55,
                    F(root + tri[i % tri.length], 5), cfg.arpAmp, 'pulse', 9);
        // coups de tension : quinte diminuee sur le dernier temps
        if (cfg.stab)
          this.tone(d, t + beat * 3.5, beat * 0.45, F(root + 6, 4),
                    cfg.stab, 'saw', 7);
      });
      return this.norm(d);
    },

    build() {
      const sr = this.ctx.sampleRate;
      const prog = [['A', 2, ['A', 'C', 'E']], ['F', 2, ['F', 'A', 'C']],
                    ['C', 2, ['C', 'E', 'G']], ['G', 2, ['G', 'B', 'D']]];

      // --- les quatre paliers de course -------------------------------
      const MIN = [0, 3, 7], MAJ = [0, 4, 7], AUG = [0, 4, 8], DIM = [0, 3, 6];
      this.buf.race0 = this.buildRace({          // etapes 1 a 3 : entrainant
        bpm: 124, prog: [[0, MIN], [-4, MAJ], [3, MAJ], [-2, MAJ]],
        kick: [0, 1.5, 2, 3.5], snare: [1, 3], hats: 8,
        bassDiv: 8, bassPat: [0, 0, 12, 0, 7, 0, 12, 3], bassAmp: 0.40,
        padAmp: 0.075, arp: 8, arpAmp: 0.10, drone: 0, droneSemi: 0, stab: 0
      });
      this.buf.race1 = this.buildRace({          // championnat du monde
        bpm: 132, prog: [[0, MIN], [-4, MAJ], [5, MIN], [7, MAJ]],
        kick: [0, 1.5, 2, 2.75, 3.5], snare: [1, 3], hats: 12,
        bassDiv: 8, bassPat: [0, 0, 7, 0, 12, 0, 7, -1], bassAmp: 0.44,
        padAmp: 0.085, arp: 8, arpAmp: 0.11, drone: 0.10, droneSemi: 0, stab: 0
      });
      this.buf.race2 = this.buildRace({          // jeux olympiques
        bpm: 140, prog: [[0, MIN], [1, MAJ], [-4, MAJ], [7, AUG]],
        kick: [0, 1, 1.5, 2, 3, 3.5], snare: [1, 3, 3.75], hats: 16,
        bassDiv: 16, bassPat: [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 12, 0, 1, 0, 7, 0],
        bassAmp: 0.48, padAmp: 0.095, arp: 12, arpAmp: 0.12,
        drone: 0.15, droneSemi: 0, stab: 0.14
      });
      this.buf.race3 = this.buildRace({          // inter galactique
        bpm: 150, prog: [[0, DIM], [-1, DIM], [-2, DIM], [-3, AUG]],
        kick: [0, 0.75, 1.5, 2, 2.75, 3.5], snare: [1, 2.5, 3, 3.75], hats: 16,
        bassDiv: 16,
        bassPat: [0, 0, 6, 0, 0, 0, 6, 0, 12, 0, 6, 0, 0, 6, 0, 6],
        bassAmp: 0.52, padAmp: 0.10, arp: 16, arpAmp: 0.13,
        drone: 0.20, droneSemi: -5, stab: 0.20
      });
      this.buf.race = this.buf.race0;

      // accueil
      let beat, bar, tot, d;
      beat = 60 / 92; bar = beat * 4; tot = bar * 4;
      d = this.ctx.createBuffer(1, (tot * sr) | 0, sr);
      prog.forEach((ch, b) => {
        const t = b * bar;
        this.drum(d, t, 'k'); this.drum(d, t + beat * 2, 'k');
        this.tone(d, t, bar * 0.96, this.note(ch[0], ch[1]), 0.26, 'tri', 1.4);
        ch[2].forEach(n => this.tone(d, t, bar * 0.96, this.note(n, 4),
                                     0.085, 'sin', 1.0));
        this.tone(d, t + beat * 2, beat * 0.8, this.note(ch[2][2], 5), 0.09,
                  'sin', 2.4);
      });
      this.buf.menu = this.norm(d);
      // bruitages
      const blip = (f, dur, amp, glide) => {
        const b = this.ctx.createBuffer(1, (dur * sr) | 0, sr);
        const ch = b.getChannelData(0); let ph = 0;
        for (let i = 0; i < ch.length; i++) {
          const q = i / ch.length;
          ph += f * (1 + (glide - 1) * q) / sr;
          ch[i] = amp * Math.exp(-6 * q) * Math.min(1, i / 90) * Math.sin(TAU * ph);
        }
        return this.norm(b);
      };
      this.buf.beep = blip(660, 0.16, 0.3, 1);
      this.buf.go = blip(1050, 0.34, 0.34, 1.3);
      this.buf.trip = blip(160, 0.22, 0.32, 0.55);
      this.buf.win = blip(760, 0.6, 0.3, 1.6);
      this.buf.lose = blip(300, 0.5, 0.3, 0.6);
    },
    // La musique de course se durcit a partir du championnat du monde.
    raceTrack(level) {
      return 'race' + (level <= 2 ? 0 : level - 2);
    },
    music(name) {
      if (!this.ok || !this.on || this.cur === name) return;
      if (this.src) { try { this.src.stop(); } catch (e) { } }
      const b = this.buf[name]; if (!b) return;
      const s = this.ctx.createBufferSource();
      s.buffer = b; s.loop = true; s.connect(this.gain); s.start();
      this.src = s; this.cur = name;
    },
    stop() {
      if (this.src) { try { this.src.stop(); } catch (e) { } }
      this.src = null; this.cur = null;
    },
    sfx(name) {
      if (!this.ok || !this.on) return;
      const b = this.buf[name]; if (!b) return;
      const s = this.ctx.createBufferSource();
      const g = this.ctx.createGain(); g.gain.value = 0.55;
      s.buffer = b; s.connect(g); g.connect(this.ctx.destination); s.start();
    },
    toggle() { this.on = !this.on; if (!this.on) this.stop(); return this.on; }
  };

  // -------------------------------------------------------------------
  // JEU
  // -------------------------------------------------------------------
  const SAVE = 'sprinter_web_v1';
  const G = {
    cv: null, cx: null, VW: 960, VH: 640, dpr: 1, portrait: false,
    state: 'open', t: 0, openT: 0,
    raceKey: '100', race: RACES['100'], track: null,
    levelIdx: 0, runners: [], player: null, parts: [],
    elapsed: 0, countT: 0, camX: 0, camY: 0,
    champion: null, championTime: 0,
    ranking: [], won: false, badge: null, entryRank: null,
    runTime: 0, runSplits: [], runRank: null,
    cut: null, cutQueue: [], cutAfter: 'count', skipArm: 0,
    overChoice: 0, shake: 0, flash: 0, stumbleFlash: 0,
    reactFlash: 0, transFlash: 0, falseFlash: 0,
    reactShown: false, transShown: false,
    scores: {}, runs: { '100': [], '200': [] }, furthest: { '100': 0, '200': 0 },
    keyLeft: false, touches: {}, acc: 0, last: 0, fps: 60
  };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE) || '{}');
      if (d.scores) G.scores = d.scores;
      if (d.runs) G.runs = Object.assign(G.runs, d.runs);
      if (d.furthest) G.furthest = Object.assign(G.furthest, d.furthest);
      N.setLang(d.lang || N.detect());
    } catch (e) { N.setLang(N.detect()); }
  }
  function save() {
    try {
      localStorage.setItem(SAVE, JSON.stringify({
        scores: G.scores, runs: G.runs, furthest: G.furthest,
        lang: N.getLang()
      }));
    } catch (e) { }
  }
  const skey = i => G.raceKey + ':' + i;
  function levelScores(i) { return G.scores[skey(i)] || []; }
  function recordTime(i, t) {
    const a = (G.scores[skey(i)] || []).concat([Math.round(t * 100) / 100]);
    a.sort((x, y) => x - y); a.length = Math.min(10, a.length);
    G.scores[skey(i)] = a;
    const p = a.indexOf(Math.round(t * 100) / 100);
    return p < 0 ? null : p + 1;
  }
  function recordRun(t) {
    const a = G.runs[G.raceKey].concat([Math.round(t * 100) / 100]);
    a.sort((x, y) => x - y); a.length = Math.min(10, a.length);
    G.runs[G.raceKey] = a;
    const p = a.indexOf(Math.round(t * 100) / 100);
    return p < 0 ? null : p + 1;
  }

  // --- mise en place d'une course ------------------------------------
  function buildLevel(idx) {
    G.levelIdx = idx;
    const lvl = LEVELS[idx], R = G.race;
    const [lo, hi] = R.ranges[idx];
    G.track = new Track(R);
    G.runners = [];
    const pl = new Runner('TOI', 3, { isPlayer: true, maxSpeed: R.maxSpeed,
      best: R.best, total: G.track.total });
    G.player = pl; G.runners.push(pl);
    let best = 1e9;
    lvl.names.forEach((n, i) => {
      const t = lo + Math.random() * (hi - lo);
      const lane = i < 3 ? i : i + 1;
      const r = new Runner(n, lane, { target: t, maxSpeed: R.maxSpeed,
        total: G.track.total, pool: lvl.pool });
      if (t < best) { best = t; G.champion = n; G.championTime = t; }
      G.runners.push(r);
    });
    G.parts = [];
    G.elapsed = 0; G.countT = 0; G.shake = 0; G.flash = 0;
    G.stumbleFlash = 0; G.acc = 0;
    G.reactFlash = G.transFlash = G.falseFlash = 0;
    G.reactShown = G.transShown = false;
    const p0 = G.track.pos(0, 3);
    G.camX = p0[0]; G.camY = p0[1];
  }

  function queueCuts(kinds, after) {
    G.cutAfter = after; G.cutQueue = kinds.slice(); nextCut();
  }
  function nextCut() {
    if (!G.cutQueue.length) { G.cut = null; G.skipArm = 0; G.state = G.cutAfter; return; }
    const kind = G.cutQueue.shift();
    let lines, man;
    if (kind === 'champion') {
      lines = pickLang(CUT_CHAMPION).slice();
      man = { look: PLAYER_LOOK, stride: 0, v: G.race.maxSpeed * 0.18,
              maxSpeed: G.race.maxSpeed, fallAnim: 0, celebrate: 1 };
    } else {
      const tbl = kind === 'intro' ? CUT_INTRO : CUT_DEFEAT;
      const first = (G.champion || 'Le favori').split(' ')[0];
      lines = pickLang(tbl[G.levelIdx]).map(s => s.split('{n}').join(first));
      man = { look: ZEZE[G.champion] ||
                    K.lookFor(G.champion || 'X', LEVELS[G.levelIdx].pool),
              stride: 0, maxSpeed: G.race.maxSpeed,
              v: kind === 'intro' ? G.race.maxSpeed : G.race.maxSpeed * 0.22,
              fallAnim: 0, celebrate: 0 };
    }
    G.cut = { kind, t: 0, lines, man, name: G.champion || '' };
    G.skipArm = 0; G.state = 'cut';
  }

  function startRun() {
    G.runTime = 0; G.runSplits = []; G.runRank = null;
    startLevel(0);
  }
  function startLevel(i) { buildLevel(i); queueCuts(['intro'], 'count'); }

  function finishRace() {
    const order = G.runners.slice().sort((a, b) =>
      (a.finishTime === null ? 1e9 : a.finishTime) -
      (b.finishTime === null ? 1e9 : b.finishTime));
    G.ranking = order;
    const rank = order.indexOf(G.player) + 1;
    G.won = rank === 1 && G.player.finishTime !== null;
    G.badge = null; G.entryRank = null;
    if (G.player.finishTime !== null) {
      const p = recordTime(G.levelIdx, G.player.finishTime);
      G.entryRank = p;
      if (p === 1) G.badge = ['new_record', GOLD];
      else if (p && p <= 3) G.badge = ['top3', CYAN];
      else if (p) G.badge = ['top10', GREEN];
    }
    Audio_.stop();
    if (G.won) {
      G.runSplits.push(G.player.finishTime);
      G.runTime += G.player.finishTime;
      G.furthest[G.raceKey] = Math.max(G.furthest[G.raceKey], G.levelIdx + 1);
      if (G.levelIdx + 1 >= LEVELS.length) {
        G.runRank = recordRun(G.runTime); save(); G.flash = 1;
        Audio_.sfx('win'); queueCuts(['defeat', 'champion'], 'winall'); return;
      }
      save(); G.flash = 1; Audio_.sfx('win');
      queueCuts(['defeat'], 'result'); return;
    }
    save(); Audio_.sfx('lose'); G.overChoice = 0; G.state = 'over';
  }

  // --- projection -----------------------------------------------------
  // Echelle commune a toute l'interface. On prend la plus petite des deux
  // dimensions rapportee a un ecran de reference : sur un telephone etroit
  // et haut, se caler sur la hauteur seule ferait deborder tout le texte.
  function ui() {
    return Math.max(0.62, Math.min(1.7, Math.min(G.VW / 430, G.VH / 660)));
  }
  function scaleM() {
    return ui() * (G.race.arc > 0 ? 44 : 30);
  }
  function originX() { return G.VW * (G.portrait ? 0.58 : 0.60); }
  function originY() { return G.VH * (G.portrait ? 0.44 : 0.56); }

  const WROT = -14 * Math.PI / 180, WC = Math.cos(WROT), WS = Math.sin(WROT);
  function ground(X, Y) {
    let ax = X - G.camX, ay = Y - G.camY;
    if (G.track && G.track.curved) {
      const t = ax * WC - ay * WS; ay = ax * WS + ay * WC; ax = t;
    }
    const m = scaleM(), u = ax * m, v = ay * m;
    return [originX() - u * C.ISO_COS + v * C.ISO_COS,
            originY() - u * C.ISO_SIN - v * C.ISO_SIN];
  }
  function solid(X, Y, z) {
    const p = ground(X, Y);
    return [p[0], p[1] - z * scaleM()];
  }
  function depthOf(X, Y) {
    let ax = X - G.camX, ay = Y - G.camY;
    if (G.track && G.track.curved) {
      const t = ax * WC - ay * WS; ay = ax * WS + ay * WC; ax = t;
    }
    return (ax + ay) * scaleM();
  }

  function followCam(dt) {
    const T = G.track, s = G.player ? G.player.d : 0, lane = 3;
    const p = T.pos(s, lane), h = T.heading(s, lane);
    const lead = T.curved ? 7 : 6;
    const tx = p[0] + Math.cos(h) * lead, ty = p[1] + Math.sin(h) * lead;
    const k = 1 - Math.exp(-6.5 * dt);
    G.camX += (tx - G.camX) * k; G.camY += (ty - G.camY) * k;
  }

  // --- rendu de la piste ---------------------------------------------
  // Decoupage de la piste en tranches. Dans le virage, trente segments de
  // six degres se voyaient : la courbe apparaissait facettee. On echantillonne
  // maintenant tous les 1,2 m environ, et la ligne droite au meme pas pour
  // que les bandes du decor gardent la meme longueur partout.
  const ARC_STEPS = 96;
  function segLen() { return Math.PI * C.R1 / ARC_STEPS; }
  function decorStride() { return G.track.curved ? 12 : 4; }
  function samples() {
    const T = G.track, out = [];
    if (T.curved) {
      for (let i = 0; i <= ARC_STEPS; i++)
        out.push([true, Math.PI * (1 - i / ARC_STEPS)]);
      const st = segLen();
      for (let x = st; x <= T.straight + C.RUNOUT; x += st) out.push([false, x]);
    } else {
      for (let x = -20; x <= T.straight + C.RUNOUT; x += 12) out.push([false, x]);
    }
    return out;
  }
  function ptOf(sm, r) {
    const T = G.track;
    if (T.curved) return T.posR(sm[1], r, sm[0]);
    return [sm[1], r];
  }
  function band(ctx, sm, rIn, rOut, col, z) {
    if (sm.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < sm.length; i++) {
      const p = solid(...ptOf(sm[i], rIn), z || 0);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    for (let i = sm.length - 1; i >= 0; i--) {
      const p = solid(...ptOf(sm[i], rOut), z || 0);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function rail(ctx, sm, r, col, w, z) {
    if (sm.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < sm.length; i++) {
      const p = solid(...ptOf(sm[i], r), z || 0);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke();
  }

  function drawWorld(ctx, th) {
    const T = G.track;
    // ciel
    const g = ctx.createLinearGradient(0, 0, 0, G.VH);
    g.addColorStop(0, rgb(th.skyTop)); g.addColorStop(1, rgb(th.skyBot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, G.VW, G.VH);
    if (th.stars) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < th.stars; i++) {
        const s = (i * 7919) % 9973;
        ctx.fillRect((s * 13) % G.VW, (s * 7) % (G.VH * 0.7), 1.4, 1.4);
      }
    }
    const sm = samples();
    const rIn = T.curved ? T.edge(0) : 0;
    const rOut = T.curved ? T.edge(C.LANE_COUNT) : C.LANE_W * C.LANE_COUNT;

    // pelouse interieure
    if (T.curved) {
      ctx.beginPath();
      sm.forEach((s, i) => {
        const p = ground(...ptOf(s, rIn));
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      });
      let p = ground(T.straight + C.RUNOUT, 0); ctx.lineTo(p[0], p[1]);
      p = ground(0, 0); ctx.lineTo(p[0], p[1]);
      ctx.closePath(); ctx.fillStyle = rgb(th.grass); ctx.fill();
    } else {
      band(ctx, sm, rIn - 60, rIn, rgb(th.grass));
    }
    band(ctx, sm, rOut, rOut + 46, rgb(th.grass));

    // Tribune simplifiee : muret, gradins, toiture. Elle est dessinee AVANT
    // la piste. Ces bandes sont posees en hauteur, et dans le virage leur
    // projection retombe sur la surface de course : peintes apres, elles
    // recouvraient la piste et les coureurs.
    const near = rOut + 1.6, tiers = 4, sr = 1.7, sz = 0.58;
    const stp = decorStride();
    band(ctx, sm, near, near + 0.35, rgb(th.barrier), 1.05);
    for (let i = 0; i + stp < sm.length; i += stp) {
      band(ctx, sm.slice(i, i + stp + 1), near, near + 0.3,
           rgb(th.panels[(i / stp) % th.panels.length]), 0.65);
    }
    for (let t = 0; t < tiers; t++) {
      const r0 = near + t * sr, z1 = 1.05 + (t + 1) * sz, f = 1 - t * 0.05;
      band(ctx, sm, r0, r0 + 0.05, rgb(th.riser, f), z1);
      band(ctx, sm, r0, r0 + sr, rgb(th.tread, f), z1);
    }
    band(ctx, sm, near + 0.3, near + tiers * sr + 1, rgb(th.roof),
         1.05 + tiers * sz + 2.4);

    // la piste par-dessus : elle reste toujours entierement lisible
    band(ctx, sm, rIn, rOut, rgb(th.trackA));
    for (let i = 0; i + 1 < sm.length; i += stp) {
      if ((i / stp) % 2 === 0)
        band(ctx, sm.slice(i, i + stp + 1), rIn, rOut, rgb(th.trackB));
    }

    rail(ctx, sm, rIn, rgb(th.kerb), 3);
    for (let e = 1; e < C.LANE_COUNT; e++) {
      rail(ctx, sm, T.curved ? T.edge(e) : e * C.LANE_W, rgb(th.lane), 1.6);
    }
    rail(ctx, sm, rOut, rgb(th.lane), 2.2);

    // Position d'un point de la piste a la distance m et au rayon r.
    const at = (m, r) => {
      if (T.curved && m < T.arc) {
        const phi = (T.arc - m) / T.radius(0);
        return phi > Math.PI ? null : T.posR(phi, r, true);
      }
      return [T.curved ? m - T.arc : m, r];
    };

    // Reperes blancs tous les dix metres, en travers de la piste.
    for (let m = 0; m <= T.total; m += 10) {
      const qa = at(m, rIn), qb = at(m, rOut);
      if (!qa || !qb) continue;
      const a = ground(qa[0], qa[1]), b = ground(qb[0], qb[1]);
      if (a[0] < -200 && b[0] < -200) continue;
      if (a[0] > G.VW + 200 && b[0] > G.VW + 200) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.90)';
      ctx.lineWidth = m === 0 ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    // chiffres sur l'herbe exterieure, tous les dix metres
    ctx.font = '600 ' + (13 * ui()) + 'px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    for (let m = 0; m <= T.total; m += 10) {
      const q = at(m, rOut + 2.4);
      if (!q) continue;
      const p = ground(q[0], q[1]);
      if (p[0] < -80 || p[0] > G.VW + 80) continue;
      ctx.fillText(m === 0 ? t('depart') : String(m), p[0], p[1]);
    }

    // damier d'arrivee
    const fx = T.curved ? T.straight : T.total;
    for (let i = 0; i < C.LANE_COUNT * 2; i++) {
      const rr = rIn + i * C.LANE_W * 0.5;
      ctx.fillStyle = i % 2 ? 'rgb(56,58,72)' : '#fff';
      ctx.beginPath();
      const q = [ground(fx - 0.35, rr), ground(fx + 0.35, rr),
                 ground(fx + 0.35, rr + C.LANE_W * 0.5),
                 ground(fx - 0.35, rr + C.LANE_W * 0.5)];
      ctx.moveTo(q[0][0], q[0][1]);
      for (let j = 1; j < 4; j++) ctx.lineTo(q[j][0], q[j][1]);
      ctx.closePath(); ctx.fill();
    }
  }

  // --- rendu d'un athlete ---------------------------------------------
  function drawRunner(ctx, r, ax, ay, adepth, k, headAng, lean) {
    const parts = pose(r);
    const hc = Math.cos(headAng || 0), hs = Math.sin(headAng || 0);
    const rc = Math.cos(lean || 0), rs = Math.sin(lean || 0);
    // chute + inclinaison de la phase de poussee : meme rotation du corps
    // entier autour du point d'appui, l'une transitoire, l'autre liee a
    // la distance parcourue
    const fall = (r.fallAnim || 0) * 1.25 - (r.drivePitch || 0);
    const fc = Math.cos(fall), fs = Math.sin(fall);
    const faces = [];
    for (const [col, pv, ang, off, hf, yaw] of parts) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const yc = Math.cos(yaw), ys = Math.sin(yaw);
      const pts = [];
      let lowest = 9.9;
      for (const [cxs, cys, czs] of CUBE) {
        const hx = czs < 0 ? hf[0] : hf[2], hy = czs < 0 ? hf[1] : hf[3];
        const lx = off[0] + cxs * hx, lz = off[2] + czs * hf[4];
        let wx = pv[0] + lx * ca - lz * sa;
        let wz = pv[2] + lx * sa + lz * ca;
        let wy = pv[1] + off[1] + cys * hy;
        if (yaw) { const t = wx * yc - wy * ys; wy = wx * ys + wy * yc; wx = t; }
        if (lean) { const t = wy * rc - wz * rs; wz = wy * rs + wz * rc; wy = t; }
        if (Math.abs(fall) > 0.001) { const t = wx * fc - wz * fs; wz = wx * fs + wz * fc; wx = t; }
        if (wz < 0) wz = 0;
        lowest = Math.min(lowest, wz);
        let rx = wx, ry = wy;
        if (headAng) { const t = wx * hc - wy * hs; ry = wx * hs + wy * hc; rx = t; }
        if (G.track && G.track.curved) {
          const t = rx * WC - ry * WS; ry = rx * WS + ry * WC; rx = t;
        }
        pts.push([ax + (ry - rx) * C.ISO_COS * k,
                  ay - (rx + ry) * C.ISO_SIN * k - wz * k,
                  adepth + (rx + ry) * k]);
      }
      const ao = 0.78 + 0.22 * clamp(lowest / 0.5, 0, 1);
      for (const [idx, nrm] of FACES) {
        let bx = nrm[0] * ca - nrm[2] * sa, bz = nrm[0] * sa + nrm[2] * ca;
        let by = nrm[1];
        if (yaw) { const t = bx * yc - by * ys; by = bx * ys + by * yc; bx = t; }
        if (lean) { const t = by * rc - bz * rs; bz = by * rs + bz * rc; by = t; }
        if (Math.abs(fall) > 0.001) { const t = bx * fc - bz * fs; bz = bx * fs + bz * fc; bx = t; }
        let lx2 = bx, ly2 = by;
        if (headAng) { const t = bx * hc - by * hs; ly2 = bx * hs + by * hc; lx2 = t; }
        const lit = lx2 * LIGHT[0] + ly2 * LIGHT[1] + bz * LIGHT[2];
        const f = (0.46 + 0.54 * Math.max(0, lit) + 0.16 * Math.max(0, -bz)) * ao;
        const a = pts[idx[0]], b = pts[idx[1]], c2 = pts[idx[2]], d2 = pts[idx[3]];
        if ((b[0] - a[0]) * (c2[1] - a[1]) - (c2[0] - a[0]) * (b[1] - a[1]) <= 0) continue;
        faces.push([(a[2] + b[2] + c2[2] + d2[2]) * 0.25, a, b, c2, d2,
                    rgb(col, f)]);
      }
    }
    faces.sort((p, q) => q[0] - p[0]);
    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f[1][0], f[1][1]); ctx.lineTo(f[2][0], f[2][1]);
      ctx.lineTo(f[3][0], f[3][1]); ctx.lineTo(f[4][0], f[4][1]);
      ctx.closePath(); ctx.fillStyle = f[5]; ctx.fill();
    }
  }

  function drawAthletes(ctx) {
    const T = G.track, m = scaleM();
    const vis = [];
    for (const r of G.runners) {
      const p = T.pos(r.d, r.lane), g2 = ground(p[0], p[1]);
      if (g2[0] > -200 && g2[0] < G.VW + 200 && g2[1] > -260 && g2[1] < G.VH + 200)
        vis.push([r, g2, p]);
    }
    for (const [r, g2] of vis) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(g2[0], g2[1], 15 * m / 30, 6 * m / 30, 0, 0, TAU);
      ctx.fill();
    }
    for (const [r, g2, p] of vis) {
      drawRunner(ctx, r, g2[0], g2[1], depthOf(p[0], p[1]),
                 m * (r.look.h / C.MODEL_H),
                 T.heading(r.d, r.lane), T.lean(r.d, r.lane, r.v));
    }
  }

  // athlete isole, pour les cinematiques et l'accueil
  function drawIcon(ctx, man, cx2, cy2, pxFor2m, mirror) {
    const parts = pose(man);
    const k = pxFor2m * (man.look.h / C.MODEL_H) / 2;
    const sgn = mirror ? -1 : 1;
    // inclinaison du corps entier : phase de poussee, ou chute
    const pit = (man.fallAnim || 0) * 1.25 - (man.drivePitch || 0);
    const pc = Math.cos(pit), ps = Math.sin(pit);
    const faces = [];
    for (const [col, pv, ang, off, hf, yaw] of parts) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const yc = Math.cos(yaw), ys = Math.sin(yaw);
      const pts = [];
      for (const [cxs, cys, czs] of CUBE) {
        const hx = czs < 0 ? hf[0] : hf[2], hy = czs < 0 ? hf[1] : hf[3];
        const lx = off[0] + cxs * hx, lz = off[2] + czs * hf[4];
        let wx = pv[0] + lx * ca - lz * sa;
        let wz = pv[2] + lx * sa + lz * ca;
        let wy = pv[1] + off[1] + cys * hy;
        if (yaw) { const t = wx * yc - wy * ys; wy = wx * ys + wy * yc; wx = t; }
        if (pit) { const t = wx * pc - wz * ps; wz = wx * ps + wz * pc; wx = t; }
        wx *= sgn;
        pts.push([cx2 + (wy - wx) * C.ISO_COS * k,
                  cy2 - (wx + wy) * C.ISO_SIN * k - Math.max(0, wz) * k,
                  wx + wy]);
      }
      for (const [idx, nrm] of FACES) {
        let bx = (nrm[0] * ca - nrm[2] * sa), bz = nrm[0] * sa + nrm[2] * ca;
        let by = nrm[1];
        if (yaw) { const t = bx * yc - by * ys; by = bx * ys + by * yc; bx = t; }
        if (pit) { const t = bx * pc - bz * ps; bz = bx * ps + bz * pc; bx = t; }
        bx *= sgn;
        const lit = bx * LIGHT[0] + by * LIGHT[1] + bz * LIGHT[2];
        const f = 0.48 + 0.52 * Math.max(0, lit) + 0.14 * Math.max(0, -bz);
        const a = pts[idx[0]], b = pts[idx[1]], c2 = pts[idx[2]], d2 = pts[idx[3]];
        if ((b[0] - a[0]) * (c2[1] - a[1]) - (c2[0] - a[0]) * (b[1] - a[1]) <= 0) continue;
        faces.push([(a[2] + b[2] + c2[2] + d2[2]) * 0.25, a, b, c2, d2, rgb(col, f)]);
      }
    }
    faces.sort((p, q) => q[0] - p[0]);
    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f[1][0], f[1][1]); ctx.lineTo(f[2][0], f[2][1]);
      ctx.lineTo(f[3][0], f[3][1]); ctx.lineTo(f[4][0], f[4][1]);
      ctx.closePath(); ctx.fillStyle = f[5]; ctx.fill();
    }
  }

  globalThis.SprinterApp = { G, THEMES, Audio_, load, save, levelScores,
    recordTime, recordRun, buildLevel, queueCuts, nextCut, startRun,
    startLevel, finishRace, ground, solid, depthOf, followCam, drawWorld, ui,
    drawAthletes, drawIcon, scaleM, originX, originY, rgb, clamp, lerp, mix,
    CUT_INTRO, CUT_DEFEAT, CUT_CHAMPION, GOLD, CREAM, MUTED, CYAN, GREEN,
    N, t,
    RED, MAGENTA };
})();
