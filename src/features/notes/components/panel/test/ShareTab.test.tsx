import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { PageDetail, PageRole } from "@/features/notes/types";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ShareTab } from "../ShareTab";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_USE_PROXY", "false");
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../InternalPermissionSection", () => ({
  InternalPermissionSection: () => (
    <div data-testid="internal-permission-section" />
  ),
}));
vi.mock("../PublicShareSection", () => ({
  PublicShareSection: () => <div data-testid="public-share-section" />,
}));

const NOTION_URL = "http://localhost:3007";
const PAGE_ID = "page-1";
const WORKSPACE_ID = "workspace-1";
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: "2026-08-25T00:00:00.000Z",
  });
}

function buildPage(myRole: PageRole): PageDetail {
  return {
    id: PAGE_ID,
    workspaceId: WORKSPACE_ID,
    parentId: null,
    path: `.${PAGE_ID}.`,
    depth: 1,
    sortKey: "a0",
    title: "Trang thử",
    icon: null,
    coverUrl: null,
    createdBy: "user-1",
    lastEditedBy: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
    myRole,
  };
}

function usePageResponse(myRole: PageRole) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}`, () =>
      envelope(buildPage(myRole)),
    ),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe("tab Chia sẻ — cổng theo myRole", () => {
  it("hiện skeleton khi đang tải thông tin trang", () => {
    server.use(
      http.get(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}`,
        () => new Promise(() => undefined),
      ),
    );

    renderWithProviders(
      <ShareTab pageId={PAGE_ID} workspaceId={WORKSPACE_ID} />,
    );

    expect(screen.getByTestId("share-tab-loading")).toBeInTheDocument();
  });

  it("hiện lỗi nhỏ và cho thử tải lại", async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}`, () =>
        HttpResponse.json({ message: "Lỗi máy chủ" }, { status: 500 }),
      ),
    );
    renderWithProviders(
      <ShareTab pageId={PAGE_ID} workspaceId={WORKSPACE_ID} />,
    );
    expect(
      await screen.findByText("Không tải được thông tin trang"),
    ).toBeInTheDocument();

    usePageResponse("FULL");
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/members`, () =>
        envelope([]),
      ),
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions`, () =>
        envelope([]),
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(
      await screen.findByTestId("internal-permission-section"),
    ).toBeInTheDocument();
  });

  it.each<PageRole>(["EDIT", "COMMENT", "VIEW"])(
    "myRole %s → chặn, không gọi API quyền/thành viên/link",
    async (role) => {
      usePageResponse(role);
      renderWithProviders(
        <ShareTab pageId={PAGE_ID} workspaceId={WORKSPACE_ID} />,
      );

      expect(
        await screen.findByText("Chỉ người có toàn quyền mới quản lý chia sẻ"),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("internal-permission-section"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("public-share-section"),
      ).not.toBeInTheDocument();
    },
  );

  it("myRole FULL → ráp cả nửa nội bộ và nửa công khai", async () => {
    usePageResponse("FULL");
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/${WORKSPACE_ID}/members`, () =>
        envelope([]),
      ),
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/permissions`, () =>
        envelope([]),
      ),
    );
    renderWithProviders(
      <ShareTab pageId={PAGE_ID} workspaceId={WORKSPACE_ID} />,
    );

    expect(
      await screen.findByTestId("internal-permission-section"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("public-share-section")).toBeInTheDocument();
  });
});
