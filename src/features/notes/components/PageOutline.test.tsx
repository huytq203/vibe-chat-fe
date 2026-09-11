import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OutlineItem } from '@/lib/editor/heading-outline';

import { PageOutline } from './PageOutline';

const observers: IntersectionObserverMock[] = [];

class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds = [0];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    observers.push(this);
  }

  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  unobserve(): void {}

  enter(target: Element): void {
    const bounds = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      boundingClientRect: bounds,
      intersectionRatio: 1,
      intersectionRect: bounds,
      isIntersecting: true,
      rootBounds: null,
      target,
      time: 0,
    };
    this.callback([entry], this);
  }
}

class ResizeObserverMock implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

const items: OutlineItem[] = [
  { id: 'heading-0', level: 1, text: 'Giới thiệu' },
  { id: 'heading-1', level: 2, text: 'Bối cảnh' },
  { id: 'heading-2', level: 3, text: 'Thiết kế' },
  { id: 'heading-3', level: 4, text: 'Chi tiết' },
  { id: 'heading-4', level: 5, text: 'Triển khai' },
  { id: 'heading-5', level: 6, text: 'Phụ lục' },
];

function renderOutline(outlineItems: OutlineItem[] = items) {
  return render(
    <main>
      <header />
      <div className="notes-editor notes-editor-next">
        {outlineItems.map((item) => <h2 key={item.id}>{item.text}</h2>)}
      </div>
      <PageOutline items={outlineItems} />
    </main>,
  );
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('mục lục trang', () => {
  it('nên hiện mục lục khi trang có heading', () => {
    renderOutline();

    expect(screen.getByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giới thiệu' })).toBeInTheDocument();
  });

  it('nên đặt mục lục theo khung soạn thảo chứ không theo cửa sổ', () => {
    renderOutline();

    expect(screen.getByRole('navigation', { name: 'Mục lục' }))
      .toHaveClass('absolute');
    expect(screen.getByRole('navigation', { name: 'Mục lục' }))
      .not.toHaveClass('fixed');
  });

  it('nên không hiện gì khi không có heading', () => {
    renderOutline([]);

    expect(screen.queryByRole('navigation', { name: 'Mục lục' })).not.toBeInTheDocument();
    expect(observers).toHaveLength(0);
  });

  it('nên tạo IntersectionObserver với rootMargin chỉ dùng px hoặc phần trăm', () => {
    renderOutline();

    const marginValues = observers.at(-1)?.rootMargin.trim().split(/\s+/) ?? [];
    expect(marginValues).not.toHaveLength(0);
    expect(marginValues.every((value) => /^-?\d+(?:\.\d+)?(?:px|%)$/.test(value))).toBe(true);
  });

  it('nên cuộn vùng <main> tới đúng heading, trừ chiều cao header, khi bấm một mục', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.tagName === 'HEADER') return new DOMRect(0, 0, 0, 112);
      if (this.tagName === 'MAIN') return new DOMRect(0, 200);
      if (this.textContent === 'Chi tiết') return new DOMRect(0, 620);
      return new DOMRect();
    });
    renderOutline();
    const main = screen.getByRole('main');
    const target = document.querySelectorAll<HTMLElement>('.notes-editor h2').item(3);
    const scrollIntoView = vi.fn();
    const scrollTo = vi.fn();
    main.scrollTop = 80;
    main.scrollTo = scrollTo;
    target.scrollIntoView = scrollIntoView;

    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 380 });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('nên dùng chiều cao header thật cho rootMargin', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return new DOMRect(0, 0, 0, this.tagName === 'HEADER' ? 112 : 0);
    });

    renderOutline();

    expect(observers.at(-1)?.rootMargin).toBe('-112px 0px 0px 0px');
  });

  it('nên thu gọn sau khi bấm một mục bằng chuột', async () => {
    renderOutline();
    const button = screen.getByRole('button', { name: 'Chi tiết' });
    const blur = vi.spyOn(button, 'blur');

    await userEvent.click(button);

    expect(blur).toHaveBeenCalledOnce();
    expect(button).not.toHaveFocus();
  });

  it('nên đánh dấu mục đang xem khi heading vào tầm nhìn', () => {
    renderOutline();
    const target = document.querySelectorAll<HTMLElement>('.notes-editor h2').item(3);
    if (target) act(() => observers[0]?.enter(target));

    expect(screen.getByRole('button', { name: 'Chi tiết' }))
      .toHaveAttribute('aria-current', 'location');
  });

  it('nên canh mọi gạch theo một mép chung khi thu gọn', () => {
    renderOutline();

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('p-0');
      expect(button).not.toHaveClass('pl-2', 'pl-4', 'pl-6', 'pl-8');
      expect(button.querySelector('[data-outline-marker-rail]')).toHaveClass('w-6');
    }
  });

  it('nên thu ngắn gạch dần qua đủ sáu cấp', () => {
    renderOutline();

    const markerWidths = ['w-5', 'w-4', 'w-3', 'w-2.5', 'w-2', 'w-1.5'];
    screen.getAllByRole('button').forEach((button, index) => {
      expect(button.querySelector('[data-outline-marker]')).toHaveClass(markerWidths[index]);
    });
  });

  it('nên thụt lề theo đủ sáu cấp khi mở', () => {
    renderOutline();

    const indentSteps = ['2', '4', '6', '8', '10', '12'];
    screen.getAllByRole('button').forEach((button, index) => {
      expect(button).toHaveClass(
        `group-hover/outline:pl-${indentSteps[index]}`,
        `group-has-[:focus-visible]/outline:pl-${indentSteps[index]}`,
      );
    });
  });

  it('nên dùng kiểu cấp một khi cấp heading nằm ngoài phạm vi', () => {
    renderOutline([{ id: 'heading-0', level: 7, text: 'Ngoài phạm vi' }]);

    const button = screen.getByRole('button', { name: 'Ngoài phạm vi' });
    expect(button).toHaveClass(
      'group-hover/outline:pl-2',
      'group-has-[:focus-visible]/outline:pl-2',
    );
    expect(button.querySelector('[data-outline-marker]')).toHaveClass('w-5');
  });

  it('nên xếp sát các gạch khi thu gọn và giãn hàng khi mở', () => {
    renderOutline();

    expect(screen.getByRole('button', { name: 'Giới thiệu' })).toHaveClass(
      'h-4',
      'group-hover/outline:h-9',
      'group-has-[:focus-visible]/outline:h-9',
      'motion-reduce:transition-none',
    );
  });

  it('nên chừa khoảng thở với mép phải và mở thành panel có tiêu đề', () => {
    renderOutline();

    const navigation = screen.getByRole('navigation', { name: 'Mục lục' });
    expect(navigation).toHaveClass('right-3');
    expect(navigation.querySelector('[data-outline-panel]')).toHaveClass(
      'w-9',
      'group-hover/outline:w-72',
      'group-has-[:focus-visible]/outline:w-72',
    );
    expect(screen.getByText('Trong trang')).toBeInTheDocument();
  });

  it('nên không dùng tooltip mặc định của trình duyệt trên mục bị rút gọn', () => {
    renderOutline();

    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('title');
    }
  });

  it('nên định vị theo chỉ số heading kể cả khi heading rỗng bị bỏ khỏi mục lục', async () => {
    render(
      <main>
        <header />
        <div className="notes-editor notes-editor-next">
          <h1>Đầu</h1>
          <h2 />
          <h3>Cuối</h3>
        </div>
        <PageOutline items={[{ id: 'heading-2', level: 3, text: 'Cuối' }]} />
      </main>,
    );
    const target = document.querySelectorAll<HTMLElement>('.notes-editor h1, .notes-editor h2, .notes-editor h3').item(2);
    const main = screen.getByRole('main');
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 300));

    await userEvent.click(screen.getByRole('button', { name: 'Cuối' }));

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 292 });
  });

});
