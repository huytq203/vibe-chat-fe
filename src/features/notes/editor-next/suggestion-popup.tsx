"use client";

import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  Fragment,
  type ForwardedRef,
  forwardRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils/cn";

import { SuggestionUrlPrompt } from "./suggestion-url-prompt";

export type SuggestionItemGroup = "Căn lề" | "Cơ bản" | "Chèn" | "Danh sách" | "Khối";

/** Một hàng có thể chọn trong popup lệnh / hoặc emoji. `run` thực hiện thao tác chèn. */
export interface SuggestionItem {
  embedProviderId?: string;
  group?: SuggestionItemGroup;
  id: string;
  keywords: readonly string[];
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  prompt?: "embed" | "image" | "link";
  run: (editor: Editor, range: Range, value?: string) => void;
}

export interface SuggestionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  resetActive: () => void;
}

interface SuggestionRowProps {
  active: boolean;
  index: number;
  item: SuggestionItem;
  onActivate: (index: number) => void;
  onSelect: (item: SuggestionItem) => void;
}

function SuggestionRow({ active, index, item, onActivate, onSelect }: SuggestionRowProps) {
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    // Giữ focus/vùng chọn của editor để `run` tác động đúng vùng.
    event.preventDefault();
    onSelect(item);
  }

  return (
    <button
      type="button"
      data-idx={index}
      onMouseEnter={() => onActivate(index)}
      onMouseDown={handleMouseDown}
      className={cn(
        "flex w-full items-center gap-[10px] rounded-md px-[10px] py-2 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent",
      )}
    >
      {item.icon ? (
        <span className="flex size-6 shrink-0 items-center justify-center text-base text-muted-foreground [&>svg]:size-4">
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{item.title}</span>
        {item.subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

function useSuggestionNavigation(
  items: SuggestionItem[],
  selectItem: (item: SuggestionItem) => void,
  ref: ForwardedRef<SuggestionListHandle>,
  listRef: RefObject<HTMLDivElement | null>,
  promptItem: SuggestionItem | null,
  closePrompt: () => void,
) {
  const [active, setActive] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (promptItem) {
        if (event.key === "Escape") closePrompt();
        else return false;
        return true;
      }
      if (!items.length) return false;
      if (event.key === "ArrowDown") setActive((value) => (value + 1) % items.length);
      else if (event.key === "ArrowUp") {
        setActive((value) => (value - 1 + items.length) % items.length);
      } else if (event.key === "Enter") {
        const item = items[active];
        if (item) selectItem(item);
      } else return false;
      return true;
    },
    resetActive: () => {
      setActive(0);
      closePrompt();
    },
  }));
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active, listRef]);

  return { active, setActive };
}

interface SuggestionRowsProps {
  active: number;
  command: (item: SuggestionItem) => void;
  items: SuggestionItem[];
  setActive: (index: number) => void;
  setPromptItem: (item: SuggestionItem) => void;
}

function SuggestionRows({ active, command, items, setActive, setPromptItem }: SuggestionRowsProps) {
  return items.map((item, index) => {
    const showGroup = item.group && item.group !== items[index - 1]?.group;
    return (
      <Fragment key={item.id}>
        {showGroup ? (
          <div className="px-[10px] pb-1 pt-2 text-xs font-medium text-muted-foreground">
            {item.group}
          </div>
        ) : null}
        <SuggestionRow
          active={index === active}
          index={index}
          item={item}
          onActivate={setActive}
          onSelect={item.prompt ? setPromptItem : command}
        />
      </Fragment>
    );
  });
}

/**
 * Danh sách điều hướng bằng bàn phím được hiển thị trong popup `@tiptap/suggestion`.
 * Menu lệnh gạch chéo và bộ chọn emoji cùng truyền vào các `SuggestionItem`.
 */
export const SuggestionList = forwardRef<
  SuggestionListHandle,
  Pick<SuggestionProps<SuggestionItem>, "command" | "items"> &
    Partial<Pick<SuggestionProps<SuggestionItem>, "editor" | "range">>
>(
  function SuggestionList({ command, editor, items, range }, ref) {
    const listRef = useRef<HTMLDivElement>(null);
    const [promptItem, setPromptItem] = useState<SuggestionItem | null>(null);
    const closePrompt = () => setPromptItem(null);
    const selectItem = (item: SuggestionItem) => {
      if (item.prompt) setPromptItem(item);
      else command(item);
    };
    const { active, setActive } = useSuggestionNavigation(
      items, selectItem, ref, listRef, promptItem, closePrompt,
    );

    if (!items.length) return null;

    if (promptItem) {
      return (
        <SuggestionUrlPrompt
          command={command}
          editor={editor}
          item={promptItem}
          onClose={closePrompt}
          range={range}
        />
      );
    }

    return (
      <div
        ref={listRef}
        className="flex max-h-[300px] w-[336px] max-w-[calc(100vw-24px)] flex-col gap-[1px] overflow-y-auto rounded-[10px] border border-border bg-popover p-[6px] shadow-subtle"
      >
        <SuggestionRows
          active={active}
          command={command}
          items={items}
          setActive={setActive}
          setPromptItem={selectItem}
        />
      </div>
    );
  },
);

/**
 * Tạo phần `render` của cấu hình `@tiptap/suggestion`, gắn `SuggestionList`
 * qua `props.mount()` do v3 quản lý (định vị Floating UI, không dùng tippy).
 * Menu lệnh gạch chéo và bộ chọn emoji cùng tái sử dụng phần này.
 */
export function makeSuggestionRender(): NonNullable<
  SuggestionOptions<SuggestionItem>["render"]
> {
  return () => {
    let component: ReactRenderer<SuggestionListHandle, SuggestionProps<SuggestionItem>> | null =
      null;
    let previousItems: SuggestionItem[] | undefined;
    let unmount: (() => void) | undefined;

    return {
      onStart: (props) => {
        previousItems = props.items;
        const renderer = new ReactRenderer<
          SuggestionListHandle,
          SuggestionProps<SuggestionItem>
        >(SuggestionList, { props, editor: props.editor });
        renderer.element.classList.add("z-50");
        unmount = props.mount(renderer.element);
        component = renderer;
      },
      onUpdate: (props) => {
        if (previousItems !== props.items) component?.ref?.resetActive();
        previousItems = props.items;
        component?.updateProps(props);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          unmount?.();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        unmount?.();
        component?.destroy();
        component = null;
      },
    };
  };
}
