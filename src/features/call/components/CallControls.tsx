'use client';

import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangup: () => void;
};

export function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangup,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 bg-accent p-4">
      <Button
        variant="ghost"
        size="icon"
        aria-label={micOn ? 'Tắt micro' : 'Bật micro'}
        onClick={onToggleMic}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-destructive" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={camOn ? 'Tắt camera' : 'Bật camera'}
        onClick={onToggleCam}
      >
        {camOn ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5 text-destructive" />
        )}
      </Button>

      <Button
        variant="solid"
        size="icon"
        aria-label="Kết thúc"
        onClick={onHangup}
        className="bg-destructive text-white hover:bg-destructive/90"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
