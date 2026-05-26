declare module 'twemoji-parser' {
  export type TwemojiEntity = {
    url: string;
    indices: [number, number];
    text: string;
    type: 'emoji';
  };

  export type ParseOptions = {
    assetType?: 'svg' | 'png';
    buildUrl?: (codepoints: string, assetType: string) => string;
  };

  export function parse(text: string, options?: ParseOptions): TwemojiEntity[];
  export function toCodePoints(unicodeSurrogates: string): string[];
  export const TypeName: 'emoji';
}
