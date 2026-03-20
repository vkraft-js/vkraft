import type { VK } from "@vkraft/api";
import type { VKCallbackEventMap } from "@vkraft/types";
import type { Context } from "./context.ts";
import { MessageContext } from "./message.ts";
import { MessageEventContext } from "./message-event.ts";
import { GroupMemberContext } from "./group-member.ts";
import { WallPostContext } from "./wall-post.ts";
import { UnsupportedEventContext } from "./unsupported.ts";

type ContextFactory = (vk: VK, event: any) => Context;

const contextMapping: Record<string, ContextFactory> = {
	message_new: (vk, e) => new MessageContext(vk, e),
	message_reply: (vk, e) => new MessageContext(vk, e),
	message_edit: (vk, e) => new MessageContext(vk, e),
	message_event: (vk, e) => new MessageEventContext(vk, e),
	group_join: (vk, e) => new GroupMemberContext(vk, e),
	group_leave: (vk, e) => new GroupMemberContext(vk, e),
	wall_post_new: (vk, e) => new WallPostContext(vk, e),
	wall_repost: (vk, e) => new WallPostContext(vk, e),
};

export function createContext(vk: VK, event: { type: string; object: unknown; group_id: number; event_id: string }): Context {
	const factory = contextMapping[event.type];
	if (factory) return factory(vk, event);
	return new UnsupportedEventContext(vk, event);
}

/** Maps event type to context class for type-level inference */
export interface ContextMap {
	message_new: MessageContext;
	message_reply: MessageContext;
	message_edit: MessageContext;
	message_event: MessageEventContext;
	group_join: GroupMemberContext;
	group_leave: GroupMemberContext;
	wall_post_new: WallPostContext;
	wall_repost: WallPostContext;
}

export type EventType = keyof VKCallbackEventMap | "message_event";

export type ContextFor<T extends EventType> = T extends keyof ContextMap
	? ContextMap[T]
	: UnsupportedEventContext;
