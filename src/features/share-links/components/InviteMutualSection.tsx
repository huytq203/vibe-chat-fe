import { MUTUAL_SAMPLES } from '../enums/invite';

export function InviteMutualSection({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="px-5 pb-8">
      <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground/60">
        Bạn chung · {count}
      </p>
      <div className="flex items-center gap-1.5">
        {MUTUAL_SAMPLES.slice(0, Math.min(count, 4)).map((u, i) => (
          <div
            key={i}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold"
            style={{ background: u.c + '22', border: `2px solid ${u.c}44`, color: u.c }}
          >
            {u.av}
          </div>
        ))}
        {count > 4 && (
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-border bg-secondary text-[11.5px] font-bold text-muted-foreground">
            +{count - 4}
          </div>
        )}
      </div>
    </div>
  );
}
