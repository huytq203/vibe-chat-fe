import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import { COLLAB_FRAGMENT_NAME } from "@/lib/collab/constants";

import {
  createCollaborativeNoteEditorExtensions,
  NOTE_EDITOR_BASE_EXTENSIONS,
} from "./extensions";

interface TestProvider {
  destroy: () => void;
  provider: HocuspocusProvider;
}

function createProvider(doc: Y.Doc): TestProvider {
  const websocketProvider = new HocuspocusProviderWebsocket({
    url: "ws://localhost:1234",
    autoConnect: false,
  });
  const provider = new HocuspocusProvider({
    name: "tiptap-collaboration-test",
    document: doc,
    websocketProvider,
  });
  return {
    provider,
    destroy: () => {
      provider.destroy();
      websocketProvider.destroy();
    },
  };
}

function extensionNames(extensions: typeof NOTE_EDITOR_BASE_EXTENSIONS): string[] {
  return extensions.map((extension) => extension.name);
}

describe("extensions của editor ghi chú mới", () => {
  it("nên loại UndoRedo khi bật cộng tác", () => {
    const doc = new Y.Doc();
    const testProvider = createProvider(doc);
    const { provider } = testProvider;
    const extensions = createCollaborativeNoteEditorExtensions({ doc, provider });

    expect(extensionNames(extensions)).toContain("collaboration");
    expect(extensionNames(extensions)).toContain("collaborationCaret");
    expect(extensionNames(extensions)).not.toContain("undoRedo");

    testProvider.destroy();
    doc.destroy();
  });

  it("nên giữ UndoRedo trong tập cơ sở", () => {
    expect(extensionNames(NOTE_EDITOR_BASE_EXTENSIONS)).toContain("undoRedo");
  });

  it("nên render iframe với sandbox khi có node embed", () => {
    const editor = new Editor({
      extensions: NOTE_EDITOR_BASE_EXTENSIONS,
      content: {
        type: "doc",
        content: [{
          type: "embed",
          attrs: {
            provider: "youtube",
            src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            title: "Demo",
            aspect: "16:9",
          },
        }],
      },
    });

    expect(editor.getHTML()).toContain("<figure data-embed");
    expect(editor.getHTML()).toContain("sandbox=\"allow-scripts allow-same-origin allow-popups\"");
    expect(editor.getJSON().content?.[0]?.type).toBe("embed");
    editor.destroy();
  });

  it("nên parse lại iframe embed đã render với đủ attrs", () => {
    const editor = new Editor({
      extensions: NOTE_EDITOR_BASE_EXTENSIONS,
      content: `<figure data-embed data-provider="youtube" data-aspect="16:9">
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo"></iframe>
      </figure>`,
    });

    expect(editor.getJSON().content?.[0]).toEqual({
      type: "embed",
      attrs: {
        provider: "youtube",
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        title: "Demo",
        aspect: "16:9",
      },
    });
    editor.destroy();
  });

  it("không nên render iframe cho src ngoài whitelist", () => {
    const editor = new Editor({
      extensions: NOTE_EDITOR_BASE_EXTENSIONS,
      content: {
        type: "doc",
        content: [{
          type: "embed",
          attrs: {
            provider: "youtube",
            src: "https://evil.test/embed",
            title: null,
            aspect: "16:9",
          },
        }],
      },
    });

    expect(editor.getHTML()).toBe("<figure data-embed=\"\"></figure>");
    editor.destroy();
  });

  it("nên dùng đúng tên fragment mà backend đọc", () => {
    const doc = new Y.Doc();
    const testProvider = createProvider(doc);
    const { provider } = testProvider;
    const collaboration = createCollaborativeNoteEditorExtensions({ doc, provider }).find(
      (extension) => extension.name === "collaboration",
    );

    expect(collaboration).toBeDefined();
    expect(Reflect.get(collaboration?.options ?? {}, "document")).toBe(doc);
    expect(Reflect.get(collaboration?.options ?? {}, "field")).toBe(COLLAB_FRAGMENT_NAME);

    testProvider.destroy();
    doc.destroy();
  });

  it("nên đồng bộ nội dung giữa hai editor cùng chia sẻ một Y.Doc", () => {
    const doc = new Y.Doc();
    const testProvider = createProvider(doc);
    const { provider } = testProvider;
    const first = new Editor({
      extensions: createCollaborativeNoteEditorExtensions({ doc, provider }),
    });
    const second = new Editor({
      extensions: createCollaborativeNoteEditorExtensions({ doc, provider }),
    });

    first.commands.insertContent("Nội dung đồng bộ");

    expect(second.getText()).toBe("Nội dung đồng bộ");

    first.destroy();
    second.destroy();
    testProvider.destroy();
    doc.destroy();
  });
});
