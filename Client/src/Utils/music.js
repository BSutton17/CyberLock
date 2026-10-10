// Background music with a volume that works everywhere. iPhones and iPads ignore an audio
// element's `volume` (it's always full), so the music goes through a Web Audio gain node instead,
// which every browser honors. Without Web Audio (old browsers, tests) it falls back to `volume`.

let audioContext = null;

function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
    if (!AudioContextClass) return null;
    try {
        audioContext = new AudioContextClass();
    } catch {
        return null;
    }
    // Browsers start audio suspended until the player touches the page.
    const resume = () => {
        if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    };
    for (const event of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(event, resume, { passive: true });
    return audioContext;
}

/** A looping track. `setVolume(level, muted)` takes 0-1. */
export function createMusic(src) {
    const audio = new Audio(src);
    audio.loop = true;
    let gain = null;
    let level = 1;
    let muted = false;

    const apply = () => {
        audio.muted = muted;
        if (gain) {
            audio.volume = 1;
            gain.gain.value = muted ? 0 : level;
        } else {
            audio.volume = Math.min(1, Math.max(0, level));
        }
    };

    // Hook the element up to the gain node the first time it plays (an element can only be
    // connected once).
    const connect = () => {
        if (gain) return;
        const context = getAudioContext();
        if (!context) return;
        try {
            const source = context.createMediaElementSource(audio);
            gain = context.createGain();
            source.connect(gain);
            gain.connect(context.destination);
            apply();
        } catch {
            gain = null;
        }
    };

    return {
        audio,
        play() {
            connect();
            if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
            return audio.play();
        },
        pause() {
            audio.pause();
        },
        stop() {
            audio.pause();
            audio.currentTime = 0;
        },
        setVolume(nextLevel, nextMuted = false) {
            level = Math.min(1, Math.max(0, Number(nextLevel) || 0));
            muted = !!nextMuted;
            apply();
        }
    };
}
