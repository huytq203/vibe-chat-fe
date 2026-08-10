import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatWindow } from "../AiChatWindow";
import { useAiWindowStore } from "@/features/chat/stores/ai-window.store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useParams: () => ({}),
}));

type StreamOptions = { onDelta: (text: string) => void; signal?: AbortSignal };

const chat = vi.fn();
vi.mock("@/services/ai.api", () => ({
  aiApi: {
    chat: vi.fn(),
    // `chat` giữ tên cũ để các test sẵn có không phải viết lại: resolve = câu trả
    // lời trọn vẹn, reject = lượt hỏng. Test nào cần từng mẩu thì mockImplementation.
    chatStream: (...args: unknown[]) => chat(...args),
  },
}));

/** Cầm cương một lượt stream: tự quyết định lúc nào có chữ, lúc nào kết thúc. */
function holdStream() {
  const control = {
    emit: (_text: string) => {},
    finish: (_full: string) => {},
    fail: (_error: Error) => {},
    signal: undefined as AbortSignal | undefined,
  };
  chat.mockImplementation(
    (_messages: unknown, _attachments: unknown, options: StreamOptions) => {
      control.emit = options.onDelta;
      control.signal = options.signal;
      return new Promise<string>((resolve, reject) => {
        control.finish = resolve;
        control.fail = reject;
        options.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    },
  );
  return control;
}

// AiMessageList dùng @tanstack/react-virtual (không sửa được — reuse unchanged).
// jsdom không layout thật nên offsetHeight/offsetWidth luôn = 0, khiến virtualizer
// tính "visible range" rỗng và không render message nào. Stub 2 thuộc tính này
// (chỉ trong file test) để virtualizer đo được kích thước container như môi trường thật.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 400,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 360,
  });
});

