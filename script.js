window.addEventListener('wheel', function(evento) {
    const cortina = document.getElementById('cortina');
    if (evento.deltaY > 0 && !cortina.classList.contains('oculta')) {
        cortina.classList.add('oculta');
    }
});

// ==========================================
// SISTEMA DE SONIDOS SIN COPYRIGHT (WEB AUDIO API)
// ==========================================
const SoundFX = (() => {
    let audioCtx = null;
    let alertInterval = null;

    function getContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Genera curva de saturación para simular el crepitar supersónico del cohete
    function makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; ++i) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    // 0. Sonido tipo "click" al seleccionar una opción (~45 ms)
    function playClick() {
        const ctx = getContext();
        const now = ctx.currentTime;
        const duration = 0.045;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1150, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + duration);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);

        const snapLen = Math.floor(ctx.sampleRate * 0.015);
        const snapBuffer = ctx.createBuffer(1, snapLen, ctx.sampleRate);
        const snapData = snapBuffer.getChannelData(0);
        for (let i = 0; i < snapLen; i++) {
            snapData[i] = (Math.random() * 2 - 1) * (1 - i / snapLen);
        }

        const snapSource = ctx.createBufferSource();
        snapSource.buffer = snapBuffer;

        const snapFilter = ctx.createBiquadFilter();
        snapFilter.type = 'bandpass';
        snapFilter.frequency.value = 2600;
        snapFilter.Q.value = 2.0;

        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0.14, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        snapSource.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(ctx.destination);
        snapSource.start(now);
        snapSource.stop(now + 0.015);
    }

    // 1. Cohete despegando realista (2 segundos)
    function playRocketLaunch() {
        const ctx = getContext();
        const now = ctx.currentTime;
        const duration = 2.0;
        const bufferSize = Math.floor(ctx.sampleRate * duration);

        const whiteBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const brownBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const whiteData = whiteBuffer.getChannelData(0);
        const brownData = brownBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            whiteData[i] = white;
            brownData[i] = (lastOut + 0.04 * white) / 1.04;
            lastOut = brownData[i];
            brownData[i] *= 3.2;
        }

        // CAPA A: Chispazo / Golpe inicial de ignición
        const ignOsc = ctx.createOscillator();
        const ignGain = ctx.createGain();
        ignOsc.type = 'triangle';
        ignOsc.frequency.setValueAtTime(190, now);
        ignOsc.frequency.exponentialRampToValueAtTime(42, now + 0.28);

        ignGain.gain.setValueAtTime(0.32, now);
        ignGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

        ignOsc.connect(ignGain);
        ignGain.connect(ctx.destination);
        ignOsc.start(now);
        ignOsc.stop(now + 0.32);

        // CAPA B: Rugido subgrave de plataforma y propulsores
        const rumbleSource = ctx.createBufferSource();
        rumbleSource.buffer = brownBuffer;

        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(110, now);
        rumbleFilter.frequency.linearRampToValueAtTime(320, now + 0.85);
        rumbleFilter.frequency.exponentialRampToValueAtTime(160, now + duration);
        rumbleFilter.Q.value = 2.2;

        const rumbleGain = ctx.createGain();
        rumbleGain.gain.setValueAtTime(0.01, now);
        rumbleGain.gain.linearRampToValueAtTime(0.45, now + 0.18);
        rumbleGain.gain.setValueAtTime(0.42, now + 1.25);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        rumbleSource.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);

        // CAPA C: Turbulencia y crepitar de escape supersónico
        const roarSource = ctx.createBufferSource();
        roarSource.buffer = whiteBuffer;

        const roarBandpass = ctx.createBiquadFilter();
        roarBandpass.type = 'bandpass';
        roarBandpass.frequency.setValueAtTime(320, now);
        roarBandpass.frequency.exponentialRampToValueAtTime(1350, now + 0.95);
        roarBandpass.frequency.exponentialRampToValueAtTime(650, now + duration);
        roarBandpass.Q.value = 1.4;

        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(35);
        shaper.oversample = '2x';

        const roarGain = ctx.createGain();
        roarGain.gain.setValueAtTime(0.005, now);
        roarGain.gain.linearRampToValueAtTime(0.22, now + 0.25);
        roarGain.gain.linearRampToValueAtTime(0.26, now + 1.0);
        roarGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        roarSource.connect(roarBandpass);
        roarBandpass.connect(shaper);
        shaper.connect(roarGain);
        roarGain.connect(ctx.destination);

        rumbleSource.start(now);
        rumbleSource.stop(now + duration);
        roarSource.start(now);
        roarSource.stop(now + duration);
    }

    // 2. Alerta continua mientras dura el contador
    function playAlertPulse() {
        const ctx = getContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.14);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
        gain.gain.setValueAtTime(0.14, now + 0.12);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.135);

        gain.gain.setValueAtTime(0.14, now + 0.145);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    function startAlertLoop() {
        stopAlertLoop();
        playAlertPulse();
        alertInterval = setInterval(playAlertPulse, 1000);
    }

    function stopAlertLoop() {
        if (alertInterval) {
            clearInterval(alertInterval);
            alertInterval = null;
        }
    }

    // 3. Victoria al completar la misión (3 segundos)
    function playVictory() {
        const ctx = getContext();
        const now = ctx.currentTime;

        const notes = [
            { freq: 523.25, start: 0.00, dur: 0.22 },
            { freq: 659.25, start: 0.22, dur: 0.22 },
            { freq: 783.99, start: 0.44, dur: 0.22 },
            { freq: 1046.50, start: 0.66, dur: 0.45 },
            { freq: 783.99, start: 1.15, dur: 0.25 },
            { freq: 1046.50, start: 1.45, dur: 1.55 }
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            gain.gain.setValueAtTime(0.001, now + n.start);
            gain.gain.linearRampToValueAtTime(0.22, now + n.start + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });

        [523.25, 659.25, 783.99].forEach(freq => {
            const chordOsc = ctx.createOscillator();
            const chordGain = ctx.createGain();
            chordOsc.type = 'sine';
            chordOsc.frequency.setValueAtTime(freq, now + 1.45);

            chordGain.gain.setValueAtTime(0.001, now + 1.45);
            chordGain.gain.linearRampToValueAtTime(0.10, now + 1.55);
            chordGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

            chordOsc.connect(chordGain);
            chordGain.connect(ctx.destination);
            chordOsc.start(now + 1.45);
            chordOsc.stop(now + 3.0);
        });
    }

    // 3B. Misión Fallida / Alerta Roja (2.5 segundos)
    function playMissionFailed() {
        const ctx = getContext();
        const now = ctx.currentTime;

        const klaxonPulses = [
            { freq: 440.00, start: 0.00, dur: 0.16 },
            { freq: 311.13, start: 0.17, dur: 0.18 },
            { freq: 440.00, start: 0.42, dur: 0.16 },
            { freq: 311.13, start: 0.59, dur: 0.18 }
        ];

        klaxonPulses.forEach(p => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(p.freq, now + p.start);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1400;

            gain.gain.setValueAtTime(0.001, now + p.start);
            gain.gain.linearRampToValueAtTime(0.16, now + p.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + p.start);
            osc.stop(now + p.start + p.dur);
        });

        const downOsc = ctx.createOscillator();
        const downGain = ctx.createGain();
        downOsc.type = 'sawtooth';
        downOsc.frequency.setValueAtTime(220, now + 0.80);
        downOsc.frequency.exponentialRampToValueAtTime(42, now + 2.50);

        const downFilter = ctx.createBiquadFilter();
        downFilter.type = 'lowpass';
        downFilter.frequency.setValueAtTime(800, now + 0.80);
        downFilter.frequency.exponentialRampToValueAtTime(120, now + 2.50);

        downGain.gain.setValueAtTime(0.001, now + 0.80);
        downGain.gain.linearRampToValueAtTime(0.20, now + 0.90);
        downGain.gain.exponentialRampToValueAtTime(0.001, now + 2.50);

        downOsc.connect(downFilter);
        downFilter.connect(downGain);
        downGain.connect(ctx.destination);
        downOsc.start(now + 0.80);
        downOsc.stop(now + 2.50);
    }

    // 4A. Evento aleatorio BUENO (2 segundos)
    function playGoodEvent() {
        const ctx = getContext();
        const now = ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880, 1108.73];

        notes.forEach((freq, idx) => {
            const start = idx * 0.28;
            const dur = 2.0 - start;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0.001, now + start);
            gain.gain.linearRampToValueAtTime(0.16, now + start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + 2.0);
        });
    }

    // 4B. Evento aleatorio MALO (2 segundos)
    function playBadEvent() {
        const ctx = getContext();
        const now = ctx.currentTime;
        const duration = 2.0;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        osc.frequency.setValueAtTime(340, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.7);
        osc.frequency.exponentialRampToValueAtTime(85, now + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(260, now + duration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
        gain.gain.setValueAtTime(0.15, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    // 5. Sonido de fiesta cuando aparece SuperAyuda (2 segundos)
    function playParty() {
        const ctx = getContext();
        const now = ctx.currentTime;

        const riff = [
            { freq: 587.33, start: 0.00, dur: 0.14 },
            { freq: 587.33, start: 0.16, dur: 0.14 },
            { freq: 587.33, start: 0.32, dur: 0.14 },
            { freq: 783.99, start: 0.48, dur: 0.40 },
            { freq: 659.25, start: 0.92, dur: 0.18 },
            { freq: 783.99, start: 1.12, dur: 0.18 },
            { freq: 987.77, start: 1.32, dur: 0.68 }
        ];

        riff.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(n.freq, now + n.start);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2400;

            gain.gain.setValueAtTime(0.001, now + n.start);
            gain.gain.linearRampToValueAtTime(0.16, now + n.start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + n.start);
            osc.stop(now + n.start + n.dur);
        });
    }

    return {
        playClick,
        playRocketLaunch,
        startAlertLoop,
        stopAlertLoop,
        playVictory,
        playMissionFailed,
        playGoodEvent,
        playBadEvent,
        playParty
    };
})();

