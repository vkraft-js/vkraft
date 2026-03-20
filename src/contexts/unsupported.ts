import type { VK } from "@vkraft/api";
import { Context } from "./context.ts";

export interface UnsupportedEventPayload {
	type: string;
	object: unknown;
	group_id: number;
	event_id: string;
}

export class UnsupportedEventContext extends Context {
	readonly object: unknown;

	constructor(vk: VK, event: UnsupportedEventPayload) {
		super(vk, event);
		this.object = event.object;
	}
}
