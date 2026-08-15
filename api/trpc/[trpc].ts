import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

type ExpressRequestLike = Parameters<typeof createContext>[0]["req"];
type ExpressResponseLike = Parameters<typeof createContext>[0]["res"];

function adaptRequest(request: Request): ExpressRequestLike {
  const url = new URL(request.url);
  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers: Object.fromEntries(request.headers.entries()),
  } as unknown as ExpressRequestLike;
}

export default async function handler(request: Request) {
  const adaptedRequest = adaptRequest(request);
  const adaptedResponse = {} as ExpressResponseLike;

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () =>
      createContext({ req: adaptedRequest, res: adaptedResponse }),
  });
}
