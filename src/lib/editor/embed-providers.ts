export const EMBED_ASPECTS = ["16:9", "4:3", "1:1", "auto"] as const;

export type EmbedAspect = (typeof EMBED_ASPECTS)[number];

export interface EmbedProvider {
  id: string;
  label: string;
  match: (url: string) => boolean;
  toEmbedSrc: (url: string) => string | null;
  aspect: EmbedAspect;
}

export interface ResolvedEmbed {
  provider: EmbedProvider;
  src: string;
  aspect: EmbedAspect;
}

const SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;

function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.port
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function hasHost(url: URL, ...hosts: string[]): boolean {
  return hosts.includes(url.hostname.toLowerCase());
}

function validSegment(value: string | undefined): value is string {
  return Boolean(value && SEGMENT_PATTERN.test(value));
}

function decodedPathSegment(value: string): string | null {
  try {
    return decodeURIComponent(value.replace(/\+/g, "%20"));
  } catch {
    return null;
  }
}

function provider(
  id: string,
  label: string,
  aspect: EmbedAspect,
  convert: (url: URL) => string | null,
): EmbedProvider {
  const toEmbedSrc = (value: string): string | null => {
    const url = httpsUrl(value);
    return url ? convert(url) : null;
  };
  return { id, label, aspect, toEmbedSrc, match: (value) => toEmbedSrc(value) !== null };
}

function youtubeSrc(url: URL): string | null {
  let id: string | undefined;
  if (hasHost(url, "youtu.be")) id = url.pathname.split("/")[1];
  if (hasHost(url, "youtube.com", "www.youtube.com", "m.youtube.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? undefined;
    if (["shorts", "embed"].includes(parts[0] ?? "")) id = parts[1];
  }
  return validSegment(id) && id.length === 11
    ? `https://www.youtube.com/embed/${id}`
    : null;
}

function vimeoSrc(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
  return (host === "vimeo.com" || host === "www.vimeo.com" || host === "player.vimeo.com")
    && Boolean(id && /^\d+$/.test(id))
    ? `https://player.vimeo.com/video/${id}`
    : null;
}

function loomSrc(url: URL): string | null {
  if (!hasHost(url, "loom.com", "www.loom.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const id = ["share", "embed"].includes(parts[0] ?? "") ? parts[1] : undefined;
  return validSegment(id) ? `https://www.loom.com/embed/${id}` : null;
}

function googleMapsQuery(url: URL): string | null {
  const directQuery = url.searchParams.get("query") ?? url.searchParams.get("q");
  if (directQuery) return directQuery;
  const parts = url.pathname.split("/").filter(Boolean);
  const placeIndex = parts.indexOf("place");
  if (placeIndex >= 0 && parts[placeIndex + 1]) return decodedPathSegment(parts[placeIndex + 1]);
  const coordinates = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return coordinates ? `${coordinates[1]},${coordinates[2]}` : null;
}

function googleMapsSrc(url: URL): string | null {
  if (!hasHost(url, "google.com", "www.google.com", "maps.google.com")) return null;
  if (!url.pathname.startsWith("/maps")) return null;
  const query = googleMapsQuery(url);
  if (!query) return null;
  // Legacy keyless form. Move to Google Maps Embed API when an API key exists.
  const embed = new URL("https://maps.google.com/maps");
  embed.searchParams.set("q", query);
  embed.searchParams.set("output", "embed");
  return embed.toString();
}

function figmaSrc(url: URL): string | null {
  if (!hasHost(url, "figma.com", "www.figma.com", "embed.figma.com")) return null;
  if (url.pathname === "/embed") {
    const original = url.searchParams.get("url");
    const parsed = original ? httpsUrl(original) : null;
    return parsed ? figmaSrc(parsed) : null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (
    !["design", "file", "proto", "board", "slides", "deck"].includes(
      parts[0] ?? "",
    )
    || !validSegment(parts[1])
  ) return null;
  url.protocol = "https:";
  url.hostname = "embed.figma.com";
  url.hash = "";
  url.searchParams.set("embed-host", "halo");
  return url.toString();
}

function codepenSrc(url: URL): string | null {
  if (!hasHost(url, "codepen.io")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  return validSegment(parts[0]) && ["pen", "embed"].includes(parts[1] ?? "") && validSegment(parts[2])
    ? `https://codepen.io/${parts[0]}/embed/${parts[2]}`
    : null;
}

function gistSrc(url: URL): string | null {
  if (!hasHost(url, "gist.github.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (!validSegment(parts[0]) || !parts[1]) return null;
  const id = parts[1].replace(/\.pibb$/, "");
  // Best-effort: .pibb is not documented by GitHub; layer D will use a GitHub card.
  return validSegment(id) ? `https://gist.github.com/${parts[0]}/${id}.pibb` : null;
}

function spotifySrc(url: URL): string | null {
  if (!hasHost(url, "open.spotify.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const offset = parts[0] === "embed" ? 1 : 0;
  const kind = parts[offset];
  const id = parts[offset + 1];
  return ["track", "album", "playlist", "episode"].includes(kind ?? "") && validSegment(id)
    ? `https://open.spotify.com/embed/${kind}/${id}`
    : null;
}

function soundcloudSrc(url: URL): string | null {
  if (hasHost(url, "w.soundcloud.com") && url.pathname === "/player/") {
    const original = url.searchParams.get("url");
    const parsed = original ? httpsUrl(original) : null;
    return parsed ? soundcloudSrc(parsed) : null;
  }
  if (!hasHost(url, "soundcloud.com", "www.soundcloud.com")) return null;
  if (!url.pathname.split("/").filter(Boolean).length) return null;
  url.hash = "";
  const embed = new URL("https://w.soundcloud.com/player/");
  embed.searchParams.set("url", url.toString());
  return embed.toString();
}

export const EMBED_PROVIDERS: readonly EmbedProvider[] = [
  provider("youtube", "YouTube", "16:9", youtubeSrc),
  provider("vimeo", "Vimeo", "16:9", vimeoSrc),
  provider("loom", "Loom", "16:9", loomSrc),
  provider("googlemaps", "Google Maps", "4:3", googleMapsSrc),
  provider("figma", "Figma", "4:3", figmaSrc),
  provider("codepen", "CodePen", "16:9", codepenSrc),
  provider("gist", "GitHub Gist", "auto", gistSrc),
  provider("spotify", "Spotify", "auto", spotifySrc),
  provider("soundcloud", "SoundCloud", "auto", soundcloudSrc),
];

export function resolveEmbed(url: string): ResolvedEmbed | null {
  for (const candidate of EMBED_PROVIDERS) {
    const src = candidate.toEmbedSrc(url);
    if (src) return { provider: candidate, src, aspect: candidate.aspect };
  }
  return null;
}
