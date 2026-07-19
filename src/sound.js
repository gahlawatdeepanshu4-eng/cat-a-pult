// All the game's audio, generated live in the browser with WebAudio — no files
// to ship, so the PWA stays tiny and works offline. Playful, cartoony blips to
// match the slingshot / dart-blaster / giant-fork look.
//
// Split like the rest of the project: the *data* (which note, which fire sound)
// is pure and unit-tested; the *playing* is a thin WebAudio layer that no-ops
// safely when there is no browser (so importing this in Node never throws) and
// when muted. Every play path is wrapped so an audio hiccup can never crash the
// animation frame that calls it.

// --- Pure data (testable in Node) ------------------------------------------

// MIDI note number -> frequency in Hz. A4 (midi 69) = 440.
export function noteHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// One short fire sound per weapon, as a pitch glide on a waveform. freq -> to
// over dur seconds; `type` is the oscillator shape; `noise` adds a whoosh layer.
// Keyed by the same names as weapons.js, so every weapon has a voice.
export const WEAPON_SOUND = {
  catapult:      { type: 'triangle', freq: 520, to: 190, dur: 0.16, gain: 0.5 },  // slingshot twang
  crossbow:      { type: 'square',   freq: 900, to: 620, dur: 0.10, gain: 0.35 }, // dart "pew"
  spearcrossbow: { type: 'sawtooth', freq: 300, to: 760, dur: 0.14, gain: 0.4, noise: 0.5 }, // fork whoosh-up
  spear:         { type: 'sawtooth', freq: 240, to: 150, dur: 0.18, gain: 0.5, noise: 0.3 }, // heavy bone thwip
  bazooka:       { type: 'sine',     freq: 180, to: 900, dur: 0.22, gain: 0.45, noise: 0.35 }, // firework whistle-up
};

export function fireSoundFor(weaponName) {
  return WEAPON_SOUND[weaponName] ?? WEAPON_SOUND.catapult;
}

// Every creature has its own pained cry — a cat meows, a bunny shrieks, a T-rex
// roars. This list is the contract with creatures.js: a test asserts every KIND
// has a voice, so a new creature can't ship silent. The actual synth per kind
// lives in `voice()` inside createSound (it needs the audio primitives).
export const VOICED_KINDS = ['cat', 'trex', 'catrex', 'frogrex', 'bunnyrex', 'pigrex', 'ducktrex'];

// Real recorded cries for every creature (Wikimedia Commons — see CREDITS.md),
// trimmed to short hit clips. When a clip has loaded it plays instead of the
// synth `voice()`; the synth stays as an automatic fallback if a file is
// missing or hasn't decoded yet. Every kind has one, so this equals VOICED_KINDS.
export const CLIP_KINDS = VOICED_KINDS;

// Resolve the clip URL relative to THIS module (src/sound.js -> ../audio/…),
// so it works no matter what path the page is served from.
export function clipUrl(kind) {
  return new URL(`../audio/${kind}.mp3`, import.meta.url).href;
}

// A light, cheerful looping tune in C major. Two voices, one entry per beat
// (null = rest). 16 beats at ~130bpm ≈ 7.4s per loop. Kept deliberately simple
// and quiet so it sits under the effects.
export const MELODY = {
  bpm: 130,
  lead: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 74],
  bass: [48, null, 55, null, 50, null, 57, null, 48, null, 55, null, 53, null, 55, null],
};

// --- WebAudio engine --------------------------------------------------------

const AudioCtx = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null;

