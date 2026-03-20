import type { VK } from "@vkraft/api";

export class Context {
	readonly vk: VK;
	readonly type: string;
	readonly groupId: number;
	readonly eventId: string;

	constructor(
		vk: VK,
		event: { type: string; group_id: number; event_id: string },
	) {
		this.vk = vk;
		this.type = event.type;
		this.groupId = event.group_id;
		this.eventId = event.event_id;
	}

	is<T extends string>(type: T): boolean {
		return this.type === type;
	}
}
