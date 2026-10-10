// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
    vi.resetModules();
    delete window.AudioContext;
});

describe('createMusic', () => {
    it('sets the element volume when Web Audio is missing', async () => {
        const { createMusic } = await import('./music');
        const music = createMusic('/audio/Title.mp3');
        music.setVolume(0.4, false);
        expect(music.audio.volume).toBeCloseTo(0.4);
        expect(music.audio.loop).toBe(true);
        music.setVolume(0.9, true);
        expect(music.audio.muted).toBe(true);
    });

    it('turns the volume down through a gain node, which phones honor', async () => {
        const gain = { gain: { value: 1 }, connect: vi.fn() };
        const context = {
            state: 'running',
            destination: {},
            resume: vi.fn(() => Promise.resolve()),
            createGain: vi.fn(() => gain),
            createMediaElementSource: vi.fn(() => ({ connect: vi.fn() }))
        };
        window.AudioContext = class { constructor() { return context; } };
        window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
        const { createMusic } = await import('./music');

        const music = createMusic('/audio/BattleMusic.mp3');
        music.setVolume(0.3, false);
        await music.play();
        expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
        expect(gain.gain.value).toBeCloseTo(0.3);
        expect(music.audio.volume).toBe(1);

        music.setVolume(0.6, false);
        expect(gain.gain.value).toBeCloseTo(0.6);
        music.setVolume(0.6, true);
        expect(gain.gain.value).toBe(0);

        await music.play();
        expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
    });
});