let currentLang = "en"; // Inglés por defecto
let gameData = {};
let deck = [];
let currentTask = null;
let selectedLevel = "1";
let selectedLevelKey = "level_1_luna";
let selectedRole = "Ingeniero Mecánico";
let currentLevelMultiplier = 0.7;

// Progresión de niveles desbloqueados (guardado en localStorage)
let maxUnlockedLevel = parseInt(localStorage.getItem("nasa_unlocked_level")) || 1;

let turnCount = 0;
let strandedTurnsRemaining = 0;
let strandedCardRef = null;
let decisionTimer = null;
let timeLeft = 20;
let lastStatDropped = null;

let stats = {
    energia: 100,
    vida: 100,
    blindaje: 100,
    progreso: 0
};

let roleScores = {
    "Ingeniero Mecánico": 0,
    "Especialista en Sistemas": 0,
    "Médico / Biólogo": 0,
    "Comandante": 0,
    "Investigador / Científico": 0,
    "Biólogo / Botánico": 0
};

// Diccionario UI Bilingüe (EN / ES)
const uiTranslations = {
    en: {
        subtitle: "Scroll down or click START MISSION to launch",
        startHero: "START MISSION",
        energia: "Energy",
        vida: "Health",
        blindaje: "Shield",
        progreso: "Progress",
        tutWelcomeTitle: "🧑‍🚀 Welcome aboard, Cadet!",
        tutWelcomeDesc: "Before blasting off into deep space with real NASA data, would you like a quick training session to learn how to survive?",
        btnStartTut: "🎓 Yes, start Tutorial",
        btnSkipTut: "⏭️ No, go straight to Mission",
        btnPrev: "⬅️ Previous",
        btnNext: "Next ➡️",
        btnFinishTut: "🚀 Ready to play!",
        setupTitle: "Prepare Your Space Mission",
        lblLevel: "1. Choose Destination (Complete previous level to unlock):",
        lvl1: "🌑 Level 1: The Moon (Easy • No Progress Loss)",
        lvl2Open: "🛰️ Level 2: Mars Orbit (Medium)",
        lvl2Lock: "🔒 Level 2: Mars Orbit (Complete Level 1 to unlock)",
        lvl3Open: "💥 Level 3: Crash on Mars (Semi-Hard)",
        lvl3Lock: "🔒 Level 3: Crash on Mars (Complete Level 2 to unlock)",
        lblRole: "2. Choose Your Specialty:",
        role1: "🔧 Mechanical Engineer (+20% Initial Shield)",
        role2: "💻 Systems Specialist (75% success on radio glitches)",
        role3: "🧬 Medic / Biologist (+20% Initial Health)",
        btnLaunch: "🚀 Launch Mission",
        lblTimer: "Optimal pace! Decide fast:",
        btnHint: "💡 Need a hint?",
        sidebarTitle: "🛰️ NASA API Real Data",
        turnLabel: "Turn",
        roleActive: "Active Role",
        sourceLabel: "Verified Source",
        winTitle: "🎉 MISSION ACCOMPLISHED (100%)!",
        winDesc: "You completed the mission in {turns} turns using real NASA science.",
        loseTitle: "🚨 RED ALERT! MISSION FAILED",
        loseDesc: "A vital system reached 0% on turn {turns}. In deep space, every resource counts.",
        profileLabel: "🧑‍🚀 Your Astronaut Profile:",
        profileText: "Based on your engineering decisions, NASA would recruit you as a top",
        adviceHeader: "📋 Mission Debrief & Survival Advice:",
        btnPlayAgain: "🔄 Play Another Mission",
        btnNextLevel: "🔓 Unlock & Play Next Level"
    },
    es: {
        subtitle: "Deslizá hacia abajo o hacé clic para despegar",
        startHero: "INICIAR MISIÓN",
        energia: "Energía",
        vida: "Vida",
        blindaje: "Blindaje",
        progreso: "Progreso",
        tutWelcomeTitle: "🧑‍🚀 ¡Bienvenido a bordo, Cadete!",
        tutWelcomeDesc: "Antes de despegar al espacio profundo con datos reales de la NASA, ¿querés hacer un entrenamiento rápido para aprender a sobrevivir?",
        btnStartTut: "🎓 Sí, hacer Tutorial",
        btnSkipTut: "⏭️ No, ir directo a la Misión",
        btnPrev: "⬅️ Anterior",
        btnNext: "Siguiente ➡️",
        btnFinishTut: "🚀 ¡Listo para jugar!",
        setupTitle: "Prepará tu Misión Espacial",
        lblLevel: "1. Elegí el destino (Completá el nivel anterior para desbloquear):",
        lvl1: "🌑 Nivel 1: La Luna (Fácil • Sin perder progreso)",
        lvl2Open: "🛰️ Nivel 2: Órbita de Marte (Medio)",
        lvl2Lock: "🔒 Nivel 2: Órbita de Marte (Completá Nivel 1)",
        lvl3Open: "💥 Nivel 3: Caída en Marte (Semidifícil)",
        lvl3Lock: "🔒 Nivel 3: Caída en Marte (Completá Nivel 2)",
        lblRole: "2. Elegí tu Especialidad:",
        role1: "🔧 Ing. Mecánico (+20% Blindaje inicial)",
        role2: "💻 Esp. Sistemas (75% éxito en fallos de radio)",
        role3: "🧬 Médico / Biólogo (+20% Vida inicial)",
        btnLaunch: "🚀 Despegar Misión",
        lblTimer: "¡Ritmo óptimo! Decidí rápido:",
        btnHint: "💡 ¿Necesitás una pista?",
        sidebarTitle: "🛰️ Datos Reales API NASA",
        turnLabel: "Turno",
        roleActive: "Rol activo",
        sourceLabel: "Fuente verificada",
        winTitle: "🎉 ¡MISIÓN CUMPLIDA AL 100%!",
        winDesc: "Completaste la misión en {turns} turnos tomando decisiones reales basadas en datos de la NASA.",
        loseTitle: "🚨 ¡ALERTA ROJA! MISIÓN FALLIDA",
        loseDesc: "Uno de los sistemas vitales llegó a 0% en el turno {turns}. En el espacio, cada recurso cuenta.",
        profileLabel: "🧑‍🚀 Tu Perfil de Astronauta:",
        profileText: "Por tu forma de resolver problemas, en la NASA serías un gran",
        adviceHeader: "📋 Consejo de Supervivencia NASA:",
        btnPlayAgain: "🔄 Jugar otra misión",
        btnNextLevel: "🔓 Jugar Siguiente Nivel"
    }
};

