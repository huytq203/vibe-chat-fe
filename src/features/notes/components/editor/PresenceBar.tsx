'use client';

import { Avatar } from '@/components/ui/avatar/Avatar';
import type { CollabPerson } from '@/features/notes/hooks/useAwareness';

const MAX_VISIBLE_PEOPLE = 5;

interface PresenceBarProps {
  people: CollabPerson[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return parts.slice(0, 2).map((part) => part[0]).join('');
}

export function PresenceBar({ people }: PresenceBarProps) {
  if (people.length === 0) return null;
  const visiblePeople = people.slice(0, MAX_VISIBLE_PEOPLE);
  const hiddenCount = people.length - visiblePeople.length;

  return (
    <div aria-label={`${people.length} người đang xem`} className="flex items-center ps-2">
      {visiblePeople.map((person, index) => {
        const label = person.isSelf ? `${person.name} (Bạn)` : person.name;
        return (
          <Avatar
            key={person.userId}
            aria-label={label}
            title={label}
            fallback={initials(person.name)}
            className={`h-6 w-6 border-2 bg-background text-[10px] text-foreground ${index > 0 ? '-ms-2' : ''}`}
            style={{ borderColor: person.color, zIndex: visiblePeople.length - index }}
          />
        );
      })}
      {hiddenCount > 0 && (
        <span
          aria-label={`Còn ${hiddenCount} người đang xem`}
          className="-ms-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground"
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
