import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function translateLyrics(
  lyrics: string,
  sourceLanguage: string,
  targetLanguage = "en",
): Promise<string> {
  const systemPrompt = `You are a professional lyricist and translator specializing in music translation.
Your task is to translate song lyrics from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Preserve the poetic meaning, emotion, and rhythm — NOT word-for-word literal translation
- Keep the same line breaks and verse structure as the original
- Maintain the number of syllables per line as closely as possible (for singability)
- Preserve rhyme schemes where natural in the target language
- Return ONLY the translated lyrics — no explanations, no annotations, no commentary`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Translate these lyrics:\n\n${lyrics}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 2000,
  });

  const result = completion.choices[0]?.message.content;
  if (!result) throw new Error("OpenAI returned empty translation");

  return result.trim();
}
