import type { VK } from "@vkraft/api";
import type {
	VKCallbackInfoForBots,
	VKCallbackMessage,
	VKCallbackMessageNew,
	VKMessagesKeyboard,
	VKMessagesMessageAttachment,
	MessagesSendParams,
	MessagesEditParams,
} from "@vkraft/types";
import { Context } from "./context.ts";

/** Raw event shape for message_new / message_reply / message_edit */
export interface MessageEventPayload {
	type: string;
	object: { message: VKCallbackMessage; client_info?: VKCallbackInfoForBots };
	group_id: number;
	event_id: string;
}

export class MessageContext extends Context {
	readonly message: VKCallbackMessage;
	readonly clientInfo: VKCallbackInfoForBots | undefined;

	constructor(vk: VK, event: MessageEventPayload) {
		super(vk, event);
		this.message = event.object.message;
		this.clientInfo = event.object.client_info;
	}

	get text(): string | undefined {
		return this.message.text || undefined;
	}

	get peerId(): number {
		return this.message.peer_id;
	}

	get senderId(): number {
		return this.message.from_id;
	}

	get attachments(): VKMessagesMessageAttachment[] {
		return this.message.attachments ?? [];
	}

	get isChat(): boolean {
		return this.message.peer_id > 2_000_000_000;
	}

	get isDM(): boolean {
		return !this.isChat;
	}

	get hasText(): boolean {
		return !!this.message.text;
	}

	get hasAttachments(): boolean {
		return this.attachments.length > 0;
	}

	get hasForwards(): boolean {
		return (
			this.message.fwd_messages != null &&
			(this.message.fwd_messages as unknown[]).length > 0
		);
	}

	get payload(): string | undefined {
		return this.message.payload ?? undefined;
	}

	async send(
		params: Omit<MessagesSendParams, "peer_id" | "random_id">,
	): Promise<number> {
		return this.vk.api.messages.send({
			peer_id: this.peerId,
			random_id: 0,
			...params,
		}) as Promise<number>;
	}

	async reply(text: string): Promise<number> {
		return this.send({
			message: text,
			forward: {
				is_reply: true,
				conversation_message_ids: [this.message.conversation_message_id],
			},
		});
	}

	async answer(text: string): Promise<number> {
		return this.send({ message: text });
	}

	async editMessage(
		params: Omit<MessagesEditParams, "peer_id" | "message_id">,
	): Promise<number> {
		return this.vk.api.messages.edit({
			peer_id: this.peerId,
			message_id: this.message.id,
			...params,
		}) as unknown as number;
	}

	async deleteMessage(deleteForAll = true): Promise<void> {
		await this.vk.api.messages.delete({
			peer_id: this.peerId,
			cmids: [this.message.conversation_message_id],
			delete_for_all: deleteForAll ? 1 : 0,
		});
	}

	async setActivity(type: "typing" = "typing"): Promise<void> {
		await this.vk.api.messages.setActivity({
			peer_id: this.peerId,
			type,
		});
	}

	async sendWithKeyboard(
		text: string,
		keyboard: VKMessagesKeyboard,
	): Promise<number> {
		return this.send({ message: text, keyboard });
	}
}
