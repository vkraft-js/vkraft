# vkraft

Bot framework for VK, built on `@vkraft/api`. Package name: `vkraft`.

## Commands

- `bun test` — run tests
- `bunx tsc --noEmit` — type-check
- `bun prepublishOnly` — build (pkgroll, CJS + ESM)

## Architecture

- **Simple classes, no mixins** — each context is self-contained
- **Composer** — Koa-style middleware chain with `use()`, `on()`, `derive()`
- **Bot** — `on()`, `command()`, `hears()`, `use()`, `derive()`, `onError()`, `start()`/`stop()`
- **Contexts**: `MessageContext`, `MessageEventContext`, `GroupMemberContext`, `WallPostContext`, `UnsupportedEventContext`

## Dependencies

- `@vkraft/api` (VK class, LongPoll) at `../api/`
- `@vkraft/types` (generated VK API types) at `../types/`

## Notes

- `message_event` is VK's equivalent of Telegram's `callback_query` (inline keyboard button callbacks). It's missing from `VKCallbackEventMap` in `@vkraft/types`, so it's added manually to `EventType`.
- For structured callback data (type-safe pack/unpack of button payloads), use `@gramio/callback-data` directly — it's platform-agnostic, no need to rewrite. Can be a dependency or a recommended companion lib.
- In general, platform-agnostic GramIO packages (callback-data, keyboards, format) can be reused as-is where applicable.