export function createSound({ muted = false, music = true, sfx = true } = {}) {
  let ctx = null;
  let master = null;      // everything routes through here; muting silences it
  let musicGain = null;   // the tune's own quieter bus
  let musicTimer = null;  // lookahead scheduler handle
  let nextNoteAt = 0;     // audio-clock time of the next beat to schedule
  let beat = 0;           // index into MELODY, wraps
  let isMuted = muted;    // the master mute (speaker button) — silences all
  let musicOn = music;    // settings: background tune on/off
  let sfxOn = sfx;        // settings: fire/hit/jingle effects on/off

  const clipBytes = {};   // kind -> Promise<ArrayBuffer> (fetched raw)
  const clipBuffers = {}; // kind -> decoded AudioBuffer (ready to play)

  // Start downloading the raw clip bytes as early as possible (page load), so
  // they are ready to decode the moment the context exists. Only in a browser
  // with an AudioContext — in Node this is skipped, keeping imports side-effect
  // free. The service worker caches these too, so it costs nothing when offline.
  function prefetch() {
    if (!AudioCtx || typeof fetch !== 'function') return;
    for (const kind of CLIP_KINDS) {
      clipBytes[kind] = fetch(clipUrl(kind))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .catch(() => null); // a missing clip just means the synth voice covers it
    }
  }

  // Decode whatever bytes have arrived into playable buffers. Safe to call more
  // than once; each kind decodes at most once.
  function decodeClips() {
    if (!ctx) return;
    for (const kind of CLIP_KINDS) {
      if (clipBuffers[kind] || !clipBytes[kind]) continue;
      clipBuffers[kind] = 'pending';
      clipBytes[kind].then((bytes) => {
        if (!bytes) { clipBuffers[kind] = null; return; }
        // slice(0) — decodeAudioData detaches the buffer, so hand it a copy.
        ctx.decodeAudioData(bytes.slice(0))
          .then((buf) => { clipBuffers[kind] = buf; })
          .catch(() => { clipBuffers[kind] = null; });
      });
    }
  }

  // Play a decoded creature clip, if it is ready. Returns false when there is no
  // clip yet, so the caller can fall back to the synth voice.
  function playClip(kind, at = 0, gain = 0.9) {
    const buf = clipBuffers[kind];
    if (!ctx || !master || !buf || buf === 'pending') return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(master);
    src.start(ctx.currentTime + at);
    return true;
  }

  // Lazily build the context. Browsers only allow this from a user gesture, so
  // callers invoke resume() from the first tap.
  function ensure() {
    if (!AudioCtx) return null;
    if (!ctx) {
      try {
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = isMuted ? 0 : 1;
        master.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0.14; // the tune sits well under the effects
        musicGain.connect(master);
      } catch {
        ctx = null;
      }
    }
    if (ctx) decodeClips(); // decode any clips that have finished downloading
    return ctx;
  }

  // A single pitch-gliding tone. The workhorse behind most effects.
  function tone({ type = 'sine', freq, to = freq, dur = 0.15, gain = 0.4, at = 0, bus = master }) {
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    // Quick attack, exponential decay — a plucky, cartoony envelope.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A short filtered-noise burst — whooshes, splats, booms.
  function noiseBurst({ dur = 0.2, gain = 0.4, cutoff = 1800, at = 0, bus = master }) {
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + at;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp).connect(g).connect(bus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // Effects gate: silenced by the master mute OR the settings SFX toggle.
  function safe(fn) {
    if (isMuted || !sfxOn || !ensure()) return;
    try { fn(); } catch { /* audio must never crash the game */ }
  }

  // A low-frequency oscillator wired into an AudioParam — the wobble that makes
  // a voice sound alive (vibrato on pitch, tremolo on volume). depth is in the
  // param's own units (Hz for frequency, gain for volume).
  function lfo(param, { rate, depth, at = 0, dur }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = rate;
    g.gain.value = depth;
    osc.connect(g).connect(param);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  // A *voiced* tone: a buzzy carrier pushed through one or more band-pass
  // "formants" — the resonances a throat/mouth add to a voice. Pure oscillators
  // sound like beeps; formants are what make the same buzz read as a meow, a
  // quack, a roar. Each formant can glide (hz -> to) so a vowel changes shape
  // mid-cry, and optional vibrato gives it a living wobble. This is the whole
  // trick behind the animal sounds.
  function vox({
    type = 'sawtooth', f0, f0End = f0, formants = [], dur = 0.3, gain = 0.5,
    at = 0, vibratoRate = 0, vibratoDepth = 0, bus = master,
  }) {
    if (!ctx || !bus) return;
    const t0 = ctx.currentTime + at;
    const carrier = ctx.createOscillator();
    carrier.type = type;
    carrier.frequency.setValueAtTime(f0, t0);
    carrier.frequency.exponentialRampToValueAtTime(Math.max(1, f0End), t0 + dur);
    if (vibratoRate) lfo(carrier.frequency, { rate: vibratoRate, depth: vibratoDepth, at, dur });

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.03, dur * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    env.connect(bus);

    if (formants.length) {
      // Parallel band-passes, each fed by the carrier and summed into the
      // envelope — the vocal-tract colouring.
      for (const f of formants) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = f.q ?? 8;
        bp.frequency.setValueAtTime(f.hz, t0);
        if (f.to) bp.frequency.exponentialRampToValueAtTime(Math.max(1, f.to), t0 + dur);
        carrier.connect(bp).connect(env);
      }
    } else {
      carrier.connect(env);
    }
    carrier.start(t0);
    carrier.stop(t0 + dur + 0.04);
  }

  // A creature's pained cry, offset by `at` seconds so several victims of one
  // shot can yelp in quick succession. Each is a tiny cartoon vocalisation built
  // from the primitives above — approximations the player will judge and I tune.
  function voice(kind, at = 0) {
    switch (kind) {
      case 'cat': // "meee-oww": pitch rises while the vowel opens ee -> ow
        vox({
          f0: 480, f0End: 620, dur: 0.4, gain: 0.55, at,
          formants: [{ hz: 780, to: 520, q: 7 }, { hz: 2100, to: 1000, q: 9 }],
          vibratoRate: 6, vibratoDepth: 22,
        });
        break;
      case 'trex': // a big guttural roar sweeping down, with a rasp of noise
        noiseBurst({ dur: 0.4, gain: 0.22, cutoff: 600, at });
        vox({
          f0: 200, f0End: 70, dur: 0.52, gain: 0.6, at,
          formants: [{ hz: 500, to: 300, q: 4 }, { hz: 1100, to: 700, q: 5 }],
          vibratoRate: 5, vibratoDepth: 14,
        });
        break;
      case 'catrex': // a monstrous screech — high, harsh, heavy vibrato
        vox({
          f0: 760, f0End: 300, dur: 0.36, gain: 0.5, at,
          formants: [{ hz: 1500, q: 7 }, { hz: 2700, to: 1800, q: 9 }],
          vibratoRate: 12, vibratoDepth: 40,
        });
        break;
      case 'frogrex': // a couple of resonant low croaks — "rrrp rrrp"
        for (let k = 0; k < 3; k++) {
          vox({
            type: 'square', f0: 135, f0End: 115, dur: 0.08, gain: 0.5, at: at + k * 0.1,
            formants: [{ hz: 430, q: 13 }, { hz: 900, q: 10 }],
          });
        }
        break;
      case 'bunnyrex': // rabbits shriek — thin, very high, fast wobble
        vox({
          f0: 1250, f0End: 900, dur: 0.26, gain: 0.42, at,
          formants: [{ hz: 2500, q: 6 }],
          vibratoRate: 15, vibratoDepth: 45,
        });
        break;
      case 'pigrex': // two nasal grunts rising toward a squeal
        vox({
          f0: 200, f0End: 300, dur: 0.13, gain: 0.5, at,
          formants: [{ hz: 450, q: 9 }, { hz: 1150, q: 6 }],
        });
        vox({
          f0: 230, f0End: 360, dur: 0.15, gain: 0.5, at: at + 0.15,
          formants: [{ hz: 480, q: 9 }, { hz: 1250, q: 6 }],
        });
        break;
      case 'ducktrex': // two honky nasal "quack-quack" — resonant bandpass buzz
        for (let k = 0; k < 2; k++) {
          vox({
            f0: 300, f0End: 220, dur: 0.1, gain: 0.5, at: at + k * 0.14,
            formants: [{ hz: 900, q: 8 }, { hz: 1400, q: 6 }],
          });
        }
        break;
      default: // a generic voiced yelp, so an unknown creature is never silent
        vox({ f0: 600, f0End: 300, dur: 0.22, gain: 0.45, at, formants: [{ hz: 1200, q: 6 }] });
    }
  }

  // --- Background music: a small lookahead scheduler ---
  function scheduleMusic() {
    if (!ctx || !musicGain) return;
    const beatDur = 60 / MELODY.bpm;
    // Schedule any beats that fall inside the next ~100ms window.
    while (nextNoteAt < ctx.currentTime + 0.1) {
      const i = beat % MELODY.lead.length;
      const lead = MELODY.lead[i];
      const bass = MELODY.bass[i];
      const at = nextNoteAt - ctx.currentTime;
      if (lead != null) {
        tone({ type: 'triangle', freq: noteHz(lead), dur: beatDur * 0.55, gain: 0.5, at, bus: musicGain });
      }
      if (bass != null) {
        tone({ type: 'sine', freq: noteHz(bass), dur: beatDur * 0.9, gain: 0.6, at, bus: musicGain });
      }
      nextNoteAt += beatDur;
      beat += 1;
    }
  }

  function startMusic() {
    if (isMuted || !musicOn || !ensure() || musicTimer) return;
    nextNoteAt = ctx.currentTime + 0.05;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 25);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  prefetch(); // start downloading the creature clips right away (browser only)

  return {
    // Call from the first user gesture: unlock/resume the context, and if a
    // suspended context resumes, keep the tune going.
    resume() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },

    fire(weaponName) {
      safe(() => {
        const s = fireSoundFor(weaponName);
        tone({ type: s.type, freq: s.freq, to: s.to, dur: s.dur, gain: s.gain });
        if (s.noise) noiseBurst({ dur: s.dur * 1.1, gain: 0.18 * s.noise, cutoff: 2600 });
      });
    },

    // A hit: the weapon's impact (a splat, or a bazooka boom) plus each struck
    // creature's own pained cry. A pierced line or a blast voices every victim,
    // staggered so they cry out one after another; single hits just voice the
    // one. Impact stays lighter than before so the animal's sound leads.
    hit(lastHit) {
      safe(() => {
        if (lastHit?.blast) {
          noiseBurst({ dur: 0.5, gain: 0.5, cutoff: 900 });
          tone({ type: 'sine', freq: 160, to: 40, dur: 0.45, gain: 0.5 }); // low thump
        } else {
          noiseBurst({ dur: 0.13, gain: 0.22, cutoff: 1500 }); // wet splat
        }
        // Voice each victim with its real recorded cry (falling back to the
        // synth voice until the clip has loaded). Cap the count so a huge blast
        // doesn't become a wall of noise, staggered into a chorus.
        const kinds = lastHit?.kinds ?? (lastHit?.kind ? [lastHit.kind] : []);
        kinds.slice(0, 5).forEach((kind, i) => {
          const at = 0.04 + i * 0.13;
          if (!playClip(kind, at)) voice(kind, at);
        });
      });
    },

    cleared() {
      safe(() => {
        [72, 76, 79, 84].forEach((m, i) =>
          tone({ type: 'triangle', freq: noteHz(m), dur: 0.18, gain: 0.5, at: i * 0.11 }));
      });
    },

    failed() {
      safe(() => {
        [60, 56, 51].forEach((m, i) =>
          tone({ type: 'sawtooth', freq: noteHz(m), dur: 0.22, gain: 0.4, at: i * 0.14 }));
      });
    },

    startMusic,
    stopMusic,

    setMuted(next) {
      isMuted = !!next;
      if (master) master.gain.value = isMuted ? 0 : 1;
      if (isMuted) stopMusic();
      else if (ctx) startMusic(); // resume the loop when un-muted mid-game
      return isMuted;
    },
    toggleMute() { return this.setMuted(!isMuted); },
    isMuted() { return isMuted; },

    // Settings: independent Music and SFX switches, layered under the master
    // mute (mute still silences everything regardless of these).
    setMusicEnabled(next) {
      musicOn = !!next;
      if (!musicOn) stopMusic();
      else if (ctx && !isMuted) startMusic();
      return musicOn;
    },
    toggleMusic() { return this.setMusicEnabled(!musicOn); },
    isMusicEnabled() { return musicOn; },

    setSfxEnabled(next) { sfxOn = !!next; return sfxOn; },
    toggleSfx() { return this.setSfxEnabled(!sfxOn); },
    isSfxEnabled() { return sfxOn; },
  };
}
