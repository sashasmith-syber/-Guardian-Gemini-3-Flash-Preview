import { describe, expect, it, beforeEach } from 'vitest';
import { sound } from './soundEffects';

describe('SoundController mute', () => {
  beforeEach(() => {
    sound.setMuted(false);
  });

  it('tracks mute state', () => {
    expect(sound.getMuted()).toBe(false);
    sound.setMuted(true);
    expect(sound.getMuted()).toBe(true);
    sound.setMuted(false);
    expect(sound.getMuted()).toBe(false);
  });

  it('does not throw when muted and cues are fired', () => {
    sound.setMuted(true);
    expect(() => {
      sound.playTacticalPing();
      sound.playCriticalAlert();
      sound.playMitigationTrigger();
      sound.playKeypressBlip();
      sound.speakLocal('OPERATOR test vocalization');
    }).not.toThrow();
  });
});
