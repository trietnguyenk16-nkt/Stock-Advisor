import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { deletePushSubscription, getAiModel, getPushSubscriptions, setAiModel, upsertPushSubscription } from "./db";
import { getPushConfig } from "./push";
import { marketRouter } from "./market";
import { addTrackedAsset, deactivateTrackedAsset, getTrackedAssets } from "./db";
import { AI_MODELS, getConfiguredAiModel } from "./openai";

export const appRouter = router({
  system: systemRouter,
  market: marketRouter,
  watchlist: router({
    list: publicProcedure.query(() => getTrackedAssets("owner")),
    add: publicProcedure.input(z.object({ ticker: z.string().trim().min(1).max(32), displayName: z.string().trim().min(1).max(255), assetType: z.enum(["equity", "fund", "gold"]), exchange: z.string().trim().max(16).optional(), providerCode: z.string().trim().min(1).max(64), currency: z.string().trim().max(8).default("VND"), unit: z.string().trim().max(32).default("share") })).mutation(({ input }) => addTrackedAsset({ ...input, workspaceKey: "owner", ticker: input.ticker.toUpperCase(), isActive: true })),
    remove: publicProcedure.input(z.object({ ticker: z.string().trim().min(1).max(32) })).mutation(async ({ input }) => { await deactivateTrackedAsset(input.ticker.toUpperCase(), "owner"); return { success: true }; }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ai: router({
    config: publicProcedure.query(async () => ({ enabled: Boolean(process.env.OPENAI_API_KEY), model: getConfiguredAiModel(await getAiModel()), models: AI_MODELS })),
    setModel: publicProcedure.input(z.object({ model: z.enum(["gpt-4o-mini", "gpt-5-mini"]) })).mutation(async ({ input }) => ({ ok: Boolean(await setAiModel(input.model)), model: input.model })),
  }),
  push: router({
    config: publicProcedure.query(() => getPushConfig()),
    subscribe: publicProcedure.input(z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) })).mutation(async ({ input, ctx }) => {
      const subscription = await upsertPushSubscription({ endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: ctx.req.headers["user-agent"] });
      return { ok: Boolean(subscription) };
    }),
    unsubscribe: publicProcedure.input(z.object({ endpoint: z.string().url() })).mutation(async ({ input }) => { await deletePushSubscription(input.endpoint); return { ok: true }; }),
    count: publicProcedure.query(async () => (await getPushSubscriptions()).length),
  }),
});

export type AppRouter = typeof appRouter;
