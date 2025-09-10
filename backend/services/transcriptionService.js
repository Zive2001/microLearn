const OpenAI = require('openai');
const fs = require('fs');
const { createReadStream } = require('fs');
const path = require('path');

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Transcribe audio using OpenAI Whisper API
 */
const transcribeAudio = async (audioPath, language = "en") => {
  try {
    if (!openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    console.log(`Starting transcription for: ${audioPath}`);

    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error("Audio file not found");
    }

    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    console.log(`Audio file size: ${fileSizeInMB.toFixed(2)} MB`);

    // OpenAI has a 25MB limit for audio files
    if (fileSizeInMB > 25) {
      throw new Error(
        "Audio file size exceeds 25MB limit. Please compress the audio."
      );
    }

    // Create file stream
    const audioStream = createReadStream(audioPath);

    // Call OpenAI Whisper API with detailed response
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: language,
      response_format: "verbose_json",
      temperature: 0.2, // Lower temperature for more consistent results
      timestamp_granularities: ["segment", "word"],
    });

    console.log("Transcription completed successfully");

    // Process and enhance the transcription
    const processedTranscript = await processTranscription(
      transcription,
      language
    );

    return processedTranscript;
  } catch (error) {
    console.error("Transcription error:", error);

    if (error.response?.status === 413) {
      throw new Error("Audio file too large. Maximum size is 25MB.");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid audio file format or corrupted file.");
    } else if (error.response?.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else if (error.response?.status === 401) {
      throw new Error("Invalid OpenAI API key.");
    }

    throw new Error(`Transcription failed: ${error.message}`);
  }
};

/**
 * Process and enhance transcription results
 */
const processTranscription = async (transcription, language) => {
  try {
    const segments = transcription.segments || [];
    const words = transcription.words || [];

    // Process segments with enhanced metadata
    const processedSegments = segments.map((segment, index) => {
      // Calculate confidence based on word-level confidence if available
      const segmentWords = words.filter(
        (word) => word.start >= segment.start && word.end <= segment.end
      );

      const wordConfidences = segmentWords.map(
        (word) => word.confidence || 0.8
      );
      const averageConfidence =
        wordConfidences.length > 0
          ? wordConfidences.reduce((sum, conf) => sum + conf, 0) /
            wordConfidences.length
          : 0.8;

      return {
        id: segment.id || index,
        start: Math.round(segment.start * 1000), // Convert to milliseconds
        end: Math.round(segment.end * 1000),
        duration: Math.round((segment.end - segment.start) * 1000),
        text: segment.text.trim(),
        confidence: Math.round(averageConfidence * 100) / 100,

        // Enhanced metadata
        wordCount: segment.text.trim().split(/\s+/).length,
        hasNumbers: /\d/.test(segment.text),
        hasPunctuation: /[.!?;:]/.test(segment.text),
        speakingRate: calculateSpeakingRate(
          segment.text,
          segment.end - segment.start
        ),

        // CLT-bLM relevance markers
        keyPhrases: extractKeyPhrases(segment.text),
        conceptualDensity: calculateConceptualDensity(segment.text),

        // Segment classification
        type: classifySegment(segment.text),
        importance: calculateImportance(segment.text, index, segments.length),
      };
    });

    // Generate quality metrics
    const quality = calculateQualityMetrics(processedSegments, transcription);

    // Create full text with timestamps
    const fullText = processedSegments
      .map((segment) => `[${formatTime(segment.start)}] ${segment.text}`)
      .join("\n");

    // Generate summary statistics
    const statistics = generateStatistics(processedSegments);

    return {
      segments: processedSegments,
      fullText: transcription.text,
      fullTextWithTimestamps: fullText,
      language: transcription.language || language,
      duration: transcription.duration,
      quality,
      statistics,

      // Metadata for CLT-bLM processing
      processingMetadata: {
        totalSegments: processedSegments.length,
        averageSegmentLength: statistics.averageSegmentDuration,
        conceptualComplexity: statistics.averageConceptualDensity,
        processingTime: new Date().toISOString(),
        whisperModel: "whisper-1",
      },
    };
  } catch (error) {
    console.error("Transcription processing error:", error);
    throw new Error(`Failed to process transcription: ${error.message}`);
  }
};

/**
 * Calculate speaking rate (words per minute)
 */
const calculateSpeakingRate = (text, durationInSeconds) => {
  const wordCount = text.trim().split(/\s+/).length;
  const durationInMinutes = durationInSeconds / 60;
  return durationInMinutes > 0 ? Math.round(wordCount / durationInMinutes) : 0;
};