// Pasos del Tutorial Bilingüe
const tutorialStepsData = {
    en: [
        {
            title: "1. Your Goal & The 4 Bars",
            text: "To win, push <strong>🚀 Progress to 100%</strong>. Careful: if <strong>⚡ Energy</strong>, <strong>❤️ Health</strong>, or <strong>🛡️ Shield</strong> drops to <strong>0%</strong>, your ship fails and the mission ends."
        },
        {
            title: "2. Color Code: Green & Red",
            text: "Every option button shows what you gain and lose:<br><br>🟢 <span class='txt-good'>Attributes in GREEN</span> are resources you gain.<br>🔴 <span class='txt-bad'>Attributes in RED</span> are resources you spend or lose."
        },
        {
            title: "3. Real NASA Data & Sidebar",
            text: "Every crisis (solar flares, lunar dust, oxygen leaks) comes from <strong>real NASA missions and APIs</strong>. Check the right sidebar for live facts and use <strong>💡 Need a hint?</strong> if you get stuck."
        },
        {
            title: "4. Progressive Difficulty Levels",
            text: "<strong>Level 1 (Moon)</strong> is relaxed and you <strong>never lose Progress</strong>! Beat it to unlock <strong>Level 2 (Mars Orbit - Medium)</strong> and <strong>Level 3 (Mars Crash - Semi-Hard)</strong>."
        }
    ],
    es: [
        {
            title: "1. Tu Objetivo y las 4 Barras",
            text: "Para ganar tenés que llevar el <strong>🚀 Progreso al 100%</strong>. Cuidado: si <strong>⚡ Energía</strong>, <strong>❤️ Vida</strong> o <strong>🛡️ Blindaje</strong> llegan a <strong>0%</strong>, perdés la misión."
        },
        {
            title: "2. Código de Colores: Verde y Rojo",
            text: "Cada botón de opción muestra qué te da y qué te quita:<br><br>🟢 <span class='txt-good'>Los atributos en VERDE</span> son los que ganás.<br>🔴 <span class='txt-bad'>Los atributos en ROJO</span> son los que gastás o perdés."
        },
        {
            title: "3. Ciencia Real de la NASA",
            text: "Todos los problemas (tormentas solares, polvo lunar, fugas de aire) salen de <strong>datos reales de la NASA</strong>. Mirá el panel lateral para aprender más y usá el botón <strong>💡 ¿Necesitás una pista?</strong> si dudás."
        },
        {
            title: "4. Niveles Progresivos",
            text: "En el <strong>Nivel 1 (Luna)</strong> jugás tranquilo y <strong>nunca perdés Progreso</strong>. Superalo para desbloquear el <strong>Nivel 2 (Órbita de Marte - Medio)</strong> y el <strong>Nivel 3 (Caída en Marte - Semidifícil)</strong>."
        }
    ]
};
let currentTutorialStep = 0;

