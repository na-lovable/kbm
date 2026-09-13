import env from "@/lib/env";
// import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
// import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

// export const lmstudio = createOpenAICompatible({
//   name: "lmstudio",
//   baseURL: "http://localhost:1234/v1",
// });

// export const chatModel = lmstudio("nvidia/nemotron-3-nano-4b");
// export const chatModel = lmstudio("qwen/qwen3-1.7b");
// export const chatModel = lmstudio("qwen/qwen3-4b-2507");
// export const chatModel = lmstudio("liquid/lfm2.5-1.2b");
export const chatModel = openrouter("openrouter/free");
// export const chatModel = openAI("openai/gpt-oss-120b:free");

// export const embeddingModel = lmstudio.embeddingModel(
//   "text-embedding-qwen3-embedding-0.6b",
// );
