import { describe, test, expect, mock } from "bun:test";
import { Composer } from "../src/composer.ts";
import type { Context } from "../src/contexts/context.ts";

function fakeCtx(type = "message_new"): Context {
	return { type, groupId: 1, eventId: "evt1", vk: {} as any } as any;
}

describe("Composer", () => {
	test("use() registers and runs middleware", async () => {
		const composer = new Composer();
		const calls: number[] = [];

		composer.use(async (_ctx, next) => {
			calls.push(1);
			await next();
			calls.push(3);
		});
		composer.use(async (_ctx, next) => {
			calls.push(2);
			await next();
		});

		const composed = composer.compose();
		await composed(fakeCtx(), async () => {});

		expect(calls).toEqual([1, 2, 3]);
	});

	test("on() matches by event type", async () => {
		const composer = new Composer();
		const handler = mock(() => {});

		composer.on("message_new", handler);

		const composed = composer.compose();
		await composed(fakeCtx("message_new"), async () => {});
		await composed(fakeCtx("wall_post_new"), async () => {});

		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("on() skips non-matching type and calls next", async () => {
		const composer = new Composer();
		const handler1 = mock(() => {});
		const handler2 = mock(() => {});

		composer.on("wall_post_new", handler1);
		composer.on("message_new", handler2);

		const composed = composer.compose();
		await composed(fakeCtx("message_new"), async () => {});

		expect(handler1).not.toHaveBeenCalled();
		expect(handler2).toHaveBeenCalledTimes(1);
	});

	test("derive() accumulates derivers", () => {
		const composer = new Composer();
		const fn1 = () => ({ a: 1 });
		const fn2 = () => ({ b: 2 });

		composer.derive(fn1);
		composer.derive(fn2);

		expect(composer.getDerivers()).toEqual([fn1, fn2]);
	});

	test("middleware chain stops when next() is not called", async () => {
		const composer = new Composer();
		const calls: number[] = [];

		composer.use(async () => {
			calls.push(1);
			// deliberately not calling next
		});
		composer.use(async () => {
			calls.push(2);
		});

		const composed = composer.compose();
		await composed(fakeCtx(), async () => {});

		expect(calls).toEqual([1]);
	});

	test("route with filter", async () => {
		const composer = new Composer();
		const handler = mock(() => {});

		composer.routes.push({
			type: "message_new",
			filter: (ctx: any) => ctx.flag === true,
			fn: handler,
		});

		const composed = composer.compose();

		await composed({ ...fakeCtx(), flag: false } as any, async () => {});
		expect(handler).not.toHaveBeenCalled();

		await composed({ ...fakeCtx(), flag: true } as any, async () => {});
		expect(handler).toHaveBeenCalledTimes(1);
	});

	test("next() called multiple times throws", async () => {
		const composer = new Composer();

		composer.use(async (_ctx, next) => {
			await next();
			await next();
		});

		const composed = composer.compose();
		await expect(composed(fakeCtx(), async () => {})).rejects.toThrow(
			"next() called multiple times",
		);
	});
});