// Datos reales para el Widget Lateral (Extraídos de las APIs de NASA)
const nasaSidebarFacts = [
    {
        img: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~medium.jpg",
        title_en: "DONKI: Solar Flares",
        title_es: "DONKI: Llamaradas Solares",
        text_en: "X-class solar flares release energy equal to a billion hydrogen bombs, reaching Earth and Mars in minutes.",
        text_es: "Las llamaradas solares Clase X liberan energía equivalente a mil millones de bombas, afectando naves y radios.",
        source: "NASA DONKI Space Weather API"
    },
    {
        img: "https://images-assets.nasa.gov/image/iss064e027006/iss064e027006~medium.jpg",
        title_en: "OSDR: Space Farming",
        title_es: "OSDR: Cultivos Espaciales",
        text_en: "NASA's Veggie experiment proved astronauts can grow red romaine lettuce in microgravity using red and blue LEDs.",
        text_es: "El experimento Veggie de la NASA demostró que se pueden cultivar lechugas en gravedad cero usando luces LED rojas y azules.",
        source: "NASA OSDR Biological Repository"
    },
    {
        img: "https://images-assets.nasa.gov/image/PIA24428/PIA24428~medium.jpg",
        title_en: "MOXIE: Oxygen on Mars",
        title_es: "MOXIE: Oxígeno en Marte",
        text_en: "Perseverance's MOXIE instrument successfully converted Mars' CO2 atmosphere into breathable oxygen.",
        text_es: "El instrumento MOXIE del rover Perseverance logró fabricar oxígeno respirable a partir del aire de Marte (95% CO2).",
        source: "NASA Mars 2020 / Trek API"
    },
    {
        img: "https://images-assets.nasa.gov/image/as11-40-5875/as11-40-5875~medium.jpg",
        title_en: "Artemis: Sharp Lunar Dust",
        title_es: "Artemis: Polvo Lunar Afilado",
        text_en: "Without wind or water erosion on the Moon, lunar regolith grains remain microscopic and sharp like crushed glass.",
        text_es: "Como en la Luna no hay viento ni agua, el polvo lunar (regolito) es microscópico y afilado como vidrio molido.",
        source: "NASA Artemis & Apollo Archive"
    },
    {
        img: "https://images-assets.nasa.gov/image/iss063e053998/iss063e053998~medium.jpg",
        title_en: "NeoWs: Micrometeoroids",
        title_es: "NeoWs: Micrometeoritos",
        text_en: "Space debris and micrometeoroids travel at up to 28,000 km/h, requiring multi-layer Whipple shields on spacecraft.",
        text_es: "Los micrometeoritos viajan a más de 28,000 km/h, por eso las naves usan escudos multicapa Whipple.",
        source: "NASA Near Earth Object API (NeoWs)"
    }
];
let currentFactIndex = 0;

// Consejos específicos según por qué perdió el jugador
const lossAdviceDict = {
    energia: {
        en: "⚡ <strong>Energy Depleted (0%):</strong> You ran out of battery! Next time, avoid overusing high-drain shields or engines when solar panels are hidden, and take energy-saving options when your battery drops below 40%.",
        es: "⚡ <strong>Energía Agotada (0%):</strong> ¡Te quedaste sin batería! La próxima vez evitá abusar de escudos o motores cuando no haya luz solar, y elegí opciones de ahorro energético cuando bajes del 40%."
    },
    vida: {
        en: "❤️ <strong>Crew Health Critical (0%):</strong> Radiation, dehydration, or lack of oxygen overwhelmed the crew. Always prioritize water recycling, exercise, and radiation shelters behind water tanks during solar storms.",
        es: "❤️ <strong>Salud de Tripulación en 0%:</strong> La radiación, la falta de agua o el agotamiento vencieron a la tripulación. Priorizá el reciclaje de agua, el ejercicio y refugiarte detrás de los tanques de agua en tormentas solares."
    },
    blindaje: {
        en: "🛡️ <strong>Hull / Shield Destroyed (0%):</strong> Micrometeoroids, lunar dust, or atmospheric friction tore through the ship. Clean spacesuits from sharp regolith and reinforce the hull before risky maneuvers.",
        es: "🛡️ <strong>Blindaje Destruido (0%):</strong> Los micrometeoritos, el polvo lunar o la fricción rompieron la nave. Limpiá el regolito afilado de los trajes y reforzá el casco antes de maniobras arriesgadas."
    }
};

const nasaDefaultImages = {
    "Clima Espacial y Radiación": "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~medium.jpg",
    "Salud Humana y Biología": "https://images-assets.nasa.gov/image/iss064e027006/iss064e027006~medium.jpg",
    "Ingeniería y Navegación": "https://images-assets.nasa.gov/image/iss063e053998/iss063e053998~medium.jpg",
    "Ciencia y Exploración": "https://images-assets.nasa.gov/image/PIA24428/PIA24428~medium.jpg",
    "level_1_luna": "https://images-assets.nasa.gov/image/as11-40-5875/as11-40-5875~medium.jpg",
    "level_2_orbita_marte": "https://images-assets.nasa.gov/image/PIA04591/PIA04591~medium.jpg",
    "level_3_caida_marte": "https://images-assets.nasa.gov/image/PIA24428/PIA24428~medium.jpg"
};

document.addEventListener("DOMContentLoaded", () => {
    fetch('tasks.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            configurarIdioma();
            configurarTutorial();
            configurarMenuInicio();
            actualizarCandadosNiveles();
            actualizarWidgetLateral();
        })
        .catch(error => console.error("Error loading tasks.json:", error));

    // Sonido tipo "click" al seleccionar cualquier opción interactiva
    document.addEventListener("click", (e) => {
        const optionTarget = e.target.closest(
            ".option-box, .setup-btn:not(.locked), .start-btn, .hint-btn, .lang-btn, #btn-next-fact"
        );
        if (optionTarget) {
            SoundFX.playClick();
        }
    });

    const cortina = document.getElementById("cortina");
    const btnEnter = document.getElementById("btn-enter-game");
    if (btnEnter) {
        btnEnter.addEventListener("click", () => {
            SoundFX.playRocketLaunch();
            cortina.classList.add("oculta");
        });
    }

    document.getElementById("btn-hint").addEventListener("click", () => {
        const hintText = document.getElementById("hint-text");
        hintText.style.display = hintText.style.display === "none" ? "block" : "none";
    });

    document.getElementById("btn-next-fact").addEventListener("click", () => {
        currentFactIndex = (currentFactIndex + 1) % nasaSidebarFacts.length;
        actualizarWidgetLateral();
    });
});

function configurarIdioma() {
    const btnEn = document.getElementById("btn-lang-en");
    const btnEs = document.getElementById("btn-lang-es");

    btnEn.addEventListener("click", () => cambiarIdioma("en"));
    btnEs.addEventListener("click", () => cambiarIdioma("es"));
    aplicarTextosUI();
}

function cambiarIdioma(lang) {
    currentLang = lang;
    document.getElementById("btn-lang-en").classList.toggle("active", lang === "en");
    document.getElementById("btn-lang-es").classList.toggle("active", lang === "es");
    aplicarTextosUI();
    actualizarCandadosNiveles();
    actualizarWidgetLateral();

    if (document.getElementById("tutorial-steps-screen").style.display === "block") {
        renderizarPasoTutorial();
    }
    if (document.getElementById("game-screen").style.display === "block" && currentTask) {
        if (strandedTurnsRemaining > 0) {
            manejarTurnoVarado();
        } else {
            mostrarCarta(currentTask);
        }
    }
}

