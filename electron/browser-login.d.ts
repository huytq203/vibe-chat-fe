export interface PkcePair { verifier: string; challenge: string; state: string }
export interface BrowserLoginResult { code: string; codeVerifier: string }
export interface BrowserLoginCoordinator {
  start(): Promise<BrowserLoginResult>;
  handleCallback(rawUrl: string): boolean;
  cancel(): void;
}
declare const browserLogin: {
  createPkcePair(): PkcePair;
  buildLoginUrl(webUrl: string, pkce: PkcePair): string;
  parseCallback(rawUrl: string): { code: string; state: string } | null;
  findDeepLink(argv: string[]): string | null;
  createBrowserLoginCoordinator(opts: {
    openExternal: (url: string) => Promise<void>;
    webUrl: string;
    timeoutMs?: number;
  }): BrowserLoginCoordinator;
};
export default browserLogin;
