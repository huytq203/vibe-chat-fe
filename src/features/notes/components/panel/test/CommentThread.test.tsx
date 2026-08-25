import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { useAuthStore, type AuthUser } from "@/features/auth";
import { useNotesUiStore } from "@/features/notes/stores/notes-ui.store";
import type { Comment, PageRole } from "@/features/notes/types";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { CommentThread } from "../CommentThread";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_USE_PROXY", "false");
});
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const NOTION_URL = "http://localhost:3007";
const CHAT_URL = "http://localhost:3005";
const PAGE_ID = "page-1";
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: "2026-08-25T00:00:00.000Z",
  });
}

function buildPage(myRole: PageRole) {
  return {
    id: PAGE_ID,
    workspaceId: "workspace-1",
    parentId: null,
    path: PAGE_ID,
    depth: 0,
    sortKey: "a0",
    title: "Trang kiểm thử",
    icon: null,
    coverUrl: null,
    createdBy: "user-1",
    lastEditedBy: "user-1",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-25T00:00:00.000Z",
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
    myRole,
  };
}

function buildComment(input: Partial<Comment> & Pick<Comment, "id">): Comment {
  const { id, ...overrides } = input;
  return {
    id,
    pageId: PAGE_ID,
    blockId: "block-1",
    parentId: null,
    authorId: "user-1",
    body: { segments: [{ type: "text", text: "Nội dung bình luận" }] },
    resolvedAt: null,
    resolvedBy: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    deletedAt: null,
    author: { displayName: "Người viết", avatarUrl: null },
    ...overrides,
  };
}

const authUser: AuthUser = {
  id: "user-1",
  username: "nguoi-viet",
  email: null,
  phone: null,
  displayName: "Người viết",
  avatarUrl: null,
  coverUrl: null,
  bio: null,
  gender: null,
  dateOfBirth: null,
  status: "ACTIVE",
  visibility: "PUBLIC",
};

function useResponses(comments: Comment[], myRole: PageRole = "COMMENT") {
  server.use(
    http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}`, () =>
      envelope(buildPage(myRole)),
    ),
    http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/comments`, () =>
      envelope(comments),
    ),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => useAuthStore.getState().setUser(authUser));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().clear();
  useNotesUiStore.setState({ activeCommentBlockId: null });
  useNotesUiStore.persist.clearStorage();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe("luồng bình luận của trang", () => {
  it("hiện đúng hai skeleton bubble khi đang tải", () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}`, () =>
        envelope(buildPage("COMMENT")),
      ),
      http.get(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/comments`,
        () => new Promise(() => undefined),
      ),
    );

    renderWithProviders(<CommentThread pageId={PAGE_ID} />);

    expect(screen.getByTestId("comment-thread-loading").children).toHaveLength(
      2,
    );
  });

  it("hiện lỗi nhỏ và thử tải lại được", async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}`, () =>
        envelope(buildPage("COMMENT")),
      ),
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/comments`, () =>
        HttpResponse.json({ message: "Lỗi máy chủ" }, { status: 500 }),
      ),
    );
    renderWithProviders(<CommentThread pageId={PAGE_ID} />);
    expect(
      await screen.findByText("Không tải được bình luận"),
    ).toBeInTheDocument();

    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/comments`, () =>
        envelope([]),
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(await screen.findByText("Chưa có bình luận")).toBeInTheDocument();
  });

  it("hiện trạng thái rỗng và ô nhập với quyền COMMENT", async () => {
    useResponses([], "COMMENT");
    renderWithProviders(<CommentThread pageId={PAGE_ID} />);

    expect(await screen.findByText("Chưa có bình luận")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Viết bình luận…" }),
    ).toBeInTheDocument();
  });

  it("không hiện ô nhập với quyền VIEW", async () => {
    useResponses([], "VIEW");
    renderWithProviders(<CommentThread pageId={PAGE_ID} />);

    expect(await screen.findByText("Chưa có bình luận")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("hiện dữ liệu và không cho sửa hoặc xoá bình luận của người khác", async () => {
    useResponses([
      buildComment({
        id: "comment-other",
        authorId: "user-2",
        author: { displayName: "Người khác", avatarUrl: null },
        body: {
          segments: [
            { type: "text", text: "Chào " },
            { type: "mention", userId: "user-1" },
          ],
        },
      }),
    ]);
    renderWithProviders(<CommentThread pageId={PAGE_ID} />);

    expect(await screen.findByText("Người khác")).toBeInTheDocument();
    expect(screen.getByText("@user-1")).toHaveClass(
      "bg-primary/10",
      "text-primary",
    );
    expect(
      screen.queryByRole("button", { name: "Sửa bình luận" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xoá bình luận" }),
    ).not.toBeInTheDocument();
  });

  it("dồn trả lời của trả lời về đúng một cấp hiển thị", async () => {
    useResponses([
      buildComment({ id: "root" }),
      buildComment({ id: "reply-1", parentId: "root", authorId: "user-2" }),
      buildComment({ id: "reply-2", parentId: "reply-1", authorId: "user-3" }),
    ]);
    const { container } = renderWithProviders(
      <CommentThread pageId={PAGE_ID} />,
    );
    await screen.findAllByText("Người viết");

    expect(container.querySelectorAll('[data-comment-depth="0"]')).toHaveLength(
      1,
    );
    expect(container.querySelectorAll('[data-comment-depth="1"]')).toHaveLength(
      2,
    );
  });

  it("gửi body segment mention đúng userId theo hợp đồng BE", async () => {
    useResponses([], "COMMENT");
    let received: unknown;
    server.use(
      http.get(`${CHAT_URL}/api/v1/users/search`, () =>
        envelope({
          items: [
            {
              id: "user-2",
              username: "an",
              displayName: "An",
              avatarUrl: null,
              friendship: "NONE",
              mutualFriendsCount: 0,
            },
          ],
          nextCursor: null,
        }),
      ),
      http.post(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/comments`,
        async ({ request }) => {
          received = await request.json();
          return envelope(buildComment({ id: "comment-created" }));
        },
      ),
    );
    renderWithProviders(<CommentThread pageId={PAGE_ID} />);
    const composer = await screen.findByRole("textbox", {
      name: "Viết bình luận…",
    });

    await userEvent.type(composer, "Chào @an");
    const option = await screen.findByRole("option", { name: /An/ });
    await userEvent.click(option);
    await userEvent.type(composer, "nhé");
    await userEvent.click(screen.getByRole("button", { name: "Gửi" }));

    await waitFor(() => expect(received).toBeDefined());
    await waitFor(() => expect(composer).toHaveValue(""));
    expect(received).toEqual({
      body: {
        segments: [
          { type: "text", text: "Chào " },
          { type: "mention", userId: "user-2" },
          { type: "text", text: " nhé" },
        ],
      },
    });
  });
});
