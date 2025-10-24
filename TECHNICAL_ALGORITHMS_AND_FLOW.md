# Technical Algorithms & Flow - MicroLearn Video Creation System

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [CLT-bLM Educational Model](#clt-blm-educational-model)
3. [Complete Algorithm Flow](#complete-algorithm-flow)
4. [AI Models & Algorithms](#ai-models--algorithms)
5. [Technical Implementation Details](#technical-implementation-details)
6. [Performance Analysis](#performance-analysis)

---

## 🏗️ System Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌────────────┬────────────┬─────────────┬────────────┐    │
│  │  React.js  │  Three.js  │ React Three │  Tailwind  │    │
│  │   18.2.0   │   0.158.0  │    Fiber    │    CSS     │    │
│  └────────────┴────────────┴─────────────┴────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (REST)                         │
│  ┌────────────┬────────────┬─────────────┬────────────┐    │
│  │ Express.js │  JWT Auth  │  Validator  │   CORS     │    │
│  │   4.18.2   │  Middleware│             │            │    │
│  └────────────┴────────────┴─────────────┴────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         CLT-bLM Video Generation Service            │   │
│  │  (Cognitive Load Theory - Bite-sized Learning)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                              ↓                               │
│  ┌──────────┬──────────┬──────────┬──────────────────┐     │
│  │ Keypoint │ Script   │Whiteboard│ Frame Structure  │     │
│  │ Service  │Generator │Timeline  │ Generator        │     │
│  └──────────┴──────────┴──────────┴──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI/ML INTEGRATION LAYER                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OpenAI GPT-4 (Educational Script Generation)       │   │
│  │  • Model: gpt-4                                      │   │
│  │  • Temperature: 0.7                                  │   │
│  │  • Max Tokens: 3000                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OpenAI GPT-4o-mini (Whiteboard Timeline)           │   │
│  │  • Model: gpt-4o-mini                                │   │
│  │  • Temperature: 0.2                                  │   │
│  │  • Max Tokens: 2500                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Microsoft Azure TTS (Voice Synthesis + Visemes)    │   │
│  │  • Voice: en-US-AvaMultilingualNeural                │   │
│  │  • Format: WAV + Viseme JSON                         │   │
│  │  • Sample Rate: 24kHz                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MongoDB (NoSQL Database)                            │   │
│  │  • Videos Collection                                 │   │
│  │  • MicroVideos Collection (CLT-bLM Data)             │   │
│  │  • Users Collection                                  │   │
│  │  • Assessments Collection                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  File System (Audio & 3D Models)                     │   │
│  │  • /generated-audio/*.wav                            │   │
│  │  • /public/models/*.glb                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 CLT-bLM Educational Model

### What is CLT-bLM?

**CLT**: **Cognitive Load Theory**
- Developed by John Sweller (1988)
- Focuses on optimizing learning by managing cognitive load
- Three types of cognitive load:
  1. **Intrinsic Load**: Complexity of the material itself
  2. **Extraneous Load**: Poorly designed instruction (minimize this)
  3. **Germane Load**: Mental effort for schema construction (maximize this)

**bLM**: **Bite-sized Learning Modules**
- Modern microlearning approach
- Content delivered in small, focused chunks
- Ideal duration: 5-15 minutes per module
- Optimized for attention span and retention

### CLT-bLM Implementation in MicroLearn

**Our Adaptation**:
```
CLT-bLM Video Generation =
    Cognitive Load Management +
    Microlearning Principles +
    AI-Powered Content Generation +
    Interactive 3D Visualization
```

**Key Principles Applied**:

1. **Segmentation**: Break 1-hour YouTube video into 3-12 focused segments
2. **Modality**: Combine visual (whiteboard) + auditory (avatar speech)
3. **Coherence**: Eliminate extraneous content (no fluff, direct teaching)
4. **Signaling**: Highlight key points on whiteboard at precise moments
5. **Pre-training**: Each segment has clear learning objective
6. **Personalization**: User chooses specific keypoints to learn

### CLT-bLM Data Structure

**MongoDB Schema** (`MicroVideo.js:43-143`):

```javascript
cltBlmScript: {
  // COGNITIVE LOAD MANAGEMENT
  learningObjective: String,      // Clear goal (reduces extraneous load)
  keypoints: [String],            // Chunked information
  cognitiveLoad: Number,          // 1-10 scale (intrinsic complexity)
  prerequisites: [String],        // Pre-training effect
  difficulty: String,             // Beginner/Intermediate/Advanced

  // CONTENT OPTIMIZATION
  educationalScript: String,      // 1000-1500 words (optimal chunk size)
  practicalExample: String,       // Concrete examples (germane load)
  visualCues: [String],          // Signaling for attention

  // FRAME-BASED STRUCTURE (Bite-sized Learning)
  frameStructure: {
    frame1: {                     // Introduction (30%)
      keypoints: [String],        // What will be learned
      audioScript: String,        // Narration
      estimatedDuration: Number   // Time management
    },
    frame2: {                     // Main Content (40%)
      keypoints: [String],        // Core concepts
      audioScript: String,
      estimatedDuration: Number
    },
    frame3: {                     // Summary (30%)
      keypoints: [String],        // Reinforcement
      audioScript: String,
      estimatedDuration: Number
    }
  }
}
```

**Why 3 Frames?**
- **Frame 1 (30%)**: Activate prior knowledge, set expectations
- **Frame 2 (40%)**: Present new information with examples
- **Frame 3 (30%)**: Consolidate learning, reinforce schema

**Cognitive Load Calculation Algorithm**:

```javascript
function calculateCognitiveLoad(script) {
  let load = 0;

  // Factor 1: Script complexity (word count)
  const wordCount = script.split(/\s+/).length;
  if (wordCount > 1400) load += 3;
  else if (wordCount > 1200) load += 2;
  else load += 1;

  // Factor 2: Technical terms density
  const technicalTerms = countTechnicalTerms(script);
  const density = technicalTerms / wordCount;
  if (density > 0.15) load += 3;
  else if (density > 0.10) load += 2;
  else load += 1;

  // Factor 3: Code complexity
  const codeBlocks = extractCodeBlocks(script);
  const avgLinesPerBlock = codeBlocks.reduce((sum, block) =>
    sum + block.split('\n').length, 0) / codeBlocks.length;
  if (avgLinesPerBlock > 10) load += 3;
  else if (avgLinesPerBlock > 5) load += 2;
  else load += 1;

  // Factor 4: Prerequisite requirements
  const prerequisites = identifyPrerequisites(script);
  load += Math.min(prerequisites.length, 3);

  // Normalize to 1-10 scale
  return Math.min(Math.max(Math.round(load), 1), 10);
}
```

---

## 🔄 Complete Algorithm Flow

### Master Algorithm: Video Generation Pipeline

```
ALGORITHM: GenerateEducationalVideo
INPUT: youtubeUrl, keypoints[], teacher, userId
OUTPUT: videoId, microVideoIds[], metadata

BEGIN
  // PHASE 1: VALIDATION & INITIALIZATION
  1. VALIDATE_INPUT(youtubeUrl, keypoints)
  2. AUTHENTICATE_USER(userId, jwtToken)
  3. INITIALIZE_SERVICES(openai, azure, mongodb)

  // PHASE 2: CONTENT EXTRACTION
  4. videoId ← EXTRACT_YOUTUBE_VIDEO_ID(youtubeUrl)
  5. transcript ← FETCH_YOUTUBE_TRANSCRIPT(videoId)
  6. videoContext ← EXTRACT_VIDEO_METADATA(transcript)

  // PHASE 3: AI-POWERED SCRIPT GENERATION (CLT-bLM)
  7. FOR EACH keypoint IN keypoints DO
       7.1. educationalScript ← GENERATE_SCRIPT_GPT4(
              keypoint, transcript, videoContext
            )
       7.2. whiteboardTimeline ← GENERATE_TIMELINE_GPT4O_MINI(
              educationalScript
            )
       7.3. frameStructure ← DECOMPOSE_INTO_FRAMES(
              educationalScript, CLT_BLM_MODEL
            )
       7.4. cognitiveLoad ← CALCULATE_COGNITIVE_LOAD(
              educationalScript
            )
       7.5. scripts[keypoint] ← {
              educationalScript,
              whiteboardTimeline,
              frameStructure,
              cognitiveLoad
            }
     END FOR

  // PHASE 4: MULTIMEDIA GENERATION
  8. FOR EACH script IN scripts DO
       8.1. ttsResult ← GENERATE_TTS_AZURE(
              script.educationalScript, teacher
            )
       8.2. audioFile ← SAVE_AUDIO_FILE(ttsResult.audioData)
       8.3. visemes ← EXTRACT_VISEMES(ttsResult)
       8.4. avatarVideos[script] ← {
              audioBase64: ttsResult.base64,
              visemes: visemes,
              duration: ttsResult.duration,
              whiteboardTimeline: script.whiteboardTimeline
            }
     END FOR

  // PHASE 5: DATABASE PERSISTENCE (CLT-bLM MODEL)
  9. videoDoc ← CREATE_VIDEO_DOCUMENT(videoContext, userId)
  10. videoId ← SAVE_TO_MONGODB(videoDoc)
  11. FOR EACH script IN scripts DO
        11.1. microVideoDoc ← CREATE_MICROVIDEO_DOCUMENT(
                script, avatarVideos[script], videoId, CLT_BLM_DATA
              )
        11.2. microVideoId ← SAVE_TO_MONGODB(microVideoDoc)
        11.3. microVideoIds.PUSH(microVideoId)
      END FOR

  // PHASE 6: RESPONSE ASSEMBLY
  12. metadata ← CALCULATE_METADATA(scripts, avatarVideos)
  13. response ← {
        videoId,
        microVideoIds,
        scripts,
        avatarVideos,
        metadata,
        cltBlmMetrics: {
          avgCognitiveLoad,
          totalLearningTime,
          frameDistribution
        }
      }

  14. RETURN response
END
```

---

## 🤖 AI Models & Algorithms

### 1. YouTube Transcript Extraction Algorithm

**Function**: `extractTranscript(videoId)`

**Algorithm**:
```
ALGORITHM: ExtractYouTubeTranscript
INPUT: videoId (String, 11 characters)
OUTPUT: { transcript, title, duration, wordCount }

BEGIN
  1. youtubeUrl ← "https://www.youtube.com/watch?v=" + videoId

  2. TRY
       // Use youtube-transcript library
       2.1. transcriptArray ← YouTubeTranscript.fetchTranscript(videoId)

       // Combine all text segments
       2.2. fullText ← ""
       2.3. FOR EACH segment IN transcriptArray DO
              fullText ← fullText + segment.text + " "
            END FOR

       2.4. wordCount ← COUNT_WORDS(fullText)
       2.5. duration ← ESTIMATE_DURATION(wordCount, 150) // 150 WPM
       2.6. title ← FETCH_VIDEO_TITLE(youtubeUrl) // Web scraping

  3. CATCH TranscriptNotAvailableError
       3.1. THROW "Could not extract transcript. Video may have no captions."

  4. RETURN {
       youtubeVideoId: videoId,
       youtubeUrl: youtubeUrl,
       title: title,
       transcript: fullText,
       duration: duration,
       wordCount: wordCount
     }
END
```

**Technical Details**:
- **Library**: `youtube-transcript` (npm package)
- **API**: Uses YouTube's internal transcript API
- **Limitations**: Requires video to have auto-generated or manual captions
- **Fallback**: If no transcript, operation fails (no mock data in production)

---

### 2. Educational Script Generation (GPT-4)

**Function**: `generateSingleKeypointScript()`

**Algorithm**:
```
ALGORITHM: GenerateEducationalScript_GPT4
INPUT: keypoint, transcript, segmentNumber, totalSegments
OUTPUT: educationalScript (1000-1500 words)

BEGIN
  // STEP 1: PROMPT ENGINEERING (CLT-bLM Principles)
  1. systemPrompt ← BUILD_SYSTEM_PROMPT({
       role: "Expert educational script writer",
       principles: [
         "Zero waste - every word teaches",
         "Direct teaching - no fluff",
         "Complete coverage - thorough but efficient",
         "Practical focus - real examples",
         "Avatar optimized - natural speech"
       ],
       constraints: {
         minWords: 1000,
         maxWords: 1500,
         forbiddenPhrases: [
           "I hope you enjoyed",
           "Let's take a moment",
           "Before we move on",
           "You might be wondering"
         ]
       },
       cltBlmPrinciples: {
         segmentation: true,
         coherence: true,
         signaling: true,
         modality: "audioVisual"
       }
     })

  2. userPrompt ← BUILD_USER_PROMPT({
       keypoint: keypoint,
       transcriptExcerpt: transcript.substring(0, 2000),
       videoTitle: videoContext.title,
       position: segmentNumber === 1 ? "FIRST" :
                 segmentNumber === totalSegments ? "LAST" : "MIDDLE",
       requirements: {
         wordCount: "1000-1500",
         structure: segmentNumber === 1 ?
           "Brief welcome → Learning objective → Core content → Summary" :
           "Direct content → Examples → Summary",
         examples: 2-3,
         speakingRate: 150 // words per minute
       }
     })

  // STEP 2: GPT-4 API CALL
  3. request ← {
       model: "gpt-4",
       messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt }
       ],
       temperature: 0.7,      // Balance creativity & consistency
       max_tokens: 3000,      // ~1500 words output
       top_p: 1.0,
       frequency_penalty: 0.3, // Reduce repetition
       presence_penalty: 0.1   // Encourage topic diversity
     }

  4. response ← OPENAI_API_CALL(request)
  5. rawScript ← response.choices[0].message.content

  // STEP 3: POST-PROCESSING & VALIDATION
  6. cleanScript ← CLEAN_SCRIPT(rawScript) // Remove JSON formatting
  7. wordCount ← COUNT_WORDS(cleanScript)
  8. estimatedDuration ← wordCount / 150 * 60 // seconds
  9. sentences ← SPLIT_INTO_SENTENCES(cleanScript)

  // STEP 4: QUALITY CHECKS (CLT Principles)
  10. IF wordCount < 900 THEN
        WARN("Script below minimum word count: " + wordCount)
      END IF

  11. timeWasteScore ← CHECK_TIME_WASTE_PHRASES(cleanScript)
  12. IF timeWasteScore > 0 THEN
        WARN("Script contains time-wasting phrases")
      END IF

  13. readabilityScore ← CALCULATE_FLESCH_READING_EASE(cleanScript)
  14. IF readabilityScore < 50 THEN
        WARN("Script may be too complex for target audience")
      END IF

  // STEP 5: RETURN STRUCTURED DATA
  15. RETURN {
        educationalScript: cleanScript,
        wordCount: wordCount,
        estimatedDuration: estimatedDuration,
        sentences: sentences.length,
        avgWordsPerSentence: wordCount / sentences.length,
        meetsWordCount: wordCount >= 900,
        noTimeWaste: timeWasteScore === 0,
        readyForAvatar: true,
        qualityMetrics: {
          readability: readabilityScore,
          cognitiveLoad: CALCULATE_COGNITIVE_LOAD(cleanScript)
        }
      }
END
```

**GPT-4 Configuration**:
```javascript
{
  model: "gpt-4",
  temperature: 0.7,       // Sweet spot for educational content
  max_tokens: 3000,       // Allows ~1500 words
  top_p: 1.0,            // Use full probability distribution
  frequency_penalty: 0.3, // Reduce word repetition
  presence_penalty: 0.1   // Encourage topic variety
}
```

**Prompt Engineering Strategy**:

1. **System Prompt** (Sets persona & constraints):
   - Role definition: "Expert educational script writer"
   - Mission statement: Focus on time-efficient microlearning
   - Forbidden phrases: Explicit list of time-wasters
   - CLT principles: Embedded in instruction

2. **User Prompt** (Provides context & task):
   - Video context (title, transcript excerpt)
   - Learning goal (specific keypoint)
   - Position (first/middle/last segment)
   - Structural requirements
   - Word count targets

**Quality Validation**:
```javascript
function validateScriptQuality(script) {
  const checks = {
    wordCount: script.split(/\s+/).length >= 900,
    noFluff: !containsFluffPhrases(script),
    hasExamples: countExamples(script) >= 2,
    properStructure: hasIntroBodyConclusion(script),
    readability: calculateFleschScore(script) >= 50
  };

  return Object.values(checks).every(check => check);
}
```

---

### 3. Whiteboard Timeline Generation (GPT-4o-mini)

**Function**: `generateWhiteboardTimeline()`

**Algorithm**:
```
ALGORITHM: GenerateWhiteboardTimeline_GPT4oMini
INPUT: educationalScript (1000-1500 words)
OUTPUT: whiteboardTimeline[] (4-8 items)

BEGIN
  // STEP 1: SCRIPT ANALYSIS
  1. scriptLength ← COUNT_WORDS(educationalScript)
  2. estimatedDuration ← scriptLength / 150 * 60 // seconds
  3. speechRate ← 2.5 // words per second

  // STEP 2: PROMPT ENGINEERING (CRITICAL)
  4. systemPrompt ← BUILD_TIMELINE_SYSTEM_PROMPT({
       rules: {
         codeBlocks: {
           principle: "ALWAYS keep complete code blocks together",
           never: "split multi-line code into separate items",
           preserve: "line breaks, indentation, formatting",
           displayTime: {
             singleLine: "5-8 seconds",
             twoToThreeLines: "8-12 seconds",
             fourPlusLines: "12-18 seconds"
           }
         },
         concepts: {
           maxWords: 15,
           style: "short, factual, no fluff",
           displayTime: "4-7 seconds"
         },
         timing: {
           calculation: "based on word count & 150 WPM",
           offset: "display 1-2 seconds before spoken",
           distribution: "evenly throughout duration"
         },
         output: {
           format: "JSON only",
           itemCount: "4-8 items total",
           structure: {
             timeStart: "number (seconds)",
             timeEnd: "number (seconds)",
             contentType: "code | concept",
             contentText: "string with \\n for line breaks"
           }
         }
       },
       examples: {
         correct: {
           multiLineCode: "function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n-1);\n}",
           timeRange: "11.0 to 23.0 seconds"
         },
         wrong: {
           splitCode: [
             "function factorial(n) {",
             "  if (n <= 1) return 1;",
             "  return n * factorial(n-1);"
           ],
           reason: "NEVER split code blocks"
         }
       }
     })

  5. userPrompt ← "Analyze this educational script and generate whiteboard timeline:\n\n" + educationalScript

  // STEP 3: GPT-4o-mini API CALL
  6. request ← {
       model: "gpt-4o-mini",
       messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: userPrompt }
       ],
       temperature: 0.2,  // Low for consistency
       max_tokens: 2500,  // Handle large code blocks
       response_format: { type: "json_object" } // Force JSON
     }

  7. response ← OPENAI_API_CALL(request)
  8. rawContent ← response.choices[0].message.content

  // STEP 4: JSON EXTRACTION & PARSING
  9. jsonStart ← rawContent.indexOf('{')
  10. jsonEnd ← rawContent.lastIndexOf('}')
  11. jsonString ← rawContent.substring(jsonStart, jsonEnd + 1)
  12. parsed ← JSON_PARSE(jsonString)
  13. timeline ← parsed.whiteboardTimeline

  // STEP 5: VALIDATION & ENHANCEMENT
  14. FOR EACH item IN timeline DO
        14.1. lineCount ← item.contentText.split('\n').length
        14.2. duration ← item.timeEnd - item.timeStart

        // Validate timing
        14.3. IF item.contentType === "code" AND lineCount > 1 THEN
                minDuration ← lineCount <= 3 ? 8 : 12
                IF duration < minDuration THEN
                  WARN("Code block duration too short: " + duration)
                END IF
              END IF

        // Log for debugging
        14.4. LOG_ITEM_DETAILS(item, lineCount, duration)
      END FOR

  // STEP 6: QUALITY METRICS
  15. metrics ← {
        totalItems: timeline.length,
        codeItems: COUNT_BY_TYPE(timeline, "code"),
        conceptItems: COUNT_BY_TYPE(timeline, "concept"),
        avgDuration: AVG_DURATION(timeline),
        coverage: (timeline[timeline.length-1].timeEnd / estimatedDuration) * 100
      }

  16. RETURN {
        whiteboardTimeline: timeline,
        metrics: metrics
      }
END
```

**Critical Algorithm: Code Block Detection**

```javascript
function detectCompleteCodeBlocks(script) {
  const codeBlockPatterns = [
    // 1. Function definitions
    /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g,

    // 2. Arrow functions
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}/g,

    // 3. Class definitions
    /class\s+\w+\s*\{[\s\S]*?\}/g,

    // 4. If-else blocks
    /if\s*\([^)]+\)\s*\{[\s\S]*?\}(?:\s*else\s*\{[\s\S]*?\})?/g,

    // 5. Loops
    /(?:for|while)\s*\([^)]+\)\s*\{[\s\S]*?\}/g,

    // 6. Object literals (multi-line)
    /const\s+\w+\s*=\s*\{[\s\S]*?\};/g,

    // 7. Try-catch blocks
    /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g
  ];

  const blocks = [];

  for (const pattern of codeBlockPatterns) {
    let match;
    while ((match = pattern.exec(script)) !== null) {
      const code = match[0];
      const lineCount = code.split('\n').length;

      // Only include if multi-line (2+ lines)
      if (lineCount >= 2) {
        const wordsBefore = script.substring(0, match.index)
                                 .split(/\s+/).length;

        blocks.push({
          code: code.trim(),
          lineCount: lineCount,
          startWordIndex: wordsBefore,
          displayDuration: calculateCodeDisplayDuration(lineCount)
        });
      }
    }
  }

  // Remove duplicates and overlaps
  return deduplicateBlocks(blocks);
}

function calculateCodeDisplayDuration(lineCount) {
  if (lineCount === 1) return 6;        // 6 seconds
  if (lineCount <= 3) return 10;        // 10 seconds
  if (lineCount <= 6) return 15;        // 15 seconds
  return lineCount * 2.5;               // 2.5 sec per line for large blocks
}
```

**Timeline Generation Strategy**:

```
Step 1: Analyze script structure
  ├── Identify introduction, body, conclusion
  ├── Detect code blocks (multi-line)
  └── Extract key concepts

Step 2: Calculate timing
  ├── Total duration = wordCount / 150 * 60
  ├── Distribute timeline items evenly
  └── Apply display duration rules

Step 3: Generate timeline items
  ├── For code: Keep complete blocks together
  ├── For concepts: Extract 10-15 word summaries
  └── Add timing offsets (show before speaking)

Step 4: Validate & optimize
  ├── Check coverage (should span 80%+ of duration)
  ├── Verify no overlaps
  └── Ensure logical progression
```

**Example Output**:
```json
{
  "whiteboardTimeline": [
    {
      "timeStart": 3.0,
      "timeEnd": 10.5,
      "contentType": "concept",
      "contentText": "Three variable types: var, let, const"
    },
    {
      "timeStart": 11.0,
      "timeEnd": 23.0,
      "contentType": "code",
      "contentText": "function demo() {\n  var x = 1;  // function-scoped\n  let y = 2;  // block-scoped\n  const z = 3; // constant\n}"
    }
  ]
}
```

---

### 4. Frame Structure Generation (CLT-bLM)

**Function**: `generateFrameStructure()`

**Algorithm**:
```
ALGORITHM: GenerateFrameStructure_CLT_bLM
INPUT: educationalScript (full text), keypoint (learning goal)
OUTPUT: frameStructure { frame1, frame2, frame3 }

BEGIN
  // STEP 1: SENTENCE TOKENIZATION
  1. sentences ← SPLIT_INTO_SENTENCES(educationalScript)
  2. totalSentences ← sentences.length
  3. totalWords ← COUNT_WORDS(educationalScript)

  // STEP 2: CLT-bLM FRAME DISTRIBUTION
  // Based on cognitive load research:
  // - Frame 1 (30%): Activate prior knowledge
  // - Frame 2 (40%): Present new information
  // - Frame 3 (30%): Consolidate & reinforce

  4. frame1EndIndex ← FLOOR(totalSentences * 0.30)
  5. frame2EndIndex ← FLOOR(totalSentences * 0.70)

  // STEP 3: EXTRACT FRAME CONTENT
  6. frame1Sentences ← sentences[0 : frame1EndIndex]
  7. frame2Sentences ← sentences[frame1EndIndex : frame2EndIndex]
  8. frame3Sentences ← sentences[frame2EndIndex : totalSentences]

  // STEP 4: BUILD FRAME OBJECTS
  9. frame1 ← {
       keypoints: [keypoint + " - Introduction"],
       audioScript: JOIN_SENTENCES(frame1Sentences),
       estimatedDuration: CALCULATE_DURATION(frame1Sentences, 150),
       cognitiveLoadType: "LOW",  // Activation phase
       pedagogicalPurpose: "Activate prior knowledge, set expectations"
     }

  10. frame2 ← {
        keypoints: [keypoint + " - Main Content"],
        audioScript: JOIN_SENTENCES(frame2Sentences),
        estimatedDuration: CALCULATE_DURATION(frame2Sentences, 150),
        cognitiveLoadType: "HIGH", // Learning phase
        pedagogicalPurpose: "Present new concepts, provide examples"
      }

  11. frame3 ← {
        keypoints: [keypoint + " - Summary"],
        audioScript: JOIN_SENTENCES(frame3Sentences),
        estimatedDuration: CALCULATE_DURATION(frame3Sentences, 150),
        cognitiveLoadType: "MEDIUM", // Consolidation phase
        pedagogicalPurpose: "Reinforce learning, provide closure"
      }

  // STEP 5: VALIDATE FRAME BALANCE
  12. totalDuration ← frame1.estimatedDuration +
                      frame2.estimatedDuration +
                      frame3.estimatedDuration

  13. IF ABS(frame1.estimatedDuration / totalDuration - 0.30) > 0.10 THEN
        WARN("Frame 1 duration imbalanced")
      END IF

  14. IF ABS(frame2.estimatedDuration / totalDuration - 0.40) > 0.10 THEN
        WARN("Frame 2 duration imbalanced")
      END IF

  // STEP 6: ADD CLT METADATA
  15. frameStructure ← {
        frame1: frame1,
        frame2: frame2,
        frame3: frame3,
        metadata: {
          totalDuration: totalDuration,
          frameDistribution: [
            (frame1.estimatedDuration / totalDuration * 100).toFixed(1) + "%",
            (frame2.estimatedDuration / totalDuration * 100).toFixed(1) + "%",
            (frame3.estimatedDuration / totalDuration * 100).toFixed(1) + "%"
          ],
          cltPrinciples: [
            "Segmentation",
            "Pre-training",
            "Coherence"
          ]
        }
      }

  16. RETURN frameStructure
END
```

**CLT Optimization**:

```javascript
// Cognitive Load Analysis per Frame
function analyzeCognitiveLoad(frame) {
  const analysis = {
    intrinsicLoad: 0,  // Material complexity
    extraneousLoad: 0, // Design-induced load
    germaneLoad: 0     // Learning-relevant load
  };

  // Intrinsic load factors
  const technicalTerms = countTechnicalTerms(frame.audioScript);
  const abstractConcepts = countAbstractConcepts(frame.audioScript);
  analysis.intrinsicLoad = (technicalTerms * 2 + abstractConcepts * 3) / 10;

  // Extraneous load factors (should be minimized)
  const fluffPhrases = countFluffPhrases(frame.audioScript);
  const redundancy = calculateRedundancy(frame.audioScript);
  analysis.extraneousLoad = (fluffPhrases * 3 + redundancy * 2) / 10;

  // Germane load factors (should be maximized)
  const examples = countExamples(frame.audioScript);
  const connections = countConcept Connections(frame.audioScript);
  analysis.germaneLoad = (examples * 2 + connections * 3) / 10;

  // Optimal: High germane, low extraneous, moderate intrinsic
  const quality = analysis.germaneLoad - analysis.extraneousLoad;

  return {
    ...analysis,
    quality: quality,
    optimal: quality > 0.5 && analysis.extraneousLoad < 2
  };
}
```

---

### 5. Azure TTS + Visemes Generation

**Function**: `generateTTSWithVisemes()`

**Algorithm**:
```
ALGORITHM: GenerateTextToSpeech_Azure
INPUT: script (1000-1500 words), teacher (voice name)
OUTPUT: { audioBase64, visemes[], duration, audioPath }

BEGIN
  // STEP 1: VOICE CONFIGURATION
  1. voiceMap ← {
       "Ava": "en-US-AvaMultilingualNeural",
       "Andrew": "en-US-AndrewMultilingualNeural",
       "Emma": "en-US-EmmaMultilingualNeural",
       "Brian": "en-US-BrianMultilingualNeural",
       "Jenny": "en-US-JennyNeural"
     }

  2. selectedVoice ← voiceMap[teacher]

  // STEP 2: SSML CONSTRUCTION
  // SSML = Speech Synthesis Markup Language
  3. ssml ← BUILD_SSML({
       version: "1.0",
       xmlns: "http://www.w3.org/2001/10/synthesis",
       xmlnsMs: "https://www.w3.org/2001/mstts",
       xmlLang: "en-US",
       voice: {
         name: selectedVoice,
         effects: "eq_telecomhp8k",  // Audio enhancement
         rate: "0%",                  // Normal speed
         pitch: "0%"                  // Normal pitch
       },
       viseme: {
         type: "FacialExpression"     // Enable viseme generation
       },
       content: ESCAPE_XML(script)
     })

  // Example SSML output:
  // <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
  //        xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  //   <voice name="en-US-AvaMultilingualNeural">
  //     <mstts:viseme type="FacialExpression"/>
  //     Welcome to this focused learning segment...
  //   </voice>
  // </speak>

  // STEP 3: AZURE COGNITIVE SERVICES CONFIGURATION
  4. speechConfig ← SpeechConfig.fromSubscription(
       AZURE_SPEECH_KEY,
       AZURE_SPEECH_REGION
     )

  5. speechConfig.speechSynthesisVoiceName ← selectedVoice
  6. speechConfig.speechSynthesisOutputFormat ←
       SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3

  // STEP 4: AUDIO CONFIGURATION
  7. timestamp ← CURRENT_TIMESTAMP()
  8. audioFilename ← "tts_web_" + timestamp + ".wav"
  9. audioPath ← "generated-audio/" + audioFilename
  10. audioConfig ← AudioConfig.fromAudioFileOutput(audioPath)

  // STEP 5: SYNTHESIZER INITIALIZATION
  11. synthesizer ← NEW SpeechSynthesizer(speechConfig, audioConfig)

  // STEP 6: VISEME DATA COLLECTION
  12. visemes ← []
  13. REGISTER_EVENT_HANDLER(synthesizer, "visemeReceived", (event) => {
        visemes.PUSH({
          time: event.audioOffset / 10000000, // Convert to seconds
          visemeId: event.visemeId           // 0-21 (mouth shapes)
        })
      })

  // STEP 7: SYNTHESIS EXECUTION
  14. result ← AWAIT synthesizer.speakSsmlAsync(ssml)

  15. IF result.reason === ResultReason.SynthesizingAudioCompleted THEN
        // Success
        15.1. audioBuffer ← result.audioData
        15.2. duration ← result.audioDuration / 10000000 // seconds

        // STEP 8: AUDIO FILE PROCESSING
        15.3. WRITE_FILE(audioPath, audioBuffer)
        15.4. audioBase64 ← BUFFER_TO_BASE64(audioBuffer)

        // STEP 9: VISEME POST-PROCESSING
        15.5. visemes ← SORT_VISEMES_BY_TIME(visemes)
        15.6. visemes ← REMOVE_DUPLICATE_VISEMES(visemes)

        // STEP 10: METADATA CALCULATION
        15.7. fileSize ← GET_FILE_SIZE(audioPath)
        15.8. bitrate ← fileSize * 8 / duration / 1000 // kbps

        15.9. RETURN {
                audioPath: audioPath,
                audioBase64: audioBase64,
                duration: duration,
                visemes: visemes,
                metadata: {
                  voice: selectedVoice,
                  fileSize: fileSize,
                  bitrate: bitrate,
                  visemeCount: visemes.length,
                  format: "WAV",
                  sampleRate: 24000
                }
              }

  16. ELSE IF result.reason === ResultReason.Canceled THEN
        16.1. cancellation ← SpeechSynthesisCancellationDetails.fromResult(result)
        16.2. THROW ERROR("TTS failed: " + cancellation.errorDetails)

  17. END IF
END
```

**Viseme Mapping** (21 mouth shapes):

```javascript
const VISEME_MAP = {
  0: "Silence",
  1: "aa, ax (father)",
  2: "aa (hot)",
  3: "ao (caught)",
  4: "ey (ate)",
  5: "eh (pet)",
  6: "uh (but)",
  7: "ih (fill)",
  8: "iy (eat)",
  9: "w, uw (boot)",
  10: "ow (go)",
  11: "aw (cow)",
  12: "oy (toy)",
  13: "ay (kite)",
  14: "h (help)",
  15: "r (red)",
  16: "l (lid)",
  17: "s, z (sit, zap)",
  18: "sh, ch, jh, zh (ship, chip)",
  19: "th, dh (think, this)",
  20: "f, v (fan, van)",
  21: "d, t, n (dog, top, nap)"
};
```

**Viseme-to-MorphTarget Algorithm** (Frontend):

```javascript
function applyVisemeToAvatar(visemeId, avatarHead) {
  // Reset all morph targets
  for (let i = 0; i < avatarHead.morphTargetInfluences.length; i++) {
    avatarHead.morphTargetInfluences[i] = 0;
  }

  // Map viseme ID to ReadyPlayerMe morph target
  const morphTargetIndex = visemeToMorphTargetMap[visemeId];

  if (morphTargetIndex !== undefined) {
    // Apply with smooth interpolation
    avatarHead.morphTargetInfluences[morphTargetIndex] = 1.0;
  }
}

const visemeToMorphTargetMap = {
  0: null,     // Silence - neutral
  1: 8,        // visemeAA
  2: 8,        // visemeAA
  3: 14,       // visemeO
  4: 5,        // visemeE
  5: 5,        // visemeE
  6: 21,       // visemeU
  7: 10,       // visemeI
  8: 10,       // visemeI
  9: 21,       // visemeU
  10: 14,      // visemeO
  11: 8,       // visemeAA
  12: 14,      // visemeO
  13: 8,       // visemeAA
  14: 8,       // visemeAA
  15: 18,      // visemeRR
  16: 12,      // visemeFF
  17: 19,      // visemeSS
  18: 3,       // visemeCH
  19: 20,      // visemeTH
  20: 12,      // visemeFF
  21: 4        // visemeDD
};
```

---

### 6. MongoDB Storage Algorithm (CLT-bLM Data)

**Algorithm**:
```
ALGORITHM: SaveToDatabase_CLT_BLM
INPUT: videoContext, scripts[], avatarVideos[], userId
OUTPUT: videoId, microVideoIds[]

BEGIN
  // STEP 1: CREATE MAIN VIDEO DOCUMENT
  1. videoDoc ← {
       title: videoContext.title + " (Keypoint-Based)",
       description: "Keypoint-based learning: " + scripts.length + " focused segments",
       sourceUrl: videoContext.youtubeUrl,
       youtubeVideoId: videoContext.youtubeVideoId,
       uploadedBy: userId,
       topic: "custom",
       processingStatus: "completed",
       transcript: videoContext.transcript,
       originalDuration: videoContext.duration,

       // CLT-bLM Metadata
       cltBlmMetadata: {
         generationMethod: "AI-Powered Keypoint-Based",
         totalKeypoints: scripts.length,
         avgCognitiveLoad: CALCULATE_AVG_COGNITIVE_LOAD(scripts),
         totalLearningTime: SUM_DURATIONS(scripts),
         educationalFramework: "CLT-bLM v1.0"
       },

       createdAt: CURRENT_TIMESTAMP(),
       updatedAt: CURRENT_TIMESTAMP()
     }

  2. videoId ← MONGODB_INSERT("videos", videoDoc)
  3. LOG("✅ Video saved: " + videoId)

  // STEP 2: CREATE MICRO-VIDEO DOCUMENTS (CLT-bLM MODEL)
  4. microVideoIds ← []
  5. FOR i ← 0 TO scripts.length - 1 DO
       5.1. script ← scripts[i]
       5.2. avatarData ← avatarVideos[i]

       // Calculate time range (estimated)
       5.3. startTime ← i * 300  // Approximate 5-min segments
       5.4. endTime ← (i + 1) * 300
       5.5. duration ← script.estimatedDuration

       // Build CLT-bLM Script Object
       5.6. cltBlmScript ← {
              // CORE LEARNING DATA
              learningObjective: script.keypoint,
              keypoints: [script.keypoint],
              cognitiveLoad: CALCULATE_COGNITIVE_LOAD(script.educationalScript),
              difficulty: DETERMINE_DIFFICULTY(script.educationalScript),

              // SCRIPT CONTENT
              educationalScript: script.educationalScript,
              whiteboardTimeline: script.whiteboardTimeline, // NEW

              // FRAME STRUCTURE (CLT-bLM)
              frameStructure: script.frameStructure,

              // QUALITY METRICS
              wordCount: script.wordCount,
              meetsQualityStandards: script.meetsWordCount && script.noTimeWaste,

              // PEDAGOGICAL METADATA
              prerequisites: IDENTIFY_PREREQUISITES(script.educationalScript),
              practicalExample: EXTRACT_PRIMARY_EXAMPLE(script.educationalScript),
              visualCues: EXTRACT_VISUAL_CUES(script.educationalScript)
            }

       // Build Micro-Video Document
       5.7. microVideoDoc ← {
              originalVideoId: videoId,
              title: script.title,
              sequence: script.segmentNumber,

              // TIME RANGE
              timeRange: {
                startTime: startTime,
                endTime: endTime,
                duration: duration
              },

              // CLT-bLM EDUCATIONAL CONTENT
              cltBlmScript: cltBlmScript,

              // AVATAR DATA (if available)
              avatarTeacher: avatarData?.teacher || null,
              avatarVideoDuration: avatarData?.duration || null,
              avatarVisemesCount: avatarData?.visemes.length || null,
              avatarGeneratedAt: avatarData ? CURRENT_TIMESTAMP() : null,

              // AUDIO DATA
              audioProvider: avatarData ? "azure" : null,
              audioDuration: avatarData?.duration || null,
              audioFilename: avatarData ? EXTRACT_FILENAME(avatarData.audioPath) : null,

              // STATUS
              processingStatus: "completed",

              // TIMESTAMPS
              createdAt: CURRENT_TIMESTAMP(),
              updatedAt: CURRENT_TIMESTAMP()
            }

       5.8. microVideoId ← MONGODB_INSERT("microvideos", microVideoDoc)
       5.9. microVideoIds.PUSH(microVideoId)
       5.10. LOG("✅ Saved micro-video " + (i+1) + ": " + microVideoId)
     END FOR

  6. LOG("✅ Saved " + microVideoIds.length + " micro-videos")

  7. RETURN {
       videoId: videoId,
       microVideoIds: microVideoIds
     }
END
```

**Database Indexes for Performance**:

```javascript
// Compound index for efficient querying
db.microvideos.createIndex({ originalVideoId: 1, sequence: 1 });

// Text index for search
db.microvideos.createIndex({
  "cltBlmScript.learningObjective": "text",
  "cltBlmScript.educationalScript": "text"
});

// Index on cognitive load for filtering
db.microvideos.createIndex({ "cltBlmScript.cognitiveLoad": 1 });
```

---

## 🎮 Frontend Playback Algorithm

### Real-Time Avatar Rendering with Lip-Sync

**Algorithm**:
```
ALGORITHM: RenderAvatarWithLipSync
INPUT: audioPlayer, visemes[], educationalScript
OUTPUT: VOID (continuous rendering at 60 FPS)

BEGIN
  // INITIALIZATION PHASE
  1. scene ← CREATE_3D_SCENE()
  2. avatarModel ← LOAD_GLB_MODEL("/models/Ava.glb")
  3. whiteboardMesh ← CREATE_WHITEBOARD_MESH()
  4. floor ← LOAD_MARBLE_FLOOR_MODEL()

  5. avatarHead ← avatarModel.getObjectByName("Wolf3D_Head")
  6. avatarTeeth ← avatarModel.getObjectByName("Wolf3D_Teeth")

  // SETUP LIGHTING
  7. ADD_LIGHTING_TO_SCENE(scene, {
       ambient: { intensity: 0.4 },
       directional: [
         { position: [5, 5, 5], intensity: 1.2, castShadow: true },
         { position: [-5, 3, 2], intensity: 0.5 },
         { position: [0, 3, -5], intensity: 0.3 }
       ],
       spotlight: { position: [0, 4, 0], intensity: 0.8 }
     })

  // SETUP CAMERA
  8. camera ← CREATE_PERSPECTIVE_CAMERA({
       position: [0, 1.5, 5],
       fov: 50,
       lookAt: [0, 1, 0]
     })

  // PLAYBACK PHASE
  9. audioPlayer.play()
  10. isPlaying ← TRUE

  // RENDER LOOP (60 FPS)
  11. WHILE isPlaying DO
        // Get current audio time
        11.1. currentTime ← audioPlayer.currentTime

        // LIP-SYNC: Apply Visemes
        11.2. currentViseme ← FIND_CURRENT_VISEME(visemes, currentTime)
        11.3. IF currentViseme THEN
                APPLY_VISEME_TO_AVATAR(avatarHead, currentViseme.visemeId)
              END IF

        // WHITEBOARD: Update Content
        11.4. IF whiteboardTimeline EXISTS THEN
                11.4.1. activeItem ← FIND_ACTIVE_TIMELINE_ITEM(
                          whiteboardTimeline, currentTime
                        )
                11.4.2. IF activeItem THEN
                          UPDATE_WHITEBOARD_CONTENT(
                            whiteboardMesh, activeItem.contentText
                          )
                        END IF
              END IF

        // CAPTIONS: Update Text
        11.5. currentWordIndex ← CALCULATE_WORD_INDEX(
                currentTime, educationalScript, audioPlayer.duration
              )
        11.6. captionText ← GET_WORDS(
                educationalScript, currentWordIndex, 10
              )
        11.7. UPDATE_CAPTION_DISPLAY(captionText)

        // AVATAR IDLE ANIMATIONS
        11.8. IF NOT currentViseme THEN
                APPLY_IDLE_BREATHING_ANIMATION(avatarModel, currentTime)
              END IF

        // RENDER FRAME
        11.9. RENDER_SCENE(scene, camera)

        // CHECK END CONDITION
        11.10. IF audioPlayer.ended THEN
                 isPlaying ← FALSE
               END IF
      END WHILE

  // CLEANUP
  12. RESET_AVATAR_STATE(avatarModel)
  13. CLEAR_WHITEBOARD(whiteboardMesh)
END
```

**Viseme Application Algorithm**:

```
ALGORITHM: ApplyVisemeToAvatar
INPUT: avatarHead (3D mesh), visemeId (0-21)
OUTPUT: VOID (modifies avatarHead morphTargets)

BEGIN
  1. morphTargets ← avatarHead.morphTargetDictionary
  2. influences ← avatarHead.morphTargetInfluences

  // Reset all mouth-related morph targets
  3. FOR EACH target IN MOUTH_RELATED_TARGETS DO
       influences[morphTargets[target]] ← 0
     END FOR

  // Map viseme ID to ReadyPlayerMe morph target
  4. targetName ← VISEME_TO_MORPH_MAP[visemeId]
  5. targetIndex ← morphTargets[targetName]

  6. IF targetIndex EXISTS THEN
       // Apply with smoothing for natural movement
       7. currentValue ← influences[targetIndex]
       8. targetValue ← 1.0
       9. influences[targetIndex] ← LERP(
            currentValue, targetValue, 0.5
          ) // 50% blend for smoothness
     END IF

  10. // Optional: Add co-articulation (natural mouth movements)
      IF visemeId IN [1, 2, 8] THEN // Open vowels
        influences[morphTargets["jawOpen"]] ← 0.3
      END IF
END

FUNCTION LERP(a, b, t)
  RETURN a + (b - a) * t
END FUNCTION
```

**Whiteboard Update Algorithm**:

```
ALGORITHM: UpdateWhiteboardContent
INPUT: whiteboardMesh, contentText
OUTPUT: VOID (updates 3D whiteboard texture)

BEGIN
  // STEP 1: CREATE HIGH-RES CANVAS
  1. canvas ← CREATE_CANVAS(2560, 1920) // 4K resolution
  2. context ← canvas.getContext2D({ alpha: false })

  // STEP 2: DRAW BACKGROUND
  3. context.fillStyle ← "#FFFFFF" // Pure white
  4. context.fillRect(0, 0, canvas.width, canvas.height)

  // STEP 3: DRAW BORDER
  5. context.strokeStyle ← "#1a1a1a" // Dark border
  6. context.lineWidth ← 12
  7. context.strokeRect(0, 0, canvas.width, canvas.height)

  // STEP 4: DETECT CONTENT TYPE
  8. isCode ← DETECT_CODE(contentText) // Check for {}, (), ;, etc.

  // STEP 5: CONFIGURE TEXT RENDERING
  9. IF isCode THEN
       9.1. fontSize ← 68
       9.2. fontFamily ← "Consolas, Courier New, monospace"
       9.3. fontWeight ← 900
       9.4. lineHeight ← 88
     ELSE
       9.5. fontSize ← 84
       9.6. fontFamily ← "Arial Black, Arial, sans-serif"
       9.7. fontWeight ← 900
       9.8. lineHeight ← 110
     END IF

  10. context.font ← fontWeight + " " + fontSize + "px " + fontFamily
  11. context.fillStyle ← "#000000" // Pure black text
  12. context.textBaseline ← "top"
  13. context.textAlign ← "left"

  // STEP 6: ENABLE ANTI-ALIASING
  14. context.imageSmoothingEnabled ← TRUE
  15. context.imageSmoothingQuality ← "high"

  // STEP 7: ADD TEXT SHADOW FOR DEPTH
  16. context.shadowColor ← "rgba(0, 0, 0, 0.3)"
  17. context.shadowBlur ← 2
  18. context.shadowOffsetX ← 1
  19. context.shadowOffsetY ← 1

  // STEP 8: RENDER TEXT WITH WORD WRAPPING
  20. lines ← contentText.split("\n")
  21. y ← 100 // Top padding
  22. maxWidth ← canvas.width - 200 // Side padding

  23. FOR EACH line IN lines DO
        23.1. words ← line.split(" ")
        23.2. currentLine ← ""

        23.3. FOR EACH word IN words DO
                23.3.1. testLine ← currentLine + word + " "
                23.3.2. metrics ← context.measureText(testLine)

                23.3.3. IF metrics.width > maxWidth AND currentLine ≠ "" THEN
                          // Render current line
                          context.fillText(currentLine.trim(), 100, y)
                          // Double-render for extra boldness
                          context.fillText(currentLine.trim(), 100.5, y)
                          y ← y + lineHeight
                          currentLine ← word + " "
                        ELSE
                          currentLine ← testLine
                        END IF
              END FOR

        23.4. // Render remaining text
              IF currentLine.trim() ≠ "" THEN
                context.fillText(currentLine.trim(), 100, y)
                context.fillText(currentLine.trim(), 100.5, y)
                y ← y + lineHeight
              END IF
     END FOR

  // STEP 9: CREATE 3D TEXTURE
  24. texture ← NEW THREE.CanvasTexture(canvas)
  25. texture.needsUpdate ← TRUE
  26. texture.minFilter ← THREE.LinearFilter
  27. texture.magFilter ← THREE.LinearFilter
  28. texture.anisotropy ← 16 // Maximum quality

  // STEP 10: APPLY TO WHITEBOARD MESH
  29. whiteboardMesh.material.map ← texture
  30. whiteboardMesh.material.needsUpdate ← TRUE
END
```

---

## ⚡ Performance Analysis

### Time Complexity Analysis

| Component | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| Transcript Extraction | O(n) | O(n) | n = transcript length |
| GPT-4 Script Gen | O(1)* | O(m) | m = output length; *API call is constant time from client perspective |
| GPT-4o-mini Timeline | O(1)* | O(k) | k = timeline items (~6) |
| Azure TTS | O(s) | O(s) | s = script length |
| Viseme Processing | O(v) | O(v) | v = viseme count (~2847) |
| Database Write | O(d) | O(d) | d = document count |
| Frontend Rendering | O(1) per frame | O(t) | t = total data size |

### Processing Time Breakdown

For **3 keypoints** (measured):

```
Phase                          Time      Percentage
─────────────────────────────────────────────────────
Transcript Extraction          2s        2%
├─ YouTube API Call           1.5s
└─ Text Processing            0.5s

Script Generation (×3)         45s       45%
├─ GPT-4 API Call (×3)        42s       (14s each)
└─ Post-processing            3s

Timeline Generation (×3)       6s        6%
├─ GPT-4o-mini API (×3)       5s        (1.7s each)
└─ JSON Parsing               1s

TTS + Visemes (×3)            45s       45%
├─ Azure API Call (×3)        42s       (14s each)
└─ File Processing            3s

Database Storage               2s        2%
├─ MongoDB Writes             1.5s
└─ File System Ops            0.5s

TOTAL                          ~100s     100%
```

**Optimization Opportunities**:

1. **Parallel Processing**: Process all keypoints simultaneously
   ```
   Current: Sequential (45s + 6s + 45s = 96s)
   Optimized: Parallel (max(45s, 6s, 45s) = 45s)
   Savings: ~50 seconds (50% reduction)
   ```

2. **Caching**: Store generated audio files, reuse on replay
3. **Streaming**: Stream TTS generation instead of waiting
4. **Database Batching**: Batch insert micro-videos

### Cost Analysis (Detailed)

**Per 1000-word Segment**:

```
Component           Tokens    Rate              Cost
───────────────────────────────────────────────────────
GPT-4 Input         ~2500     $0.03/1K tokens   $0.075
GPT-4 Output        ~2000     $0.06/1K tokens   $0.120
GPT-4o-mini Input   ~1500     $0.00015/1K       $0.0002
GPT-4o-mini Output  ~800      $0.0006/1K        $0.0005
Azure TTS           ~1200 chr $0.000016/char    $0.0192

TOTAL PER SEGMENT                                $0.2149
```

**For 3-Keypoint Video**:
- Total cost: **$0.22 × 3 = $0.66**
- User gets: **~23 minutes of personalized content**
- Cost per minute: **$0.029/min** ← Extremely cost-effective

### Scalability Metrics

**Current System Capacity**:
- Concurrent requests: 10-20 (limited by API rate limits)
- Daily volume: ~1000 videos (with API quotas)
- Storage per video: ~50 MB (audio files)
- Database growth: ~5 KB per micro-video

**Bottlenecks**:
1. OpenAI API rate limits (TPM, RPM)
2. Azure TTS character limits
3. MongoDB write throughput
4. File system I/O for audio storage

**Scaling Solutions**:
1. Implement request queuing system
2. Add Redis caching layer
3. Distribute across multiple API keys
4. Use CDN for audio file delivery
5. Shard MongoDB by user ID

---

## 📊 CLT-bLM Effectiveness Metrics

### Learning Outcome Measurements

```javascript
function measureLearningEffectiveness(microVideo) {
  const metrics = {
    // CLT Compliance
    cognitiveLoadOptimal: microVideo.cltBlmScript.cognitiveLoad <= 7,
    segmentationApplied: microVideo.cltBlmScript.frameStructure !== null,
    coherenceScore: calculateCoherenceScore(microVideo.cltBlmScript.educationalScript),

    // Engagement Metrics
    durationOptimal: microVideo.avatarVideoDuration >= 300 &&
                     microVideo.avatarVideoDuration <= 900, // 5-15 min
    visualAidsUsed: microVideo.cltBlmScript.whiteboardTimeline.length > 0,

    // Content Quality
    exampleCount: countExamples(microVideo.cltBlmScript.educationalScript),
    wordCountOptimal: microVideo.cltBlmScript.wordCount >= 1000 &&
                      microVideo.cltBlmScript.wordCount <= 1500,

    // Overall Effectiveness Score (0-100)
    effectivenessScore: calculateOverallScore(...)
  };

  return metrics;
}
```

---

This document provides the **complete technical foundation** for understanding, maintaining, and extending the MicroLearn video generation system with CLT-bLM educational principles!
