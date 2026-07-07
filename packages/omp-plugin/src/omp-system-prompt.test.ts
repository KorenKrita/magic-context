/**
 * Tests for OMP-specific systemPrompt handling (string[] vs string).
 */
import { describe, expect, test } from "bun:test";

describe("systemPrompt string[] adaptation", () => {
	test("Array.isArray detects OMP systemPrompt format", () => {
		const ompSystemPrompt = ["You are a coding assistant.", "Follow the user's instructions."];
		expect(Array.isArray(ompSystemPrompt)).toBe(true);
		const joined = ompSystemPrompt.join("\n");
		expect(joined).toContain("You are a coding assistant.");
		expect(joined).toContain("Follow the user's instructions.");
	});

	test("string[] join + block append produces valid composed prompt", () => {
		const systemPrompt = ["Base prompt line 1.", "Base prompt line 2."];
		const systemPromptText = systemPrompt.join("\n");
		const block = "<magic-context>injected content</magic-context>";
		const composed = `${systemPromptText}\n\n${block}`;
		expect(composed).toContain("Base prompt line 1.\nBase prompt line 2.");
		expect(composed).toContain("<magic-context>injected content</magic-context>");
	});

	test("composed string wraps back to string[] for OMP return", () => {
		const composed = "full system prompt with injections";
		const result = { systemPrompt: [composed] };
		expect(result.systemPrompt).toBeArrayOfSize(1);
		expect(result.systemPrompt[0]).toBe(composed);
	});

	test("skip_signatures check works against joined string[]", () => {
		const systemPrompt = ["Part 1", "SKIP_MAGIC_CONTEXT", "Part 3"];
		const joined = systemPrompt.join("\n");
		const skipSigs = ["SKIP_MAGIC_CONTEXT"];
		const shouldSkip = skipSigs.some((sig) => sig.length > 0 && joined.includes(sig));
		expect(shouldSkip).toBe(true);
	});

	test("skip_signatures returns false when not present", () => {
		const systemPrompt = ["Normal prompt", "No skip marker here"];
		const joined = systemPrompt.join("\n");
		const skipSigs = ["SKIP_MAGIC_CONTEXT"];
		const shouldSkip = skipSigs.some((sig) => sig.length > 0 && joined.includes(sig));
		expect(shouldSkip).toBe(false);
	});
});
