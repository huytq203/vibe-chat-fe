'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCallPro } from '@/features/call/hooks/useCallPro';

const KINDS: { kind: MediaDeviceKind; label: string }[] = [
  { kind: 'audioinput', label: 'Micro' },
  { kind: 'videoinput', label: 'Camera' },
  { kind: 'audiooutput', label: 'Loa' },
];

type DeviceMap = Record<MediaDeviceKind, MediaDeviceInfo[]>;
const EMPTY: DeviceMap = { audioinput: [], videoinput: [], audiooutput: [] };

/**
 * Chọn thiết bị mic/camera/loa. Dùng popover TỰ QUẢN (không portal) vì cửa sổ gọi
 * ở z-60 — DropdownMenu portal (z-50) sẽ bị che khuất phía dưới.
 */
export function DevicePicker() {
  const { listDevices, switchDevice } = useCallPro();
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceMap>(EMPTY);
  const [selected, setSelected] = useState<Partial<Record<MediaDeviceKind, string>>>({});
  const ref = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const [mic, cam, spk] = await Promise.all([
      listDevices('audioinput'),
      listDevices('videoinput'),
      listDevices('audiooutput'),
    ]);
    setDevices({ audioinput: mic, videoinput: cam, audiooutput: spk });
  }, [listDevices]);

  // Chỉ đăng ký listener click-ngoài khi đang mở (không setState trong effect).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      if (!o) void refresh();
      return !o;
    });
  }, [refresh]);

  const pick = useCallback(
    async (kind: MediaDeviceKind, deviceId: string) => {
      await switchDevice(kind, deviceId);
      setSelected((s) => ({ ...s, [kind]: deviceId }));
    },
    [switchDevice],
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Chọn thiết bị"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          'grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors',
          open ? 'bg-foreground/15' : 'bg-foreground/5 hover:bg-foreground/10',
        )}
      >
        <Settings className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-20 mb-2 max-h-[260px] w-[240px] -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl">
          {KINDS.map(({ kind, label }, i) => (
            <div key={kind}>
              {i > 0 && <div className="my-1 h-px bg-border" />}
              <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {label}
              </p>
              {devices[kind].length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">Không có thiết bị</p>
              ) : (
                devices[kind].map((d) => (
                  <button
                    key={d.deviceId}
                    type="button"
                    onClick={() => void pick(kind, d.deviceId)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="max-w-[170px] truncate">
                      {d.label || 'Thiết bị không tên'}
                    </span>
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-primary',
                        selected[kind] === d.deviceId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