/**
 * Extract key phrases from text
 */
const extractKeyPhrases = (text) => {
  // Simple keyword extraction - can be enhanced with NLP libraries
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Remove common stop words
  const stopWords = new Set([
    "this",
    "that",
    "with",
    "have",
    "will",
    "from",
    "they",
    "know",
    "want",
    "been",
    "good",
    "much",
    "some",
    "time",
    "very",
    "when",
    "come",
    "here",
    "just",
    "like",
    "long",
    "make",
    "many",
    "over",
    "such",
    "take",
    "than",
    "them",
    "well",
    "were",
    "what",
  ]);

  const keyWords = words.filter((word) => !stopWords.has(word));

  // Return top 3 key phrases
  return keyWords.slice(0, 3);
};

/**
 * Calculate conceptual density (complexity measure)
 */
const calculateConceptualDensity = (text) => {
  const totalWords = text.trim().split(/\s+/).length;

  // Count technical/complex terms indicators
  const complexIndicators = [
    /\b\w{8,}\b/g, // Long words (8+ chars)
    /\b[A-Z]{2,}\b/g, // Acronyms
    /\b\d+\.\d+\b/g, // Numbers with decimals
    /\b(process|system|method|concept|principle|theory|analysis|research|study|data|information|technology|development|implementation|optimization|integration|framework|methodology|algorithm|parameter|variable|function|component|structure|architecture|design|model|approach|strategy|technique|solution|application|evaluation|assessment|measurement|calculation|computation|operation|execution|configuration|specification|requirement|criteria|standard|protocol|procedure|workflow|pipeline|infrastructure|platform|environment|interface|database|network|security|performance|efficiency|scalability|reliability|availability|maintainability|usability|accessibility|compatibility|interoperability|sustainability|innovation|transformation|evolution|advancement|improvement|enhancement|refinement|customization|personalization|adaptation|modification|adjustment|calibration|validation|verification|testing|debugging|troubleshooting|monitoring|tracking|reporting|documentation|specification|requirement|criteria|standard|guideline|best practice|recommendation|suggestion|proposal|plan|strategy|roadmap|timeline|milestone|deliverable|outcome|result|impact|benefit|advantage|disadvantage|limitation|constraint|challenge|risk|issue|problem|solution|alternative|option|choice|decision|consideration|factor|aspect|element|feature|characteristic|attribute|property|quality|metric|measure|indicator|benchmark|baseline|threshold|target|goal|objective|purpose|intention|motivation|reason|cause|effect|consequence|implication|significance|importance|relevance|applicability|suitability|feasibility|viability|practicality|effectiveness|efficiency|productivity|performance|quality|reliability|accuracy|precision|consistency|stability|robustness|resilience|flexibility|adaptability|scalability|extensibility|maintainability|sustainability|security|privacy|compliance|governance|regulation|policy|guideline|standard|protocol|procedure|practice|convention|tradition|custom|habit|routine|pattern|trend|tendency|behavior|action|activity|task|operation|function|role|responsibility|duty|obligation|commitment|promise|agreement|contract|arrangement|partnership|collaboration|cooperation|coordination|communication|interaction|engagement|participation|involvement|contribution|support|assistance|help|guidance|direction|instruction|education|training|learning|teaching|knowledge|skill|expertise|experience|understanding|comprehension|awareness|recognition|identification|discovery|exploration|investigation|research|study|analysis|examination|inspection|review|evaluation|assessment|appraisal|judgment|opinion|perspective|viewpoint|standpoint|position|stance|approach|attitude|mindset|philosophy|belief|value|principle|ethic|moral|standard|norm|expectation|assumption|hypothesis|theory|concept|idea|thought|notion|impression|perception|observation|insight|revelation|realization|understanding|comprehension|knowledge|wisdom|intelligence|smartness|cleverness|brilliance|genius|talent|ability|capability|capacity|potential|power|strength|force|energy|motivation|drive|ambition|determination|perseverance|persistence|commitment|dedication|devotion|passion|enthusiasm|excitement|interest|curiosity|wonder|amazement|surprise|shock|astonishment|bewilderment|confusion|uncertainty|doubt|skepticism|suspicion|distrust|mistrust|concern|worry|anxiety|fear|apprehension|nervousness|stress|tension|pressure|strain|burden|load|weight|responsibility|accountability|liability|obligation|duty|requirement|necessity|need|demand|request|desire|want|wish|hope|expectation|anticipation|prediction|forecast|projection|estimate|calculation|computation|analysis|evaluation|assessment|measurement|quantification|qualification|classification|categorization|grouping|sorting|ranking|ordering|prioritization|organization|arrangement|structure|framework|system|model|representation|illustration|demonstration|example|instance|case|scenario|situation|circumstance|condition|state|status|position|location|place|space|area|region|zone|sector|domain|field|sphere|realm|territory|boundary|limit|edge|border|frontier|threshold|point|level|degree|extent|scope|range|scale|magnitude|size|dimension|proportion|ratio|percentage|fraction|part|portion|section|segment|component|element|unit|item|piece|bit|fragment|particle|atom|molecule|cell|organism|entity|object|thing|stuff|material|substance|matter|content|information|data|knowledge|fact|detail|specification|description|explanation|definition|meaning|sense|significance|importance|value|worth|benefit|advantage|gain|profit|return|reward|compensation|payment|cost|price|expense|investment|expenditure|budget|finance|money|currency|cash|capital|asset|resource|tool|instrument|device|equipment|machine|apparatus|system|technology|innovation|invention|creation|development|advancement|progress|improvement|enhancement|upgrade|update|modification|change|transformation|conversion|transition|shift|move|movement|motion|action|activity|operation|function|process|procedure|method|technique|approach|strategy|plan|scheme|program|project|initiative|effort|attempt|try|trial|test|experiment|study|research|investigation|exploration|discovery|finding|result|outcome|conclusion|summary|overview|synopsis|abstract|extract|excerpt|quote|citation|reference|source|origin)/gi,
  ].map((pattern) => (text.match(pattern) || []).length);

  const complexTermCount = complexIndicators.reduce(
    (sum, count) => sum + count,
    0
  );

  return totalWords > 0 ? Math.min(complexTermCount / totalWords, 1) : 0;
};

