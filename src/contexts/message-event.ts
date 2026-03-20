import type { VK } from "@vkraft/api";
import type {
	VKCallbackMessageEvent,
	MessagesSendMessageEventAnswerParams,
} from "@vkraft/types";
import { Context } from "./context.ts";

/** Raw event shape for message_event (callback button press) */
export interface MessageEventEventPayload {
	type: string;
	object: VKCallbackMessageEvent;
	group_id: number;
	event_id: string;
}

export class MessageEventContext extends Context {
	readonly event: VKCallbackMessageEvent;

	constructor(vk: VK, event: MessageEventEventPayload) {
		super(vk, event);
		this.event = event.object;
	}

	get userId(): number {
		return this.event.user_id;
	}

	get peerId(): number {
		return this.event.peer_id;
	}

	get payload(): string {
		return this.event.payload;
	}

	async answer(
		params: Omit<
			MessagesSendMessageEventAnswerParams,
			"event_id" | "user_id" | "peer_id"
		>,
	): Promise<void> {
		await this.vk.api.messages.sendMessageEventAnswer({
			event_id: this.event.event_id,
			user_id: this.event.user_id,
			peer_id: this.event.peer_id,
			...params,
		});
	}
}
