import { describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type { SubagentRunOptions } from "@magic-context/core/shared/subagent-runner";

import { __test, PiSubagentRunner } from "./subagent-runner";

const baseOptions: SubagentRunOptions = {
	agent: "historian",
	systemPrompt: "system guidance",
	userMessage: "summarize this session",
};

const COLLISION_STDERR =
	"Agent is already processing. Specify streamingBehavior ('steer' or 'followUp') to queue the message.";

type MockChild = ReturnType<typeof createMockChild>;

function createMockChild() {
	const events = new EventEmitter();
	const stdin = new PassThrough();
	const stdout = new PassThrough();
	const stderr = new PassThrough();
	let exitCode: number | null = null;
	let signalCode: NodeJS.Signals | null = null;

	return {
		pid: 42,
		stdin,
		stdout,
		stderr,
		get exitCode() {
			return exitCode;
		},
		get signalCode() {
			return signalCode;
		},
		kill: mock(() => true),
		on: events.on.bind(events),
		once: events.once.bind(events),
		writeStdoutLine(event: unknown) {
			stdout.write(`${JSON.stringify(event)}\n`);
		},
		writeStderr(text: string) {
			stderr.write(text);
		},
		emitClose(code: number | null = 0, signal: NodeJS.Signals | null = null) {
			exitCode = code;
			signalCode = signal;
			stdout.end();
			stderr.end();
			if (!stdin.writableEnded) stdin.end();
			setTimeout(() => events.emit("close", code, signal), 0);
		},
	};
}

function runnerWith(children: MockChild[], extraArgs: readonly string[] = []) {
	const remaining = [...children];
	const spawnImpl = mock(() => {
		const child = remaining.shift();
		if (!child) throw new Error("unexpected extra spawn");
		return child as never;
	});
	const runner = new PiSubagentRunner({
		piBinary: "omp-test",
		extraArgs,
		spawnImpl: spawnImpl as never,
	});
	return { runner, spawnImpl };
}

function agentEnd(text: string) {
	return {
		type: "agent_end",
		messages: [
			{
				role: "assistant",
				content: [{ type: "text", text }],
				stopReason: "stop",
			},
		],
	};
}

function nextTick() {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("OMP subagent extension-collision retry", () => {
	it("keeps explicit Magic Context extensions when discovery is disabled", () => {
		const args = __test.buildArgs(
			{
				...baseOptions,
				agent: "sidekick",
				model: "anthropic/claude-sonnet",
			},
			{
				disableDiscoveredExtensions: true,
				subagentEntryPath: "/tmp/subagent-entry.js",
				systemPromptPath: "/tmp/system-prompt.txt",
			},
		);

		expect(args).toEqual(
			expect.arrayContaining([
				"--no-extensions",
				"--extension",
				"/tmp/subagent-entry.js",
			]),
		);
	});

	it("retries once with --no-extensions after an extension turn collision", async () => {
		const first = createMockChild();
		const second = createMockChild();
		const { runner, spawnImpl } = runnerWith([first, second]);

		const resultPromise = runner.run({
			...baseOptions,
			model: "anthropic/claude-sonnet",
		});
		first.writeStderr(COLLISION_STDERR);
		first.emitClose(1);
		await nextTick();
		second.writeStdoutLine(agentEnd("isolated success"));
		second.emitClose(0);

		const result = await resultPromise;
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.assistantText).toBe("isolated success");
		expect(spawnImpl).toHaveBeenCalledTimes(2);
		expect(spawnImpl.mock.calls[0]?.[1]).not.toContain("--no-extensions");
		expect(spawnImpl.mock.calls[1]?.[1]).toContain("--no-extensions");
	});

	it("does not isolate unrelated fallback failures", async () => {
		const first = createMockChild();
		const second = createMockChild();
		const { runner, spawnImpl } = runnerWith([first, second]);

		const resultPromise = runner.run({
			...baseOptions,
			model: "anthropic/primary",
			fallbackModels: ["openai/fallback"],
		});
		first.writeStderr("auth missing");
		first.emitClose(1);
		await nextTick();
		second.writeStdoutLine(agentEnd("fallback success"));
		second.emitClose(0);

		expect((await resultPromise).ok).toBe(true);
		expect(spawnImpl).toHaveBeenCalledTimes(2);
		expect(spawnImpl.mock.calls[0]?.[1]).not.toContain("--no-extensions");
		expect(spawnImpl.mock.calls[1]?.[1]).not.toContain("--no-extensions");
	});

	it("does not create a retry loop when extensions are already disabled", async () => {
		const first = createMockChild();
		const second = createMockChild();
		const { runner, spawnImpl } = runnerWith(
			[first, second],
			["--no-extensions"],
		);

		const resultPromise = runner.run({
			...baseOptions,
			model: "anthropic/primary",
			fallbackModels: ["openai/fallback"],
		});
		first.writeStderr(COLLISION_STDERR);
		first.emitClose(1);
		await nextTick();
		second.writeStdoutLine(agentEnd("fallback without retry loop"));
		second.emitClose(0);

		expect((await resultPromise).ok).toBe(true);
		expect(spawnImpl).toHaveBeenCalledTimes(2);
		expect(spawnImpl.mock.calls[0]?.[1]).toContain("--no-extensions");
		expect(spawnImpl.mock.calls[1]?.[1]).toContain("--no-extensions");
	});

	it("annotates an isolated retry that loses an extension-only model", async () => {
		const first = createMockChild();
		const second = createMockChild();
		const { runner } = runnerWith([first, second]);

		const resultPromise = runner.run({
			...baseOptions,
			model: "openai/extension-model",
		});
		first.writeStderr(COLLISION_STDERR);
		first.emitClose(1);
		await nextTick();
		second.writeStderr("Unknown model openai-codex/extension-model");
		second.emitClose(1);

		const result = await resultPromise;
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("model unavailable in isolated retry");
			expect(result.error).toContain("~/.omp/agent/models.yml");
			expect(result.error).toContain("Original failure:");
		}
	});
});
