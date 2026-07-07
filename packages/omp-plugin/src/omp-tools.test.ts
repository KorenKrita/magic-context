/**
 * Tests for OMP tool registration compatibility.
 * Verifies that tools can be created without type errors at runtime.
 */
import { describe, expect, test } from "bun:test";
import { createCtxExpandTool } from "./tools/ctx-expand";
import { createCtxMemoryTool } from "./tools/ctx-memory";
import { createCtxNoteTool } from "./tools/ctx-note";
import { createCtxReduceTool } from "./tools/ctx-reduce";
import { createCtxSearchTool } from "./tools/ctx-search";
import { createTodowriteTool } from "./tools/todowrite";

// Use a null db stub — we only test tool creation, not execution
const nullDb = null as any;

describe("tool creation (runtime shape)", () => {
	test("ctx_search tool has correct structure", () => {
		const tool = createCtxSearchTool({ db: nullDb });
		expect(tool.name).toBe("ctx_search");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.description.length).toBeGreaterThan(0);
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("ctx_memory tool has correct structure", () => {
		const tool = createCtxMemoryTool({
			db: nullDb,
			allowDreamerActions: false,
		});
		expect(tool.name).toBe("ctx_memory");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("ctx_note tool has correct structure", () => {
		const tool = createCtxNoteTool({ db: nullDb, dreamerEnabled: false });
		expect(tool.name).toBe("ctx_note");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("ctx_expand tool has correct structure", () => {
		const tool = createCtxExpandTool({ db: nullDb });
		expect(tool.name).toBe("ctx_expand");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("ctx_reduce tool has correct structure", () => {
		const tool = createCtxReduceTool({ db: nullDb, protectedTags: 20 });
		expect(tool.name).toBe("ctx_reduce");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("todowrite tool has correct structure", () => {
		const tool = createTodowriteTool();
		expect(tool.name).toBe("todowrite");
		expect(tool.description).toBeTypeOf("string");
		expect(tool.parameters).toBeDefined();
		expect(tool.execute).toBeTypeOf("function");
	});

	test("all tools have JSON-serializable parameters", () => {
		const tools = [
			createCtxSearchTool({ db: nullDb }),
			createCtxMemoryTool({ db: nullDb, allowDreamerActions: false }),
			createCtxNoteTool({ db: nullDb, dreamerEnabled: false }),
			createCtxExpandTool({ db: nullDb }),
			createCtxReduceTool({ db: nullDb, protectedTags: 20 }),
			createTodowriteTool(),
		];
		for (const tool of tools) {
			const json = JSON.stringify(tool.parameters);
			expect(json).toBeTypeOf("string");
			const parsed = JSON.parse(json);
			expect(parsed.type).toBe("object");
			expect(parsed.properties).toBeDefined();
		}
	});
});
