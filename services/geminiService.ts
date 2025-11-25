import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Helper to safely access environment variables in various environments
const getEnvVar = (key: string): string | undefined => {
  // 1. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) { /* ignore */ }

  // 2. Try process.env (Node/Webpack/Next.js/CRA standard)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) { /* ignore */ }

  return undefined;
};

const getApiKey = (): string => {
  // Check ALL possible prefixes for different frameworks
  const keysToCheck = [
    "VITE_VAIT_API_KEY",        // Vite (Preferred)
    "NEXT_PUBLIC_VAIT_API_KEY", // Next.js
    "REACT_APP_VAIT_API_KEY",   // Create React App
    "VAIT_API_KEY",             // Fallback
    "VITE_API_KEY",             // Generic Vite
    "API_KEY"                   // Generic Fallback
  ];

  console.log("[GeminiService] Checking environment variables...");

  for (const keyName of keysToCheck) {
    const value = getEnvVar(keyName);
    if (value && value.trim() !== "") {
      // Clean the key (remove quotes if present)
      const cleanKey = value.trim().replace(/^["']|["']$/g, '');
      console.log(`[GeminiService] ✅ Success! Found key in: ${keyName}`);
      return cleanKey;
    }
  }
  
  console.warn("[GeminiService] ❌ Failed to find any API Key.");
  return "";
};

// Check if a valid key exists (for UI warning)
export const checkConnection = (): boolean => {
    const key = getApiKey();
    return !!key && key.length > 0;
};

const getAIClient = (): GoogleGenAI => {
  if (!aiInstance) {
    const apiKey = getApiKey();
    // Initialize even if empty to allow error handling downstream
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
    return `⚠️ **CRITICAL ERROR: API KEY MISSING**

우주 통신망 키(API Key)를 찾을 수 없습니다. Vercel 설정을 확인해주세요.

**해결 방법 (Step-by-Step):**
1. **Vercel Dashboard** > Project Settings > **Environment Variables**
2. 다음 이름 중 하나로 키를 추가하세요 (이미 있다면 철자를 확인하세요):
   - \`VITE_VAIT_API_KEY\` (권장)
   - \`NEXT_PUBLIC_VAIT_API_KEY\`
   - \`REACT_APP_VAIT_API_KEY\`
3. **중요:** 변경 후 **Deployments** 탭에서 최신 배포의 **Redeploy**를 꼭 눌러야 합니다.`;
  }

  try {
    const session = getChatSession();
    const result: GenerateContentResponse = await session.sendMessage({
      message: message,
    });
    
    return result.text || "통신 신호가 약합니다. 응답을 해독할 수 없습니다.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    chatSession = null; // Reset session
    
    const errorMsg = error.toString().toLowerCase();
    
    if (errorMsg.includes("403") || errorMsg.includes("key")) {
       return `🚫 **API 키 권한 오류**\n\n설정된 API 키가 유효하지 않거나 Google AI Studio에서 해당 프로젝트의 결제 계정이 연결되지 않았을 수 있습니다.\n\n(참고: Gemini 1.5/2.5 모델은 무료 티어라도 API 키 설정이 필요합니다.)`;
    }

    if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
        return `📡 **네트워크 연결 실패**\n\nGoogle 서버에 도달할 수 없습니다. 인터넷 연결을 확인해주세요.`;
    }

    return `💥 **통신 오류**\n\n오류 내용: ${error.message || error.toString()}\n잠시 후 다시 시도해 주세요.`;
  }
};

export const resetSession = () => {
  chatSession = null;
};