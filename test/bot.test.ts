import { describe, test, expect, mock } from "bun:test";
import { Bot } from "../src/bot.ts";
import { MessageContext } from "../src/contexts/message.ts";
import { MessageEventContext } from "../src/contexts/message-event.ts";
import { UnsupportedEventContext } from "../src/contexts/unsupported.ts";
import { createContext } from "../src/contexts/mapping.ts";
import { CallbackData } from "@gramio/callback-data";

function createVK() {
	return {
		api: {
			messages: {
				send: mock(() => Promise.resolve(42)),
				edit: mock(() => Promise.resolve(1)),
				delete: mock(() => Promise.resolve({})),
				setActivity: mock(() => Promise.resolve(1)),
				sendMessageEventAnswer: mock(() => Promise.resolve(1)),
			},
			groups: {
				getLongPollServer: mock(() =>
					Promise.resolve({ key: "k", server: "s", ts: "1" }),
				),
			},
		},
	} as any;
}

function messageEvent(text = "hello", overrides?: Record<string, unknown>) {
	return {
		type: "message_new" as const,
		object: {
			message: {
				id: 1,
				conversation_message_id: 1,
				peer_id: 2000000001,
				from_id: 123,
				text,
				date: 1700000000,
				version: 1,
				out: 0,
				...overrides,
			},
			client_info: { keyboard: true, inline_keyboard: true },
		},
		group_id: 999,
		event_id: "evt1",
	};
}

describe("createContext", () => {
	test("creates MessageContext for message_new", () => {
		const ctx = createContext(createVK(), messageEvent());
		expect(ctx).toBeInstanceOf(MessageContext);
		expect(ctx.type).toBe("message_new");
	});

	test("creates UnsupportedEventContext for unknown type", () => {
		const ctx = createContext(createVK(), {
			type: "some_unknown_event",
			object: { data: 1 },
			group_id: 1,
			event_id: "e1",
		});
		expect(ctx).toBeInstanceOf(UnsupportedEventContext);
	});
});

describe("Bot", () => {
	test("on() handler receives correct context type", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.on("message_new", handler);

		// Simulate event processing by accessing internals
		const event = messageEvent("test");
		const ctx = createContext(vk, event);
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).toHaveBeenCalledTimes(1);
		const received = (handler.mock.calls as any[])[0]![0];
		expect(received).toBeInstanceOf(MessageContext);
	});

	test("on() does not fire for wrong event type", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.on("wall_post_new", handler);

		const ctx = createContext(vk, messageEvent());
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).not.toHaveBeenCalled();
	});

	test("command() matches /cmd prefix", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.command("start", handler);

		// Matching
		const ctx1 = createContext(vk, messageEvent("/start"));
		const composed = (bot as any).composer.compose();
		await composed(ctx1, async () => {});
		expect(handler).toHaveBeenCalledTimes(1);

		// Non-matching
		const ctx2 = createContext(vk, messageEvent("/stop"));
		await composed(ctx2, async () => {});
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("command() extracts $args", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		let capturedArgs = "";

		bot.command("echo", (ctx) => {
			capturedArgs = ctx.$args;
		});

		const ctx = createContext(vk, messageEvent("/echo hello world"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(capturedArgs).toBe("hello world");
	});

	test("hears() matches regex pattern", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		let capturedMatch: RegExpMatchArray | null = null;

		bot.hears(/^!ping$/i, (ctx) => {
			capturedMatch = ctx.$match;
		});

		const ctx = createContext(vk, messageEvent("!ping"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(capturedMatch).not.toBeNull();
		expect(capturedMatch![0]).toBe("!ping");
	});

	test("hears() matches string pattern (case-insensitive)", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.hears("hello", handler);

		const ctx = createContext(vk, messageEvent("Hello"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("hears() does not match partial string", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.hears("hello", handler);

		const ctx = createContext(vk, messageEvent("hello world"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).not.toHaveBeenCalled();
	});

	test("derive() extends context", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 }).derive(() => ({
			extra: 42,
		}));

		let captured: number | undefined;
		bot.on("message_new", (ctx) => {
			captured = ctx.extra;
		});

		const ctx = createContext(vk, messageEvent());
		// Apply derivers
		for (const d of (bot as any).composer.getDerivers()) {
			Object.assign(ctx, await d(ctx));
		}
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(captured).toBe(42);
	});

	test("use() middleware runs for all events", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const calls: string[] = [];

		bot.use(async (ctx, next) => {
			calls.push(`mw:${ctx.type}`);
			await next();
		});

		const composed = (bot as any).composer.compose();

		await composed(createContext(vk, messageEvent()), async () => {});
		await composed(
			createContext(vk, {
				type: "wall_post_new",
				object: { inner_type: "wall_wallpost", text: "hi" },
				group_id: 1,
				event_id: "e1",
			}),
			async () => {},
		);

		expect(calls).toEqual(["mw:message_new", "mw:wall_post_new"]);
	});

	test("multiple handlers execute in order", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const calls: number[] = [];

		bot.on("message_new", () => calls.push(1));
		bot.on("message_new", () => calls.push(2));

		const composed = (bot as any).composer.compose();
		await composed(createContext(vk, messageEvent()), async () => {});

		// on() handlers don't call next(), so only first fires
		expect(calls).toEqual([1]);
	});
});

