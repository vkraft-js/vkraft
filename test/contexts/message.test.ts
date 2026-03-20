import { describe, test, expect, mock } from "bun:test";
import { MessageContext } from "../../src/contexts/message.ts";
import type { MessageEventPayload } from "../../src/contexts/message.ts";

function createVK(apiMock?: Record<string, any>) {
	return {
		api: {
			messages: {
				send: mock(() => Promise.resolve(42)),
				edit: mock(() => Promise.resolve(1)),
				delete: mock(() => Promise.resolve({})),
				setActivity: mock(() => Promise.resolve(1)),
				sendMessageEventAnswer: mock(() => Promise.resolve(1)),
				...apiMock,
			},
		},
	} as any;
}

function createEvent(
	overrides?: Partial<MessageEventPayload["object"]["message"]>,
): MessageEventPayload {
	return {
		type: "message_new",
		object: {
			message: {
				id: 100,
				conversation_message_id: 50,
				peer_id: 2000000001,
				from_id: 12345,
				text: "hello world",
				date: 1700000000,
				version: 1,
				out: 0,
				attachments: [],
				...overrides,
			},
			client_info: {
				keyboard: true,
				inline_keyboard: true,
				carousel: false,
			},
		},
		group_id: 999,
		event_id: "evt1",
	};
}

describe("MessageContext", () => {
	test("exposes message properties", () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		expect(ctx.type).toBe("message_new");
		expect(ctx.text).toBe("hello world");
		expect(ctx.peerId).toBe(2000000001);
		expect(ctx.senderId).toBe(12345);
		expect(ctx.groupId).toBe(999);
		expect(ctx.eventId).toBe("evt1");
	});

	test("isChat / isDM", () => {
		const vk = createVK();

		const chatCtx = new MessageContext(vk, createEvent({ peer_id: 2000000001 }));
		expect(chatCtx.isChat).toBe(true);
		expect(chatCtx.isDM).toBe(false);

		const dmCtx = new MessageContext(vk, createEvent({ peer_id: 12345 }));
		expect(dmCtx.isChat).toBe(false);
		expect(dmCtx.isDM).toBe(true);
	});

	test("hasText / hasAttachments / hasForwards", () => {
		const vk = createVK();

		const ctx1 = new MessageContext(vk, createEvent({ text: "" }));
		expect(ctx1.hasText).toBe(false);
		expect(ctx1.text).toBeUndefined();

		const ctx2 = new MessageContext(vk, createEvent({ text: "hi" }));
		expect(ctx2.hasText).toBe(true);

		const ctx3 = new MessageContext(vk, createEvent());
		expect(ctx3.hasAttachments).toBe(false);
		expect(ctx3.hasForwards).toBe(false);
	});

	test("send() calls messages.send with peer_id", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		const result = await ctx.send({ message: "test" });

		expect(result).toBe(42);
		expect(vk.api.messages.send).toHaveBeenCalledWith({
			peer_id: 2000000001,
			random_id: 0,
			message: "test",
		});
	});

	test("answer() sends plain text", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		await ctx.answer("pong");

		expect(vk.api.messages.send).toHaveBeenCalledWith({
			peer_id: 2000000001,
			random_id: 0,
			message: "pong",
		});
	});

	test("reply() sends with forward", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		await ctx.reply("re");

		expect(vk.api.messages.send).toHaveBeenCalledWith({
			peer_id: 2000000001,
			random_id: 0,
			message: "re",
			forward: {
				is_reply: true,
				conversation_message_ids: [50],
			},
		});
	});

	test("editMessage() calls messages.edit", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		await ctx.editMessage({ message: "edited" });

		expect(vk.api.messages.edit).toHaveBeenCalledWith({
			peer_id: 2000000001,
			message_id: 100,
			message: "edited",
		});
	});

	test("deleteMessage() calls messages.delete", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		await ctx.deleteMessage();

		expect(vk.api.messages.delete).toHaveBeenCalledWith({
			peer_id: 2000000001,
			cmids: [50],
			delete_for_all: 1,
		});
	});

	test("setActivity() calls messages.setActivity", async () => {
		const vk = createVK();
		const ctx = new MessageContext(vk, createEvent());

		await ctx.setActivity();

		expect(vk.api.messages.setActivity).toHaveBeenCalledWith({
			peer_id: 2000000001,
			type: "typing",
		});
	});

	test("payload getter", () => {
		const vk = createVK();

		const ctx1 = new MessageContext(vk, createEvent());
		expect(ctx1.payload).toBeUndefined();

		const ctx2 = new MessageContext(
			vk,
			createEvent({ payload: '{"cmd":"start"}' }),
		);
		expect(ctx2.payload).toBe('{"cmd":"start"}');
	});
});
