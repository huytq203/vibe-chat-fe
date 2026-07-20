"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeft, Maximize2, Minimize2, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { cn } from "@/lib/utils/cn";
import type { WebAppSession } from "@/features/chat/hooks/useWebAppLaunch";

type WebAppContainerProps = {
  session: WebAppSession | null;
  onSendData: (data: string) => void;
  onClose: () => void;
  onInvokeCustomMethod: (request: {
    reqId: string;
    method: string;
    params: Record<string, unknown>;
  }) => Promise<unknown>;
};

type Frame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 420;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 680;
const VIEWPORT_MARGIN = 12;
const DEFAULT_TOP = 64;

function withInitDataHash(url: string, initData: string): string {
  const parsed = new URL(url);
  parsed.hash = `haloWebAppData=${encodeURIComponent(initData)}`;
  return parsed.toString();
}

function defaultFrame(): Frame {
  if (typeof window === "undefined") {
    return {
      left: VIEWPORT_MARGIN,
      top: DEFAULT_TOP,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
  }
  const width = Math.min(
    DEFAULT_WIDTH,
    window.innerWidth - VIEWPORT_MARGIN * 2,
  );
  const height = Math.min(
    DEFAULT_HEIGHT,
    window.innerHeight - DEFAULT_TOP - VIEWPORT_MARGIN,
  );
  return {
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.round((window.innerWidth - width) / 2),
    ),
    top: DEFAULT_TOP,
    width,
    height,
  };
}

function clampFrame(frame: Frame): Frame {
  if (typeof window === "undefined") return frame;
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(
    MIN_HEIGHT,
    window.innerHeight - VIEWPORT_MARGIN * 2,
  );
  const width = Math.min(maxWidth, Math.max(MIN_WIDTH, frame.width));
  const height = Math.min(maxHeight, Math.max(MIN_HEIGHT, frame.height));
  return {
    left: Math.min(
      window.innerWidth - width - VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, frame.left),
    ),
    top: Math.min(
      window.innerHeight - height - VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, frame.top),
    ),
    width,
    height,
  };
}

