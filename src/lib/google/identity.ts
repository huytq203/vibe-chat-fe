/**
 * Wrapper Google Identity Services — feature code KHÔNG chạm `window.google`.
 * Script chỉ nạp khi trang login cần (không vào bundle chung).
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';

type CredentialResponse = { credential: string };

type GsiButtonOptions = {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'pill';
  width: number;
  locale: string;
};

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode: 'popup';
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(el: HTMLElement, options: GsiButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | null = null;

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') return Promise.reject(new Error('GIS chỉ chạy ở trình duyệt'));
  const ready = window.google?.accounts.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts.id;
      if (id) resolve(id);
      else reject(new Error('Không tải được Google Sign-In'));
    };
    script.onerror = () => {
      loading = null; // cho phép thử lại (mạng chập chờn / adblock)
      reject(new Error('Không tải được Google Sign-In'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

// Callback đọc qua biến module: initialize() chỉ nên gọi 1 lần cho mỗi client id
// (gọi lặp làm GIS cảnh báo và đôi khi không vẽ lại nút).
let initializedClientId: string | null = null;
let activeCallback: ((credential: string) => void) | null = null;

export async function renderGoogleButton(
  el: HTMLElement,
  opts: { clientId: string; width: number; onCredential: (credential: string) => void },
): Promise<void> {
  const id = await loadGoogleIdentity();
  activeCallback = opts.onCredential;
  if (initializedClientId !== opts.clientId) {
    id.initialize({
      client_id: opts.clientId,
      callback: (response) => activeCallback?.(response.credential),
      ux_mode: 'popup',
    });
    initializedClientId = opts.clientId;
  }
  el.replaceChildren();
  id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: opts.width,
    locale: 'vi',
  });
}