function aplicarTextosUI() {
    const t = uiTranslations[currentLang];
    document.getElementById("txt-subtitle").innerText = t.subtitle;
    document.getElementById("btn-enter-game").innerText = t.startHero;
    document.getElementById("lbl-energia").innerText = t.energia;
    document.getElementById("lbl-vida").innerText = t.vida;
    document.getElementById("lbl-blindaje").innerText = t.blindaje;
    document.getElementById("lbl-progreso").innerText = t.progreso;

    document.getElementById("tut-welcome-title").innerText = t.tutWelcomeTitle;
    document.getElementById("tut-welcome-desc").innerText = t.tutWelcomeDesc;
    document.getElementById("btn-start-tutorial").innerText = t.btnStartTut;
    document.getElementById("btn-skip-tutorial").innerText = t.btnSkipTut;
    document.getElementById("btn-tutorial-prev").innerText = t.btnPrev;

    document.getElementById("setup-title").innerText = t.setupTitle;
    document.getElementById("lbl-select-level").innerText = t.lblLevel;
    document.getElementById("lbl-select-role").innerText = t.lblRole;
    document.getElementById("role-btn-1").innerText = t.role1;
    document.getElementById("role-btn-2").innerText = t.role2;
    document.getElementById("role-btn-3").innerText = t.role3;
    document.getElementById("btn-start-game").innerText = t.btnLaunch;

    document.getElementById("lbl-timer").innerText = t.lblTimer;
    document.getElementById("btn-hint").innerText = t.btnHint;
    document.getElementById("sidebar-title").innerText = t.sidebarTitle;
}

function actualizarWidgetLateral() {
    const fact = nasaSidebarFacts[currentFactIndex];
    document.getElementById("fact-img").src = fact.img;
    document.getElementById("fact-title").innerText = currentLang === "en" ? fact.title_en : fact.title_es;
    document.getElementById("fact-text").innerText = currentLang === "en" ? fact.text_en : fact.text_es;
    document.getElementById("fact-source").innerText = fact.source;
}

function actualizarCandadosNiveles() {
    const t = uiTranslations[currentLang];
    const levelBtns = document.querySelectorAll("#level-selector .setup-btn");

    levelBtns.forEach(btn => {
        const lvl = parseInt(btn.dataset.level);
        if (lvl === 1) {
            btn.innerText = t.lvl1;
            btn.classList.remove("locked");
        } else if (lvl === 2) {
            if (maxUnlockedLevel >= 2) {
                btn.innerText = t.lvl2Open;
                btn.classList.remove("locked");
            } else {
                btn.innerText = t.lvl2Lock;
                btn.classList.add("locked");
            }
        } else if (lvl === 3) {
            if (maxUnlockedLevel >= 3) {
                btn.innerText = t.lvl3Open;
                btn.classList.remove("locked");
            } else {
                btn.innerText = t.lvl3Lock;
                btn.classList.add("locked");
            }
        }
    });
}

function actualizarAmbienteVisual(levelNum) {
    document.body.className = `bg-level-${levelNum}`;
    document.getElementById("env-moon").style.display = levelNum === "1" ? "block" : "none";
    document.getElementById("env-mars-far").style.display = levelNum === "2" ? "block" : "none";
    document.getElementById("env-mars-surface").style.display = levelNum === "3" ? "block" : "none";
}

function configurarTutorial() {
    const promptScreen = document.getElementById("tutorial-prompt-screen");
    const stepsScreen = document.getElementById("tutorial-steps-screen");
    const setupScreen = document.getElementById("setup-screen");

    document.getElementById("btn-start-tutorial").addEventListener("click", () => {
        promptScreen.style.display = "none";
        stepsScreen.style.display = "block";
        currentTutorialStep = 0;
        renderizarPasoTutorial();
    });

    document.getElementById("btn-skip-tutorial").addEventListener("click", () => {
        promptScreen.style.display = "none";
        setupScreen.style.display = "block";
    });

    document.getElementById("btn-tutorial-prev").addEventListener("click", () => {
        if (currentTutorialStep > 0) {
            currentTutorialStep--;
            renderizarPasoTutorial();
        }
    });

    document.getElementById("btn-tutorial-next").addEventListener("click", () => {
        const steps = tutorialStepsData[currentLang];
        if (currentTutorialStep < steps.length - 1) {
            currentTutorialStep++;
            renderizarPasoTutorial();
        } else {
            stepsScreen.style.display = "none";
            setupScreen.style.display = "block";
        }
    });
}

function renderizarPasoTutorial() {
    const steps = tutorialStepsData[currentLang];
    const paso = steps[currentTutorialStep];
    const t = uiTranslations[currentLang];

    document.getElementById("tutorial-content").innerHTML = `
        <span style="font-size: 0.85rem; color: #a855f7; font-weight: bold;">NASA TRAINING (${currentTutorialStep + 1}/${steps.length})</span><br>
        <strong style="font-size: 1.3rem; color: #38bdf8;">${paso.title}</strong><br><br>
        <p>${paso.text}</p>
    `;

    const btnPrev = document.getElementById("btn-tutorial-prev");
    const btnNext = document.getElementById("btn-tutorial-next");

    btnPrev.style.opacity = currentTutorialStep === 0 ? "0.4" : "1";
    btnNext.innerText = currentTutorialStep === steps.length - 1 ? t.btnFinishTut : t.btnNext;
}

function configurarMenuInicio() {
    const levelBtns = document.querySelectorAll("#level-selector .setup-btn");
    levelBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const lvl = parseInt(btn.dataset.level);
            if (lvl > maxUnlockedLevel) return;

            levelBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedLevel = btn.dataset.level;
            selectedLevelKey = btn.dataset.key;
        });
    });

    const roleBtns = document.querySelectorAll("#role-selector .setup-btn");
    roleBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            roleBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedRole = btn.dataset.role;
        });
    });

    document.getElementById("btn-start-game").addEventListener("click", iniciarMision);
}

