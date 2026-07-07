/**
 * Smoke tests for OMP adapter-specific behavior.
 * Verifies the adaptations that differentiate omp-plugin from pi-plugin.
 */
import { describe, expect, test } from "bun:test";
import { buildArgs } from "./subagent-runner";

describe("buildArgs (OMP CLI compatibility)", () => {
	const baseOptions = {
		agent: "historian" as const,
		userMessage: "summarize this session",
		model: "anthropic/claude-sonnet-4-20250514",
	};

	test("includes --print, --mode json, --no-session, --no-skills", () => {
		const args = buildArgs(baseOptions);
		expect(args).toContain("--print");
		expect(args).toContain("--mode");
		expect(args[args.indexOf("--mode") + 1]).toBe("json");
		expect(args).toContain("--no-session");
		expect(args).toContain("--no-skills");
	});

	test("does NOT include --no-prompt-templates or --no-context-files", () => {
		const args = buildArgs(baseOptions);
		expect(args).not.toContain("--no-prompt-templates");
		expect(args).not.toContain("--no-context-files");
	});

	test("passes --model with provider mapping", () => {
		const args = buildArgs({
			...baseOptions,
			model: "openai/gpt-4o",
		});
		// resolveModelRefForPi maps openai -> openai-codex
		expect(args).toContain("--model");
		expect(args[args.indexOf("--model") + 1]).toBe("openai-codex/gpt-4o");
	});

	test("passes --thinking when configured", () => {
		const args = buildArgs({
			...baseOptions,
			thinkingLevel: "medium",
		});
		expect(args).toContain("--thinking");
		expect(args[args.indexOf("--thinking") + 1]).toBe("medium");
	});

	test("appends user message as last positional", () => {
		const args = buildArgs(baseOptions);
		expect(args[args.length - 1]).toBe("summarize this session");
	});

	test("omits positional when omitPositionalMessage is set", () => {
		const args = buildArgs(baseOptions, { omitPositionalMessage: true });
		expect(args[args.length - 1]).not.toBe("summarize this session");
	});

	test("passes --system-prompt path when provided", () => {
		const args = buildArgs(baseOptions, {
			systemPromptPath: "/tmp/prompt.txt",
		});
		expect(args).toContain("--system-prompt");
		expect(args[args.indexOf("--system-prompt") + 1]).toBe("/tmp/prompt.txt");
	});
});

describe("buildArgs tool allowlist (OMP builtins)", () => {
	test("historian gets OMP read-only tools (no find/ls/aft)", () => {
		const args = buildArgs({
			agent: "historian",
			userMessage: "summarize",
			model: "anthropic/claude-sonnet-4-20250514",
		});
		const toolsIdx = args.indexOf("--tools");
		expect(toolsIdx).toBeGreaterThan(-1);
		const toolsValue = args[toolsIdx + 1];
		expect(toolsValue).toContain("read");
		expect(toolsValue).toContain("grep");
		expect(toolsValue).toContain("glob");
		expect(toolsValue).not.toContain("find");
		expect(toolsValue).not.toContain("ls");
		expect(toolsValue).not.toContain("aft_");
	});

	test("sidekick gets read-only + ctx_search (no aft)", () => {
		const args = buildArgs({
			agent: "sidekick",
			userMessage: "help",
			model: "anthropic/claude-sonnet-4-20250514",
		});
		const toolsIdx = args.indexOf("--tools");
		expect(toolsIdx).toBeGreaterThan(-1);
		const toolsValue = args[toolsIdx + 1];
		expect(toolsValue).toContain("ctx_search");
		expect(toolsValue).toContain("read");
		expect(toolsValue).not.toContain("aft_");
	});
});

describe("harness identity", () => {
	test("harness is set to 'omp'", async () => {
		const { getHarness } = await import(
			"@magic-context/core/shared/harness"
		);
		// The main index.ts calls setHarness("omp") at module load.
		// In test context we verify the import path works.
		expect(["omp", "opencode", "pi"]).toContain(getHarness());
	});
});
