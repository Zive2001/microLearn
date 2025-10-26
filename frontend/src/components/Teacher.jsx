import { teachers, useAvatarTeacher } from "../hooks/useAvatarTeacher";
import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { MathUtils, MeshStandardMaterial } from "three";
import { randInt } from "three/src/math/MathUtils";
import MorphTargetMapper from "../utils/morphTargetMapper";

const ANIMATION_FADE_TIME = 0.5;

// FIXED: Ready Player Me morph target mapping for Azure visemes
const READY_PLAYER_ME_VISEME_MAPPING = {
  // Azure Viseme ID -> Ready Player Me morph target name
  0: "viseme_sil",     // Silence
  1: "viseme_aa",      // AA sound (cat)
  2: "viseme_aa",      // AA sound (father)
  3: "viseme_o",       // AO sound (caught)
  4: "viseme_e",       // EY sound (eight)
  5: "viseme_er",      // ER sound (bird)
  6: "viseme_e",       // EH sound (red)
  7: "viseme_u",       // UW sound (boot)
  8: "viseme_aa",      // AH sound (but)
  9: "viseme_i",       // IY sound (eat)
  10: "viseme_i",      // IH sound (bit)
  11: "viseme_u",      // UH sound (book)
  12: "viseme_aa",     // AX sound (about)
  13: "viseme_aa",     // AA sound variation
  14: "viseme_e",      // AE sound variation
  15: "viseme_e",      // EH sound variation
  16: "viseme_aa",     // AH sound variation
  17: "viseme_o",      // AO sound variation
  18: "viseme_aa",     // AX sound variation
  19: "viseme_i",      // IY sound variation
  20: "viseme_i",      // IH sound variation
  21: "viseme_u"       // UH sound variation
};

