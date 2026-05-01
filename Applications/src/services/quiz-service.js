import { geminiClient } from './gemini-client';

export const quizService = {
  async generateQuiz(noteText) {
    if (!noteText || noteText.trim().length < 50) {
      throw new Error("Note text is too short to generate a quiz.");
    }

    // Truncate if necessary (15,000 characters limit)
    const truncatedText = noteText.substring(0, 15000);

    const prompt = `You are an expert tutor. Your task is to read the following notes and generate a highly effective quiz in the form of flashcards for active recall study.

    Return EXACTLY a JSON array of objects. Do not include markdown code blocks like \`\`\`json. Return only the raw JSON array.
    Each object must have exactly two keys: "question" and "answer".
    Make sure the questions test key concepts, not just trivia. Include 5 to 10 questions depending on the note length.
    
    Notes content:
    ${truncatedText}
    `;

    try {
      const result = await geminiClient.sendMessage([{ role: 'user', content: prompt }]);
      if (!result.success) throw new Error(result.error);

      // Robust JSON parsing (handles markdown code block if Gemini ignores instruction)
      let rawResponse = result.response;
      rawResponse = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsedData = JSON.parse(rawResponse);
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("Invalid format received from AI.");
      }
      return parsedData;
    } catch (error) {
      console.error("Quiz generation failed:", error);
      throw new Error("Failed to generate quiz. Please try again later.");
    }
  }
};
