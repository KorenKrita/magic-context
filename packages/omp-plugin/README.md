# @cortexkit/omp-magic-context

Magic Context extension for [OMP (Oh My Pi)](https://github.com/anthropics/omp) — cross-session memory and context management.

This is the OMP adapter of [Magic Context](https://github.com/cortexkit/magic-context). It provides the same capabilities as the Pi plugin (`@cortexkit/pi-magic-context`) but targets `@oh-my-pi/pi-coding-agent` v16+.

## What it does

- **Cross-session memory** — project knowledge persists across sessions via `ctx_memory`
- **Context search** — search memories, git commits, and conversation history via `ctx_search`
- **Context management** — tag-based reclamation (`ctx_reduce`), history expansion (`ctx_expand`), session notes (`ctx_note`)
- **Task tracking** — `todowrite` tool for multi-step work
- **Automatic compaction** — historian pipeline compresses conversation history into structured compartments
- **System prompt injection** — project memories, docs, and guidance injected each turn
- **Dreamer** — background scheduled tasks (memory promotion, smart note evaluation)
- **Commands** — `/ctx-status`, `/ctx-aug`, `/ctx-dream`, `/ctx-embed`, `/ctx-flush`, `/ctx-recomp`, `/ctx-session-upgrade`

## Installation

### From npm (when published)

```bash
omp plugin install @cortexkit/omp-magic-context
```

### From source (development)

```bash
# Clone the monorepo
git clone https://github.com/KorenKrita/magic-context.git
cd magic-context
bun install

# Build the OMP plugin
cd packages/omp-plugin
bun run build

# Link into OMP's plugin directory
# Option A: symlink the built package
ln -s "$(pwd)" ~/.omp/plugins/node_modules/@cortexkit/omp-magic-context

# Option B: add to ~/.omp/plugins/package.json
# { "dependencies": { "@cortexkit/omp-magic-context": "file:../path/to/packages/omp-plugin" } }
```

After installation, restart OMP. The extension auto-discovers via `package.json` → `"omp": { "extensions": ["./dist/index.js"] }`.

## Configuration

Magic Context reads config from:
- **Project**: `$cwd/.cortexkit/magic-context.jsonc`
- **User**: `~/.config/cortexkit/magic-context.jsonc`

Both follow the same schema. Key settings:

```jsonc
{
  // Enable/disable the plugin entirely
  "enabled": true,

  // Enable §N§ tag prefix and ctx_reduce tool
  "ctx_reduce_enabled": true,

  // Protected recent tags (immune to immediate drop)
  "protected_tags": 20,

  // Memory settings
  "memory": {
    "enabled": true,
    "auto_search": { "enabled": false }
  },

  // Historian model (for automatic compaction)
  "historian": {
    "model": "anthropic/claude-sonnet-4-20250514",
    "disable": false
  },

  // Sidekick model (for /ctx-aug)
  "sidekick": {
    "model": "anthropic/claude-sonnet-4-20250514",
    "disable": false
  },

  // Dreamer (background tasks)
  "dreamer": {
    "disable": true
  },

  // Language for system prompt guidance
  "language": "en"
}
```

## Shared storage

The OMP plugin shares the same SQLite database with the Pi and OpenCode plugins at:

```
~/.local/share/cortexkit/magic-context/context.db
```

This means:
- Project memories written in Pi/OpenCode are visible in OMP and vice versa
- Session-scoped data carries a `harness` column (`"omp"`) for attribution
- The dreamer, embedding index, and other background features work across all harnesses

## Differences from the Pi plugin

| Aspect | Pi plugin | OMP plugin |
|--------|-----------|------------|
| Package | `@cortexkit/pi-magic-context` | `@cortexkit/omp-magic-context` |
| Peer dep | `@earendil-works/pi-coding-agent@^0.80` | `@oh-my-pi/pi-coding-agent@^16` |
| Harness ID | `"pi"` | `"omp"` |
| systemPrompt type | `string` | `string[]` (joined/wrapped automatically) |
| Subagent CLI fallback | `pi` | `omp` |
| CLI flags | `--no-prompt-templates`, `--no-context-files` | Not needed (covered by `--system-prompt` replace mode) |
| TUI package | `@earendil-works/pi-tui` | `@oh-my-pi/pi-tui` |
| Tool schema | typebox `TObject` matches `TSchema` | Uses type assertion for ArkSchema compat |

## Subagent support

The historian, dreamer, and sidekick spawn OMP child processes via:

```
omp --print --mode json --no-session --no-skills --system-prompt <path> --model <id> [message]
```

All required CLI flags are supported by OMP v16+.

## Development

```bash
# From monorepo root
cd packages/omp-plugin

# Type check
bun run typecheck

# Run tests
bun test

# Build
bun run build

# Lint
bun run lint
```

## License

MIT