describe("AiChatWindow", () => {
  beforeEach(() => {
    localStorage.clear();
    useAiWindowStore.setState({ isOpen: false, position: { x: 0, y: 0 } });
    chat.mockReset();
  });

  it("renders nothing when the store is closed", () => {
    render(<AiChatWindow />);
    expect(screen.queryByText("Halo AI")).not.toBeInTheDocument();
  });

  it("renders the popup when the store is open", () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    expect(screen.getByText("Halo AI")).toBeInTheDocument();
  });

  it('close button closes the store without a "back" navigation', async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText("Đóng cửa sổ AI"));
    expect(useAiWindowStore.getState().isOpen).toBe(false);
  });

  it("history toggle shows the empty history state", async () => {
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);
    await userEvent.click(screen.getByLabelText("Lịch sử hội thoại"));
    expect(screen.getByText("Chưa có cuộc trò chuyện nào")).toBeInTheDocument();
  });

  it("sends a message and renders the AI reply", async () => {
    chat.mockResolvedValue("Xin chào");
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    const textarea = screen.getByPlaceholderText("Nhắn tin với AI...");
    await userEvent.type(textarea, "Chào bạn");
    await userEvent.click(screen.getByLabelText("Gửi"));

    await waitFor(() =>
      expect(screen.getByText("Xin chào")).toBeInTheDocument(),
    );
    expect(chat).toHaveBeenCalledOnce();
  });

  /** Gửi một tin rồi để lượt gọi AI hỏng — trạng thái dùng chung cho các test lỗi. */
  async function sendAndFail(reason: string): Promise<void> {
    chat.mockRejectedValueOnce(new Error(reason));
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await userEvent.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await userEvent.click(screen.getByLabelText("Gửi"));
    await screen.findByText(reason);
  }

  it("giữ nguyên tin nhắn và cho gửi lại khi lượt gọi AI hỏng", async () => {
    await sendAndFail("Model đang quá tải");
    expect(screen.getByText("Chào bạn")).toBeInTheDocument();

    chat.mockResolvedValueOnce("Xin chào");
    await userEvent.click(screen.getByRole("button", { name: "Gửi lại" }));

    expect(await screen.findByText("Xin chào")).toBeInTheDocument();
    expect(chat).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Model đang quá tải")).not.toBeInTheDocument();
  });

  it('"Sửa" đổ tin hỏng về ô nhập thay vì bắt gõ lại', async () => {
    await sendAndFail("Lỗi mạng");
    await userEvent.click(screen.getByRole("button", { name: "Sửa" }));

    expect(screen.getByPlaceholderText("Nhắn tin với AI...")).toHaveValue(
      "Chào bạn",
    );
    expect(
      screen.queryByRole("button", { name: "Gửi lại" }),
    ).not.toBeInTheDocument();
  });

  it('"Bỏ" xoá hẳn tin gửi hỏng', async () => {
    await sendAndFail("Lỗi mạng");
    await userEvent.click(screen.getByRole("button", { name: "Bỏ" }));

    expect(screen.queryByText("Chào bạn")).not.toBeInTheDocument();
    expect(screen.queryByText("Lỗi mạng")).not.toBeInTheDocument();
  });

  it("sao chép được cả tin của mình lẫn câu trả lời của AI", async () => {
    const user = userEvent.setup();
    chat.mockResolvedValue("Xin chào");
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await user.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await user.click(screen.getByLabelText("Gửi"));
    await screen.findByText("Xin chào");

    const copyButtons = screen.getAllByRole("button", { name: "Sao chép" });
    expect(copyButtons).toHaveLength(2);

    await user.click(copyButtons[1]!);
    expect(await navigator.clipboard.readText()).toBe("Xin chào");
  });

  it("chỉ báo AI đang soạn dùng đúng nhãn của màn chat", async () => {
    let settle: (value: string) => void = () => {};
    chat.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          settle = resolve;
        }),
    );
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await userEvent.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await userEvent.click(screen.getByLabelText("Gửi"));

    expect(await screen.findByText("đang nhập…")).toBeInTheDocument();

    settle("Xin chào");
    await waitFor(() =>
      expect(screen.queryByText("đang nhập…")).not.toBeInTheDocument(),
    );
  });

  it("hiện dần từng mẩu chữ thay vì chờ trọn câu trả lời", async () => {
    const stream = holdStream();
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await userEvent.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await userEvent.click(screen.getByLabelText("Gửi"));
    await screen.findByText("đang nhập…");

    stream.emit("Doanh thu");
    expect(await screen.findByText(/Doanh thu/)).toBeInTheDocument();
    // Chữ đã ra thì chỉ báo "đang nhập" nhường chỗ cho bong bóng đang chảy.
    expect(screen.queryByText("đang nhập…")).not.toBeInTheDocument();

    stream.emit(" quý 3 tăng 18%");
    expect(await screen.findByText(/Doanh thu quý 3 tăng 18%/)).toBeInTheDocument();

    stream.finish("Doanh thu quý 3 tăng 18%");
    await waitFor(() =>
      expect(screen.getByLabelText("Gửi")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Doanh thu quý 3 tăng 18%/)).toBeInTheDocument();
  });

  it('"Dừng" giữ lại phần chữ đã nhận làm câu trả lời', async () => {
    const stream = holdStream();
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await userEvent.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await userEvent.click(screen.getByLabelText("Gửi"));

    stream.emit("Phần đầu câu trả lời");
    await screen.findByText(/Phần đầu câu trả lời/);

    await userEvent.click(screen.getByLabelText("Dừng trả lời"));

    // Nút quay lại trạng thái gửi, chữ dở được giữ như tin đã hoàn tất.
    expect(await screen.findByLabelText("Gửi")).toBeInTheDocument();
    expect(screen.getByText(/Phần đầu câu trả lời/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Gửi lại" }),
    ).not.toBeInTheDocument();
  });

  it("stream đứt giữa chừng thì giữ phần dở và cho chạy lại", async () => {
    const stream = holdStream();
    useAiWindowStore.getState().open();
    render(<AiChatWindow />);

    await userEvent.type(
      screen.getByPlaceholderText("Nhắn tin với AI..."),
      "Chào bạn",
    );
    await userEvent.click(screen.getByLabelText("Gửi"));

    stream.emit("Doanh thu quý 3");
    await screen.findByText(/Doanh thu quý 3/);
    stream.fail(new Error("Kết nối bị ngắt giữa chừng"));

    expect(await screen.findByText("Kết nối bị ngắt giữa chừng")).toBeInTheDocument();
    expect(screen.getByText(/Doanh thu quý 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi lại" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bỏ" })).toBeInTheDocument();
  });
});
