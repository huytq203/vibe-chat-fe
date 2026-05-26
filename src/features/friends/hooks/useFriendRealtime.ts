'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { friendKeys, userKeys } from '@/services/keys';
import type { FriendUpdateEvent } from '../types';

export function useFriendRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;

    function onFriendUpdate({ type, status }: FriendUpdateEvent) {
      switch (type) {
        case 'REQUEST_SENT':
          if (status === 'PENDING_IN') {
            qc.invalidateQueries({ queryKey: friendKeys.incoming() });
          } else {
            qc.invalidateQueries({ queryKey: friendKeys.outgoing() });
          }
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;

        case 'REQUEST_ACCEPTED':
          qc.invalidateQueries({ queryKey: friendKeys.incoming() });
          qc.invalidateQueries({ queryKey: friendKeys.outgoing() });
          qc.invalidateQueries({ queryKey: friendKeys.list() });
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;

        case 'REQUEST_REJECTED':
        case 'REQUEST_CANCELLED':
          qc.invalidateQueries({ queryKey: friendKeys.incoming() });
          qc.invalidateQueries({ queryKey: friendKeys.outgoing() });
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;

        case 'UNFRIENDED':
          qc.invalidateQueries({ queryKey: friendKeys.list() });
          qc.invalidateQueries({ queryKey: userKeys.all });
          break;
      }
    }

    socket.on('friend:update', onFriendUpdate);
    return () => {
      socket.off('friend:update', onFriendUpdate);
    };
  }, [isAuthed, qc]);
}
