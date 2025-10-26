// src/pages/KeypointPlayer.jsx
// Player for Keypoint-Based Educational Content with Avatar

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Teacher } from "../components/Teacher";
import { useAvatarTeacher } from "../hooks/useAvatarTeacher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Marble Tile Floor Component
function MarbleFloor({ position = [0, -1, 0], scale = 0.1 }) {
  const { scene } = useGLTF("/models/floor_-_marble_tiled_floor.glb");

  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={[scale, scale, scale]}
      receiveShadow
    />
  );
}

// Dynamic 3D Whiteboard Component - Smart Code Display
function Whiteboard({
  content,
  position = [0, 1.2, -2.5],
  scale = [3, 2, 0.1],
}) {
  const meshRef = useRef();
  const [textTexture, setTextTexture] = useState(null);

  useEffect(() => {
    if (!content) return;

    // Create HIGH-RESOLUTION canvas for crisp text rendering
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = 2560;  // Higher resolution
    canvas.height = 1920; // Higher resolution

    // Clear canvas with pure white background
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add crisp dark border
    context.strokeStyle = "#1a1a1a";
    context.lineWidth = 12;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Enhanced code detection (detects all programming languages)
    const isCode = /(\{|\}|\(|\)|;|=>|function|const|let|var|def|class|public|private|import|export|return|if|for|while|\[|\]|System\.|console\.|print\(|SELECT|INSERT)/i.test(content);

    // Configure text rendering for maximum clarity
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.textBaseline = "top";
    context.textAlign = "left";

    const padding = 100;
    const maxWidth = canvas.width - (padding * 2);
    let y = padding;

    if (isCode) {
      // CODE RENDERING: Extra bold, monospace, pure black
      const fontSize = 68;
      const lineHeight = 88;

      context.font = `900 ${fontSize}px "Consolas", "Courier New", monospace`;
      context.fillStyle = "#000000";

      // Add subtle shadow for depth (makes text appear bolder)
      context.shadowColor = "rgba(0, 0, 0, 0.3)";
      context.shadowBlur = 2;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 1;

      const lines = content.split("\n");

      lines.forEach((line) => {
        if (y + lineHeight > canvas.height - padding) return; // Prevent overflow

        if (line.trim()) {
          // Smart word wrapping for code
          const words = line.split(/(\s+)/); // Keep spaces
          let currentLine = "";

          words.forEach((word) => {
            const testLine = currentLine + word;
            const metrics = context.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.trim() !== "") {
              // Render current line with double-rendering for extra boldness
              context.fillText(currentLine.trim(), padding, y);
              context.fillText(currentLine.trim(), padding + 0.5, y); // Extra bold
              y += lineHeight;
              currentLine = "  " + word; // Indent continuation
            } else {
              currentLine = testLine;
            }
          });

          // Render remaining text
          if (currentLine.trim()) {
            context.fillText(currentLine.trim(), padding, y);
            context.fillText(currentLine.trim(), padding + 0.5, y); // Extra bold
            y += lineHeight;
          }
        } else {
          y += lineHeight * 0.5; // Spacing for empty lines
        }
      });

    } else {
      // REGULAR TEXT RENDERING: Extra bold, sans-serif, pure black
      const fontSize = 84;
      const lineHeight = 110;

      context.font = `900 ${fontSize}px "Arial Black", "Arial", sans-serif`;
      context.fillStyle = "#000000";

      // Add shadow for extra boldness
      context.shadowColor = "rgba(0, 0, 0, 0.25)";
      context.shadowBlur = 2;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 1;

      const lines = content.split("\n");

      lines.forEach((line) => {
        if (y + lineHeight > canvas.height - padding) return; // Prevent overflow

        const words = line.split(" ");
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine + word + " ";
          const metrics = context.measureText(testLine);

          if (metrics.width > maxWidth && currentLine !== "") {
            // Render line with double-rendering for maximum boldness
            const trimmed = currentLine.trim();
            context.fillText(trimmed, padding, y);
            context.fillText(trimmed, padding + 0.5, y); // Extra bold
            y += lineHeight;
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        });

        // Render remaining text
        if (currentLine.trim()) {
          context.fillText(currentLine.trim(), padding, y);
          context.fillText(currentLine.trim(), padding + 0.5, y); // Extra bold
          y += lineHeight;
        }
      });
    }

    // Reset shadow
    context.shadowColor = "transparent";
    context.shadowBlur = 0;

    // Create texture from canvas with enhanced settings
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16; // Maximum anisotropic filtering for sharpness

    setTextTexture(texture);
  }, [content]);

  if (!textTexture) return null;

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        map={textTexture}
        color="#ffffff"
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

