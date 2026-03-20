import type { VK } from "@vkraft/api";
import { LongPoll } from "@vkraft/api/updates";
import type { LongPollEvent } from "@vkraft/api/updates";
import { Composer } from "./composer.ts";
import type { Handler, Middleware } from "./composer.ts";
import {
	type Context,
	type ContextFor,
	type EventType,
	MessageContext,
	createContext,
} from "./contexts/index.ts";

export interface BotOptions {
	group_id: number;
	wait?: number;
}

export class Bot<Derived = {}> {
	readonly vk: VK;
	private readonly options: BotOptions;
	private readonly composer = new Composer();
	private polling: LongPoll | null = null;
	private errorHandler: ((err: unknown, ctx: Context) => void) | null = null;

	constructor(vk: VK, options: BotOptions) {
		this.vk = vk;
		this.options = options;
	}

	on<T extends EventType>(
		type: T,
		handler: Handler<ContextFor<T> & Derived>,
	): this {
		this.composer.on(type, handler as Handler<any>);
		return this;
	}

	hears(
		pattern: string | RegExp,
		handler: Handler<
			MessageContext & Derived & { $match: RegExpMatchArray }
		>,
	): this {
		const regex =
			typeof pattern === "string"
				? new RegExp(`^${escapeRegExp(pattern)}$`, "i")
				: pattern;

		this.composer.routes.push({
			type: "message_new",
			filter: (ctx: MessageContext) => {
				if (!ctx.text) return false;
				const match = ctx.text.match(regex);
				if (!match) return false;
				(ctx as any).$match = match;
				return true;
			},
			fn: handler as Handler<any>,
		});

		return this;
	}

	command(
		cmd: string,
		handler: Handler<MessageContext & Derived & { $args: string }>,
	): this {
		const prefix = `/${cmd}`;

		this.composer.routes.push({
			type: "message_new",
			filter: (ctx: MessageContext) => {
				if (!ctx.text) return false;
				const text = ctx.text.trim();
				if (text === prefix || text.startsWith(`${prefix} `)) {
					(ctx as any).$args = text.slice(prefix.length).trim();
					return true;
				}
				return false;
			},
			fn: handler as Handler<any>,
		});

		return this;
	}

	use(middleware: Middleware<Context & Derived>): this {
		this.composer.use(middleware as Middleware<any>);
		return this;
	}

	derive<D extends Record<string, unknown>>(
		fn: (ctx: Context & Derived) => D | Promise<D>,
	): Bot<Derived & D> {
		this.composer.derive(fn as any);
		return this as unknown as Bot<Derived & D>;
	}

	onError(handler: (err: unknown, ctx: Context) => void): this {
		this.errorHandler = handler;
		return this;
	}

	async start(): Promise<void> {
		this.polling = new LongPoll(this.vk, {
			group_id: this.options.group_id,
			wait: this.options.wait,
		});

		const composed = this.composer.compose();
		const derivers = this.composer.getDerivers();

		for await (const event of this.polling) {
			this.handleEvent(event, composed, derivers).catch((err) => {
				// If handleEvent itself throws after error handler, log it
				console.error("Unhandled error in event processing:", err);
			});
		}
	}

	stop(): void {
		this.polling?.stop();
	}

	private async handleEvent(
		event: LongPollEvent,
		composed: Middleware<Context>,
		derivers: ((ctx: any) => unknown)[],
	): Promise<void> {
		const ctx = createContext(this.vk, event);

		try {
			for (const deriver of derivers) {
				const derived = await deriver(ctx);
				if (derived && typeof derived === "object") {
					Object.assign(ctx, derived);
				}
			}

			await composed(ctx, async () => {});
		} catch (err) {
			if (this.errorHandler) {
				this.errorHandler(err, ctx);
			} else {
				console.error(`Error in ${ctx.type}:`, err);
			}
		}
	}
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
