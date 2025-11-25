import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!aiInstance) {
    // @google/genai Coding Guidelines:
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    // Assume this variable is pre-configured, valid, and accessible.
    // We use a fallback to empty string to ensure type safety if the environment variable is undefined types-wise.
    const apiKey = process.env.API_KEY || "";
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const getChatSession = (): Chat => {
  if (!chatSession) {
    const ai = getAIClient();
    chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  }
  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const session = getChatSession();
    // Use sendMessage for chat interactions
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    // @google/genai Coding Guidelines:
    // The GenerateContentResponse object features a text property that directly returns the string output.
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다. 다시 시도해 주세요.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    chatSession = null; // Reset session to recover from potential state issues
    return "💥 **통신 오류 발생**: 우주 통신망에 일시적인 장애가 있습니다. 잠시 후 다시 시도해 주세요.";
  }
};

export const resetSession = () => {
  chatSession = null;
};