function iniciarMision() {
    const defaultMultipliers = { "1": 0.7, "2": 1.0, "3": 1.3 };
    currentLevelMultiplier = (gameData.gameConfig && gameData.gameConfig.levelMultipliers[selectedLevel]) || defaultMultipliers[selectedLevel] || 1.0;
    actualizarAmbienteVisual(selectedLevel);

    stats = {
        energia: 100,
        vida: selectedRole === "Médico / Biólogo" ? 120 : 100,
        blindaje: selectedRole === "Ingeniero Mecánico" ? 120 : 100,
        progreso: 0
    };

    const generales = gameData.generalTasks.filter(t => t.id !== "GEN_20");
    const especiales = gameData.levelSpecialTasks[selectedLevelKey] || [];
    deck = mezclarArray([...generales, ...especiales]);

    turnCount = 0;
    strandedTurnsRemaining = 0;
    lastStatDropped = null;
    document.getElementById("feedback-banner").style.display = "none";

    document.getElementById("setup-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    actualizarBarrasEnPantalla();
    siguienteTurno();
}

function mezclarArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function detenerTemporizador() {
    if (decisionTimer) {
        clearInterval(decisionTimer);
        decisionTimer = null;
    }
    SoundFX.stopAlertLoop();
    document.getElementById("timer-box").style.display = "none";
}

function iniciarTemporizadorSiVaMuyBien() {
    detenerTemporizador();

    if (selectedLevel === "1") return;

    const minTurn = selectedLevel === "2" ? 12 : 10;
    const secondsAllowed = selectedLevel === "2" ? 25 : 18;

    if (stats.energia >= 90 && stats.vida >= 90 && stats.blindaje >= 90 && turnCount > minTurn) {
        const timerBox = document.getElementById("timer-box");
        const timerSpan = document.getElementById("timer-seconds");
        timeLeft = secondsAllowed;
        timerSpan.innerText = timeLeft;
        timerBox.classList.remove("urgent");
        timerBox.style.display = "block";
        SoundFX.startAlertLoop();

        decisionTimer = setInterval(() => {
            timeLeft--;
            timerSpan.innerText = timeLeft;
            if (timeLeft <= 5) timerBox.classList.add("urgent");
            if (timeLeft <= 0) {
                detenerTemporizador();
                const autoSide = Math.random() < 0.5 ? "left" : "right";
                procesarEleccion(autoSide, true);
            }
        }, 1000);
    }
}

function siguienteTurno() {
    detenerTemporizador();
    const banner = document.getElementById("event-banner");
    banner.style.display = "none";

    if (stats.energia <= 0) { lastStatDropped = "energia"; mostrarFinal(false); return; }
    if (stats.vida <= 0) { lastStatDropped = "vida"; mostrarFinal(false); return; }
    if (stats.blindaje <= 0) { lastStatDropped = "blindaje"; mostrarFinal(false); return; }

    if (stats.progreso >= 100) {
        mostrarFinal(true);
        return;
    }

    if (strandedTurnsRemaining > 0) {
        manejarTurnoVarado();
        return;
    }

    turnCount++;
    currentFactIndex = (currentFactIndex + 1) % nasaSidebarFacts.length;
    actualizarWidgetLateral();

    const superAyudaChance = selectedLevel === "1" ? 0.40 : (selectedLevel === "2" ? 0.25 : 0.20);
    if (turnCount > 1 && turnCount % 5 === 0 && Math.random() < superAyudaChance) {
        mostrarEventoSuperAyuda();
        return;
    }

    if (turnCount > 2 && Math.random() < 0.20) {
        aplicarEventoAleatorioSorpresa(banner);
    }

    if (stats.vida <= 30 && stats.blindaje <= 30) {
        const cartaEmergencia = gameData.generalTasks.find(t => t.id === "GEN_20");
        if (cartaEmergencia) {
            mostrarCarta(cartaEmergencia);
            return;
        }
    }

    if (deck.length === 0) {
        const generales = gameData.generalTasks.filter(t => t.id !== "GEN_20");
        const especiales = gameData.levelSpecialTasks[selectedLevelKey] || [];
        deck = mezclarArray([...generales, ...especiales]);
    }

    let proximaCarta = deck.pop();

    if (proximaCarta.specialMechanic === "STRANDED_2_TURNS" && stats.vida < 50) {
        deck.unshift(proximaCarta);
        proximaCarta = deck.pop();
    }

    mostrarCarta(proximaCarta);
    iniciarTemporizadorSiVaMuyBien();
}

function getLocalizedText(obj, field) {
    if (currentLang === "en" && obj[field + "_en"]) {
        return obj[field + "_en"];
    }
    return obj[field];
}

// Genera etiquetas en verde (lo que da) y en rojo (lo que quita) según el nivel actual
function generarBadgesEfectos(effects) {
    const t = uiTranslations[currentLang];
    const nombres = {
        energia: `⚡ ${t.energia}`,
        vida: `❤️ ${t.vida}`,
        blindaje: `🛡️ ${t.blindaje}`,
        progreso: `🚀 ${t.progreso}`
    };

    const positivos = [];
    const negativos = [];

    for (let key of ["energia", "vida", "blindaje", "progreso"]) {
        if (!effects || !effects.hasOwnProperty(key)) continue;
        let valor = effects[key];
        if (valor === 0) continue;

        if (selectedLevel === "1" && key === "progreso" && valor < 0) {
            continue;
        }

        if (valor < 0 && key !== "progreso") {
            valor = Math.round(valor * currentLevelMultiplier);
        }

        if (valor > 0) {
            positivos.push(`<span class="txt-good">${nombres[key]} +${valor}%</span>`);
        } else if (valor < 0) {
            negativos.push(`<span class="txt-bad">${nombres[key]} ${valor}%</span>`);
        }
    }

    return { positivos, negativos };
}

function renderizarContenidoOpcion(opcion) {
    const label = getLocalizedText(opcion, "label");
    const { positivos, negativos } = generarBadgesEfectos(opcion.effects);

    let badgesHTML = "";

    if (opcion.failEffects) {
        const failBadges = generarBadgesEfectos(opcion.failEffects);
        const okTag = currentLang === "en" ? "✅ If it works:" : "✅ Si sale bien:";
        const failTag = currentLang === "en" ? "⚠️ If it fails:" : "⚠️ Si falla:";
        const okList = [...positivos, ...negativos].join(" • ");
        const failList = [...failBadges.positivos, ...failBadges.negativos].join(" • ");

        badgesHTML = `
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 0.82rem; line-height: 1.35;">
                <div><span style="color: #cbd5e1;">${okTag}</span> ${okList}</div>
                <div><span style="color: #cbd5e1;">${failTag}</span> ${failList}</div>
            </div>
        `;
    } else {
        const todosBadges = [...positivos, ...negativos];
        if (todosBadges.length > 0) {
            badgesHTML = `
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; font-size: 0.85rem; line-height: 1.3;">
                    ${todosBadges.join(" <span style='color:#64748b;'>•</span> ")}
                </div>
            `;
        }
    }

    return `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 100%; text-align: center;">
            <span style="font-weight: 700; font-size: 1.02rem;">${label}</span>
            ${badgesHTML}
        </div>
    `;
}

function mostrarCarta(tarea) {
    currentTask = tarea;
    const t = uiTranslations[currentLang];
    const divPregunta = document.getElementById("div-pregunta");
    const divOpcion1 = document.getElementById("div-opcion1");
    const divOpcion2 = document.getElementById("div-opcion2");
    const hintText = document.getElementById("hint-text");
    const hintBtn = document.getElementById("btn-hint");

    const container = document.getElementById("game-screen");
    container.classList.remove("superayuda-card");

    hintText.style.display = "none";
    hintText.innerText = getLocalizedText(tarea, "hint");
    hintBtn.style.display = "inline-block";

    const title = getLocalizedText(tarea, "title");
    const question = getLocalizedText(tarea, "question");
    const imgUrl = tarea.image || nasaDefaultImages[tarea.category] || nasaDefaultImages[selectedLevelKey];

    divPregunta.innerHTML = `
        <span style="font-size: 0.85rem; color: #a855f7; font-weight: bold;">${t.turnLabel} ${turnCount} • ${t.roleActive}: ${tarea.role}</span><br>
        <strong style="font-size: 1.25rem; color: #38bdf8;">📡 ${title}</strong>
        <img src="${imgUrl}" alt="NASA Real Photo" class="nasa-img" onerror="this.style.display='none'">
        <p style="margin-top: 8px;">${question}</p>
        <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-top: 10px;">🛰️ ${t.sourceLabel}: ${tarea.nasaSource}</span>
    `;

    divOpcion1.style.display = "flex";
    divOpcion2.style.display = "flex";
    divOpcion1.innerHTML = renderizarContenidoOpcion(tarea.options.left);
    divOpcion2.innerHTML = renderizarContenidoOpcion(tarea.options.right);

    divOpcion1.onclick = () => procesarEleccion("left", false);
    divOpcion2.onclick = () => procesarEleccion("right", false);
}

function procesarEleccion(side, porTiempoAgotado) {
    detenerTemporizador();
    const opcion = currentTask.options[side];
    let efectosAAplicar = opcion.effects;
    let exito = true;
    let prefijoTexto = porTiempoAgotado ? (currentLang === "en" ? "⏱️ Time's up! Auto-choice: " : "⏱️ ¡Tiempo agotado! Auto-elección: ") : "";

    if (opcion.failEffects) {
        let probExito = (selectedRole === "Especialista en Sistemas") ? 0.75 : 0.50;
        if (selectedLevel === "1") {
            probExito = (selectedRole === "Especialista en Sistemas") ? 0.85 : 0.65;
        } else if (selectedLevel === "2") {
            probExito = (selectedRole === "Especialista en Sistemas") ? 0.80 : 0.55;
        }

        if (Math.random() > probExito) {
            efectosAAplicar = opcion.failEffects;
            exito = false;
            prefijoTexto += currentLang === "en" ? "⚠️ Maneuver failed! " : "⚠️ ¡Maniobra fallida! ";
        } else {
            prefijoTexto += currentLang === "en" ? "✅ Maneuver succeeded! " : "✅ ¡Maniobra exitosa! ";
        }
    }

    if (exito && currentTask.role && roleScores.hasOwnProperty(currentTask.role)) {
        roleScores[currentTask.role]++;
    }

    aplicarEfectosYMostrarColores(efectosAAplicar, prefijoTexto);

    if (currentTask.specialMechanic === "STRANDED_2_TURNS") {
        strandedTurnsRemaining = currentTask.strandedTurns || 2;
        strandedCardRef = currentTask;
    }

    actualizarBarrasEnPantalla();
    siguienteTurno();
}

function aplicarEfectosYMostrarColores(effects, prefijo = "") {
    const t = uiTranslations[currentLang];
    const nombres = {
        energia: `⚡ ${t.energia}`,
        vida: `❤️ ${t.vida}`,
        blindaje: `🛡️ ${t.blindaje}`,
        progreso: `🚀 ${t.progreso}`
    };
    let partesFeedback = [];

    for (let key in effects) {
        if (stats.hasOwnProperty(key)) {
            let valor = effects[key];
            if (valor === 0) continue;

            if (selectedLevel === "1" && key === "progreso" && valor < 0) {
                continue;
            }

            if (valor < 0 && key !== "progreso") {
                valor = Math.round(valor * currentLevelMultiplier);
            }

            stats[key] += valor;

            const maxVal = (key === "vida" && selectedRole === "Médico / Biólogo") ||
                           (key === "blindaje" && selectedRole === "Ingeniero Mecánico") ? 120 : 100;

            if (stats[key] > maxVal) stats[key] = maxVal;
            if (stats[key] < 0) stats[key] = 0;

            const barEl = document.getElementById(`bar-${key}`);
            if (valor > 0) {
                partesFeedback.push(`<span class="txt-good">${nombres[key]} +${valor}%</span>`);
                if (barEl) {
                    barEl.classList.add("flash-green");
                    setTimeout(() => barEl.classList.remove("flash-green"), 700);
                }
            } else {
                partesFeedback.push(`<span class="txt-bad">${nombres[key]} ${valor}%</span>`);
                if (barEl) {
                    barEl.classList.add("flash-red");
                    setTimeout(() => barEl.classList.remove("flash-red"), 700);
                }
            }
        }
    }

    const fbBanner = document.getElementById("feedback-banner");
    if (partesFeedback.length > 0 || prefijo !== "") {
        fbBanner.style.display = "block";
        fbBanner.innerHTML = `${prefijo}${partesFeedback.join(" • ")}`;
    }
}

function manejarTurnoVarado() {
    const banner = document.getElementById("event-banner");
    banner.style.display = "block";
    banner.innerText = currentLang === "en"
        ? `⏳ STRANDED ON MARS: Waiting for MAVEN satellite (${strandedTurnsRemaining} turns left)...`
        : `⏳ VARADO EN MARTE: Esperando satélite MAVEN (Quedan ${strandedTurnsRemaining} turnos)...`;

    const divPregunta = document.getElementById("div-pregunta");
    const divOpcion1 = document.getElementById("div-opcion1");
    const divOpcion2 = document.getElementById("div-opcion2");
    document.getElementById("btn-hint").style.display = "none";
    document.getElementById("hint-text").style.display = "none";

    divPregunta.innerHTML = currentLang === "en"
        ? `<strong style="font-size: 1.2rem; color: #fbbf24;">🛰️ Waiting for rescue signal...</strong><br><br>You are sheltering inside the lander while waiting for the orbiter relay. Crew oxygen and food deplete automatically.`
        : `<strong style="font-size: 1.2rem; color: #fbbf24;">🛰️ Esperando señal de rescate...</strong><br><br>Estás refugiado esperando que pase el satélite orbital. Mientras tanto se consume oxígeno y comida automáticamente.`;

    const efectoTurno = (strandedCardRef && strandedCardRef.perTurnEffect) || { energia: -5, vida: -10, blindaje: 0, progreso: 0 };
    divOpcion1.style.display = "flex";
    divOpcion2.style.display = "none";
    divOpcion1.innerHTML = renderizarContenidoOpcion({
        label_en: "Endure this turn",
        label: "Aguantar este turno",
        effects: efectoTurno
    });

    divOpcion1.onclick = () => {
        aplicarEfectosYMostrarColores(efectoTurno);
        strandedTurnsRemaining--;
        actualizarBarrasEnPantalla();
        siguienteTurno();
    };
}

function mostrarEventoSuperAyuda() {
    SoundFX.playParty();
    const container = document.getElementById("game-screen");
    container.classList.add("superayuda-card");

    document.getElementById("btn-hint").style.display = "none";
    document.getElementById("hint-text").style.display = "none";

    document.getElementById("div-pregunta").innerHTML = currentLang === "en"
        ? `<strong style="font-size: 1.35rem; color: #facc15;">🦸‍♂️ SUPERAYUDA TO THE RESCUE!</strong><br><br>"Sombreritus, chucu-chucu-chucu!" SuperAyuda flew to your spacecraft to help! Which system do you want to recharge <span class="txt-good">+25%</span>?`
        : `<strong style="font-size: 1.35rem; color: #facc15;">🦸‍♂️ ¡APARECIÓ SUPERAYUDA AL RESCATE!</strong><br><br>"¡Sombreritus, chucu-chucu-chucu!" SuperAyuda llegó volando hasta tu nave para darte una mano. ¿Qué sistema querés recargar <span class="txt-good">+25%</span>?`;

    const divOpcion1 = document.getElementById("div-opcion1");
    const divOpcion2 = document.getElementById("div-opcion2");

    const recursos = [
        { key: "energia", label_en: "⚡ Recharge Energy", label: "⚡ Recargar Energía", val: stats.energia },
        { key: "vida", label_en: "❤️ Restore Health", label: "❤️ Curar Vida", val: stats.vida },
        { key: "blindaje", label_en: "🛡️ Repair Shield", label: "🛡️ Reparar Blindaje", val: stats.blindaje }
    ].sort((a, b) => a.val - b.val);

    const ef1 = { energia: 0, vida: 0, blindaje: 0, progreso: 0 };
    ef1[recursos[0].key] = 25;

    const ef2 = { energia: 0, vida: 0, blindaje: 0, progreso: 0 };
    ef2[recursos[1].key] = 25;

    divOpcion1.style.display = "flex";
    divOpcion2.style.display = "flex";
    divOpcion1.innerHTML = renderizarContenidoOpcion({ label_en: recursos[0].label_en, label: recursos[0].label, effects: ef1 });
    divOpcion2.innerHTML = renderizarContenidoOpcion({ label_en: recursos[1].label_en, label: recursos[1].label, effects: ef2 });

    divOpcion1.onclick = () => {
        aplicarEfectosYMostrarColores(ef1, "🦸‍♂️ SuperAyuda: ");
        actualizarBarrasEnPantalla();
        siguienteTurno();
    };

    divOpcion2.onclick = () => {
        aplicarEfectosYMostrarColores(ef2, "🦸‍♂️ SuperAyuda: ");
        actualizarBarrasEnPantalla();
        siguienteTurno();
    };
}

function aplicarEventoAleatorioSorpresa(banner) {
    const lowThreshold = selectedLevel === "1" ? 45 : 35;

    if (stats.energia > 80 && stats.vida > 80 && stats.blindaje > 80 && selectedLevel !== "1") {
        const drain = Math.round(10 * currentLevelMultiplier);
        stats.energia = Math.max(0, stats.energia - drain);
        SoundFX.playBadEvent();
        banner.style.display = "block";
        banner.innerHTML = currentLang === "en"
            ? `⚡ Random Event: Antenna power surge drained <span class="txt-bad">-${drain}% Energy</span>.`
            : `⚡ Evento Aleatorio: Pico de consumo en las antenas gastó <span class="txt-bad">-${drain}% Energía</span>.`;
    } else if (stats.energia < lowThreshold || stats.vida < lowThreshold || stats.blindaje < lowThreshold) {
        stats.energia = Math.min(100, stats.energia + 10);
        stats.vida = Math.min(100, stats.vida + 10);
        SoundFX.playGoodEvent();
        banner.style.display = "block";
        banner.innerHTML = currentLang === "en"
            ? `🎁 Houston Support: Remote optimization restored <span class="txt-good">+10% Energy</span> & <span class="txt-good">+10% Health</span>.`
            : `🎁 Ayuda de Houston: Optimización remota recuperó <span class="txt-good">+10% Energía</span> y <span class="txt-good">+10% Vida</span>.`;
    }
    actualizarBarrasEnPantalla();
}

function actualizarBarrasEnPantalla() {
    const map = [
        { id: "val-energia", val: stats.energia },
        { id: "val-vida", val: stats.vida },
        { id: "val-blindaje", val: stats.blindaje },
        { id: "val-progreso", val: stats.progreso }
    ];

    map.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.innerText = Math.round(item.val);
            if (item.id !== "val-progreso" && item.val <= 25) {
                el.parentElement.classList.add("critica");
            } else {
                el.parentElement.classList.remove("critica");
            }
        }
    });
}

