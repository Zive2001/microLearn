// utils/morphTargetMapper.js
// Smart morph target mapper for Ready Player Me avatars
// Maps Azure viseme IDs to available morph targets

class MorphTargetMapper {
  constructor(availableTargets = []) {
    this.availableTargets = new Set(availableTargets);

    // Azure Viseme ID to Ready Player Me morph target mappings
    // Multiple fallback options for each viseme
    this.visemeMapping = {
      0: ['viseme_sil', 'viseme_silence'],                    // Silence
      1: ['viseme_aa', 'viseme_AA'],                          // AA sound (cat)
      2: ['viseme_aa', 'viseme_AA'],                          // AA sound (father)
      3: ['viseme_o', 'viseme_O', 'viseme_oo'],              // AO sound (caught)
      4: ['viseme_e', 'viseme_E', 'viseme_ee'],              // EY sound (eight)
      5: ['viseme_er', 'viseme_ER'],                         // ER sound (bird)
      6: ['viseme_e', 'viseme_E', 'viseme_eh'],              // EH sound (red)
      7: ['viseme_u', 'viseme_U', 'viseme_uu'],              // UW sound (boot)
      8: ['viseme_aa', 'viseme_AA', 'viseme_ah'],            // AH sound (but)
      9: ['viseme_i', 'viseme_I', 'viseme_ii'],              // IY sound (eat)
      10: ['viseme_i', 'viseme_I', 'viseme_ih'],             // IH sound (bit)
      11: ['viseme_u', 'viseme_U', 'viseme_uh'],             // UH sound (book)
      12: ['viseme_aa', 'viseme_AA', 'viseme_ax'],           // AX sound (about)
      13: ['viseme_aa', 'viseme_AA'],                        // AA sound variation
      14: ['viseme_e', 'viseme_E', 'viseme_ae'],             // AE sound variation
      15: ['viseme_e', 'viseme_E', 'viseme_eh'],             // EH sound variation
      16: ['viseme_aa', 'viseme_AA', 'viseme_ah'],           // AH sound variation
      17: ['viseme_o', 'viseme_O', 'viseme_ao'],             // AO sound variation
      18: ['viseme_aa', 'viseme_AA', 'viseme_ax'],           // AX sound variation
      19: ['viseme_i', 'viseme_I', 'viseme_iy'],             // IY sound variation
      20: ['viseme_i', 'viseme_I', 'viseme_ih'],             // IH sound variation
      21: ['viseme_u', 'viseme_U', 'viseme_uh'],             // UH sound variation
    };

    // Additional phoneme-based fallbacks for jaw/mouth movements
    this.phonemeFallbacks = {
      // Open vowels (A, O sounds) - jaw open
      'open': ['jawOpen', 'jaw_open', 'mouthOpen', 'mouth_open'],
      // Rounded sounds (O, U sounds) - mouth funnel/pucker
      'rounded': ['mouthFunnel', 'mouth_funnel', 'mouthPucker', 'mouth_pucker'],
      // Spread sounds (E, I sounds) - mouth smile
      'spread': ['mouthSmileLeft', 'mouthSmileRight', 'mouth_smile_left', 'mouth_smile_right'],
      // General jaw movement
      'jaw': ['jawOpen', 'jaw_open', 'jawForward', 'jaw_forward'],
    };

    // Build the actual mapping based on available targets
    this.resolvedMapping = this.buildResolvedMapping();
  }

  /**
   * Build mapping using only available morph targets
   */
  buildResolvedMapping() {
    const resolved = {};

    for (const [visemeId, targets] of Object.entries(this.visemeMapping)) {
      resolved[visemeId] = [];

      // Find first available target from the list
      for (const target of targets) {
        if (this.availableTargets.has(target)) {
          resolved[visemeId].push(target);
          break; // Use first match only
        }
      }
    }

    return resolved;
  }

  /**
   * Get morph targets for a specific viseme ID
   * @param {number} visemeId - Azure viseme ID (0-21)
   * @returns {Array<string>} Array of morph target names
   */
  getTargetsForViseme(visemeId) {
    return this.resolvedMapping[visemeId] || [];
  }

  /**
   * Apply viseme with intensity to morph targets
   * @param {number} visemeId - Azure viseme ID
   * @param {number} intensity - Intensity value (0-1)
   * @param {Function} lerpFunction - Function to apply lerp: (target, value, speed) => void
   * @param {number} speed - Lerp speed (default: 0.1)
   * @returns {boolean} True if viseme was applied
   */
  applyViseme(visemeId, intensity, lerpFunction, speed = 0.1) {
    const targets = this.getTargetsForViseme(visemeId);

    if (targets.length === 0) {
      return false;
    }

    // Apply to all matched targets
    targets.forEach(target => {
      lerpFunction(target, intensity, speed);
    });

    // Apply phoneme-based fallbacks for better mouth movement
    this.applyPhonemeFallbacks(visemeId, intensity, lerpFunction, speed);

    return true;
  }

  /**
   * Apply additional phoneme-based fallbacks for natural mouth movement
   */
  applyPhonemeFallbacks(visemeId, intensity, lerpFunction, speed) {
    const subtleIntensity = intensity * 0.4; // Subtle movement

    // A sounds - jaw open
    if ([1, 2, 8, 12, 13, 16, 18].includes(parseInt(visemeId))) {
      this.applyFallbackTargets('open', subtleIntensity * 1.2, lerpFunction, speed);
    }
    // O sounds - mouth rounded
    else if ([3, 17].includes(parseInt(visemeId))) {
      this.applyFallbackTargets('rounded', subtleIntensity * 0.8, lerpFunction, speed);
      this.applyFallbackTargets('open', subtleIntensity * 0.8, lerpFunction, speed);
    }
    // U sounds - mouth pucker
    else if ([7, 11, 21].includes(parseInt(visemeId))) {
      this.applyFallbackTargets('rounded', subtleIntensity * 0.6, lerpFunction, speed);
    }
    // E sounds - slight smile
    else if ([4, 6, 14, 15].includes(parseInt(visemeId))) {
      this.applyFallbackTargets('spread', subtleIntensity * 0.5, lerpFunction, speed);
      this.applyFallbackTargets('open', subtleIntensity * 0.9, lerpFunction, speed);
    }
    // I sounds - smile
    else if ([9, 10, 19, 20].includes(parseInt(visemeId))) {
      this.applyFallbackTargets('spread', subtleIntensity * 0.6, lerpFunction, speed);
      this.applyFallbackTargets('open', subtleIntensity * 0.7, lerpFunction, speed);
    }
  }

  /**
   * Apply fallback targets if available
   */
  applyFallbackTargets(category, intensity, lerpFunction, speed) {
    const targets = this.phonemeFallbacks[category] || [];

    targets.forEach(target => {
      if (this.availableTargets.has(target)) {
        lerpFunction(target, intensity, speed);
      }
    });
  }

  /**
   * Check if a specific viseme has available targets
   * @param {number} visemeId - Azure viseme ID
   * @returns {boolean}
   */
  hasTargets(visemeId) {
    return this.getTargetsForViseme(visemeId).length > 0;
  }

  /**
   * Get debug information about the mapping
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    const coverage = Object.keys(this.resolvedMapping).filter(
      visemeId => this.resolvedMapping[visemeId].length > 0
    ).length;

    return {
      totalVisemes: 22,
      coveredVisemes: coverage,
      coveragePercent: Math.round((coverage / 22) * 100),
      availableTargetsCount: this.availableTargets.size,
      mapping: this.resolvedMapping,
    };
  }
}

export default MorphTargetMapper;
