/**
 * Cross-platform haptic feedback helper
 */
class HapticsService {
  private enabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('begi_haptics_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('begi_haptics_enabled', String(val));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public triggerLight() {
    if (!this.enabled || typeof window === 'undefined' || !window.navigator.vibrate) return;
    try {
      window.navigator.vibrate(15);
    } catch {
      // ignore
    }
  }

  public triggerMedium() {
    if (!this.enabled || typeof window === 'undefined' || !window.navigator.vibrate) return;
    try {
      window.navigator.vibrate(40);
    } catch {
      // ignore
    }
  }

  public triggerDanger() {
    if (!this.enabled || typeof window === 'undefined' || !window.navigator.vibrate) return;
    try {
      window.navigator.vibrate([60, 40, 80]);
    } catch {
      // ignore
    }
  }
}

export const haptics = new HapticsService();
