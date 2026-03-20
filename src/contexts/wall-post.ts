import type { VK } from "@vkraft/api";
import type {
	VKCallbackWallPostNew,
	VKWallWallpostAttachment,
} from "@vkraft/types";
import { Context } from "./context.ts";

export interface WallPostEventPayload {
	type: string;
	object: VKCallbackWallPostNew;
	group_id: number;
	event_id: string;
}

export class WallPostContext extends Context {
	readonly post: VKCallbackWallPostNew;

	constructor(vk: VK, event: WallPostEventPayload) {
		super(vk, event);
		this.post = event.object;
	}

	get text(): string | undefined {
		return this.post.text ?? undefined;
	}

	get fromId(): number | undefined {
		return this.post.from_id;
	}

	get ownerId(): number | undefined {
		return this.post.owner_id;
	}

	get postId(): number | undefined {
		return this.post.id;
	}

	get attachments(): VKWallWallpostAttachment[] {
		return this.post.attachments ?? [];
	}

	get isRepost(): boolean {
		return this.type === "wall_repost";
	}
}
