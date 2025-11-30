import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODELS = {
  TEXT: "gemini-2.5-flash", 
  IMAGE: "gemini-2.5-flash-image"
};

const safeJsonParse = (text: string) => {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {
    try {
      let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (e2) {
      const start = text.indexOf('{'), end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    }
  }
  return null;
};

export const callGemini = async (prompt: string, systemInstruction: string, isJson: boolean = false): Promise<string> => {
  try {
    const config: any = {
      temperature: 0.85,
    };

    if (isJson) {
      config.responseMimeType = "application/json";
    }

    // Using generateContent as per guidelines
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        ...config,
        systemInstruction: systemInstruction,
      },
    });

    const text = response.text;
    if (!text) throw new Error("API returned empty content");
    return text;
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    throw new Error(e.message || "Failed to generate content");
  }
};

export const callImageGen = async (prompt: string): Promise<string> => {
  try {
    // Using gemini-2.5-flash-image for image generation
    const response = await ai.models.generateContent({
      model: MODELS.IMAGE,
      contents: prompt,
      config: {
        responseMimeType: "image/png"
      }
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned");
  } catch (e: any) {
    console.error("Image Gen Error:", e);
    // Fallback to a placeholder if API fails or quota exceeded
    return `https://picsum.photos/seed/${encodeURIComponent(prompt).slice(0, 10)}/512/512`;
  }
};

export { safeJsonParse };