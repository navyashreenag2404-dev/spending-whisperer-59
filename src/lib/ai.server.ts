// Server-only: calls Lovable AI. Never import this from browser code.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function askFinanceAI(question: string, summary: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions:
      "You are SpendSmart AI, a friendly personal finance assistant for a student in India. " +
      "Answer ONLY using the user's spending data below. Use ₹ for amounts. Be concise (max ~150 words), " +
      "use short bullet points when helpful, and give practical advice.\n\nUSER DATA:\n" + summary,
    messages: [{ role: "user", content: question }],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return await result.text;
}
