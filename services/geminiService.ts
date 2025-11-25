import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

// Robust API Key retrieval to handle various build environments (Vite, CRA, Next.js, Standard Node)
const getApiKey = (): string | undefined => {
  try {
    // 1. Check for global process.env (Node.js / Webpack / CRA / Next.js)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VAIT_API_KEY) return process.env.VAIT_API_KEY;
      if (process.env.REACT_APP_VAIT_API_KEY) return process.env.REACT_APP_VAIT_API_KEY;
      if (process.env.NEXT_PUBLIC_VAIT_API_KEY) return process.env.NEXT_PUBLIC_VAIT_API_KEY;
    }
    
    // 2. Check for import.meta.env (Vite)
    // @ts-ignore - import.meta might not be typed in all environments
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_VAIT_API_KEY) return import.meta.env.VITE_VAIT_API_KEY;
      // @ts-ignore
      if (import.meta.env.VAIT_API_KEY) return import.meta.env.VAIT_API_KEY;
    }
  } catch (e) {
    console.warn("Failed to retrieve API key from environment", e);
  }

  return undefined;
};

// Lazy initialization pattern to prevent startup crashes
let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    // Use a placeholder if missing to allow app to load, but calls will fail gracefully later
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "MISSING_KEY" });
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
  const apiKey = getApiKey();
  if (!apiKey) {
    return "🚨 **시스템 경고**: 통신 키(API Key)가 감지되지 않았습니다.\nVercel 환경 변수 설정에서 `VAIT_API_KEY`가 올바르게 설정되었는지 확인해주세요.";
  }

  try {
    const session = getChatSession();
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다. 다시 시도해 주세요.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Reset session on error to clear potential bad state
    chatSession = null;
    
    return "💥 **통신 오류 발생**: 우주 통신망에 일시적인 장애가 있습니다. 잠시 후 다시 시도해 주세요.";
  }
};

export const resetSession = () => {
  chatSession = null;
};