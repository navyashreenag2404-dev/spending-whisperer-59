import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askFinanceAI } from "./ai.server";

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ question: z.string().min(1).max(500), summary: z.string().max(8000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const answer = await askFinanceAI(data.question, data.summary);
      return { answer, error: null as string | null };
    } catch (e) {
      console.error("AI assistant error", e);
      const msg = String((e as Error)?.message ?? "");
      const error = msg.includes("402") ? "AI credits are used up." : msg.includes("429") ? "Too many requests, try again shortly." : "AI is unavailable right now.";
      return { answer: "", error };
    }
  });
