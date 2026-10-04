import { assistantInstructions } from "@/lib/assistant-prompt";
import { assistantTools } from "@/lib/assistant-tools";
import { streamAssistant } from "@/lib/assistant-route";

export async function POST(req: Request) {
  return streamAssistant(req, { instructions: assistantInstructions, tools: assistantTools, tag: "assistant", name: "study assistant" });
}
