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
import type { PageVersion } from "@/features/notes/types";
import {
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "@/test/test-utils";
import { VersionList } from "../VersionList";

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

function buildVersion(
  input: Partial<PageVersion> & Pick<PageVersion, "id">,
): PageVersion {
  const { id, ...overrides } = input;
  return {
    id,
    pageId: PAGE_ID,
    kind: "AUTO",
    label: null,
    sizeBytes: 128,
    preview: "Nội dung xem trước",
    createdBy: "user-1",
    createdAt: "2026-08-24T02:15:00.000Z",
    ...overrides,
  };
}

function useVersionList(versions: PageVersion[]) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/versions`, () =>
      envelope(versions),
    ),
  );
}

function useVersionDetail(
  version: PageVersion,
  html = "<p>Nội dung phiên bản</p>",
) {
  server.use(
    http.get(`${NOTION_URL}/api/v1/versions/${version.id}`, () =>
      envelope({ ...version, html }),
    ),
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe("lịch sử phiên bản của trang", () => {
  it("hiện đúng bốn skeleton hàng khi đang tải", () => {
    server.use(
      http.get(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/versions`,
        () => new Promise(() => undefined),
      ),
    );

    renderWithProviders(<VersionList pageId={PAGE_ID} />);

    expect(screen.getByTestId("version-list-loading").children).toHaveLength(4);
  });

  it("hiện lỗi nhỏ và cho thử tải lại", async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/${PAGE_ID}/versions`, () =>
        HttpResponse.json({ message: "Lỗi máy chủ" }, { status: 500 }),
      ),
    );
    renderWithProviders(<VersionList pageId={PAGE_ID} />);
    expect(
      await screen.findByText("Không tải được lịch sử phiên bản"),
    ).toBeInTheDocument();

    useVersionList([]);
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(
      await screen.findByText("Chưa có phiên bản nào"),
    ).toBeInTheDocument();
  });

  it("hiện trạng thái rỗng và vẫn cho tạo mốc", async () => {
    useVersionList([]);
    renderWithProviders(<VersionList pageId={PAGE_ID} />);

    expect(
      await screen.findByText("Chưa có phiên bản nào"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tạo mốc/ })).toBeEnabled();
    expect(
      screen.getByRole("textbox", { name: "Nhãn mốc phiên bản" }),
    ).not.toBeRequired();
  });

  it("nhóm hai mốc cùng ngày và hiện đủ ba nhãn loại tiếng Việt", async () => {
    const versions = [
      buildVersion({ id: "version-auto", kind: "AUTO" }),
      buildVersion({
        id: "version-manual",
        kind: "MANUAL",
        label: "Trước khi sửa",
        createdAt: "2026-08-24T05:30:00.000Z",
      }),
      buildVersion({
        id: "version-restore",
        kind: "BEFORE_RESTORE",
        createdAt: "2026-08-22T02:15:00.000Z",
      }),
    ];
    useVersionList(versions);
    renderWithProviders(<VersionList pageId={PAGE_ID} />);

    expect(await screen.findByText("Tự động")).toBeInTheDocument();
    expect(screen.getByText("Thủ công")).toBeInTheDocument();
    expect(screen.getByText("Trước khi khôi phục")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings).toHaveLength(2);
    const sameDayGroup = headings.find((heading) =>
      heading.textContent?.includes("24"),
    );
    expect(sameDayGroup).toBeDefined();
    expect(
      within(sameDayGroup?.closest("section") as HTMLElement).getAllByRole(
        "button",
      ),
    ).toHaveLength(2);
  });

  it("gửi nhãn người dùng khi tạo mốc thủ công", async () => {
    let requestBody: unknown;
    useVersionList([]);
    server.use(
      http.post(
        `${NOTION_URL}/api/v1/pages/${PAGE_ID}/versions`,
        async ({ request }) => {
          requestBody = await request.json();
          return envelope(
            buildVersion({
              id: "version-new",
              kind: "MANUAL",
              label: "Bản chốt",
            }),
          );
        },
      ),
    );
    renderWithProviders(<VersionList pageId={PAGE_ID} />);
    const user = userEvent.setup();

    await user.type(
      screen.getByRole("textbox", { name: "Nhãn mốc phiên bản" }),
      "  Bản chốt  ",
    );
    await user.click(screen.getByRole("button", { name: /Tạo mốc/ }));

    await waitFor(() => expect(requestBody).toEqual({ label: "Bản chốt" }));
    expect(
      screen.getByRole("textbox", { name: "Nhãn mốc phiên bản" }),
    ).toHaveValue("");
  });

  it("cô lập HTML lạ trong iframe sandbox thay vì DOM chính", async () => {
    const version = buildVersion({ id: "version-risky" });
    const html =
      '<h1>Nội dung lạ</h1><script>document.body.dataset.xss="true"</script>';
    useVersionList([version]);
    useVersionDetail(version, html);
    renderWithProviders(<VersionList pageId={PAGE_ID} />);

    await userEvent.click(
      await screen.findByRole("button", { name: /Xem phiên bản/ }),
    );
    const frame = await screen.findByTitle("Bản xem trước phiên bản");

    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(frame).toHaveAttribute("srcdoc", html);
    expect(screen.queryByText("Nội dung lạ")).not.toBeInTheDocument();
  });

  it("chỉ khôi phục sau xác nhận và huỷ dialog không gọi mutation", async () => {
    const version = buildVersion({ id: "version-restore" });
    let restoreCount = 0;
    useVersionList([version]);
    useVersionDetail(version);
    server.use(
      http.post(`${NOTION_URL}/api/v1/versions/${version.id}/restore`, () => {
        restoreCount += 1;
        return envelope({
          pageId: PAGE_ID,
          previousVersionId: "version-before-restore",
        });
      }),
    );
    renderWithProviders(<VersionList pageId={PAGE_ID} />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /Xem phiên bản/ }),
    );
    await user.click(await screen.findByRole("button", { name: "Khôi phục" }));
    expect(
      screen.getByText(
        "Phiên bản hiện tại sẽ được lưu lại trước khi khôi phục.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(restoreCount).toBe(0);

    await user.click(screen.getByRole("button", { name: "Khôi phục" }));
    await user.click(
      screen.getByRole("button", { name: "Khôi phục phiên bản" }),
    );
    await waitFor(() => expect(restoreCount).toBe(1));
  });
});