export default function KeypointPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Whiteboard settings
  const [showWhiteboard, setShowWhiteboard] = useState(true);
  const [whiteboardContent, setWhiteboardContent] = useState(
    "Welcome to MicroLearn"
  );

  // Avatar teacher state - Use local state with Zustand subscription
  const [teacher, setTeacherLocal] = useState(() => useAvatarTeacher.getState().teacher);
  const [avatarState, setAvatarStateLocal] = useState(() => useAvatarTeacher.getState().avatarState);
  const [currentMessage, setCurrentMessageLocal] = useState(() => useAvatarTeacher.getState().currentMessage);

  // Get setTeacher from Zustand
  const setTeacher = useAvatarTeacher.getState().setTeacher;

  // Helper functions to update Zustand state directly
  const setCurrentMessage = useCallback((message) => {
    useAvatarTeacher.setState({ currentMessage: message });
  }, []);

  const setAvatarState = useCallback((state) => {
    useAvatarTeacher.setState({ avatarState: state });
  }, []);

  // Subscribe to store changes for re-renders
  useEffect(() => {
    // Subscribe to teacher changes
    const unsubscribe1 = useAvatarTeacher.subscribe(
      (state) => state.teacher,
      (teacher) => setTeacherLocal(teacher)
    );

    // Subscribe to avatarState changes
    const unsubscribe2 = useAvatarTeacher.subscribe(
      (state) => state.avatarState,
      (state) => setAvatarStateLocal(state)
    );

    // Subscribe to currentMessage changes
    const unsubscribe3 = useAvatarTeacher.subscribe(
      (state) => state.currentMessage,
      (message) => setCurrentMessageLocal(message)
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, []);

  // Audio state
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentCaption, setCurrentCaption] = useState("");
  const [scriptWords, setScriptWords] = useState([]);
  const [whiteboardAutoContent, setWhiteboardAutoContent] = useState("");
  const [codeSegments, setCodeSegments] = useState([]);
  const [whiteboardChangeCounter, setWhiteboardChangeCounter] = useState(0);
  const [whiteboardTimeline, setWhiteboardTimeline] = useState([]); // AI-generated timeline

  // Fetch video data
  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      setAvatarState("idle");
      setCurrentMessage(null);
    };
  }, []);

  // Track whiteboard content changes
  const prevContent = useRef("");
  useEffect(() => {
    const content = whiteboardAutoContent || whiteboardContent;
    if (content && content !== prevContent.current) {
      prevContent.current = content;
      setWhiteboardChangeCounter(prev => prev + 1);
    }
  }, [whiteboardAutoContent, whiteboardContent]);

  const fetchVideoData = async () => {
    try {
      console.log('📥 KeypointPlayer: Loading video data from location.state...');

      // Get data from location.state passed from MicrolearningPage
      const stateData = location.state;

      if (stateData && stateData.microVideos && stateData.microVideos.length > 0) {
        console.log('✅ Found microVideos in location.state:', stateData.microVideos.length);

        // Build video data from location.state
        const videoData = {
          microVideos: stateData.microVideos,
          selectedKeypoints: stateData.selectedKeypoints || [],
          teacher: stateData.teacher || 'Ava',
          videoTitle: stateData.videoTitle || 'Tutorial Video',
          youtubeUrl: stateData.youtubeUrl
        };

        setVideoData(videoData);

        // Set teacher if available
        if (stateData.teacher) {
          setTeacher(stateData.teacher);
        }

        console.log('✅ Video data loaded successfully');
      } else {
        console.error('❌ No microVideos found in location.state');
        toast.error("No video data available. Please generate videos first.");
        navigate("/app/keypoint-learning");
      }
    } catch (error) {
      console.error("Error loading video data:", error);
      toast.error("Failed to load video data");
      navigate("/app/keypoint-learning");
    } finally {
      setLoading(false);
    }
  };

  // Play segment
  const playSegment = async (index) => {
    if (!videoData || !videoData.microVideos[index]) return;

    const segment = videoData.microVideos[index];
    setCurrentSegmentIndex(index);

    // Update whiteboard content with keypoint
    setWhiteboardContent(segment.keypoint);

    try {
      // Generate TTS for this segment
      toast.loading("Generating audio...");

      const token = localStorage.getItem("authToken");
      const response = await axios.post(
        `${API_URL}/avatar-tts/generate`,
        {
          text: segment.educationalScript,
          teacher: segment.teacher || teacher,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.dismiss();

      if (response.data.success) {
        const { audioBase64, visemes } = response.data.data;

        // Stop current audio if playing
        if (audioPlayer) {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        }

        // Create new audio player
        const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        const player = new Audio(audioUrl);

        // Create message object for avatar lip-sync
        const message = {
          id: index,
          answer: segment.educationalScript,
          visemes: visemes,
          audioPlayer: player,
        };

        // Split script into words for dynamic captions
        const words = segment.educationalScript.split(" ");
        setScriptWords(words);

        // Set whiteboard timeline if available from backend
        if (segment.whiteboardTimeline && segment.whiteboardTimeline.length > 0) {
          console.log('📊 Using AI-generated whiteboard timeline:', segment.whiteboardTimeline);
          setWhiteboardTimeline(segment.whiteboardTimeline);
        } else {
          console.log('⚠️ No whiteboard timeline found, using fallback parsing');
          setWhiteboardTimeline([]);
        }

        // ENHANCED: Parse script to find ALL code segments (supports all programming languages)
        // NOTE: This is now a fallback - we prefer the AI-generated whiteboard timeline
        const parseCodeSegments = (script) => {
          const segments = [];
          const fullText = script;

          // Comprehensive patterns for detecting code in ANY programming language
          const patterns = [
            // 1. Markdown code blocks (with or without language tag)
            /```[\w]*\n?([\s\S]*?)```/g,

            // 2. Inline code with backticks
            /`([^`\n]+)`/g,

            // 3. JavaScript/TypeScript patterns
            /\b(const|let|var|function|class|import|export|async|await|return|if|else|for|while|switch|case)\s+[\w\(]/gi,
            /=>|\.map\(|\.filter\(|\.reduce\(|\.forEach\(/g,

            // 4. Python patterns
            /\b(def|class|import|from|if|elif|else|for|while|return|print|range|len)\s+[\w\(]/gi,
            /:\s*\n\s{4,}[\w]/g, // Python indentation

            // 5. Java/C#/C++ patterns
            /\b(public|private|protected|static|void|int|String|class|interface|extends|implements)\s+[\w<]/gi,
            /System\.out\.println|console\.log|Console\.WriteLine/gi,

            // 6. Variable assignments with operators
            /[\w]+\s*[=:]\s*[\[\{\(][\s\S]*?[\]\}\)]/g,
            /[\w]+\s*=\s*["'`][\s\S]*?["'`]/g,
            /[\w]+\s*=\s*\d+/g,

            // 7. Method/function calls
            /[\w]+\.[\w]+\([^)]*\)/g,
            /[\w]+\([^)]*\)\s*{/g,

            // 8. Common operators and syntax
            /\{[\s\S]*?\}/g, // Curly braces blocks
            /\[[\s\S]*?\]/g, // Array syntax
            /\([\s\S]*?\)\s*=>/g, // Arrow functions

            // 9. SQL patterns
            /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE|TABLE)\s+/gi,

            // 10. HTML/XML patterns
            /<[\w]+[^>]*>[\s\S]*?<\/[\w]+>/g,

            // 11. CSS patterns
            /[\w-]+\s*:\s*[\w\d#()%,\s-]+;/g,

            // 12. Semicolon-terminated statements
            /[\w\s\(\)\[\]\{\}=+\-*/]+;/g
          ];

          const foundSegments = new Map();

          patterns.forEach((pattern) => {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);

            while ((match = regex.exec(fullText)) !== null) {
              const codeContent = match[1] || match[0];

              // Skip very short matches (likely false positives)
              if (codeContent.trim().length < 3) continue;

              // Skip plain English sentences (no code indicators)
              if (!/[({}\[\];:=<>]|->|=>|\.\w+\(/.test(codeContent)) {
                // Must have code-like characters
                if (!/\b(function|const|let|var|def|class|public|private|import|if|for|while)\b/i.test(codeContent)) {
                  continue;
                }
              }

              const beforeCode = fullText.substring(0, match.index);
              const wordsBefore = beforeCode.split(/\s+/).filter(w => w.length > 0).length;

              // Calculate code word count
              const codeWordCount = codeContent.split(/\s+/).filter(w => w.length > 0).length;

              // Display 3 words BEFORE first word of code
              const wordsBeforeBuffer = 3;
              // Keep showing until 2 words AFTER last word of code
              const wordsAfterBuffer = 2;

              const key = `${wordsBefore}_${codeContent.substring(0, 20)}`;

              if (!foundSegments.has(key)) {
                foundSegments.set(key, {
                  code: codeContent.trim(),
                  startWordIndex: Math.max(0, wordsBefore - wordsBeforeBuffer),
                  endWordIndex: wordsBefore + codeWordCount + wordsAfterBuffer,
                });
              }
            }
          });

          return Array.from(foundSegments.values());
        };

        const parsedSegments = parseCodeSegments(segment.educationalScript);
        setCodeSegments(parsedSegments);

        player.onloadedmetadata = () => {
          setAudioDuration(player.duration);
        };

        player.ontimeupdate = () => {
          setAudioProgress(player.currentTime);
          const currentTime = player.currentTime;

          // Display captions in chunks of 10 words at a time
          if (currentTime > 0 && words.length > 0) {
            const wordsPerSecond = words.length / player.duration;
            const currentWordIndex = Math.floor(
              currentTime * wordsPerSecond
            );
            const wordsToShow = 10;
            // Calculate which chunk we're in (0, 1, 2, etc.)
            const chunkIndex = Math.floor(currentWordIndex / wordsToShow);
            const startIndex = chunkIndex * wordsToShow;
            const endIndex = Math.min(words.length, startIndex + wordsToShow);
            const captionText = words.slice(startIndex, endIndex).join(" ");
            setCurrentCaption(captionText);

            // PRIORITY 1: Use AI-generated whiteboard timeline if available
            if (segment.whiteboardTimeline && segment.whiteboardTimeline.length > 0) {
              let timelineContent = null;

              // Find the active timeline item for current time
              for (const item of segment.whiteboardTimeline) {
                if (currentTime >= item.timeStart && currentTime <= item.timeEnd) {
                  timelineContent = item.contentText;
                  break;
                }
              }

              // Display timeline content if found, otherwise show keypoint
              if (timelineContent) {
                setWhiteboardAutoContent(timelineContent);
              } else {
                setWhiteboardAutoContent(segment.keypoint);
              }
            } else {
              // FALLBACK: Use old code segment detection if no timeline
              let codeToDisplay = null;

              for (const codeSegment of parsedSegments) {
                // If we're within the range of this code explanation
                if (
                  currentWordIndex >= codeSegment.startWordIndex &&
                  currentWordIndex <= codeSegment.endWordIndex
                ) {
                  codeToDisplay = codeSegment.code;
                  break;
                }
              }

              // Display code on whiteboard if found, otherwise show keypoint
              if (codeToDisplay) {
                setWhiteboardAutoContent(codeToDisplay);
              } else {
                setWhiteboardAutoContent(segment.keypoint);
              }
            }
          }
        };

        player.onended = () => {
          setIsPlaying(false);
          setAudioProgress(0);
          setAvatarState("idle");
          setCurrentMessage(null);
          setCurrentCaption("");
          setWhiteboardAutoContent("");
          setCodeSegments([]);
          setWhiteboardTimeline([]); // Clear timeline

          // Auto-play next segment
          if (index < videoData.microVideos.length - 1) {
            setTimeout(() => playSegment(index + 1), 1000);
          } else {
            toast.success("🎉 Completed all segments!");
          }
        };

        player.onerror = (e) => {
          console.error("Audio error:", e);
          toast.error("Failed to play audio");
          setIsPlaying(false);
          setAvatarState("idle");
        };

        // Set the message with visemes for avatar lip-sync
        setCurrentMessage(message);
        setAvatarState("talking");

        setAudioPlayer(player);
        player.play();
        setIsPlaying(true);
        toast.success(`Playing: ${segment.title}`);
      } else {
        toast.error("Failed to generate audio");
      }
    } catch (error) {
      console.error("Error playing segment:", error);
      toast.error("Failed to play segment");
      setIsPlaying(false);
    }
  };

  // Pause/Resume
  const togglePlayPause = () => {
    if (!audioPlayer) return;

    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
      setAvatarState("idle");
    } else {
      audioPlayer.play();
      setIsPlaying(true);
      setAvatarState("talking");
    }
  };

  // Stop
  const stopPlayback = () => {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setIsPlaying(false);
      setAudioProgress(0);
      setAvatarState("idle");
      setCurrentMessage(null);
      setCurrentCaption("");
      setWhiteboardAutoContent("");
      setCodeSegments([]);
      setWhiteboardTimeline([]); // Clear timeline
    }
  };

  // Seek
  const seekAudio = (e) => {
    if (!audioPlayer) return;
    const seekTime = (e.target.value / 100) * audioDuration;
    audioPlayer.currentTime = seekTime;
    setAudioProgress(seekTime);
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading educational content...</p>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Video not found</p>
          <button
            onClick={() => navigate("/app/keypoint-learning")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }

  const currentSegment = videoData.microVideos[currentSegmentIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{videoData.video.title}</h1>
            <p className="text-gray-400 text-sm">
              {videoData.summary.totalSegments} segments •{" "}
              {videoData.summary.totalWords.toLocaleString()} words •
              {Math.round(videoData.summary.totalDuration / 60)} min
            </p>
          </div>
          <button
            onClick={() => navigate("/app/keypoint-learning")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Avatar Display */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* 3D Avatar Canvas */}
            <div className="relative" style={{ height: "500px" }}>
              <Canvas
                camera={{ position: [0, 1.5, 5], fov: 50 }}
                style={{
                  background: "linear-gradient(to bottom, #1a1a1a, #2d2d2d)",
                }}
              >
                <Suspense fallback={null}>
                  {/* Studio Lighting */}
                  <ambientLight intensity={0.4} />
                  <directionalLight
                    position={[5, 5, 5]}
                    intensity={1.2}
                    castShadow
                  />
                  <directionalLight position={[-5, 3, 2]} intensity={0.5} />
                  <directionalLight position={[0, 3, -5]} intensity={0.3} />
                  <spotLight
                    position={[0, 4, 0]}
                    angle={0.5}
                    penumbra={0.5}
                    intensity={0.8}
                  />

                  {/* Stage/Floor - Marble Tile */}
                  <MarbleFloor position={[-4, -2, 4]} scale={0.009} />

                  {/* Avatar Teacher - Front Center */}
                  <Teacher
                    teacher={teacher}
                    position={[0.5, -1, 0.5]}
                    whiteboardChanged={whiteboardChangeCounter}
                  />

                  {/* Dynamic Whiteboard - Behind Avatar */}
                  {showWhiteboard && (
                    <Whiteboard
                      content={whiteboardAutoContent || whiteboardContent}
                      position={[0, 0.7, -0.5]}
                      scale={[3, 1.3, 0.1]}
                    />
                  )}

                  <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={2}
                    maxDistance={10}
                    maxPolarAngle={Math.PI / 2}
                  />
                  <Environment preset="studio" />
                </Suspense>
              </Canvas>

              {/* Playing Indicator */}
              {isPlaying && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                  Speaking...
                </div>
              )}

              {/* Whiteboard Toggle */}
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {showWhiteboard ? "🖼️ Hide Whiteboard" : "🖼️ Show Whiteboard"}
              </button>

              {/* Live Caption - Centered & Narrow */}
              {currentCaption && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 max-w-2xl bg-black bg-opacity-90 text-white px-6 py-2 rounded-lg">
                  <p className="text-sm text-center font-medium">
                    {currentCaption}
                  </p>
                </div>
              )}
            </div>

            {/* Audio Controls */}
            <div className="p-6 bg-gray-750">
              {/* Segment Title Above Progress */}
              <div className="mb-3">
                <p className="text-white font-semibold text-center">
                  {currentSegment.title}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={
                    audioDuration > 0
                      ? (audioProgress / audioDuration) * 100
                      : 0
                  }
                  onChange={seekAudio}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  disabled={!audioPlayer}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>{formatTime(audioProgress)}</span>
                  <span>{formatTime(audioDuration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() =>
                    currentSegmentIndex > 0 &&
                    playSegment(currentSegmentIndex - 1)
                  }
                  disabled={currentSegmentIndex === 0}
                  className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={togglePlayPause}
                  disabled={!audioPlayer && !currentSegment}
                  className="p-4 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={stopPlayback}
                  disabled={!audioPlayer}
                  className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 6h12v12H6z" />
                  </svg>
                </button>

                <button
                  onClick={() =>
                    currentSegmentIndex < videoData.microVideos.length - 1 &&
                    playSegment(currentSegmentIndex + 1)
                  }
                  disabled={
                    currentSegmentIndex === videoData.microVideos.length - 1
                  }
                  className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Current Segment Info - Below Controls */}
            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Keypoint:</span>{" "}
                    {currentSegment.keypoint}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-400 ml-4">
                  <p>
                    Segment {currentSegmentIndex + 1} of{" "}
                    {videoData.microVideos.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Segment List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Learning Segments</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {videoData.microVideos.map((segment, index) => (
                <button
                  key={segment.id}
                  onClick={() => playSegment(index)}
                  disabled={isPlaying && index === currentSegmentIndex}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    index === currentSegmentIndex
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  } disabled:opacity-70`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold">
                      {index + 1}. {segment.keypoint}
                    </span>
                    {index === currentSegmentIndex && isPlaying && (
                      <span className="text-xs bg-red-500 px-2 py-1 rounded">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs opacity-75">
                    <span>📝 {segment.wordCount} words</span>
                    <span>⏱️ {Math.round(segment.duration / 60)} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Segment Details */}
          {currentSegment && (
            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <h3 className="font-semibold mb-2">Segment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sequence:</span>
                  <span>{currentSegment.sequence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Word Count:</span>
                  <span>{currentSegment.wordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span>{Math.round(currentSegment.duration / 60)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Teacher:</span>
                  <span>{currentSegment.teacher}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
