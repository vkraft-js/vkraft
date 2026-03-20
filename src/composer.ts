import type { Context } from "./contexts/context.ts";

export type Handler<Ctx> = (ctx: Ctx) => unknown;
export type Middleware<Ctx> = (ctx: Ctx, next: () => Promise<void>) => unknown;

type AnyMiddleware = Middleware<any> | Handler<any>;

interface Route {
	type?: string;
	fn: AnyMiddleware;
	filter?: (ctx: any) => boolean;
}

export class Composer<Ctx extends Context = Context> {
	readonly routes: Route[] = [];
	private derivers: ((ctx: any) => unknown)[] = [];

	use(...fns: Middleware<Ctx>[]): this {
		for (const fn of fns) {
			this.routes.push({ fn });
		}
		return this;
	}

	on<T extends string>(type: T, handler: Handler<any>): this {
		this.routes.push({ type, fn: handler });
		return this;
	}

	derive<D extends Record<string, unknown>>(
		fn: (ctx: Ctx) => D | Promise<D>,
	): Composer<Ctx & D> {
		this.derivers.push(fn);
		return this as unknown as Composer<Ctx & D>;
	}

	getDerivers() {
		return this.derivers;
	}

	compose(): Middleware<Ctx> {
		const routes = this.routes;
		return async (ctx, next) => {
			let index = -1;

			const dispatch = async (i: number): Promise<void> => {
				if (i <= index) throw new Error("next() called multiple times");
				index = i;

				if (i >= routes.length) {
					await next();
					return;
				}

				const route = routes[i]!;

				if (route.type && (ctx as any).type !== route.type) {
					await dispatch(i + 1);
					return;
				}

				if (route.filter && !route.filter(ctx)) {
					await dispatch(i + 1);
					return;
				}

				await route.fn(ctx, () => dispatch(i + 1));
			};

			await dispatch(0);
		};
	}
}
