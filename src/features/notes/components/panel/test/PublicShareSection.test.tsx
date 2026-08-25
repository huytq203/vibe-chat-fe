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
import type { ShareLink } from "@/features/notes/types";
import { renderWithProviders, screen, waitFor } from "@/test/test-utils";
import { PublicShareSection } from "../PublicShareSection";

vi.hoisted(() => {
  vi.stubEnv("NEXT_PUBLIC_USE_PROXY", "false");
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const NOTION_URL = "http://localhost:3007";
const PAGE_ID = "page-1";
const server = setupServer();

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: "2026-08-25T00:00:00.000Z",
  });
}

function buildLink(overrides: Partial<ShareLink> = {}): ShareLink {
  return {
    id: "link-1",
    pageId: PAGE_ID,
    token: "tok_abc123",
    includeSubpages: false,
    expiresAt: null,
    revokedAt: null,
    allowIndexing: false,
    showAuthors: false,
    viewCount: 0,
    lastViewedAt: null,
    createdBy: "user-1",
    createdAt: "2026-08-24T02:15:00.000Z",
    ...overrides,
  };
}

function useShareLinkResponse(data: ShareLink | null) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/share-link`, () =>
      envelope(data),
    ),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe("nửa công khai của tab Chia sẻ", () => {
  it("hiện skeleton khi đang tải", () => {
    server.use(
      http.get(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/share-link`,
        () => new Promise(() => undefined),
      ),
    );

    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);

    expect(screen.getByTestId("public-share-loading")).toBeInTheDocument();
  });

  it("hiện lỗi nhỏ và cho thử tải lại", async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/share-link`, () =>
        HttpResponse.json({ message: "Lỗi máy chủ" }, { status: 500 }),
      ),
    );
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);
    expect(
      await screen.findByText("Không tải được liên kết chia sẻ"),
    ).toBeInTheDocument();

    useShareLinkResponse(null);
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(
      await screen.findByRole("button", { name: "Bật chia sẻ công khai" }),
    ).toBeInTheDocument();
  });

  it("chưa có link nào → hiện nút bật, bấm gửi đúng request và chuyển sang form sửa", async () => {
    let currentLink: ShareLink | null = null;
    let requestBody: unknown;
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/share-link`, () =>
        envelope(currentLink),
      ),
      http.post(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/share-link`,
        async ({ request }) => {
          requestBody = await request.json();
          currentLink = buildLink();
          return envelope(currentLink);
        },
      ),
    );
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Bật chia sẻ công khai" }),
    );

    await waitFor(() => expect(requestBody).toEqual({}));
    expect(
      await screen.findByRole("button", { name: "Thu hồi liên kết" }),
    ).toBeInTheDocument();
  });

  it("link đã bị thu hồi vẫn hiện nút bật lại, không hiện form sửa", async () => {
    useShareLinkResponse(buildLink({ revokedAt: "2026-08-20T00:00:00.000Z" }));
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);

    expect(
      await screen.findByRole("button", { name: "Bật chia sẻ công khai" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Thu hồi liên kết" }),
    ).not.toBeInTheDocument();
  });

  it("link đang hoạt động → hiện đúng URL và copy gọi clipboard", async () => {
    // navigator.clipboard chỉ được jsdom của repo này tạo lười khi
    // userEvent.setup() chạy — phải setup TRƯỚC khi spy, xem
    // TokenRevealCard.test.tsx (cùng deviation, cùng lý do).
    const user = userEvent.setup();
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    useShareLinkResponse(buildLink({ token: "tok_xyz789" }));
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);

    expect(await screen.findByText(/\/p\/tok_xyz789$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chép liên kết" }));

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining("/p/tok_xyz789"),
    );
  });

  it("đổi tuỳ chọn rồi lưu → PATCH đúng field, không gửi password khi để trống", async () => {
    useShareLinkResponse(
      buildLink({
        includeSubpages: false,
        allowIndexing: false,
        showAuthors: false,
      }),
    );
    let requestBody: unknown;
    server.use(
      http.patch(
        `${NOTION_URL}/api/v1/share-links/link-1`,
        async ({ request }) => {
          requestBody = await request.json();
          return envelope(buildLink({ includeSubpages: true }));
        },
      ),
    );
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("checkbox", { name: "Bao gồm cả trang con" }),
    );
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() =>
      expect(requestBody).toEqual({
        includeSubpages: true,
        allowIndexing: false,
        showAuthors: false,
        expiresAt: null,
      }),
    );
  });

  it("tick xoá mật khẩu → PATCH gửi password: null", async () => {
    useShareLinkResponse(buildLink());
    let requestBody: unknown;
    server.use(
      http.patch(
        `${NOTION_URL}/api/v1/share-links/link-1`,
        async ({ request }) => {
          requestBody = await request.json();
          return envelope(buildLink());
        },
      ),
    );
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("checkbox", {
        name: "Xoá mật khẩu hiện có (nếu có)",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(requestBody).toMatchObject({ password: null }));
  });

  it("thu hồi: huỷ dialog không gọi DELETE, xác nhận thì gọi", async () => {
    useShareLinkResponse(buildLink());
    let revokeCount = 0;
    server.use(
      http.delete(`${NOTION_URL}/api/v1/share-links/link-1`, () => {
        revokeCount += 1;
        return envelope(buildLink({ revokedAt: "2026-08-25T00:00:00.000Z" }));
      }),
    );
    renderWithProviders(<PublicShareSection pageId={PAGE_ID} />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Thu hồi liên kết" }),
    );
    await user.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(revokeCount).toBe(0);

    await user.click(screen.getByRole("button", { name: "Thu hồi liên kết" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận thu hồi" }));

    await waitFor(() => expect(revokeCount).toBe(1));
  });
});
