/**
 * Token Estimator and Counter for Architecture & Context Graph
 * Provides deterministic token accounting compatible with GPT/Claude/Gemini tokenizers.
 */

function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  if (text.length === 0) return 0;

  // Code tokenization heuristic:
  // Standard rule of thumb for English/code is ~3.7 - 4 characters per token.
  // We refine this with word/symbol splitting to closely track BPE/cl100k behavior.
  let tokens = 0;
  // Match tokens: words, sequences of digits, single punctuation/operators, or newlines
  const regex = /[A-Za-z0-9_]+|[^\s\w]|\n|\r\n/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const segment = match[0];
    if (segment.length > 4) {
      // Long identifiers/strings break into multiple tokens (avg ~3.5 chars per sub-token)
      tokens += Math.ceil(segment.length / 3.5);
    } else {
      tokens += 1;
    }
  }

  return Math.max(1, tokens);
}

function countLines(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.split('\n').length;
}

function formatTokenCount(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

module.exports = {
  estimateTokens,
  countLines,
  formatTokenCount
};
