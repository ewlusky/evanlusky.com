/**
 * Shared audio preferences: two flags in the registry, mirrored to
 * localStorage so a visitor's choice survives a reload.
 *
 * Music never starts by itself. The first deliberate game input (a movement
 * key, a click on the canvas, an action key) grants consent, and only then do
 * the scene themes come up. The floating HUD toggles are the off switch.
 */
export interface AudioPrefs {
  music: boolean;
  sfx: boolean;
}

const STORAGE_KEY = 'ewl-audio-prefs';

/** Registry keys shared by every scene. */
export const REG_MUSIC_ON = 'audio-music-on';
export const REG_SFX_ON = 'audio-sfx-on';
export const REG_MUSIC_CONSENT = 'audio-consent';

export function loadAudioPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
      return { music: parsed.music !== false, sfx: parsed.sfx !== false };
    }
  } catch {
    // Private browsing or blocked storage: fall through to the defaults.
  }
  return { music: true, sfx: true };
}

export function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Nothing to do; the toggles still work for this visit.
  }
}
