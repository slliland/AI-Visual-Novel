class MusicManager {
  private static instance: MusicManager;
  private audio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.3; // Default volume (30%)

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  initialize() {
    if (typeof window !== 'undefined' && !this.audio) {
      this.audio = new Audio('/Wav Two - Sakura.mp3');
      this.audio.loop = true;
      this.audio.volume = this.volume;
      this.audio.preload = 'auto'; // Preload for faster startup
      
      // Load saved preferences from localStorage
      const savedMuted = localStorage.getItem('music-muted');
      const savedVolume = localStorage.getItem('music-volume');
      
      if (savedMuted !== null) {
        this.isMuted = savedMuted === 'true';
      }
      
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
        this.audio.volume = this.volume;
      }
      
      // Apply muted state
      this.audio.muted = this.isMuted;
      
      console.log('🎵 Music manager initialized');
    }
  }

  async play() {
    if (!this.audio) {
      this.initialize();
    }
    
    if (this.audio && !this.isMuted) {
      try {
        await this.audio.play();
        console.log('🎵 Background music started');
      } catch (error) {
        console.log('🎵 Could not auto-play music (user interaction required):', error);
      }
    }
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
      console.log('🎵 Background music paused');
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.muted = muted;
    }
    
    // Save to localStorage
    localStorage.setItem('music-muted', muted.toString());
    
    if (muted) {
      this.pause();
    } else {
      this.play();
    }
    
    console.log('🎵 Music muted:', muted);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    
    // Save to localStorage
    localStorage.setItem('music-volume', this.volume.toString());
    
    console.log('🎵 Music volume set to:', this.volume);
  }

  isMusicMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.volume;
  }

  // Method to handle user interaction requirement for autoplay
  async handleUserInteraction() {
    if (!this.isMuted && this.audio && this.audio.paused) {
      try {
        await this.audio.play();
        console.log('🎵 Music started after user interaction');
      } catch (error) {
        console.log('🎵 Failed to start music:', error);
      }
    }
  }
}

export const musicManager = MusicManager.getInstance();
