// store/useAvatarStore.js
import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAvatarStore = create((set, get) => ({
  // State
  messages: [],
  currentMessage: null,
  teacher: 'Ava',
  isPlaying: false,
  avatarState: 'idle', // 'idle', 'talking', 'thinking'
  loading: false,
  error: null,

  // Available teachers
  availableTeachers: ['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny'],

  // Actions
  setTeacher: (teacher) => {
    set(() => ({
      teacher,
      messages: get().messages.map((message) => {
        message.audioPlayer = null; // Reset audio players when changing teacher
        return message;
      }),
    }));
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Play a specific message with avatar lip sync
  playMessage: async (message) => {
    const state = get();

    set(() => ({
      currentMessage: message,
      avatarState: 'talking',
      isPlaying: true,
      loading: false,
    }));

    // If audio player doesn't exist, generate TTS
    if (!message.audioPlayer) {
      set(() => ({ loading: true }));

      try {
        const response = await axios.post(`${API_BASE_URL}/avatar-tts/generate`, {
          teacher: state.teacher,
          text: message.text
        });

        const data = response.data.data;
        const audioBase64 = data.audioBase64;
        const visemes = data.visemes;

        // Create audio player
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        const audioPlayer = new Audio(audioUrl);

        // Store viseme data and audio player in message
        message.visemes = visemes;
        message.audioPlayer = audioPlayer;
        message.duration = data.duration;

        // Setup audio event listeners
        audioPlayer.onended = () => {
          set(() => ({
            currentMessage: null,
            isPlaying: false,
            avatarState: 'idle',
          }));
        };

        audioPlayer.onerror = (error) => {
          console.error('Audio playback error:', error);
          set(() => ({
            currentMessage: null,
            isPlaying: false,
            avatarState: 'idle',
            error: 'Audio playback failed'
          }));
        };

        // Update messages array
        set(() => ({
          loading: false,
          messages: state.messages.map((m) => {
            if (m.id === message.id) {
              return message;
            }
            return m;
          }),
        }));

      } catch (error) {
        console.error('Error generating TTS:', error);
        set(() => ({
          loading: false,
          error: 'Failed to generate speech. Please check your connection.',
          currentMessage: null,
          isPlaying: false,
          avatarState: 'idle',
        }));
        return;
      }
    }

    // Play the audio
    try {
      message.audioPlayer.currentTime = 0;
      await message.audioPlayer.play();
      set({ isPlaying: true, avatarState: 'talking' });
    } catch (error) {
      console.error('Error playing audio:', error);
      set(() => ({
        error: 'Failed to play audio',
        currentMessage: null,
        isPlaying: false,
        avatarState: 'idle',
      }));
    }
  },

  // Play educational script for micro-video
  playEducationalScript: async (educationalScript, microVideoId) => {
    const message = {
      id: `micro_${microVideoId}`,
      text: educationalScript,
      microVideoId,
      type: 'educational'
    };

    await get().playMessage(message);
  },

  // Control functions
  pauseAudio: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.pause();
      set({ isPlaying: false, avatarState: 'idle' });
    }
  },

  resumeAudio: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.play();
      set({ isPlaying: true, avatarState: 'talking' });
    }
  },

  stopAudio: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.pause();
      currentMessage.audioPlayer.currentTime = 0;
    }
    set({
      isPlaying: false,
      avatarState: 'idle',
      currentMessage: null,
    });
  },

  // Generate avatar video for micro-video segment
  generateAvatarVideo: async (microVideoId, options = {}) => {
    set({ loading: true, error: null });

    try {
      const response = await axios.post(
        `${API_BASE_URL}/avatar-videos/micro-video/${microVideoId}`,
        {
          teacher: options.teacher || get().teacher,
          options: {
            speechRate: options.speechRate || 0.9,
            resolution: options.resolution || '1280x720'
          }
        }
      );

      set({ loading: false });
      return response.data;

    } catch (error) {
      console.error('Error generating avatar video:', error);
      set({
        loading: false,
        error: 'Failed to generate avatar video'
      });
      throw error;
    }
  },

  // Test avatar functionality
  testAvatar: async (testText) => {
    const message = {
      id: `test_${Date.now()}`,
      text: testText || "Hello! This is a test of the avatar lip synchronization system.",
      type: 'test'
    };

    await get().playMessage(message);
  },

  // Get avatar status for micro-video
  getAvatarStatus: async (microVideoId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/avatar-videos/status/${microVideoId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting avatar status:', error);
      throw error;
    }
  },

  // Clear all messages
  clearMessages: () => {
    const state = get();

    // Stop current audio
    if (state.currentMessage && state.currentMessage.audioPlayer) {
      state.currentMessage.audioPlayer.pause();
    }

    set({
      messages: [],
      currentMessage: null,
      isPlaying: false,
      avatarState: 'idle',
    });
  },

  // Add message to queue
  addMessage: (text, type = 'text') => {
    const message = {
      id: `msg_${Date.now()}`,
      text,
      type,
      createdAt: new Date()
    };

    set((state) => ({
      messages: [...state.messages, message]
    }));

    return message;
  },
}));