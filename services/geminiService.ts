import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Helper to safely access Vite environment variables
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
      // Remove any surrounding quotes that might have been accidentally added in env vars
      const cleanKey = key.trim().replace(/^["']|["']$/g, '');
      console.log(`[GeminiService] API Key found (Length: ${cleanKey.length}, Starts with: ${cleanKey.substring(0, 4)}...)`);
      return cleanKey;
    }
  }
  
  console.warn("[GeminiService] No API Key found in environment variables.");
  return "";
};

const getAIClient = (): GoogleGenAI => {
  // Always recreate instance if key was missing previously
  if (!aiInstance) {
    const apiKey = getApiKey();
    // Initialize even if empty to handle errors gracefully later
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
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다. 다시 시도해 주세요.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    chatSession = null; // Reset session
    
    const errorMsg = error.toString().toLowerCase();
    const rawError = error.message || error.toString();
    
    // Check for common specific errors
    if (errorMsg.includes("403") || errorMsg.includes("key") || errorMsg.includes("unauthenticated")) {
       return `🚫 **인증 오류**: 설정된 API 키가 유효하지 않거나 권한이 없습니다.\n\n에러 상세: ${rawError}\n\nVercel 환경 변수 **VITE_VAIT_API_KEY** 값을 확인해 주세요.`;
    }

    if (errorMsg.includes("400") || errorMsg.includes("invalid argument")) {
        return `⚠️ **요청 오류**: 잘못된 요청입니다. API 키 형식이 올바른지 확인해주세요.\n\n에러 상세: ${rawError}`;
    }

    // Return the specific error message to help debugging
    return `💥 **통신 오류 발생**\n\n우주 통신망에 일시적인 장애가 있습니다.\n\n**에러 상세 내용:**\n\`${rawError}\`\n\n잠시 후 다시 시도해 주세요.`;
  }
};

export const resetSession = () => {
  chatSession = null;
};