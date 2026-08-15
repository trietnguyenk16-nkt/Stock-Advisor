import type { IncomingMessage, ServerResponse } from "node:http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = (req.url ?? "").split("?", 1)[0] ?? "";
  const path = pathname.split("/").filter(Boolean).pop() ?? "";

  await nodeHTTPRequestHandler({
    req,
    res,
    path,
    router: appRouter,
    createContext: ({ req: contextReq, res: contextRes }) =>
      createContext({
        req: contextReq as Parameters<typeof createContext>[0]["req"],
        res: contextRes as Parameters<typeof createContext>[0]["res"],
      }),
  });
}
