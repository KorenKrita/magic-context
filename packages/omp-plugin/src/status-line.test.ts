import { describe, expect, test } from "bun:test";
import type { ContextDatabase } from "@magic-context/core/features/magic-context/storage";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import {
	registerStatusLine,
	type StatusLineDeps,
	updateStatusLine,
} from "./status-line";

function createDeps(): StatusLineDeps {
	const db = {
		prepare: () => ({
			get: () => ({
				compartment_in_progress: 0,
				historian_failure_count: 0,
				historian_last_failure_at: null,
			}),
		}),
	} as unknown as ContextDatabase;
	return { db, projectIdentity: "test-project" };
}

function createContext(
	setWidget: (...args: unknown[]) => void,
): ExtensionContext {
	return {
		getContextUsage: () => ({ tokens: 12_500, percent: 25 }),
		sessionManager: { getSessionId: () => "session-1" },
		ui: { setWidget },
	} as unknown as ExtensionContext;
}

describe("OMP Magic Context status line", () => {
	test("renders below the editor with a widget", () => {
		const calls: unknown[][] = [];
		const ctx = createContext((...args) => calls.push(args));

		updateStatusLine(ctx, createDeps(), true);

		expect(calls).toEqual([
			[
				"magic-context",
				["mc: 12.5K (25%) · idle"],
				{ placement: "belowEditor" },
			],
		]);
	});

	test("removes the widget on session shutdown", async () => {
		const handlers = new Map<string, (...args: unknown[]) => unknown>();
		const pi = {
			on: (event: string, handler: (...args: unknown[]) => unknown) => {
				handlers.set(event, handler);
			},
		} as unknown as ExtensionAPI;
		const calls: unknown[][] = [];
		const ctx = createContext((...args) => calls.push(args));
		registerStatusLine(pi, createDeps());

		await handlers.get("session_shutdown")?.({}, ctx);

		expect(calls).toEqual([["magic-context", undefined]]);
	});
});
