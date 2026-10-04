import { streamAssistant } from "@/lib/assistant-route";
import { deepStudyInstructions, deepStudyTools } from "@/lib/deep-study-assistant";

// The Deep Study chat (SPEC D12): scripture and Deep Study texts, side by side.
export async function POST(req: Request) {
  return streamAssistant(req, { instructions: deepStudyInstructions, tools: deepStudyTools, tag: "deep-study", name: "Deep Study assistant" });
}
