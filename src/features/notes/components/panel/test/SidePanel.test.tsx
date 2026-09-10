import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useParams, usePathname } from "next/navigation";
import { useNotesUiStore } from "@/features/notes/stores/notes-ui.store";
import { NotesLayout } from "../../NotesLayout";
import { SidePanel } from "../SidePanel";

const DEFAULT_PATHNAME = "/notes/workspace-1/page-1";
let aiTabMountCount = 0;

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ workspaceId: "workspace-1", pageId: "page-1" })),
  usePathname: vi.fn(() => DEFAULT_PATHNAME),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/features/notes/hooks/use-query", () => ({
  useWorkspaces: () => ({
    data: [{ id: "workspace-1" }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("../../NoteCanvas", () => ({
  NoteCanvas: () => <main data-testid="notes-canvas" className="flex-1" />,
}));
vi.mock("../CommentThread", () => ({ CommentThread: () => null }));
vi.mock("../VersionList", () => ({ VersionList: () => null }));
vi.mock("../ShareTab", () => ({ ShareTab: () => null }));
vi.mock("../AiTab", () => ({
  AiTab: ({ pageId, workspaceId }: { pageId: string; workspaceId: string }) => {
    const [mountId] = useState(() => {
      aiTabMountCount += 1;
      return aiTabMountCount;
    });
    return (
      <section aria-label="Trợ lý AI">
        Khung hội thoại AI cho {workspaceId}/{pageId}, mount {mountId}
      </section>
    );
  },
}));
vi.mock("../../sidebar/FavoriteList", () => ({ FavoriteList: () => null }));
vi.mock("../../sidebar/PageTree", () => ({ PageTree: () => null }));
vi.mock("../../sidebar/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => null,
}));
vi.mock("../../trash/TrashView", () => ({
  TrashView: () => <div data-testid="notes-trash-view" />,
}));
vi.mock("../../search/QuickSearchDialog", () => ({
  QuickSearchDialog: () => null,
}));

function resetStore(isOpen = false) {
  useNotesUiStore.setState({
    activeWorkspaceId: "workspace-1",
    expandedByWorkspace: {},
    isSidePanelOpen: isOpen,
    sidePanelTab: "comments",
  });
}

function renderNotesLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(<NotesLayout />, { wrapper: Wrapper });
}

afterEach(() => {
  aiTabMountCount = 0;
  resetStore();
  useNotesUiStore.persist.clearStorage();
  vi.mocked(useParams).mockReturnValue({ workspaceId: "workspace-1", pageId: "page-1" });
  vi.mocked(usePathname).mockReturnValue(DEFAULT_PATHNAME);
});

describe("bảng bên ghi chú", () => {
  it("nằm cùng luồng flex để đẩy canvas trên desktop và phủ toàn màn ở viewport hẹp", () => {
    resetStore(true);
    renderNotesLayout();

    const flow = screen.getByTestId("notes-content-flow");
    const canvas = screen.getByTestId("notes-canvas");
    const panel = screen.getByTestId("notes-side-panel");

    expect(flow).toHaveClass("flex");
    expect(canvas.parentElement).toBe(flow);
    expect(panel.parentElement).toBe(flow);
    expect(panel).toHaveClass("relative", "w-[340px]", "min-[1280px]:ml-3");
    expect(panel).not.toHaveClass("absolute", "fixed");
    expect(panel).toHaveClass(
      "max-[1279px]:fixed",
      "max-[1279px]:w-full",
      "min-[1280px]:rounded-2xl",
      "min-[1280px]:border",
      "min-[1280px]:shadow-subtle",
    );
  });

  it("lưu trạng thái mở và tab đang chọn vào store", async () => {
    resetStore(true);
    renderNotesLayout();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Lịch sử" }));

    expect(useNotesUiStore.getState().isSidePanelOpen).toBe(true);
    expect(useNotesUiStore.getState().sidePanelTab).toBe("versions");
    expect(localStorage.getItem("halo-notes-ui")).toContain(
      '"sidePanelTab":"versions"',
    );

    act(() => useNotesUiStore.getState().setSidePanelOpen(false));
    expect(screen.getByTestId("notes-side-panel")).toHaveClass(
      "w-0",
      "border-0",
      "shadow-none",
      "pointer-events-none",
    );
    expect(screen.getByTestId("notes-side-panel")).not.toHaveClass(
      "min-[1280px]:border",
      "min-[1280px]:shadow-subtle",
    );
  });

  it("nên hiện tab AI trong danh sách tab của bảng bên", () => {
    resetStore(true);
    renderNotesLayout();

    expect(screen.getByRole("tab", { name: "AI" })).toBeInTheDocument();
  });

  it("nên hiện khung hội thoại AI khi chọn tab AI", async () => {
    resetStore(true);
    renderNotesLayout();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "AI" }));

    expect(screen.getByRole("region", { name: "Trợ lý AI" })).toHaveTextContent(
      "Khung hội thoại AI cho workspace-1/page-1",
    );
  });

  it("nên không dựng lại AiTab khi đổi trang trong cùng workspace", () => {
    resetStore(true);
    useNotesUiStore.setState({ sidePanelTab: "ai" });
    const view = renderNotesLayout();
    expect(screen.getByRole("region", { name: "Trợ lý AI" })).toHaveTextContent(
      "workspace-1/page-1, mount 1",
    );

    vi.mocked(useParams).mockReturnValue({ workspaceId: "workspace-1", pageId: "page-2" });
    view.rerender(<NotesLayout />);

    expect(screen.getByRole("region", { name: "Trợ lý AI" })).toHaveTextContent(
      "workspace-1/page-2, mount 1",
    );
  });

  it("nên hiện lời nhắc chọn trang khi mở tab AI mà chưa chọn trang nào", () => {
    vi.mocked(useParams).mockReturnValue({ workspaceId: "workspace-1" });
    resetStore(true);
    useNotesUiStore.setState({ sidePanelTab: "ai" });
    renderNotesLayout();

    expect(screen.getByText("Chọn một trang để hỏi AI")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Trợ lý AI" })).not.toBeInTheDocument();
  });

  it("nên hiện lời nhắc chọn trang khi mở tab AI mà thiếu workspace", () => {
    vi.mocked(useParams).mockReturnValue({ pageId: "page-1" });
    resetStore(true);
    useNotesUiStore.setState({ sidePanelTab: "ai" });
    render(<SidePanel />);

    expect(screen.getByText("Chọn một trang để hỏi AI")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Trợ lý AI" })).not.toBeInTheDocument();
  });

  it("/notes/trash hiện TrashView, ẩn NoteCanvas và SidePanel", () => {
    vi.mocked(usePathname).mockReturnValue("/notes/trash");
    resetStore(true);
    renderNotesLayout();

    expect(screen.getByTestId("notes-trash-view")).toBeInTheDocument();
    expect(screen.queryByTestId("notes-canvas")).not.toBeInTheDocument();
    expect(screen.queryByTestId("notes-side-panel")).not.toBeInTheDocument();
  });
});
