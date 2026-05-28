/* ==========================================================================
   PC-3104 Retro Pixel Studio - Sound Effects Engine (sound.js)
   ========================================================================== */

// --- Retro Sound Effects Engine (Web Audio API) ---
const SoundFX = {
  ctx: null,
  enabled: true,
  recordingDestination: null,
  _intercepted: false,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Monkey-patch AudioNode.connect to mirror sounds into recordingDestination
      if (this.ctx && !this._intercepted) {
        this._intercepted = true;
        const originalConnect = AudioNode.prototype.connect;
        const self = this;
        AudioNode.prototype.connect = function(destination, output, input) {
          if (destination === self.ctx.destination) {
            originalConnect.call(this, self.ctx.destination, output, input);
            if (self.recordingDestination) {
              try {
                originalConnect.call(this, self.recordingDestination, output, input);
              } catch (e) {
                console.warn("Failed to mirror audio node connection to recordingDestination:", e);
              }
            }
          } else {
            originalConnect.call(this, destination, output, input);
          }
          return destination;
        };
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },

  bgmPlayer: {
    isPlaying: false,
    timer: null,
    currentStep: 0,
    tempo: 110,
    nextNoteTime: 0.0,
    scheduleAheadTime: 0.1,
    gainNode: null,
    selectedBgm: "none",

    tracks: {
      "suspense": {
        tempo: 100,
        bass: ["C2", "", "C#2", "", "C2", "", "G#1", "", "C2", "", "C#2", "", "C2", "", "G#1", ""],
        lead: ["C4", "", "D#4", "", "G4", "", "F#4", "", "F4", "", "D4", "", "D#4", "", "C4", ""]
      },
      "adventure": {
        tempo: 130,
        bass: ["C3", "G3", "E3", "G3", "F3", "C4", "A3", "C4", "G3", "D4", "B3", "D4", "C3", "G3", "E3", "G3"],
        lead: ["E4", "G4", "C5", "E5", "D5", "B4", "G4", "B4", "C5", "E4", "G4", "C5", "D5", "B4", "G4", "B4"]
      }
    },

    noteToFreq(note) {
      if (!note) return 0;
      const notes = {
        "A": 440.00, "A#": 466.16, "B": 493.88, "C": 261.63, "C#": 277.18, "D": 293.66,
        "D#": 311.13, "E": 329.63, "F": 349.23, "F#": 369.99, "G": 392.00, "G#": 415.30
      };
      const match = note.match(/^([A-G]#?)(\d)$/);
      if (!match) return 0;
      const key = match[1];
      const octave = parseInt(match[2]);
      const baseFreq = notes[key];
      let freq = baseFreq;
      if (key === "C" || key === "C#" || key === "D" || key === "D#" || key === "E" || key === "F" || key === "F#" || key === "G" || key === "G#") {
        freq = baseFreq * 2;
      }
      const diff = octave - 4;
      return freq * Math.pow(2, diff);
    },

    scheduler() {
      if (!SoundFX.ctx) return;
      while (this.nextNoteTime < SoundFX.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.currentStep, this.nextNoteTime);
        this.advanceStep();
      }
    },

    advanceStep() {
      const secondsPerBeat = 60.0 / this.tempo;
      const secondsPerStep = secondsPerBeat / 4;
      this.nextNoteTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % 16;
    },

    scheduleNote(step, time) {
      const track = this.tracks[this.selectedBgm];
      if (!track) return;

      const bassNote = track.bass[step];
      const leadNote = track.lead[step];

      if (bassNote) {
        const freq = this.noteToFreq(bassNote);
        if (freq > 0) {
          const osc = SoundFX.ctx.createOscillator();
          const gain = SoundFX.ctx.createGain();

          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, time);

          const filter = SoundFX.ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(300, time);
          filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

          gain.gain.setValueAtTime(0.04, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.gainNode);

          osc.start(time);
          osc.stop(time + 0.25);
        }
      }

      if (leadNote) {
        const freq = this.noteToFreq(leadNote);
        if (freq > 0) {
          const osc = SoundFX.ctx.createOscillator();
          const gain = SoundFX.ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, time);

          osc.frequency.setValueAtTime(freq, time);
          osc.frequency.linearRampToValueAtTime(freq + 4, time + 0.08);
          osc.frequency.linearRampToValueAtTime(freq - 4, time + 0.16);

          gain.gain.setValueAtTime(0.0, time);
          gain.gain.linearRampToValueAtTime(0.05, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

          osc.connect(gain);
          gain.connect(this.gainNode);

          osc.start(time);
          osc.stop(time + 0.22);
        }
      }
    },

    start(bgmKey) {
      if (!SoundFX.enabled || !bgmKey || bgmKey === "none") {
        this.stop();
        return;
      }

      SoundFX.init();
      if (!SoundFX.ctx) return;

      this.stop();
      this.selectedBgm = bgmKey;
      this.tempo = this.tracks[bgmKey].tempo;
      this.currentStep = 0;
      this.isPlaying = true;
      this.nextNoteTime = SoundFX.ctx.currentTime + 0.05;

      this.gainNode = SoundFX.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.18, SoundFX.ctx.currentTime);
      this.gainNode.connect(SoundFX.ctx.destination);

      this.timer = setInterval(() => {
        this.scheduler();
      }, 25);
    },

    stop() {
      this.isPlaying = false;
      this.selectedBgm = "none";
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      if (this.gainNode) {
        try {
          this.gainNode.disconnect();
        } catch (e) { }
        this.gainNode = null;
      }
    }
  },

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  },

  playTabClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  },

  playRenderChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Nostalgic PC-3104 FM Chime arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteDuration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      gain.gain.setValueAtTime(0, now + idx * noteDuration);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * noteDuration + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * noteDuration + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * noteDuration);
      osc.stop(now + idx * noteDuration + 0.25);
    });
  },

  playBeepAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },

  playTrashSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    
    // Procedural paper-crumpling sound effect using modulated bandpass noise
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate || 44100;
    const bufferSize = sampleRate * 0.4; // 0.4 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.4);
  },

  playDialupSound() {
    if (!this.enabled) return null;
    this.init();
    if (!this.ctx) return null;
    
    const now = this.ctx.currentTime;
    const activeNodes = [];
    
    // Stage 1: Telephone Line Off-hook and Dial Tone (mixed 350Hz + 440Hz)
    const dialToneOsc1 = this.ctx.createOscillator();
    const dialToneOsc2 = this.ctx.createOscillator();
    const dialToneGain = this.ctx.createGain();
    
    dialToneOsc1.frequency.setValueAtTime(350, now);
    dialToneOsc2.frequency.setValueAtTime(440, now);
    dialToneGain.gain.setValueAtTime(0.04, now);
    dialToneGain.gain.setValueAtTime(0.04, now + 1.0);
    dialToneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    
    dialToneOsc1.connect(dialToneGain);
    dialToneOsc2.connect(dialToneGain);
    dialToneGain.connect(this.ctx.destination);
    
    dialToneOsc1.start(now);
    dialToneOsc2.start(now);
    dialToneOsc1.stop(now + 1.2);
    dialToneOsc2.stop(now + 1.2);
    
    activeNodes.push(dialToneOsc1, dialToneOsc2, dialToneGain);
    
    // Stage 2: DTMF Dialing (dialing 03-3104-9800)
    const dtmfDigits = [
      { r: 941, c: 1336 }, // 0
      { r: 697, c: 1477 }, // 3
      { r: 697, c: 1477 }, // 3
      { r: 697, c: 1209 }, // 1
      { r: 941, c: 1336 }, // 0
      { r: 770, c: 1209 }, // 4
      { r: 852, c: 1477 }, // 9
      { r: 852, c: 1336 }, // 8
      { r: 941, c: 1336 }, // 0
      { r: 941, c: 1336 }  // 0
    ];
    
    let dialStart = now + 1.3;
    dtmfDigits.forEach((digit) => {
      const rowOsc = this.ctx.createOscillator();
      const colOsc = this.ctx.createOscillator();
      const dtmfGain = this.ctx.createGain();
      
      rowOsc.frequency.setValueAtTime(digit.r, dialStart);
      colOsc.frequency.setValueAtTime(digit.c, dialStart);
      
      dtmfGain.gain.setValueAtTime(0.0, now);
      dtmfGain.gain.setValueAtTime(0.03, dialStart);
      dtmfGain.gain.setValueAtTime(0.03, dialStart + 0.1);
      dtmfGain.gain.exponentialRampToValueAtTime(0.0001, dialStart + 0.12);
      
      rowOsc.connect(dtmfGain);
      colOsc.connect(dtmfGain);
      dtmfGain.connect(this.ctx.destination);
      
      rowOsc.start(dialStart);
      colOsc.start(dialStart);
      rowOsc.stop(dialStart + 0.15);
      colOsc.stop(dialStart + 0.15);
      
      activeNodes.push(rowOsc, colOsc, dtmfGain);
      dialStart += 0.16;
    });
    
    // Stage 3: Telephone Ringback Tone (2 rings, 400Hz + 450Hz)
    let ringStart = dialStart + 0.2;
    for (let r = 0; r < 2; r++) {
      const ringOsc1 = this.ctx.createOscillator();
      const ringOsc2 = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      
      ringOsc1.frequency.setValueAtTime(400, ringStart);
      ringOsc2.frequency.setValueAtTime(450, ringStart);
      
      ringGain.gain.setValueAtTime(0, now);
      ringGain.gain.setValueAtTime(0.03, ringStart);
      ringGain.gain.setValueAtTime(0.03, ringStart + 1.0);
      ringGain.gain.exponentialRampToValueAtTime(0.0001, ringStart + 1.1);
      
      ringOsc1.connect(ringGain);
      ringOsc2.connect(ringGain);
      ringGain.connect(this.ctx.destination);
      
      ringOsc1.start(ringStart);
      ringOsc2.start(ringStart);
      ringOsc1.stop(ringStart + 1.2);
      ringOsc2.stop(ringStart + 1.2);
      
      activeNodes.push(ringOsc1, ringOsc2, ringGain);
      ringStart += 1.6;
    }
    
    // Stage 4: Modem Connection Handshake Screech
    const handshakeStart = ringStart - 0.2;
    const answerOsc = this.ctx.createOscillator();
    const answerGain = this.ctx.createGain();
    
    answerOsc.frequency.setValueAtTime(2100, handshakeStart);
    answerGain.gain.setValueAtTime(0, now);
    answerGain.gain.setValueAtTime(0.04, handshakeStart);
    answerGain.gain.setValueAtTime(0.04, handshakeStart + 0.8);
    answerGain.gain.exponentialRampToValueAtTime(0.0001, handshakeStart + 0.9);
    
    answerOsc.connect(answerGain);
    answerGain.connect(this.ctx.destination);
    
    answerOsc.start(handshakeStart);
    answerOsc.stop(handshakeStart + 1.0);
    activeNodes.push(answerOsc, answerGain);
    
    // Swirling bandpass filtered white noise for static carrier screeches
    const screechStart = handshakeStart + 0.9;
    const sampleRate = this.ctx.sampleRate || 44100;
    const bufferSize = sampleRate * 5.0; 
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1000, screechStart);
    noiseFilter.Q.setValueAtTime(1.5, screechStart);
    noiseFilter.frequency.exponentialRampToValueAtTime(3000, screechStart + 2.0);
    noiseFilter.frequency.linearRampToValueAtTime(600, screechStart + 4.0);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.setValueAtTime(0.03, screechStart);
    for (let t = 0; t < 50; t++) {
      const timeOffset = screechStart + (t / 10.0);
      const randomAmp = 0.01 + Math.random() * 0.035;
      noiseGain.gain.setValueAtTime(randomAmp, timeOffset);
    }
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, screechStart + 5.0);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    noiseSource.start(screechStart);
    noiseSource.stop(screechStart + 5.0);
    activeNodes.push(noiseSource, noiseFilter, noiseGain);
    
    // Low screaming modulated oscillators
    const oscScreech1 = this.ctx.createOscillator();
    const oscScreech2 = this.ctx.createOscillator();
    const gainScreech = this.ctx.createGain();
    
    oscScreech1.type = "sawtooth";
    oscScreech2.type = "triangle";
    oscScreech1.frequency.setValueAtTime(1200, screechStart);
    oscScreech2.frequency.setValueAtTime(600, screechStart);
    oscScreech1.frequency.linearRampToValueAtTime(2200, screechStart + 2.5);
    oscScreech2.frequency.exponentialRampToValueAtTime(300, screechStart + 3.0);
    
    gainScreech.gain.setValueAtTime(0, now);
    gainScreech.gain.setValueAtTime(0.015, screechStart);
    gainScreech.gain.setValueAtTime(0.015, screechStart + 3.0);
    gainScreech.gain.exponentialRampToValueAtTime(0.0001, screechStart + 4.5);
    
    oscScreech1.connect(gainScreech);
    oscScreech2.connect(gainScreech);
    gainScreech.connect(this.ctx.destination);
    
    oscScreech1.start(screechStart);
    oscScreech2.start(screechStart);
    oscScreech1.stop(screechStart + 4.8);
    oscScreech2.stop(screechStart + 4.8);
    activeNodes.push(oscScreech1, oscScreech2, gainScreech);
    
    // Stage 5: Final Clean "CONNECT" Bleep!
    const connectStart = screechStart + 4.7;
    const connectOsc = this.ctx.createOscillator();
    const connectGain = this.ctx.createGain();
    
    connectOsc.type = "sine";
    connectOsc.frequency.setValueAtTime(1500, connectStart);
    
    connectGain.gain.setValueAtTime(0, now);
    connectGain.gain.setValueAtTime(0.03, connectStart);
    connectGain.gain.exponentialRampToValueAtTime(0.0001, connectStart + 0.4);
    
    connectOsc.connect(connectGain);
    connectGain.connect(this.ctx.destination);
    
    connectOsc.start(connectStart);
    connectOsc.stop(connectStart + 0.5);
    activeNodes.push(connectOsc, connectGain);
    
    return {
      stop: () => {
        activeNodes.forEach(node => {
          try {
            node.disconnect();
          } catch(e){}
        });
      },
      duration: 12.8
    };
  },

  playThunder() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Create oscillator for low-frequency rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 1.8);

    // Lowpass filter to make it muddy and deep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + 1.8);

    // Noise buffer for the lightning crack & storm hiss
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();

    // Envelope for lightning crack
    noiseGain.gain.setValueAtTime(0.12, now); // loud crack
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // quick crack decay

    // Envelope for deep rumble
    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.linearRampToValueAtTime(0.25, now + 0.1); // rumble grows slightly
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // slow rumble fade

    // Connect
    noise.connect(noiseGain);
    noiseGain.connect(filter);

    osc.connect(oscGain);
    oscGain.connect(filter);

    filter.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 2.0);

    osc.start(now);
    osc.stop(now + 2.0);
  },

  playMenuSelect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1500, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  },

  playPageAdvance() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }
};
