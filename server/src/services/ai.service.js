import env from '../config/env.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

const PARSE_QUESTIONS_PROMPT = `You are an MCQ question parser. Given raw text containing questions, extract and convert them into structured JSON.

Return ONLY a valid JSON array (no markdown fences, no commentary). Each element:
{
  "question": "string - the question text",
  "optionA": "string - first option",
  "optionB": "string - second option",
  "optionC": "string - third option",
  "optionD": "string - fourth option",
  "correctAnswer": "A" | "B" | "C" | "D"
}

Rules:
- If the user's text has 4 options, map them to A/B/C/D.
- If fewer than 4 options exist, add reasonable distractors.
- "correctAnswer" must be the letter of the correct option.
- Strip numbering like "1." or "Q1:" from the question text.
- If you cannot parse any question, skip it. Return [] if nothing is parseable.`;

const parseQuestionsFromText = async (rawText) => {
  const apiKey = env.geminiApiKey;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Contact the administrator.');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PARSE_QUESTIONS_PROMPT }] },
      contents: [{ parts: [{ text: rawText }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('[AI] Gemini API error:', response.status, errorBody);
    throw new Error(`AI service returned status ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  let questions;
  try {
    const cleaned = content.replace(/^```json\n?|\n?```$/g, '').trim();
    questions = JSON.parse(cleaned);
  } catch {
    console.error('[AI] Failed to parse AI response as JSON:', content);
    throw new Error('AI returned invalid JSON. Try simplifying your input.');
  }

  if (!Array.isArray(questions)) {
    throw new Error('AI response was not an array of questions');
  }

  const validQuestions = questions.filter(
    (q) =>
      q.question &&
      q.optionA &&
      q.optionB &&
      q.optionC &&
      q.optionD &&
      ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
  );

  return validQuestions;
};

export default { parseQuestionsFromText };
