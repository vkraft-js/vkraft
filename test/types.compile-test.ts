/**
 * Compile-time type tests — these only need to type-check, not run.
 */
import type { VK } from "@vkraft/api";
import { Bot } from "../src/bot.ts";
import type { MessageContext } from "../src/contexts/message.ts";
import type { GroupMemberContext } from "../src/contexts/group-member.ts";
import type { WallPostContext } from "../src/contexts/wall-post.ts";
import type { MessageEventContext } from "../src/contexts/message-event.ts";
import type { UnsupportedEventContext } from "../src/contexts/unsupported.ts";

declare const vk: VK;

// --- on() narrows context type ---

const bot = new Bot(vk, { group_id: 1 });

bot.on("message_new", (ctx) => {
	ctx satisfies MessageContext;
	ctx.text satisfies string | undefined;
	ctx.peerId satisfies number;
	ctx.send({ message: "hi" });
	ctx.answer("hi");
	ctx.reply("hi");
});

bot.on("group_join", (ctx) => {
	ctx satisfies GroupMemberContext;
	ctx.userId satisfies number | undefined;
	ctx.isJoin satisfies boolean;
});

bot.on("wall_post_new", (ctx) => {
	ctx satisfies WallPostContext;
	ctx.text satisfies string | undefined;
	ctx.fromId satisfies number | undefined;
	ctx.isRepost satisfies boolean;
});

bot.on("message_event", (ctx) => {
	ctx satisfies MessageEventContext;
	ctx.userId satisfies number;
	ctx.peerId satisfies number;
	ctx.payload satisfies string;
});

bot.on("photo_new", (ctx) => {
	ctx satisfies UnsupportedEventContext;
	ctx.object satisfies unknown;
});

// --- derive() accumulates types ---

const botWithSession = new Bot(vk, { group_id: 1 })
	.derive(() => ({ session: { count: 0 } }))
	.derive(() => ({ db: { query: () => [] } }));

botWithSession.on("message_new", (ctx) => {
	ctx satisfies MessageContext & { session: { count: number } } & {
		db: { query: () => never[] };
	};
	ctx.session.count satisfies number;
	ctx.db.query satisfies () => never[];
	ctx.peerId satisfies number;
});

// --- command() and hears() ---

bot.command("start", (ctx) => {
	ctx satisfies MessageContext & { $args: string };
	ctx.$args satisfies string;
	ctx.peerId satisfies number;
});

bot.hears(/test/, (ctx) => {
	ctx satisfies MessageContext & { $match: RegExpMatchArray };
	ctx.$match satisfies RegExpMatchArray;
	ctx.text satisfies string | undefined;
});

// --- use() middleware ---

bot.use(async (ctx, next) => {
	ctx.type satisfies string;
	ctx.groupId satisfies number;
	await next();
});

// --- onError ---

bot.onError((err, ctx) => {
	err satisfies unknown;
	ctx.type satisfies string;
});

// --- chaining ---

const chained = new Bot(vk, { group_id: 1 })
	.derive(() => ({ x: 1 }))
	.on("message_new", (ctx) => {
		ctx.x satisfies number;
	})
	.command("test", (ctx) => {
		ctx.x satisfies number;
		ctx.$args satisfies string;
	});
