# vkraft

Bot framework for VK, built on `@vkraft/api`. Package name: `vkraft`.

## Commands

- `bun test` — run tests
- `bunx tsc --noEmit` — type-check
- `bun prepublishOnly` — build (pkgroll, CJS + ESM)

## Architecture

- **Simple classes, no mixins** — each context is self-contained
- **Composer** — Koa-style middleware chain with `use()`, `on()`, `derive()`
- **Bot** — `on()`, `command()`, `hears()`, `messageEvent()`, `use()`, `derive()`, `onError()`, `start()`/`stop()`
- **Contexts**: `MessageContext`, `MessageEventContext`, `GroupMemberContext`, `WallPostContext`, `UnsupportedEventContext`

## Dependencies

- `@vkraft/api` (VK class, LongPoll) at `../api/`
- `@vkraft/types` (generated VK API types) at `../types/`
- `@gramio/callback-data` — type-safe callback data (pack/unpack button payloads), re-exported from `vkraft`

## Notes

- `message_event` is VK's equivalent of Telegram's `callback_query` (inline keyboard button callbacks). It's missing from `VKCallbackEventMap` in `@vkraft/types`, so it's added manually to `EventType`.
- `bot.messageEvent(callbackData, handler)` integrates `@gramio/callback-data` — type-safe `ctx.$data` with full inference. Also accepts string (exact match) or RegExp triggers.
- Platform-agnostic GramIO packages (callback-data, keyboards, format) should be reused as-is — don't rewrite.
