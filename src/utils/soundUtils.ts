/**
 * Sound utility functions for playing notification sounds
 */

class SoundManager {
  private static instance: SoundManager;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  private constructor() {}

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Preload a sound file
   */
  public preloadSound(soundPath: string, key: string): void {
    if (!this.audioCache.has(key)) {
      const audio = new Audio(soundPath);
      audio.preload = 'auto';
      this.audioCache.set(key, audio);
    }
  }

  /**
   * Play a sound
   */
  public async playSound(soundPath: string, key: string = soundPath): Promise<void> {
    try {
      let audio = this.audioCache.get(key);
      
      if (!audio) {
        audio = new Audio(soundPath);
        this.audioCache.set(key, audio);
      }

      // Reset the audio to start from beginning
      audio.currentTime = 0;
      
      // Play the sound
      await audio.play();
    } catch (error) {
      console.warn('Failed to play sound:', error);
      // Fail silently to not disrupt user experience
    }
  }

  /**
   * Set volume for all sounds (0.0 to 1.0)
   */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audioCache.forEach(audio => {
      audio.volume = clampedVolume;
    });
  }
}

// Export singleton instance
export const soundManager = SoundManager.getInstance();

// Convenience functions
export const playNotificationSound = () => {
  soundManager.playSound('/sounds/notification.mp3', 'notification');
};

export const preloadNotificationSound = () => {
  soundManager.preloadSound('/sounds/notification.mp3', 'notification');
};

// Initialize and preload common sounds
export const initializeSounds = () => {
  preloadNotificationSound();
  // Set default volume to 70%
  soundManager.setVolume(0.7);
};

