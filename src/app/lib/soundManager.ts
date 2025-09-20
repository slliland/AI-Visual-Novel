// Simple sound manager for typing effects and UI interactions
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private isEnabled = false;

  constructor() {
    // Initialize audio context only in browser environment
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.isEnabled = true;
      } catch (error) {
        console.warn('Audio context not supported:', error);
        this.isEnabled = false;
      }
    }
  }

  /**
   * Play a typing sound effect
   */
  playTypingSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      // Create a simple beep sound for typing
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure the sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.type = 'sine';

      // Quick fade in/out for a subtle click
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.05);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.05);
    } catch (error) {
      console.warn('Error playing typing sound:', error);
    }
  }

  /**
   * Play a choice selection sound
   */
  playChoiceSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Higher pitch for choices
      oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Error playing choice sound:', error);
    }
  }

  /**
   * Play a subtle transition sound
   */
  playTransitionSound(): void {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Soft transition sound
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 0.3);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Error playing transition sound:', error);
    }
  }

  /**
   * Enable or disable sound effects
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled && !!this.audioContext;
  }

  /**
   * Check if sound is enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled && !!this.audioContext;
  }
}

// Global sound manager instance
export const soundManager = new SoundManager();
