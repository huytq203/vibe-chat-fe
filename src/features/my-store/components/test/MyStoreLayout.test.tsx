import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  isMobile: false,
  selfConvId: "self-1" as string | undefined,
}));

vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: () => mocks.isMobile,
}));
vi.mock("@/features/my-store/hooks/use-query", () => ({
  useStoreConversation: () => ({
    data: mocks.selfConvId ? { id: mocks.selfConvId } : undefined,
  }),
}));
vi.mock("@/features/my-store/hooks/useMyStoreRealtime", () => ({
  useMyStoreRealtime: () => undefined,
}));
vi.mock("../MyStoreFeed", () => ({ MyStoreFeed: () => <div>feed</div> }));
vi.mock("../MyStoreComposer", () => ({
  MyStoreComposer: () => <div>composer</div>,
}));
vi.mock("../StoreFileBrowser", () => ({
  StoreFileBrowser: () => <div>file-browser</div>,
}));
vi.mock("../MyStoreInfoPanel", () => ({
  MyStoreInfoPanel: ({
    onClose,
    onOpenFiles,
  }: {
    onClose?: () => void;
    onOpenFiles: () => void;
  }) => (
    <aside>
      <span>info-panel</span>
      {onClose && (
        <button type="button" onClick={onClose}>
          Đóng
        </button>
      )}
      <button type="button" onClick={onOpenFiles}>
        Tệp & thư mục
      </button>
    </aside>
  ),
}));

import { MyStoreLayout } from "../MyStoreLayout";

const openInfo = () =>
  fireEvent.click(
    screen.getByRole("button", { name: /Mở thông tin kho của tôi/i }),
  );

describe("MyStoreLayout", () => {
  beforeEach(() => {
    mocks.isMobile = false;
    mocks.selfConvId = "self-1";
  });

  it("desktop: panel nằm cạnh nội dung, không có nút mở", () => {
    render(<MyStoreLayout />);
    expect(screen.getByText("info-panel")).toBeInTheDocument();
    expect(screen.getByText("feed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Mở thông tin kho của tôi/i }),
    ).not.toBeInTheDocument();
  });

  it("mobile: panel ẩn cho tới khi bấm cụm tiêu đề, rồi chiếm trọn khung", () => {
    mocks.isMobile = true;
    render(<MyStoreLayout />);

    expect(screen.queryByText("info-panel")).not.toBeInTheDocument();

    openInfo();

    expect(screen.getByText("info-panel")).toBeInTheDocument();
    // Chiếm trọn khung → nội dung và header gốc phải biến mất.
    expect(screen.queryByText("feed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Mở thông tin kho của tôi/i }),
    ).not.toBeInTheDocument();
  });

  it("mobile: nút đóng của panel trả về nội dung", () => {
    mocks.isMobile = true;
    render(<MyStoreLayout />);

    openInfo();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));

    expect(screen.queryByText("info-panel")).not.toBeInTheDocument();
    expect(screen.getByText("feed")).toBeInTheDocument();
  });

  it('mobile: chọn "Tệp & thư mục" đóng panel và chuyển sang tab File', () => {
    mocks.isMobile = true;
    render(<MyStoreLayout />);

    openInfo();
    fireEvent.click(screen.getByRole("button", { name: "Tệp & thư mục" }));

    expect(screen.queryByText("info-panel")).not.toBeInTheDocument();
    expect(screen.getByText("file-browser")).toBeInTheDocument();
  });

  // Chưa có conversation SELF → không có gì để mở, tránh panel rỗng.
  it("mobile: chưa có conversation SELF thì không hiện nút mở panel", () => {
    mocks.isMobile = true;
    mocks.selfConvId = undefined;
    render(<MyStoreLayout />);

    expect(
      screen.queryByRole("button", { name: /Mở thông tin kho của tôi/i }),
    ).not.toBeInTheDocument();
  });
});
