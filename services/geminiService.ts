import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Helper to safely access environment variables in various environments (Vite, Next.js, Node, etc.)
const getEnvVar = (key: string): string | undefined => {
  // 1. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors accessing import.meta
  }

  // 2. Try process.env (Node/Webpack standard) - Safely check for process existence first
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore errors accessing process
  }

  return undefined;
};

const getApiKey = (): string => {
  // Try to find the API Key in various common locations.
  // Order matters: Check specific VITE_ keys first as they are required for client-side bundles.
  const keysToCheck = [
    "VITE_VAIT_API_KEY",    // Preferred for this project
    "VITE_API_KEY",         // Standard Vite
    "VAIT_API_KEY",         // User specified (might work if backend-injected)
    "API_KEY"               // Standard fallback
  ];

  for (const keyName of keysToCheck) {
    const value = getEnvVar(keyName);
    if (value && value.trim() !== "") {
      // Clean the key (remove quotes if present)
      const cleanKey = value.trim().replace(/^["']|["']$/g, '');
      console.log(`[GeminiService] Key found: ${keyName} (Length: ${cleanKey.length})`);
      return cleanKey;
    }
  }
  
  console.warn("[GeminiService] No API Key found in environment variables.");
  return "";
};

const getAIClient = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    // We initialize with what we have; if empty, it will fail gracefully during calls
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
    return `⚠️ **시스템 경고: API 키 누락**\n\n통신 키(API Key)가 감지되지 않았습니다.\n\n**해결 방법:**\n1. Vercel 설정 > Environment Variables로 이동하세요.\n2. **\`VITE_VAIT_API_KEY\`** 라는 이름으로 키를 추가하세요.\n3. **Deployments** 탭에서 최신 배포의 **Redeploy** 버튼을 눌러야 적용됩니다.\n\n(참고: 브라우저 환경에서는 보안상 \`VITE_\` 접두사가 필수입니다.)`;
  }

  try {
    const session = getChatSession();
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다. 다시 시도해 주세요.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    chatSession = null; // Reset session to force reconnection next time
    
    const errorMsg = error.toString().toLowerCase();
    const rawError = error.message || error.toString();
    
    // Check for specific error types
    if (errorMsg.includes("403") || errorMsg.includes("key") || errorMsg.includes("unauthenticated")) {
       return `🚫 **인증 오류**: 설정된 API 키가 유효하지 않거나 권한이 없습니다.\n\n**설정된 변수명**: \`VITE_VAIT_API_KEY\` (또는 유사)\n**에러 내용**: ${rawError}\n\n키 값을 다시 확인하고 재배포해 주세요.`;
    }

    if (errorMsg.includes("400") || errorMsg.includes("invalid argument")) {
        return `⚠️ **요청 오류**: 잘못된 요청입니다.\n\n**에러 내용**: ${rawError}`;
    }

    if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
        return `📡 **네트워크 오류**: Google 서버에 연결할 수 없습니다.\n\n인터넷 연결을 확인하거나, 잠시 후 다시 시도해 주세요.`;
    }

    // Generic error
    return `💥 **통신 오류 발생**\n\n우주 통신망에 일시적인 장애가 있습니다.\n\n**에러 상세 내용:**\n\`${rawError}\`\n\n잠시 후 다시 시도해 주세요.`;
  }
};

export const resetSession = () => {
  chatSession = null;
};