function messageEventEvent(payload: string) {
	return {
		type: "message_event",
		object: {
			user_id: 123,
			peer_id: 2000000001,
			event_id: "btn_evt_1",
			payload,
		},
		group_id: 999,
		event_id: "evt2",
	};
}

describe("Bot.messageEvent()", () => {
	test("matches with CallbackData and unpacks $data", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });

		const itemAction = new CallbackData("item").number("id").string("action");
		const packed = itemAction.pack({ id: 42, action: "buy" });

		let captured: { id: number; action: string } | undefined;
		bot.messageEvent(itemAction, (ctx) => {
			captured = ctx.$data;
		});

		const ctx = createContext(vk, messageEventEvent(packed));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(captured).toEqual({ id: 42, action: "buy" });
	});

	test("does not match CallbackData with wrong payload", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });

		const itemAction = new CallbackData("item").number("id");
		const otherAction = new CallbackData("other").number("id");
		const packed = otherAction.pack({ id: 1 });

		const handler = mock(() => {});
		bot.messageEvent(itemAction, handler);

		const ctx = createContext(vk, messageEventEvent(packed));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).not.toHaveBeenCalled();
	});

	test("matches with string trigger (exact match)", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.messageEvent("menu_open", handler);

		const ctx1 = createContext(vk, messageEventEvent("menu_open"));
		const composed = (bot as any).composer.compose();
		await composed(ctx1, async () => {});
		expect(handler).toHaveBeenCalledTimes(1);

		const ctx2 = createContext(vk, messageEventEvent("menu_close"));
		await composed(ctx2, async () => {});
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("matches with RegExp trigger and captures $data", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		let captured: RegExpMatchArray | undefined;

		bot.messageEvent(/^action_(\d+)$/, (ctx) => {
			captured = ctx.$data;
		});

		const ctx = createContext(vk, messageEventEvent("action_42"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(captured).not.toBeUndefined();
		expect(captured![1]).toBe("42");
	});

	test("context is MessageEventContext", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });

		const data = new CallbackData("test");
		const packed = data.pack();

		let isInstance = false;
		bot.messageEvent(data, (ctx) => {
			isInstance = ctx instanceof MessageEventContext;
		});

		const ctx = createContext(vk, messageEventEvent(packed));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(isInstance).toBe(true);
	});

	test("does not fire for message_new events", async () => {
		const vk = createVK();
		const bot = new Bot(vk, { group_id: 999 });
		const handler = mock(() => {});

		bot.messageEvent("payload", handler);

		const ctx = createContext(vk, messageEvent("payload"));
		const composed = (bot as any).composer.compose();
		await composed(ctx, async () => {});

		expect(handler).not.toHaveBeenCalled();
	});
});