export function Teacher({ teacher: teacherProp, whiteboardChanged, ...props }) {
  const group = useRef();

  // FIXED: Use useState initializer + subscription instead of direct hook call
  // This prevents hook errors inside React Three Fiber's Canvas context
  const [teacherFromHook, setTeacherFromHook] = useState(() => useAvatarTeacher.getState().teacher);

  useEffect(() => {
    const unsubscribe = useAvatarTeacher.subscribe(
      (state) => state.teacher,
      (teacher) => setTeacherFromHook(teacher)
    );
    return () => unsubscribe();
  }, []);

  const teacher = teacherProp || teacherFromHook;
  const { scene } = useGLTF(`/models/Teacher_${teacher}.glb`);
  const [morphMapper, setMorphMapper] = useState(null);

  // Arm gesture
  const [armGestureActive, setArmGestureActive] = useState(false);
  const leftForearmRef = useRef(null);
  const rightForearmRef = useRef(null);
  const leftUpperArmRef = useRef(null);
  const rightUpperArmRef = useRef(null);
  const initialRotationsSet = useRef(false);
  const initialRotations = useRef({
    leftForearm: { x: 0, y: 0, z: 0 },
    rightForearm: { x: 0, y: 0, z: 0 },
    leftUpperArm: { x: 0, y: 0, z: 0 },
    rightUpperArm: { x: 0, y: 0, z: 0 }
  });

  // Initialize morph target mapper and find arm bones
  useEffect(() => {
    console.log('🔍 Analyzing morph targets for', teacher);
    const foundTargets = [];
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const targets = Object.keys(child.morphTargetDictionary);
        foundTargets.push(...targets);
        console.log('🎯 Mesh:', child.name, 'has', targets.length, 'morph targets');
        console.log('📋 Full target list:', targets);
      }

      // Find arm bones
      if (child.isBone) {
        const boneName = child.name.toLowerCase();

        if (boneName.includes('leftforearm') || boneName.includes('left_forearm') ||
            boneName.includes('lforearm') || boneName.includes('leftlowerarm')) {
          leftForearmRef.current = child;
          console.log('✋ Found left forearm:', child.name);
        }
        if (boneName.includes('rightforearm') || boneName.includes('right_forearm') ||
            boneName.includes('rforearm') || boneName.includes('rightlowerarm')) {
          rightForearmRef.current = child;
          console.log('✋ Found right forearm:', child.name);
        }
        if ((boneName.includes('leftupperarm') || boneName.includes('left_upperarm') ||
             boneName.includes('lupperarm') || boneName.includes('leftarm')) &&
            !boneName.includes('forearm') && !boneName.includes('lower')) {
          leftUpperArmRef.current = child;
          console.log('💪 Found left upper arm:', child.name);
        }
        if ((boneName.includes('rightupperarm') || boneName.includes('right_upperarm') ||
             boneName.includes('rupperarm') || boneName.includes('rightarm')) &&
            !boneName.includes('forearm') && !boneName.includes('lower')) {
          rightUpperArmRef.current = child;
          console.log('💪 Found right upper arm:', child.name);
        }
      }
    });

    const uniqueTargets = [...new Set(foundTargets)];
    console.log('📋 All unique morph targets:', uniqueTargets);

    // Create the smart morph target mapper
    const mapper = new MorphTargetMapper(uniqueTargets);
    setMorphMapper(mapper);

    // Debug info
    console.log('🎯 Morph Mapper Debug:', mapper.getDebugInfo());
  }, [scene, teacher]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.material) {
        child.material = new MeshStandardMaterial({
          map: child.material.map,
        });
      }
    });
  }, [scene]);

  // Fixed for Zustand 5.x + React 19 compatibility
  // Use local state with Zustand subscription
  const [currentMessage, setCurrentMessage] = useState(() => useAvatarTeacher.getState().currentMessage);
  const [loading, setLoading] = useState(() => useAvatarTeacher.getState().loading);
  const [avatarState, setAvatarState] = useState(() => useAvatarTeacher.getState().avatarState);

  useEffect(() => {
    // Subscribe to currentMessage changes
    const unsubscribe1 = useAvatarTeacher.subscribe(
      (state) => state.currentMessage,
      (message) => setCurrentMessage(message)
    );

    // Subscribe to loading changes
    const unsubscribe2 = useAvatarTeacher.subscribe(
      (state) => state.loading,
      (isLoading) => setLoading(isLoading)
    );

    // Subscribe to avatarState changes
    const unsubscribe3 = useAvatarTeacher.subscribe(
      (state) => state.avatarState,
      (state) => setAvatarState(state)
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, []);
  const { animations } = useGLTF(`/models/animations_${teacher}.glb`);
  const { actions, mixer } = useAnimations(animations, group);
  const [animation, setAnimation] = useState("Idle");

  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 100);
      }, randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Trigger gesture when whiteboard content changes
  useEffect(() => {
    if (whiteboardChanged) {
      setArmGestureActive(true);

      // Return to initial state after 1 second
      const timer = setTimeout(() => {
        setArmGestureActive(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [whiteboardChanged]);

  useEffect(() => {
    if (loading) {
      setAnimation("Thinking");
    } else if (avatarState === 'talking') {
      setAnimation(randInt(0, 1) ? "Talking" : "Talking2");
    } else {
      setAnimation("Idle");
    }
  }, [avatarState, loading]);

  useFrame(({ camera }) => {
    // Store initial arm rotations (current position is initial state)
    if (!initialRotationsSet.current && leftForearmRef.current && rightForearmRef.current &&
        leftUpperArmRef.current && rightUpperArmRef.current) {
      initialRotations.current = {
        leftForearm: { x: leftForearmRef.current.rotation.x, y: leftForearmRef.current.rotation.y, z: leftForearmRef.current.rotation.z },
        rightForearm: { x: rightForearmRef.current.rotation.x, y: rightForearmRef.current.rotation.y, z: rightForearmRef.current.rotation.z },
        leftUpperArm: { x: leftUpperArmRef.current.rotation.x, y: leftUpperArmRef.current.rotation.y, z: leftUpperArmRef.current.rotation.z },
        rightUpperArm: { x: rightUpperArmRef.current.rotation.x, y: rightUpperArmRef.current.rotation.y, z: rightUpperArmRef.current.rotation.z }
      };
      initialRotationsSet.current = true;
      console.log('✅ Initial arm positions stored:', initialRotations.current);
    }

    // Arm gesture animation - return to CURRENT initial state
    if (leftForearmRef.current && rightForearmRef.current && initialRotationsSet.current) {
      const lerpSpeed = 0.12;

      // Target rotation: +20° when active, return to stored initial state when not
      const forearmOffset = armGestureActive ? -0.349 : 0; // -20 degrees
      const upperArmOffset = armGestureActive ? -0.174 : 0; // -10 degrees

      // Move forearms
      leftForearmRef.current.rotation.x = MathUtils.lerp(
        leftForearmRef.current.rotation.x,
        initialRotations.current.leftForearm.x + forearmOffset,
        lerpSpeed
      );
      rightForearmRef.current.rotation.x = MathUtils.lerp(
        rightForearmRef.current.rotation.x,
        initialRotations.current.rightForearm.x + forearmOffset,
        lerpSpeed
      );

      // Move upper arms
      if (leftUpperArmRef.current && rightUpperArmRef.current) {
        leftUpperArmRef.current.rotation.x = MathUtils.lerp(
          leftUpperArmRef.current.rotation.x,
          initialRotations.current.leftUpperArm.x + upperArmOffset,
          lerpSpeed
        );
        rightUpperArmRef.current.rotation.x = MathUtils.lerp(
          rightUpperArmRef.current.rotation.x,
          initialRotations.current.rightUpperArm.x + upperArmOffset,
          lerpSpeed
        );
      }
    }

    // Basic facial expressions
    lerpMorphTarget("mouthSmileLeft", 0.1, 0.5);
    lerpMorphTarget("mouthSmileRight", 0.1, 0.5);

    // Blinking (try both standard and RPM naming)
    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eye_close", blink ? 1 : 0, 0.5); // fallback

    // Highly realistic lip sync logic - Precise speech timing
    if (
      currentMessage &&
      currentMessage.visemes &&
      currentMessage.audioPlayer &&
      avatarState === 'talking' &&
      morphMapper
    ) {
      const audioTime = currentMessage.audioPlayer.currentTime * 1000;
      let activeViseme = null;
      let silenceMode = true;

      // Find the exact viseme that should be active at current time
      for (let i = 0; i < currentMessage.visemes.length; i++) {
        const viseme = currentMessage.visemes[i];
        const visemeTime = viseme[0];
        const nextVisemeTime = i + 1 < currentMessage.visemes.length ?
          currentMessage.visemes[i + 1][0] : audioTime + 100;

        // Check if this viseme is currently active with precise timing
        if (audioTime >= visemeTime && audioTime < nextVisemeTime) {
          const visemeId = viseme[1];
          const duration = nextVisemeTime - visemeTime;
          const elapsed = audioTime - visemeTime;
          const progress = elapsed / duration;

          // Natural, gentle timing curve for speech
          let intensity = 1.0;
          if (visemeId === 0) {
            // Silence - mouth closes gently
            intensity = 0;
            silenceMode = true;
          } else {
            // Speech sounds - gentle, natural timing
            if (progress < 0.25) {
              // Gentle attack - mouth opens naturally
              intensity = Math.min(0.8, progress * 3.2); // 0 to 0.8 in 25% of duration
            } else if (progress > 0.75) {
              // Gentle decay towards next sound
              intensity = Math.max(0.3, 0.8 - (progress - 0.75) * 2); // Gentle fade
            } else {
              // Sustain phase - hold at moderate intensity
              intensity = 0.8; // Not full intensity for more natural look
            }
            silenceMode = false;
          }

          activeViseme = {
            id: visemeId,
            intensity: intensity,
            progress: progress,
            duration: duration
          };

          console.log(`🗣️ Realistic viseme ${visemeId} at ${audioTime.toFixed(0)}ms, intensity: ${intensity.toFixed(2)}, progress: ${(progress*100).toFixed(0)}%`);
          break;
        }
      }

      // Gentle reset of all viseme targets for natural movement
      if (morphMapper) {
        for (let i = 0; i <= 21; i++) {
          const targets = morphMapper.getTargetsForViseme(i);
          targets.forEach(target => {
            lerpMorphTarget(target, 0, 0.12); // Gentle reset for natural speech
          });
        }
      }

      // Handle silence - close mouth gently
      if (silenceMode || !activeViseme) {
        lerpMorphTarget("jawOpen", 0, 0.15);
        lerpMorphTarget("jaw_open", 0, 0.15);
        lerpMorphTarget("mouthOpen", 0, 0.15);
        lerpMorphTarget("mouth_open", 0, 0.15);
        lerpMorphTarget("mouthFunnel", 0, 0.15);
        lerpMorphTarget("mouth_funnel", 0, 0.15);
        lerpMorphTarget("mouthPucker", 0, 0.15);
        lerpMorphTarget("mouth_pucker", 0, 0.15);
      }

      // Apply active speech viseme with high precision
      if (activeViseme && !silenceMode) {
        const visemeId = activeViseme.id;
        const intensity = activeViseme.intensity;
        const speed = 0.15; // Gentle, natural speech movement

        // Try primary viseme mapping first
        const applied = morphMapper.applyViseme(visemeId, intensity, lerpMorphTarget, speed);

        if (!applied) {
          // Highly realistic fallback based on phonetics
          const baseIntensity = intensity;

          // Natural, subtle mouth shapes - not exaggerated
          const subtleIntensity = baseIntensity * 0.4; // Much more subtle overall

          if ([1, 2, 8, 12, 13, 16, 18].includes(visemeId)) {
            // A sounds - slightly more open, not wide
            lerpMorphTarget("jawOpen", subtleIntensity * 1.2, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 1.2, speed);
            lerpMorphTarget("mouthOpen", subtleIntensity * 1.0, speed);
            lerpMorphTarget("mouth_open", subtleIntensity * 1.0, speed);
          } else if ([3, 17].includes(visemeId)) {
            // O sounds - slight rounding, not pronounced
            lerpMorphTarget("mouthFunnel", subtleIntensity * 0.8, speed);
            lerpMorphTarget("mouth_funnel", subtleIntensity * 0.8, speed);
            lerpMorphTarget("jawOpen", subtleIntensity * 0.8, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.8, speed);
          } else if ([7, 11, 21].includes(visemeId)) {
            // U sounds - slight pursing, not exaggerated
            lerpMorphTarget("mouthPucker", subtleIntensity * 0.6, speed);
            lerpMorphTarget("mouth_pucker", subtleIntensity * 0.6, speed);
            lerpMorphTarget("jawOpen", subtleIntensity * 0.6, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.6, speed);
          } else if ([4, 6, 14, 15].includes(visemeId)) {
            // E sounds - very slight smile, natural opening
            lerpMorphTarget("mouthSmileLeft", subtleIntensity * 0.5, speed);
            lerpMorphTarget("mouthSmileRight", subtleIntensity * 0.5, speed);
            lerpMorphTarget("jawOpen", subtleIntensity * 0.9, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.9, speed);
          } else if ([9, 10, 19, 20].includes(visemeId)) {
            // I sounds - minimal smile, small opening
            lerpMorphTarget("mouthSmileLeft", subtleIntensity * 0.6, speed);
            lerpMorphTarget("mouthSmileRight", subtleIntensity * 0.6, speed);
            lerpMorphTarget("jawOpen", subtleIntensity * 0.7, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.7, speed);
          } else if ([5].includes(visemeId)) {
            // ER sounds - neutral, small opening
            lerpMorphTarget("jawOpen", subtleIntensity * 0.8, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.8, speed);
            lerpMorphTarget("mouthOpen", subtleIntensity * 0.6, speed);
            lerpMorphTarget("mouth_open", subtleIntensity * 0.6, speed);
          } else {
            // Consonants - minimal movement
            lerpMorphTarget("jawOpen", subtleIntensity * 0.7, speed);
            lerpMorphTarget("jaw_open", subtleIntensity * 0.7, speed);
            lerpMorphTarget("mouthOpen", subtleIntensity * 0.5, speed);
            lerpMorphTarget("mouth_open", subtleIntensity * 0.5, speed);
          }
        }
      }

      // Animation cycling for talking states
      if (
        actions[animation] &&
        actions[animation].time >
        actions[animation].getClip().duration - ANIMATION_FADE_TIME
      ) {
        setAnimation((animation) =>
          animation === "Talking" ? "Talking2" : "Talking"
        );
      }
    } else {
      // Reset all targets when not talking - return to neutral quickly
      if (morphMapper) {
        for (let i = 0; i <= 21; i++) {
          const targets = morphMapper.getTargetsForViseme(i);
          targets.forEach(target => {
            lerpMorphTarget(target, 0, 0.2);
          });
        }
      } else {
        Object.values(READY_PLAYER_ME_VISEME_MAPPING).forEach(target => {
          lerpMorphTarget(target, 0, 0.2);
        });
      }

      // Ensure mouth is completely closed when not talking
      lerpMorphTarget("jawOpen", 0, 0.2);
      lerpMorphTarget("jaw_open", 0, 0.2);
      lerpMorphTarget("mouthOpen", 0, 0.2);
      lerpMorphTarget("mouth_open", 0, 0.2);
      lerpMorphTarget("mouthFunnel", 0, 0.2);
      lerpMorphTarget("mouth_funnel", 0, 0.2);
      lerpMorphTarget("mouthPucker", 0, 0.2);
      lerpMorphTarget("mouth_pucker", 0, 0.2);
    }
  });

  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        ?.reset()
        .fadeIn(mixer.time > 0 ? ANIMATION_FADE_TIME : 0)
        .play();
    }
    return () => {
      actions[animation]?.fadeOut(ANIMATION_FADE_TIME);
    };
  }, [animation, actions]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );
      }
    });
  };


  const [thinkingText, setThinkingText] = useState(".");

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setThinkingText((thinkingText) => {
          if (thinkingText.length === 3) {
            return ".";
          }
          return thinkingText + ".";
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  return (
    <group {...props} dispose={null} ref={group}>
      {loading && (
        <Html position-y={teacher === "Nanami" ? 1.6 : 1.8}>
          <div className="flex justify-center items-center -translate-x-1/2">
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex items-center justify-center duration-75 rounded-full h-8 w-8 bg-white/80">
                {thinkingText}
              </span>
            </span>
          </div>
        </Html>
      )}
      <primitive object={scene} />
    </group>
  );
}

teachers.forEach((teacher) => {
  useGLTF.preload(`/models/Teacher_${teacher}.glb`);
  useGLTF.preload(`/models/animations_${teacher}.glb`);
});