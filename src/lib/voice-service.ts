export class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis = window.speechSynthesis;
  private silenceTimer: any = null;
  private onTranscriptUpdate: (text: string) => void = () => {};
  private onStateChange: (isRecording: boolean) => void = () => {};
  private onError: (error: string) => void = () => {};
  private isRecording: boolean = false;
  private speechEnabled: boolean;

  constructor() {
    this.speechEnabled = localStorage.getItem('ai_speech_enabled') !== 'false';
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript) {
           this.onTranscriptUpdate(transcript);
        }

        this.resetSilenceTimer();
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.stopListening();
        
        if (event.error === 'not-allowed') {
          this.onError('Microphone permission denied.');
        } else if (event.error === 'no-speech') {
          // ignore no speech
        } else {
          this.onError(`Microphone error: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.setIsRecording(false);
      };
    }
  }

  setCallbacks(
    onTranscript: (t: string) => void,
    onState: (isRec: boolean) => void,
    onError: (err: string) => void
  ) {
    this.onTranscriptUpdate = onTranscript;
    this.onStateChange = onState;
    this.onError = onError;
  }

  toggleMute(muted: boolean) {
    this.speechEnabled = !muted;
    localStorage.setItem('ai_speech_enabled', this.speechEnabled.toString());
    if (muted) {
      this.stopListening();
      this.stopSpeaking();
    }
  }

  isSpeechEnabled() {
    return this.speechEnabled;
  }

  private setIsRecording(state: boolean) {
    this.isRecording = state;
    this.onStateChange(state);
    if (!state && this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.stopListening();
    }, 2000); // 2 seconds of silence -> stop
  }

  startListening() {
    if (!this.recognition) {
       this.onError('Microphone/Speech Recognition not supported in this browser.');
       return;
    }
    if (!this.speechEnabled) return;
    
    try {
      this.recognition.start();
      this.setIsRecording(true);
      this.resetSilenceTimer();
    } catch (e) {
      console.warn('Failed to start recognition', e);
      // Might already be started
    }
  }

  stopListening() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
      this.setIsRecording(false);
    }
  }

  toggleListening() {
    if (this.isRecording) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  speak(text: string, onStart?: () => void, onEnd?: () => void) {
    if (!this.speechEnabled || !this.synthesis) return;

    this.synthesis.cancel(); // Stop anything currently playing

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find Edge natural voices first, then Google, then fallback to English
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Microsoft') && v.name.includes('Online (Natural)')) ||
                           voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) ||
                           voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.(); // Stop animation on error too

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
       this.synthesis.cancel();
    }
  }
}

export const voiceService = new VoiceService();
