import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Helper to safely access Vite environment variables without crashing in non-Vite environments
const getViteEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    return import.meta.env?.[key];
  } catch (e) {
    return undefined;
  }
};

const getApiKey = (): string => {
  // Try to find the API Key in various common locations.
  // Vercel/Vite requires 'VITE_' prefix for client-side variables.
  const possibleKeys = [
    process.env.VITE_VAIT_API_KEY,      // Standard Vite format for custom key
    process.env.VAIT_API_KEY,           // User's requested key name
    process.env.API_KEY,                // Default fallback
    getViteEnv("VITE_VAIT_API_KEY"),    // Direct Vite access
    getViteEnv("VITE_API_KEY")          // Direct Vite access fallback
  ];

  // Return the first found non-empty key
  for (const key of possibleKeys) {
    if (key && key.trim() !== "") {
      return key.trim();
    }
  }
  return "";
};

const getAIClient = (): GoogleGenAI => {
  // Always recreate instance if key was missing previously but might be available now (rare, but good for stability)
  if (!aiInstance) {
    const apiKey = getApiKey();
    // We initialize even with empty string to allow the service to throw a proper error later
    // rather than crashing on import.
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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return `⚠️ **시스템 경고: API 키 누락**\n\n통신 키(API Key)가 감지되지 않았습니다.\nVercel 환경 변수 설정에서 변수 이름을 **\`VITE_VAIT_API_KEY\`**로 변경해 주세요.\n\n(참고: Vite/React 배포 환경에서는 보안상 \`VITE_\` 접두사가 필수입니다.)`;
  }

  try {
    const session = getChatSession();
    // Use sendMessage for chat interactions
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    // @google/genai Coding Guidelines:
    // The GenerateContentResponse object features a text property that directly returns the string output.
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다. 다시 시도해 주세요.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    chatSession = null; // Reset session to recover from potential state issues
    
    const errorMsg = error.toString().toLowerCase();
    
    if (errorMsg.includes("403") || errorMsg.includes("key")) {
       return "🚫 **인증 오류**: 설정된 API 키가 유효하지 않거나 만료되었습니다. Vercel 환경 변수를 확인해 주세요.";
    }

    return "💥 **통신 오류 발생**: 우주 통신망에 일시적인 장애가 있습니다. 잠시 후 다시 시도해 주세요.";
  }
};

export const resetSession = () => {
  chatSession = null;
};