# vkraft

Type-safe VK Bot framework for TypeScript. Simple classes, Koa-style middleware, [`@gramio/callback-data`](https://github.com/gramiojs/callback-data) integration.

Built on top of [`@vkraft/api`](https://github.com/vkraftjs/api) and [`@vkraft/types`](https://github.com/vkraftjs/types).

## Install

```bash
npm install vkraft @vkraft/api
```

## Quick Start

```typescript
import { VK } from "@vkraft/api";
import { Bot } from "vkraft";

const vk = new VK("TOKEN");
const bot = new Bot(vk, { group_id: 123456 });

bot.on("message_new", (ctx) => ctx.answer(ctx.text ?? ""));

bot.start();
```

## Commands & Patterns

```typescript
bot.command("start", (ctx) => {
  ctx.answer(`Welcome! Args: ${ctx.$args}`);
});

bot.command("help", (ctx) => {
  ctx.answer("Available: /start, /help");
});

bot.hears(/^!ping$/i, (ctx) => {
  ctx.answer("pong");
});
```

## Callback Buttons (message_event)

Type-safe callback data with [`@gramio/callback-data`](https://github.com/gramiojs/callback-data) — pack/unpack structured payloads for inline keyboard buttons.

```typescript
import { CallbackData } from "vkraft";

const itemAction = new CallbackData("item")
  .number("id")
  .string("action");

bot.on("message_new", (ctx) => {
  ctx.send({
    message: "Choose:",
    keyboard: {
      inline: true,
      buttons: [[{
        action: {
          type: "callback",
          label: "Buy #1",
          payload: itemAction.pack({ id: 1, action: "buy" }),
        },
      }]],
    },
  });
});

bot.messageEvent(itemAction, (ctx) => {
  // ctx.$data is typed: { id: number, action: string }
  ctx.answer({
    event_data: JSON.stringify({
      type: "show_snackbar",
      text: `Action: ${ctx.$data.action} on item #${ctx.$data.id}`,
    }),
  });
});
```

Also supports string (exact match) and RegExp triggers:

```typescript
bot.messageEvent("menu_open", (ctx) => { /* ... */ });
bot.messageEvent(/^action_(\d+)$/, (ctx) => {
  ctx.$data[1]; // captured group
});
```

## Middleware

```typescript
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(`${ctx.type}: ${Date.now() - start}ms`);
});
```

## Context Extension (derive)

```typescript
const sessions = new Map<number, { count: number }>();

const bot = new Bot(vk, { group_id: 123456 })
  .derive((ctx) => {
    if (!ctx.is("message_new")) return {};
    const key = (ctx as MessageContext).peerId;
    if (!sessions.has(key)) sessions.set(key, { count: 0 });
    return { session: sessions.get(key)! };
  });

bot.on("message_new", (ctx) => {
  ctx.session.count++;
  ctx.answer(`Message #${ctx.session.count}`);
});
```

## Error Handling

```typescript
bot.onError((err, ctx) => {
  console.error(`Error in ${ctx.type}:`, err);
});
```

## Contexts

| Event | Context | Key Properties |
|---|---|---|
| `message_new`, `message_reply`, `message_edit` | `MessageContext` | `text`, `peerId`, `senderId`, `isChat`, `attachments` |
| `message_event` | `MessageEventContext` | `userId`, `peerId`, `payload` |
| `group_join`, `group_leave` | `GroupMemberContext` | `userId`, `isJoin`, `joinType`, `isSelf` |
| `wall_post_new`, `wall_repost` | `WallPostContext` | `text`, `fromId`, `ownerId`, `attachments`, `isRepost` |
| _(other)_ | `UnsupportedEventContext` | `object` |

### MessageContext Methods

| Method | Description |
|---|---|
| `send(params)` | Send message to the same peer |
| `answer(text)` | Shorthand for `send({ message: text })` |
| `reply(text)` | Reply with forward reference |
| `editMessage(params)` | Edit the original message |
| `deleteMessage()` | Delete the original message |
| `setActivity()` | Show "typing..." indicator |
| `sendWithKeyboard(text, keyboard)` | Send with keyboard attached |

## License

MIT
