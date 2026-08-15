import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../client/public/manifest.webmanifest", import.meta.url), "utf8")) as { display: string; start_url: string; icons: { src: string }[] };
const serviceWorker = readFileSync(new URL("../client/public/sw.js", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("PWA assets", () => {
  it("contains installable app metadata and icons", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.map((icon) => icon.src)).toContain("/pwa-icon.svg");
    expect(manifest.icons.map((icon) => icon.src)).toContain("/pwa-maskable.svg");
  });

  it("does not intercept market API requests", () => {
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('const SHELL =');
    expect(serviceWorker).toContain('/offline.html');
  });

  it("keeps the dashboard usable on narrow touch screens", () => {
    expect(homePage).toContain("overflow-x-hidden");
    expect(homePage).toContain("min-h-11");
    expect(homePage).toContain("grid gap-3");
  });
});
