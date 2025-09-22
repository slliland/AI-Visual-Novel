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
      
      // Mobile-specific audio settings
      this.audio.crossOrigin = 'anonymous';
      this.audio.setAttribute('playsinline', 'true'); // Important for iOS
      
      // Load saved preferences from localStorage, default to enabled if not set
      const savedMuted = localStorage.getItem('music-muted');
      const savedVolume = localStorage.getItem('music-volume');
      
      // Default to not muted (enabled) if no saved preference
      if (savedMuted !== null) {
        this.isMuted = savedMuted === 'true';
      } else {
        this.isMuted = false; // Default to enabled
        localStorage.setItem('music-muted', 'false');
      }
      
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
        this.audio.volume = this.volume;
      } else {
        // Volume is already set to 0.3 in constructor, just save it
        localStorage.setItem('music-volume', this.volume.toString());
      }
      
      // Apply muted state
      this.audio.muted = this.isMuted;
      
      // Add error handling for mobile
      this.audio.addEventListener('error', (e) => {
        console.error('🎵 Audio error:', e);
      });
      
      this.audio.addEventListener('canplaythrough', () => {
        console.log('🎵 Audio ready to play');
      });
      
      console.log('🎵 Music manager initialized');
    }
  }

  async play() {
    if (!this.audio) {
      this.initialize();
    }
    
    if (this.audio && !this.isMuted) {
      try {
        // Ensure audio is loaded before playing
        if (this.audio.readyState < 2) {
          await this.audio.load();
        }
        
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🎵 Background music started');
        }
      } catch (error) {
        console.log('🎵 Could not auto-play music (user interaction required):', error);
        // On mobile, we might need to wait for user interaction
        return false;
      }
    }
    return true;
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('music-muted', muted.toString());
    }
    
    if (muted) {
      this.pause();
    } else {
      // On mobile, try to play but don't fail if it doesn't work
      this.play().catch(() => {
        console.log('🎵 Music will start after user interaction');
      });
    }
    
    console.log('🎵 Music muted:', muted);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('music-volume', this.volume.toString());
    }
    
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
