type CopyButtonState = 'idle' | 'copied' | 'error';

const COPY_LABEL: Record<CopyButtonState, string> = {
  idle: 'Sao chép',
  copied: 'Đã chép',
  error: 'Thử lại',
};

export function createCodeCopyButton(
  ownerDocument: Document,
  getCode: () => string,
  className: string,
) {
  const button = ownerDocument.createElement('button');
  button.type = 'button';
  button.className = className;
  button.contentEditable = 'false';
  button.setAttribute('aria-label', 'Sao chép đoạn mã');
  button.textContent = COPY_LABEL.idle;

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const setState = (state: CopyButtonState) => {
    button.dataset.state = state;
    button.textContent = COPY_LABEL[state];
    button.setAttribute('aria-label', state === 'copied' ? 'Đã sao chép đoạn mã' : 'Sao chép đoạn mã');
    if (resetTimer) clearTimeout(resetTimer);
    if (state !== 'idle') resetTimer = setTimeout(() => setState('idle'), 2_000);
  };
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(getCode());
      setState('copied');
    } catch {
      setState('error');
    }
  };

  button.addEventListener('click', handleClick);
  return {
    button,
    destroy: () => {
      if (resetTimer) clearTimeout(resetTimer);
      button.removeEventListener('click', handleClick);
    },
  };
}