/**
 * Classify segment type
 */
const classifySegment = (text) => {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("introduction") ||
    lowerText.includes("welcome") ||
    lowerText.includes("today we")
  ) {
    return "introduction";
  } else if (
    lowerText.includes("conclusion") ||
    lowerText.includes("summary") ||
    lowerText.includes("to recap")
  ) {
    return "conclusion";
  } else if (
    lowerText.includes("example") ||
    lowerText.includes("for instance") ||
    lowerText.includes("such as")
  ) {
    return "example";
  } else if (
    lowerText.includes("definition") ||
    lowerText.includes("means") ||
    lowerText.includes("is defined as")
  ) {
    return "definition";
  } else if (lowerText.includes("question") || lowerText.includes("?")) {
    return "question";
  } else if (
    lowerText.includes("step") ||
    lowerText.includes("first") ||
    lowerText.includes("then") ||
    lowerText.includes("next")
  ) {
    return "instruction";
  } else {
    return "content";
  }
};

/**
 * Calculate segment importance
 */
const calculateImportance = (text, index, totalSegments) => {
  let importance = 0.5; // Base importance

  // Position-based importance
  if (index < totalSegments * 0.1) importance += 0.2; // First 10%
  if (index > totalSegments * 0.9) importance += 0.2; // Last 10%

  // Content-based importance
  const lowerText = text.toLowerCase();

  // Key terms increase importance
  const keyTerms = [
    "important",
    "key",
    "main",
    "primary",
    "essential",
    "crucial",
    "critical",
    "remember",
    "note",
    "understand",
    "concept",
    "principle",
    "definition",
    "conclusion",
    "summary",
    "result",
    "finding",
  ];

  keyTerms.forEach((term) => {
    if (lowerText.includes(term)) importance += 0.1;
  });

  // Question marks indicate important points
  if (text.includes("?")) importance += 0.1;

  // Numbers and data indicate important information
  if (/\d+/.test(text)) importance += 0.05;

  return Math.min(Math.max(importance, 0), 1); // Clamp between 0 and 1
};

/**
 * Calculate overall quality metrics
 */
