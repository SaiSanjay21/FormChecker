// Define webkitAudioContext interface for Safari support
interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: {
    new (): AudioContext;
  };
}

// Audio context for sound generation
let audioContext: AudioContext | null = null;

// Create an audio context when needed
function getAudioContext(): AudioContext {
  if (!audioContext) {
    const windowWithWebkit = window as WindowWithWebkitAudioContext;
    audioContext = new (window.AudioContext || windowWithWebkit.webkitAudioContext || AudioContext)();
  }
  return audioContext;
}

// Generator for a simple feedback beep sound
export function playFeedbackSound(type: 'error' | 'success' = 'error'): void {
  try {
    const context = getAudioContext();

    // Create an oscillator
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    // Configure the oscillator based on the feedback type
    if (type === 'error') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.2, context.currentTime); // Lower volume for the beep

      // Set duration and fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

      // Connect and start
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    } else if (type === 'success') {
      // Higher pitch for success sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, context.currentTime); // E5 note
      gainNode.gain.setValueAtTime(0.1, context.currentTime);

      // Set duration and fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

      // Connect and start
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.3);
    }
  } catch (error) {
    console.error('Error playing feedback sound:', error);
  }
}

// Throttle the sound to avoid too frequent sounds
let lastSoundTime = 0;
const SOUND_THROTTLE_MS = 2000; // Only play a sound every 2 seconds

export function playThrottledFeedbackSound(type: 'error' | 'success' = 'error'): void {
  const now = Date.now();
  if (now - lastSoundTime > SOUND_THROTTLE_MS) {
    playFeedbackSound(type);
    lastSoundTime = now;
  }
}