function calcularPerfilAstronauta() {
    let mejorRol = selectedRole;
    let maxPuntos = -1;
    for (let rol in roleScores) {
        if (roleScores[rol] > maxPuntos) {
            maxPuntos = roleScores[rol];
            mejorRol = rol;
        }
    }
    return mejorRol;
}

function mostrarFinal(victoria) {
    detenerTemporizador();
    const t = uiTranslations[currentLang];
    const perfil = calcularPerfilAstronauta();
    const divPregunta = document.getElementById("div-pregunta");
    const divOpcion1 = document.getElementById("div-opcion1");
    const divOpcion2 = document.getElementById("div-opcion2");
    document.getElementById("btn-hint").style.display = "none";
    document.getElementById("hint-text").style.display = "none";
    document.getElementById("feedback-banner").style.display = "none";

    if (victoria) {
        SoundFX.playVictory();
        const lvlNum = parseInt(selectedLevel);
        if (lvlNum < 3 && maxUnlockedLevel <= lvlNum) {
            maxUnlockedLevel = lvlNum + 1;
            localStorage.setItem("nasa_unlocked_level", maxUnlockedLevel);
            actualizarCandadosNiveles();
        }

        divPregunta.innerHTML = `
            <h2 style="color: #4ade80; margin-bottom: 12px;">${t.winTitle}</h2>
            <p>${t.winDesc.replace("{turns}", turnCount)}</p><br>
            <div style="background: rgba(56, 189, 248, 0.15); padding: 14px; border-radius: 10px; border: 1px solid #38bdf8;">
                <strong>${t.profileLabel}</strong><br>
                ${t.profileText} <strong>${perfil}</strong>.
            </div>
        `;
    } else {
        SoundFX.playMissionFailed();
        const consejo = lossAdviceDict[lastStatDropped] ? lossAdviceDict[lastStatDropped][currentLang] : "";
        const causaCarta = currentTask ? `<br><br><em style="font-size:0.88rem; color:#cbd5e1;">(${currentLang === "en" ? "Last crisis" : "Última crisis"}: ${getLocalizedText(currentTask, "title")} — ${getLocalizedText(currentTask, "hint")})</em>` : "";

        divPregunta.innerHTML = `
            <h2 style="color: #f87171; margin-bottom: 12px;">${t.loseTitle}</h2>
            <p>${t.loseDesc.replace("{turns}", turnCount)}</p><br>
            <div style="background: rgba(239, 68, 68, 0.15); padding: 14px; border-radius: 10px; border: 1px solid #f87171; margin-bottom: 12px;">
                <strong>${t.adviceHeader}</strong><br>
                ${consejo}${causaCarta}
            </div>
            <div style="background: rgba(168, 85, 247, 0.15); padding: 12px; border-radius: 10px; border: 1px solid #a855f7;">
                <strong>${t.profileLabel}</strong> ${perfil}
            </div>
        `;
    }

    divOpcion1.style.display = "flex";
    divOpcion2.style.display = "none";
    divOpcion1.innerText = t.btnPlayAgain;
    divOpcion1.onclick = () => {
        document.getElementById("game-screen").style.display = "none";
        document.getElementById("setup-screen").style.display = "block";
    };
}