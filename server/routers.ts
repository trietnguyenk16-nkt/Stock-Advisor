import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { marketRouter } from "./market";
import { addTrackedAsset, deactivateTrackedAsset, getTrackedAssets } from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  market: marketRouter,
  watchlist: router({
    list: publicProcedure.query(() => getTrackedAssets("owner")),
    add: publicProcedure.input(z.object({ ticker: z.string().trim().min(1).max(32), displayName: z.string().trim().min(1).max(255), assetType: z.enum(["equity", "fund", "gold"]), exchange: z.string().trim().max(16).optional(), providerCode: z.string().trim().min(1).max(64), currency: z.string().trim().max(8).default("VND"), unit: z.string().trim().max(32).default("share") })).mutation(({ input }) => addTrackedAsset({ ...input, workspaceKey: "owner", ticker: input.ticker.toUpperCase(), isActive: 1 })),
    remove: publicProcedure.input(z.object({ ticker: z.string().trim().min(1).max(32) })).mutation(async ({ input }) => { await deactivateTrackedAsset(input.ticker.toUpperCase(), "owner"); return { success: true }; }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
