// BlockSideMenu.tsx với B2-ter fix
'use client';

import { SideMenuExtension, SuggestionMenu } from '@blocknote/core/extensions';
import {
  BlockColorsItem,
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useDictionary,
  useExtension,
  useExtensionState,
} from '@blocknote/react';
import { GripVertical, Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip/Tooltip';


const AUTO_SCROLL_MARGIN = 80; // pixels from top/bottom edge to trigger scroll
const MAX_SCROLL_SPEED = 10; // pixels per frame

const buttonClasses = [
  'bn-button size-6 min-w-6 rounded-md p-0',
  'bg-transparent text-muted-foreground opacity-40',
  'transition-opacity duration-150 hover:bg-accent hover:opacity-100',
  'focus-visible:opacity-100 focus-visible:outline-none',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
  '[&_svg]:pointer-events-none [&_svg]:size-4',
].join(' ');

export function BlockSideMenu() {
  const editor = useBlockNoteEditor();
  const dictionary = useDictionary();
  const sideMenu = useExtension(SideMenuExtension);
  const suggestionMenu = useExtension(SuggestionMenu);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuFrozenRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // B2-ter: Adjust side menu offset based on block content geometry
  useLayoutEffect(() => {
    if (!block) return;

    const updateSideMenuOffset = () => {
      // Find the block container that is currently hovered/selected
      const blockContainer = document.querySelector<HTMLElement>(
        '[data-node-type="blockContainer"]:hover'
      );
      
      if (!blockContainer) return;

      const blockContent = blockContainer.querySelector<HTMLElement>('.bn-block-content');
      const sideMenuEl = document.querySelector<HTMLElement>('.bn-side-menu');

      if (!blockContent || !sideMenuEl) return;

      // Get computed styles of block content
      const styles = window.getComputedStyle(blockContent);
      const paddingTop = parseFloat(styles.paddingTop) || 0;
      const lineHeight = parseFloat(styles.lineHeight) || 24;
      
      // Side menu height
      const menuHeight = sideMenuEl.offsetHeight;

      // Calculate where side menu top should be to align center with first line center
      // First line center = paddingTop + lineHeight/2
      // Side menu top = first line center - menuHeight/2
      const targetTop = paddingTop + lineHeight / 2 - menuHeight / 2;

      // Apply calculated offset
      sideMenuEl.style.top = `${targetTop}px`;
    };

    // Update immediately and on subsequent changes
    const frameId = requestAnimationFrame(() => {
      updateSideMenuOffset();
    });

    // Also update on window resize or mutations
    if (typeof ResizeObserver === "undefined") return () => {};
    const observer = new ResizeObserver(updateSideMenuOffset);
    const blockContainers = document.querySelectorAll('[data-node-type="blockContainer"]');
    blockContainers.forEach(el => {
      const content = el.querySelector('.bn-block-content');
      if (content) observer.observe(content as HTMLElement);
    });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [block]);

  // B1-bis: Auto-scroll setup for dragging
  useEffect(() => {
    if (!isDragging) return;

    // Find the scroll container (main overflow-y-auto)
    scrollContainerRef.current = document.querySelector<HTMLElement>(
      'main.overflow-y-auto'
    ) || document.querySelector<HTMLElement>(
      '[class*="overflow-y-auto"]'
    );

    if (!scrollContainerRef.current) return;

    let lastMouseY = 0;

    const handleDragOver = (event: Event) => {
      if (event instanceof DragEvent) {
        lastMouseY = event.clientY;
      }
    };

    const performScroll = () => {
      if (!scrollContainerRef.current) return;

      const rect = scrollContainerRef.current.getBoundingClientRect();
      const distFromTop = lastMouseY - rect.top;
      const distFromBottom = rect.bottom - lastMouseY;

      let scrollDelta = 0;

      if (distFromTop < AUTO_SCROLL_MARGIN && distFromTop > 0) {
        // Near top: scroll up
        const proximity = 1 - distFromTop / AUTO_SCROLL_MARGIN;
        scrollDelta = -Math.ceil(proximity * MAX_SCROLL_SPEED);
      } else if (distFromBottom < AUTO_SCROLL_MARGIN && distFromBottom > 0) {
        // Near bottom: scroll down
        const proximity = 1 - distFromBottom / AUTO_SCROLL_MARGIN;
        scrollDelta = Math.ceil(proximity * MAX_SCROLL_SPEED);
      }

      if (scrollDelta !== 0) {
        scrollContainerRef.current.scrollTop += scrollDelta;
        scrollRafRef.current = requestAnimationFrame(performScroll);
      } else {
        scrollRafRef.current = requestAnimationFrame(performScroll);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    scrollRafRef.current = requestAnimationFrame(performScroll);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    };
  }, [isDragging]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    if (menuFrozenRef.current) {
      sideMenu.unfreezeMenu();
      menuFrozenRef.current = false;
    }
  }, [sideMenu]);

  useEffect(() => () => {
    if (menuFrozenRef.current) sideMenu.unfreezeMenu();
  }, [sideMenu]);

  const handleAddBlock = useCallback(() => {
    if (!block) return;

    const isEmpty = Array.isArray(block.content) && block.content.length === 0;
    const targetBlock = isEmpty
      ? block
      : editor.insertBlocks([{ type: 'paragraph' }], block, 'after')[0];

    if (!targetBlock) return;
    editor.setTextCursorPosition(targetBlock);
    suggestionMenu.openSuggestionMenu('/');
  }, [block, editor, suggestionMenu]);

  const handleDragStart = useCallback((event: DragEvent<HTMLButtonElement>) => {
    if (!block) return;
    setIsDragging(true);
    closeMenu();
    sideMenu.blockDragStart(event, block);
  }, [block, closeMenu, sideMenu]);

  const handleDragEnd = useCallback(() => {
    sideMenu.blockDragEnd();
    setIsDragging(false);
  }, [sideMenu]);

  const handleDragHandleClick = useCallback(() => {
    setIsDragging(false);
    if (menuOpen) {
      closeMenu();
      return;
    }
    sideMenu.freezeMenu();
    menuFrozenRef.current = true;
    setMenuOpen(true);
  }, [closeMenu, menuOpen, sideMenu]);

  if (!block) return null;

  return (
    <SideMenu>
      <TooltipProvider delay={350} closeDelay={0}>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={(
                <button
                  type="button"
                  aria-label="Thêm khối bên dưới"
                  className={`${buttonClasses} cursor-pointer`}
                  onClick={handleAddBlock}
                >
                  <Plus aria-hidden="true" />
                </button>
              )}
            />
            <TooltipContent side="top" className="text-xs">
              Thêm khối bên dưới
            </TooltipContent>
          </Tooltip>

          <DropdownMenu
            modal={false}
            open={menuOpen}
            onOpenChange={(open) => {
              if (!open) closeMenu();
            }}
          >
            <Tooltip disabled={isDragging || menuOpen}>
              <TooltipTrigger
                render={(
                  <DropdownMenuTrigger
                    render={(
                      <button
                        type="button"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label="Tuỳ chọn và di chuyển khối"
                        className={`${buttonClasses} ${
                          isDragging ? 'cursor-grabbing opacity-100' : 'cursor-grab'
                        } ${menuOpen ? 'opacity-100' : ''}`}
                        draggable
                        onClick={handleDragHandleClick}
                        onDragEnd={handleDragEnd}
                        onDragStart={handleDragStart}
                      >
                        <GripVertical aria-hidden="true" />
                      </button>
                    )}
                  />
                )}
              />
              <TooltipContent side="top" className="text-xs">
                <span className="flex flex-col">
                  <span>Kéo để di chuyển</span>
                  <span className="text-muted-foreground">Nhấn để mở tuỳ chọn</span>
                </span>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              side="left"
              align="start"
              className="bn-menu-dropdown bn-drag-handle-menu"
            >
              <RemoveBlockItem>{dictionary.drag_handle.delete_menuitem}</RemoveBlockItem>
              <BlockColorsItem>{dictionary.drag_handle.colors_menuitem}</BlockColorsItem>
              <TableRowHeaderItem>
                {dictionary.drag_handle.header_row_menuitem}
              </TableRowHeaderItem>
              <TableColumnHeaderItem>
                {dictionary.drag_handle.header_column_menuitem}
              </TableColumnHeaderItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </SideMenu>
  );
}
