import { create } from 'zustand';
import axios from 'axios';

export const teachers = ["Ava", "Andrew"];

export const useAvatarTeacher = create((set, get) => ({
  messages: [],
  currentMessage: null,
  teacher: teachers[0],
  isPlaying: false,
  avatarState: 'idle', // State to manage avatar animation
  isComplete: false, // New boolean variable
  learningLevel: "", // New string variable
  setTeacher: (teacher) => {
    set((state) => ({
      teacher,
      messages: state.messages.map((message) => ({
        ...message,
        audioPlayer: null
      })),
    }));
  },
  classroom: "default",
  setClassroom: (classroom) => {
    set(() => ({
      classroom,
    }));
  },
  setLearningLevel: (level) => {
    set(() => ({
      learningLevel: level, // Update learningLevel
    }));
  },
  setIsComplete: (completeStatus) => {
    set(() => ({
      isComplete: completeStatus, // Update isComplete
    }));
  },
  loading: false,
  speech: "formal",
  setSpeech: (speech) => {
    set(() => ({
      speech,
    }));
  },
  lectureContent: null,
  subtopics: [],
  currentTopicIndex: 0,

  playLecturePart: async (text) => {
    const state = get();
    const message = {
      id: state.messages.length,
      answer: text,
    };
    await state.playMessage(message);
    set({ isPlaying: true, avatarState: 'talking' });
  },

  pauseLecture: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.pause();
      set({ isPlaying: false, avatarState: 'idle' });
    }
  },

  stopLecture: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.pause();
      currentMessage.audioPlayer.currentTime = 0; // Reset the audio
    }
    set({
      isPlaying: false,
      avatarState: 'idle',
      currentMessage: null, // Clear the current message
    });
  },

  resumeLecture: () => {
    const currentMessage = get().currentMessage;
    if (currentMessage && currentMessage.audioPlayer) {
      currentMessage.audioPlayer.play();
      set({ isPlaying: true, avatarState: 'talking' });
    }
  },

  playMessage: async (message) => {
    const currentTeacher = get().teacher;
    set(() => ({
      currentMessage: message,
      avatarState: 'talking',
    }));

    if (!message.audioPlayer) {
      set(() => ({
        loading: true,
      }));
      try {
        const audioRes = await axios.post('http://localhost:3000/api/avatar-tts/generate', {
          teacher: currentTeacher,
          text: message.answer
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = audioRes.data;
        const audioBase64 = data.audioBase64;
        const visemes = data.visemes;

        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        const audioPlayer = new Audio(audioUrl);

        message.visemes = visemes;
        message.audioPlayer = audioPlayer;
        message.audioPlayer.onended = () => {
          set(() => ({
            currentMessage: null,
            isPlaying: false,
            avatarState: 'idle',
          }));
        };
        set((state) => ({
          loading: false,
          messages: state.messages.map((m) => {
            if (m.id === message.id) {
              return { ...message };
            }
            return m;
          }),
        }));
      } catch (error) {
        console.error('Error fetching audio data:', error);
        set(() => ({
          loading: false,
        }));
      }
    }

    message.audioPlayer.currentTime = 0;
    message.audioPlayer.play();
    set({ isPlaying: true, avatarState: 'talking' });
  },
}));