export function WebAppContainer({
  session,
  onSendData,
  onClose,
  onInvokeCustomMethod,
}: WebAppContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<Frame>(defaultFrame());
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [frame, setFrame] = useState<Frame>(() => defaultFrame());
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mainButton, setMainButton] = useState({
    text: "TIẾP TỤC",
    isVisible: false,
    isActive: true,
    isProgressVisible: false,
    color: "",
    textColor: "",
  });
  const [backVisible, setBackVisible] = useState(false);
  const [needConfirmation, setNeedConfirmation] = useState(false);
  const src = useMemo(
    () => (session ? withInitDataHash(session.url, session.initData) : ""),
    [session],
  );
  const sessionOrigin = useMemo(
    () => (session ? new URL(session.url).origin : null),
    [session],
  );
  const blockedSameOrigin =
    typeof window !== "undefined" &&
    sessionOrigin != null &&
    sessionOrigin === window.location.origin;

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const postToWebapp = useCallback(
    (eventType: string, eventData: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(
        { eventType, eventData },
        sessionOrigin ?? "*",
      );
    },
    [sessionOrigin],
  );

  const requestClose = useCallback(() => {
    if (
      !needConfirmation ||
      window.confirm("Đóng WebApp? Dữ liệu chưa lưu có thể bị mất.")
    ) {
      onClose();
    }
  }, [needConfirmation, onClose]);

  const startResize = (
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (collapsed || expanded) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = frameRef.current;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);
    setResizing(true);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const next = { ...startFrame };

      if (edge.includes("e")) {
        next.width = startFrame.width + deltaX;
      }
      if (edge.includes("s")) {
        next.height = startFrame.height + deltaY;
      }
      if (edge.includes("w")) {
        next.left = startFrame.left + deltaX;
        next.width = startFrame.width - deltaX;
        if (next.width < MIN_WIDTH) {
          next.left = startFrame.left + startFrame.width - MIN_WIDTH;
          next.width = MIN_WIDTH;
        }
      }
      if (edge.includes("n")) {
        next.top = startFrame.top + deltaY;
        next.height = startFrame.height - deltaY;
        if (next.height < MIN_HEIGHT) {
          next.top = startFrame.top + startFrame.height - MIN_HEIGHT;
          next.height = MIN_HEIGHT;
        }
      }

      setFrame(clampFrame(next));
    };

    const onUp = () => {
      setResizing(false);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (expanded) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = frameRef.current;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);
    setDragging(true);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setFrame(
        clampFrame({
          ...startFrame,
          left: startFrame.left + deltaX,
          top: startFrame.top + deltaY,
        }),
      );
    };

    const onUp = () => {
      setDragging(false);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  useEffect(() => {
    if (!session || !sessionOrigin || blockedSameOrigin) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== sessionOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const payload = data as {
        type?: string;
        eventType?: string;
        data?: unknown;
        eventData?: unknown;
      };
      const eventType = payload.eventType ?? payload.type;
      const eventData = (payload.eventData ?? payload.data ?? {}) as Record<
        string,
        unknown
      >;
      if (payload.type === "halo:webapp:close") onClose();
      if (
        payload.type === "halo:webapp:sendData" &&
        typeof payload.data === "string"
      ) {
        onSendData(payload.data);
      }
      if (payload.type === "halo:webapp:expand") {
        setCollapsed(false);
        setExpanded(true);
      }
      if (payload.type === "halo:webapp:ready") {
        (event.source as WindowProxy).postMessage(
          {
            type: "halo:webapp:init",
            initData: session.initData,
            themeParams: { colorScheme: "dark" },
          },
          sessionOrigin,
        );
      }
      if (eventType === "web_app_ready") {
        postToWebapp("viewport_changed", {
          height: iframeRef.current?.clientHeight ?? window.innerHeight,
          is_expanded: expanded,
          is_state_stable: true,
        });
      }
      if (eventType === "web_app_expand") {
        setCollapsed(false);
        setExpanded(true);
      }
      if (eventType === "web_app_close") requestClose();
      if (
        eventType === "web_app_data_send" &&
        typeof eventData.data === "string"
      ) {
        onSendData(eventData.data);
      }
      if (eventType === "web_app_setup_main_button") {
        setMainButton((current) => ({
          ...current,
          text:
            typeof eventData.text === "string" ? eventData.text : current.text,
          color: typeof eventData.color === "string" ? eventData.color : "",
          textColor:
            typeof eventData.textColor === "string" ? eventData.textColor : "",
          isVisible: eventData.isVisible === true,
          isActive: eventData.isActive !== false,
          isProgressVisible: eventData.isProgressVisible === true,
        }));
      }
      if (eventType === "web_app_setup_back_button")
        setBackVisible(eventData.isVisible === true);
      if (eventType === "web_app_setup_closing_behavior")
        setNeedConfirmation(eventData.needConfirmation === true);
      if (eventType === "web_app_open_popup") {
        const message =
          typeof eventData.message === "string" ? eventData.message : "";
        const accepted = window.confirm(message);
        postToWebapp("popup_closed", { button_id: accepted ? "ok" : "cancel" });
      }
      if (eventType === "web_app_trigger_haptic" && navigator.vibrate)
        navigator.vibrate(20);
      if (eventType === "web_app_invoke_custom_method") {
        const reqId =
          typeof eventData.req_id === "string" ? eventData.req_id : "";
        const method =
          typeof eventData.method === "string" ? eventData.method : "";
        const params =
          eventData.params && typeof eventData.params === "object"
            ? (eventData.params as Record<string, unknown>)
            : {};
        if (
          (method === "requestWriteAccess" || method === "requestContact") &&
          !window.confirm(
            method === "requestContact"
              ? "Cho phép WebApp chia sẻ danh tính của bạn với bot?"
              : "Cho phép bot gửi tin nhắn cho bạn?",
          )
        ) {
          postToWebapp("custom_method_invoked", {
            req_id: reqId,
            error: "USER_DECLINED",
          });
          return;
        }
        void onInvokeCustomMethod({ reqId, method, params })
          .then((result) =>
            postToWebapp("custom_method_invoked", { req_id: reqId, result }),
          )
          .catch((error: unknown) =>
            postToWebapp("custom_method_invoked", {
              req_id: reqId,
              error:
                error instanceof Error ? error.message : "Yêu cầu thất bại",
            }),
          );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [
    blockedSameOrigin,
    expanded,
    onClose,
    onInvokeCustomMethod,
    onSendData,
    postToWebapp,
    requestClose,
    session,
    sessionOrigin,
  ]);

  if (!session) return null;
  const interacting = resizing || dragging;

  return (
    <div
      className={cn(
        "fixed z-50 overflow-hidden bg-background shadow-2xl",
        interacting
          ? "transition-none"
          : "transition-[inset,left,top,width,height,transform,border-radius] duration-200",
        expanded
          ? "inset-0 rounded-none border-0"
          : "rounded-lg border border-border",
      )}
      style={
        expanded
          ? undefined
          : {
              left: frame.left,
              top: frame.top,
              width: frame.width,
              height: collapsed ? 44 : frame.height,
            }
      }
    >
      <div
        className={cn(
          "relative z-30 flex h-11 items-center justify-between border-b border-border bg-sidebar px-2",
          expanded
            ? "cursor-default"
            : dragging
              ? "cursor-grabbing"
              : "cursor-grab",
        )}
        onPointerDown={startDrag}
      >
        <span className="truncate px-2 text-[13px] font-semibold text-foreground">
          {session.title || `@${session.botUsername}`}
        </span>
        <div
          className="flex items-center gap-1"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setExpanded(false);
              setCollapsed((value) => !value);
            }}
            aria-label={
              collapsed ? "Khôi phục WebApp" : "Thu WebApp về thanh tiêu đề"
            }
            title={collapsed ? "Khôi phục" : "Thu về thanh tiêu đề"}
          >
            {collapsed ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
          </Button>
          {!collapsed && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setCollapsed(false);
                setExpanded((value) => !value);
              }}
              aria-label={expanded ? "Thu gọn WebApp" : "Mở rộng WebApp"}
              title={expanded ? "Thu gọn" : "Mở rộng"}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={requestClose}
            aria-label="Đóng WebApp"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!collapsed &&
        (blockedSameOrigin ? (
          <div className="flex h-[calc(100%-2.75rem)] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            WebApp cùng origin với ứng dụng không được mở trong khung nhúng.
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title={`WebApp ${session.botUsername}`}
            src={src}
            sandbox="allow-scripts allow-forms allow-same-origin"
            referrerPolicy="no-referrer"
            className={cn(
              "h-[calc(100%-2.75rem)] w-full bg-background",
              interacting && "pointer-events-none",
            )}
          />
        ))}
      {!collapsed && backVisible && (
        <button
          type="button"
          className="absolute left-2 top-12 z-20 rounded-full bg-background/90 p-2 shadow"
          onClick={() => postToWebapp("back_button_pressed", {})}
          aria-label="Quay lại trong WebApp"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      {!collapsed && mainButton.isVisible && (
        <button
          type="button"
          disabled={!mainButton.isActive || mainButton.isProgressVisible}
          className="absolute bottom-3 left-3 right-3 z-20 h-12 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-lg disabled:opacity-60"
          style={{
            ...(mainButton.color ? { backgroundColor: mainButton.color } : {}),
            ...(mainButton.textColor ? { color: mainButton.textColor } : {}),
          }}
          onClick={() => postToWebapp("main_button_pressed", {})}
        >
          {mainButton.isProgressVisible ? "Đang xử lý…" : mainButton.text}
        </button>
      )}
      {!expanded && !collapsed && (
        <>
          <ResizeHandle edge="s" onResizeStart={startResize} />
          <ResizeHandle edge="e" onResizeStart={startResize} />
          <ResizeHandle edge="w" onResizeStart={startResize} />
          <ResizeHandle edge="se" onResizeStart={startResize} />
          <ResizeHandle edge="sw" onResizeStart={startResize} />
        </>
      )}
    </div>
  );
}

function ResizeHandle({
  edge,
  onResizeStart,
}: {
  edge: ResizeEdge;
  onResizeStart: (
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const classes: Record<ResizeEdge, string> = {
    n: "left-3 right-3 top-11 h-1.5 cursor-n-resize",
    s: "bottom-0 left-3 right-3 h-1.5 cursor-s-resize",
    e: "bottom-2 right-0 top-11 w-1.5 cursor-e-resize",
    w: "bottom-2 left-0 top-11 w-1.5 cursor-w-resize",
    ne: "right-0 top-11 h-2 w-2 cursor-ne-resize",
    nw: "left-0 top-11 h-2 w-2 cursor-nw-resize",
    se: "bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize",
    sw: "bottom-0 left-0 h-2.5 w-2.5 cursor-sw-resize",
  };

  return (
    <button
      type="button"
      onPointerDown={(event) => onResizeStart(edge, event)}
      className={cn("absolute z-10 bg-transparent", classes[edge])}
      aria-label={`Kéo cạnh ${edge} để đổi kích thước WebApp`}
      title="Kéo để đổi kích thước"
    />
  );
}