const calculateQualityMetrics = (segments, originalTranscription) => {
  const avgConfidence =
    segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
  const avgSpeakingRate =
    segments.reduce((sum, seg) => sum + seg.speakingRate, 0) / segments.length;

  // Quality factors
  const confidenceScore = avgConfidence;
  const consistencyScore = calculateConsistencyScore(segments);
  const completenessScore = calculateCompletenessScore(
    segments,
    originalTranscription
  );

  return {
    overallConfidence: Math.round(avgConfidence * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    completenessScore: Math.round(completenessScore * 100) / 100,
    averageSpeakingRate: Math.round(avgSpeakingRate),

    // Composite scores
    transcriptionQuality: Math.round(
      ((confidenceScore + consistencyScore + completenessScore) / 3) * 100
    ),

    // Quality indicators
    hasLowConfidenceSegments: segments.some((seg) => seg.confidence < 0.7),
    hasVeryFastSpeech: segments.some((seg) => seg.speakingRate > 200),
    hasVerySlowSpeech: segments.some((seg) => seg.speakingRate < 100),

    // Processing metadata
    totalSegments: segments.length,
    processingDate: new Date().toISOString(),
  };
};

/**
 * Calculate consistency score
 */
const calculateConsistencyScore = (segments) => {
  if (segments.length < 2) return 1;

  const speakingRates = segments.map((seg) => seg.speakingRate);
  const confidences = segments.map((seg) => seg.confidence);

  // Calculate standard deviation for speaking rates
  const avgRate =
    speakingRates.reduce((sum, rate) => sum + rate, 0) / speakingRates.length;
  const rateVariance =
    speakingRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) /
    speakingRates.length;
  const rateStdDev = Math.sqrt(rateVariance);

  // Calculate standard deviation for confidence
  const avgConf =
    confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  const confVariance =
    confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConf, 2), 0) /
    confidences.length;
  const confStdDev = Math.sqrt(confVariance);

  // Lower standard deviation = higher consistency
  const rateConsistency = Math.max(0, 1 - rateStdDev / avgRate);
  const confConsistency = Math.max(0, 1 - confStdDev / avgConf);

  return (rateConsistency + confConsistency) / 2;
};

/**
 * Calculate completeness score
 */
const calculateCompletenessScore = (segments, originalTranscription) => {
  // Check for gaps in timestamps
  let gapPenalty = 0;
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap > 1000) {
      // Gap larger than 1 second
      gapPenalty += 0.1;
    }
  }

  // Check text completeness (no excessive "[inaudible]" or similar)
  const fullText = originalTranscription.text || "";
  const inaudibleCount = (
    fullText.match(/\[inaudible\]|\[unclear\]|\[music\]|\[noise\]/gi) || []
  ).length;
  const inaudiblePenalty = Math.min(inaudibleCount * 0.05, 0.3);

  return Math.max(0, 1 - gapPenalty - inaudiblePenalty);
};

/**
 * Generate summary statistics
 */
const generateStatistics = (segments) => {
  const durations = segments.map((seg) => seg.duration);
  const wordCounts = segments.map((seg) => seg.wordCount);
  const confidences = segments.map((seg) => seg.confidence);
  const speakingRates = segments.map((seg) => seg.speakingRate);
  const conceptualDensities = segments.map((seg) => seg.conceptualDensity);

  return {
    totalDuration: durations.reduce((sum, dur) => sum + dur, 0),
    averageSegmentDuration:
      durations.reduce((sum, dur) => sum + dur, 0) / durations.length,
    totalWords: wordCounts.reduce((sum, count) => sum + count, 0),
    averageWordsPerSegment:
      wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length,
    averageConfidence:
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
    averageSpeakingRate:
      speakingRates.reduce((sum, rate) => sum + rate, 0) / speakingRates.length,
    averageConceptualDensity:
      conceptualDensities.reduce((sum, density) => sum + density, 0) /
      conceptualDensities.length,

    // Segment type distribution
    segmentTypes: segments.reduce((acc, seg) => {
      acc[seg.type] = (acc[seg.type] || 0) + 1;
      return acc;
    }, {}),

    // Quality distribution
    highImportanceSegments: segments.filter((seg) => seg.importance > 0.7)
      .length,
    lowConfidenceSegments: segments.filter((seg) => seg.confidence < 0.7)
      .length,
  };
};

/**
 * Format time in MM:SS format
 */
const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Batch transcribe multiple audio files
 */
const batchTranscribe = async (audioPaths, language = "en") => {
  const results = [];

  for (const audioPath of audioPaths) {
    try {
      console.log(`Processing: ${path.basename(audioPath)}`);
      const result = await transcribeAudio(audioPath, language);
      results.push({
        file: audioPath,
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(`Failed to process ${audioPath}:`, error.message);
      results.push({
        file: audioPath,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

module.exports = {
  transcribeAudio,
  batchTranscribe,
};
