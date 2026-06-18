'use client';

import { useState } from 'react';
import { readContactCard } from '@/features/chat/types';
import { useOpenDirectConversation } from '@/features/chat/hooks/use-mutations';
import { ContactCardBubble } from './ContactCardBubble';
import { UserProfileDialog } from '@/features/chat/components/contact/UserProfileDialog';

export function ContactCardContent({ contact }: { contact: ReturnType<typeof readContactCard> }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const openDirect = useOpenDirectConversation();
  if (!contact) return null;
  return (
    <>
      <ContactCardBubble
        contact={contact}
        onMessage={(contactUserId) => openDirect.mutate(contactUserId)}
        onCardClick={() => setProfileOpen(true)}
      />
      <UserProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        userId={contact.contactUserId}
      />
    </>
  );
}
