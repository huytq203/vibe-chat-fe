import { describe, expect, it } from "vitest";

import { EMBED_PROVIDERS, resolveEmbed } from "./embed-providers";

const CASES = [
  ["youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
  ["youtube", "https://youtu.be/M7lc1UVf-VE?t=10", "https://www.youtube.com/embed/M7lc1UVf-VE"],
  ["youtube", "https://youtube.com/shorts/aqz-KE-bpKQ", "https://www.youtube.com/embed/aqz-KE-bpKQ"],
  ["vimeo", "https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871"],
  ["vimeo", "https://www.vimeo.com/22439234?share=copy", "https://player.vimeo.com/video/22439234"],
  ["loom", "https://www.loom.com/share/473fad25ebd24b5ea8091503253dfecf", "https://www.loom.com/embed/473fad25ebd24b5ea8091503253dfecf"],
  ["loom", "https://loom.com/share/abcdef1234567890?sid=123", "https://www.loom.com/embed/abcdef1234567890"],
  ["googlemaps", "https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z", "https://maps.google.com/maps?q=Eiffel+Tower&output=embed"],
  ["googlemaps", "https://www.google.com/maps/search/?api=1&query=Grand+Palace+Bangkok", "https://maps.google.com/maps?q=Grand+Palace+Bangkok&output=embed"],
  ["figma", "https://www.figma.com/design/BAZsTPbh6W1r66Bdo/Example", "https://embed.figma.com/design/BAZsTPbh6W1r66Bdo/Example?embed-host=halo"],
  ["figma", "https://figma.com/file/nrPSsILSYjesyc5UHjYYa4/Demo?node-id=5-3", "https://embed.figma.com/file/nrPSsILSYjesyc5UHjYYa4/Demo?node-id=5-3&embed-host=halo"],
  ["codepen", "https://codepen.io/chriscoyier/pen/MYgbXjv", "https://codepen.io/chriscoyier/embed/MYgbXjv"],
  ["codepen", "https://codepen.io/Mamboleoo/pen/XWJPxpZ?editors=0010", "https://codepen.io/Mamboleoo/embed/XWJPxpZ"],
  ["gist", "https://gist.github.com/RyanNutt/905983e76c20cf3177b7", "https://gist.github.com/RyanNutt/905983e76c20cf3177b7.pibb"],
  ["gist", "https://gist.github.com/milanaryal/e9d558eae37b0aba9faeb4cbf061e970#file-hello-world-js", "https://gist.github.com/milanaryal/e9d558eae37b0aba9faeb4cbf061e970.pibb"],
  ["spotify", "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl?si=abc", "https://open.spotify.com/embed/track/11dFghVXANMlKmJXsNCbNl"],
  ["spotify", "https://open.spotify.com/episode/7makk4oTQel546B0PZlDM5", "https://open.spotify.com/embed/episode/7makk4oTQel546B0PZlDM5"],
  ["soundcloud", "https://soundcloud.com/forss/flickermood", "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fflickermood"],
  ["soundcloud", "https://soundcloud.com/forss/sets/soulhack?utm_source=clipboard", "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fforss%2Fsets%2Fsoulhack%3Futm_source%3Dclipboard"],
] as const;

describe("embed provider registry", () => {
  it.each(CASES)("resolves %s URL %s", (provider, input, expected) => {
    const resolved = resolveEmbed(input);
    const configured = EMBED_PROVIDERS.find(({ id }) => id === provider);
    expect(configured?.match(input)).toBe(true);
    expect(resolved?.provider.id).toBe(provider);
    expect(resolved?.src).toBe(expected);
    expect(resolved?.aspect).toBe(resolved?.provider.aspect);
  });

  it.each([
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://example.com/embed/video",
    "https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=invalid",
    "not a URL",
  ])("rejects non-whitelisted URL %s", (input) => {
    expect(resolveEmbed(input)).toBeNull();
    expect(EMBED_PROVIDERS.every(({ match }) => !match(input))).toBe(true);
  });

  it("keeps provider ids unique and complete", () => {
    expect(EMBED_PROVIDERS.map(({ id }) => id)).toEqual([
      "youtube", "vimeo", "loom", "googlemaps", "figma",
      "codepen", "gist", "spotify", "soundcloud",
    ]);
  });
});
