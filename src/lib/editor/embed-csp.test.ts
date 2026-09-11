import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { EMBED_PROVIDERS } from "./embed-providers";

const PROVIDER_URLS: Readonly<Record<string, string>> = {
  codepen: "https://codepen.io/chriscoyier/pen/MYgbXjv",
  figma: "https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Example",
  gist: "https://gist.github.com/defunkt/1",
  googlemaps: "https://www.google.com/maps/search/?api=1&query=Bangkok",
  loom: "https://www.loom.com/share/473fad25ebd24b5ea8091503253dfecf",
  soundcloud: "https://soundcloud.com/forss/flickermood",
  spotify: "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
  vimeo: "https://vimeo.com/76979871",
  youtube: "https://youtu.be/dQw4w9WgXcQ",
};

describe("CSP cho embed", () => {
  it("nên có mọi hostname của registry trong CSP frame-src khi cấu hình embed", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    const frameSrc = config.match(/"frame-src ([^"]+)"/)?.[1] ?? "";

    for (const provider of EMBED_PROVIDERS) {
      const input = PROVIDER_URLS[provider.id];
      const output = input ? provider.toEmbedSrc(input) : null;
      expect(output, `registry thiếu URL kiểm thử cho ${provider.id}`).not.toBeNull();
      if (output) expect(frameSrc).toContain(`https://${new URL(output).hostname}`);
    }
  });
});
