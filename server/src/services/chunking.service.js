const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 75;
const CHARS_PER_TOKEN_ESTIMATE = 4;

const estimateTokens = (text) => Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);

const splitByHeadings = (markdown) => {
  const lines = markdown.split('\n');
  const sections = [];
  let currentHeading = '';
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      if (currentLines.length > 0 || currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join('\n').trim(),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections;
};

const splitByParagraphs = (text) => {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
};

const splitBySentences = (text) => {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => s.trim().length > 0);
};

const mergeSmallChunks = (chunks, maxTokens) => {
  const merged = [];
  let buffer = '';
  let bufferTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk);

    if (bufferTokens + chunkTokens <= maxTokens) {
      buffer = buffer ? `${buffer}\n\n${chunk}` : chunk;
      bufferTokens += chunkTokens;
    } else {
      if (buffer) {
        merged.push(buffer);
      }
      buffer = chunk;
      bufferTokens = chunkTokens;
    }
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged;
};

const createOverlappingChunks = (chunks, overlapTokens) => {
  if (chunks.length <= 1 || overlapTokens <= 0) return chunks;

  const overlapped = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunks = chunks.slice(Math.max(0, i - 2), i);
    const overlapText = prevChunks.join('\n\n');
    const overlapSentences = splitBySentences(overlapText);
    let overlapContent = '';
    let overlapTokenCount = 0;

    for (const sentence of reverse(overlapSentences)) {
      const sentenceTokens = estimateTokens(sentence);
      if (overlapTokenCount + sentenceTokens > overlapTokens) break;
      overlapContent = sentence + (overlapContent ? ' ' + overlapContent : '');
      overlapTokenCount += sentenceTokens;
    }

    if (overlapContent) {
      overlapped.push(`${overlapContent}\n\n${chunks[i]}`);
    } else {
      overlapped.push(chunks[i]);
    }
  }

  return overlapped;
};

const reverse = (arr) => [...arr].reverse();

const chunkSection = (section, headingPrefix) => {
  const { heading, content } = section;
  const fullHeading = headingPrefix ? `${headingPrefix} > ${heading}` : heading;

  if (!content || content.length === 0) {
    return [];
  }

  const contentTokens = estimateTokens(content);

  if (contentTokens <= TARGET_TOKENS) {
    return [{
      heading: fullHeading,
      text: content,
    }];
  }

  const paragraphs = splitByParagraphs(content);

  if (paragraphs.length === 1) {
    const sentences = splitBySentences(paragraphs[0]);
    const chunks = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);
      if (currentTokens + sentenceTokens > TARGET_TOKENS && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        currentTokens += sentenceTokens;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks.map((text) => ({ heading: fullHeading, text }));
  }

  const mergedParagraphs = mergeSmallChunks(paragraphs, TARGET_TOKENS);

  const finalChunks = [];
  for (const merged of mergedParagraphs) {
    if (estimateTokens(merged) > TARGET_TOKENS) {
      const sentences = splitBySentences(merged);
      let currentChunk = '';
      let currentTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        if (currentTokens + sentenceTokens > TARGET_TOKENS && currentChunk) {
          finalChunks.push({ heading: fullHeading, text: currentChunk });
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          currentTokens += sentenceTokens;
        }
      }
      if (currentChunk) finalChunks.push({ heading: fullHeading, text: currentChunk });
    } else {
      finalChunks.push({ heading: fullHeading, text: merged });
    }
  }

  return finalChunks;
};

const chunkMarkdown = (markdown) => {
  const sections = splitByHeadings(markdown);

  if (sections.length === 0) {
    const text = markdown.trim();
    if (!text) return [];
    return chunkSection({ heading: '', content: text }, '');
  }

  let allChunks = [];

  for (const section of sections) {
    const subChunks = chunkSection(section, '');
    allChunks = allChunks.concat(subChunks);
  }

  if (allChunks.length > 1) {
    allChunks = createOverlappingChunks(
      allChunks.map((c) => c.text),
      OVERLAP_TOKENS
    ).map((text, i) => ({
      heading: allChunks[i]?.heading || '',
      text,
    }));
  }

  return allChunks;
};

export { chunkMarkdown, estimateTokens, TARGET_TOKENS, OVERLAP_TOKENS };
