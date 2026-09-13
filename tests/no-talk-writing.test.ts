// SPEC principle 8: no AI in talks or lessons. The assistant only finds scriptures; it
// never writes or outlines a talk. This guards the instructions against drifting back.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assistantInstructions, NO_WRITING_RULE } from "../lib/assistant-prompt";

describe("the assistant doesn't write or outline talks", () => {
  const instructions = assistantInstructions();

  test("the no-writing rule is in the instructions", () => {
    assert.ok(instructions.includes(NO_WRITING_RULE));
    assert.match(NO_WRITING_RULE, /Never write or outline a talk or lesson/);
  });

  test("nothing asks the model for an outline or talk structure", () => {
    assert.doesNotMatch(instructions, /Suggested outline|## Opening|## Closing|Mode: (Prepare|Outline)/);
  });
});
