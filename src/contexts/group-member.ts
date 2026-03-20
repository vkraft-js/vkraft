import type { VK } from "@vkraft/api";
import type {
	VKCallbackGroupJoin,
	VKCallbackGroupJoinType,
	VKCallbackGroupLeave,
} from "@vkraft/types";
import { Context } from "./context.ts";

export interface GroupMemberEventPayload {
	type: string;
	object: VKCallbackGroupJoin | VKCallbackGroupLeave;
	group_id: number;
	event_id: string;
}

export class GroupMemberContext extends Context {
	private readonly object: VKCallbackGroupJoin | VKCallbackGroupLeave;

	constructor(vk: VK, event: GroupMemberEventPayload) {
		super(vk, event);
		this.object = event.object;
	}

	get userId(): number | undefined {
		return this.object.user_id;
	}

	get isJoin(): boolean {
		return this.type === "group_join";
	}

	get isLeave(): boolean {
		return this.type === "group_leave";
	}

	get joinType(): VKCallbackGroupJoinType | undefined {
		return this.isJoin
			? (this.object as VKCallbackGroupJoin).join_type
			: undefined;
	}

	get isSelf(): boolean {
		return this.isLeave
			? (this.object as VKCallbackGroupLeave).self === 1
			: false;
	}
}
