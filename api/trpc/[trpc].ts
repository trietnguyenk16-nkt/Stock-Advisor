import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

type ContextRequest = Parameters<typeof createContext>[0]["req"];
type ContextResponse = Parameters<typeof createContext>[0]["res"];

export const config = { api: { bodyParser: false } };

function getProcedurePath(url: string | undefined) {
  return (url ?? "").split("?", 1)[0].split("/").filter(Boolean).pop() ?? "";
}

function adaptWebRequest(request: Request): ContextRequest {
  const url = new URL(request.url);
  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers: Object.fromEntries(request.headers.entries()),
  } as unknown as ContextRequest;
}

export default async function handler(request: any, response?: any) {
  if (response && typeof response.end === "function") {
    return nodeHTTPRequestHandler({
      req: request,
      res: response,
      path: getProcedurePath(request.url),
      router: appRouter,
      createContext: ({ req, res }) =>
        createContext({ req: req as ContextRequest, res: res as ContextResponse }),
    });
  }

  const contextRequest = adaptWebRequest(request as Request);
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request as Request,
    router: appRouter,
    createContext: () =>
      createContext({ req: contextRequest, res: {} as ContextResponse }),
  });
}
