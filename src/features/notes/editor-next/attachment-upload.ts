import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { toast } from "sonner";

export type UploadFile = (file: File, blockId?: string) => Promise<string>;

type PlaceholderAction =
  | { fileName: string; id: string; position: number; type: "add" }
  | { id: string; type: "remove" };

const placeholderKey = new PluginKey<DecorationSet>("noteAttachmentUpload");
let placeholderSequence = 0;

function placeholderAction(transaction: Transaction): PlaceholderAction | null {
  const value: unknown = transaction.getMeta(placeholderKey);
  if (!value || typeof value !== "object") return null;
  const type = Reflect.get(value, "type");
  const id = Reflect.get(value, "id");
  if (type === "remove" && typeof id === "string") return { id, type };
  const fileName = Reflect.get(value, "fileName");
  const position = Reflect.get(value, "position");
  if (type !== "add" || typeof id !== "string"
    || typeof fileName !== "string" || typeof position !== "number") return null;
  return { fileName, id, position, type };
}

function createPlaceholder(fileName: string): HTMLElement {
  const element = document.createElement("span");
  element.className = "notes-editor-next__upload-placeholder";
  element.setAttribute("role", "status");
  element.setAttribute("aria-label", `Đang tải lên ${fileName}`);
  element.textContent = `Đang tải ${fileName}`;
  return element;
}

function applyPlaceholder(transaction: Transaction, decorations: DecorationSet): DecorationSet {
  let next = decorations.map(transaction.mapping, transaction.doc);
  const action = placeholderAction(transaction);
  if (!action) return next;
  if (action.type === "remove") {
    return next.remove(next.find(undefined, undefined, (spec) => spec.id === action.id));
  }
  const widget = Decoration.widget(
    action.position,
    () => createPlaceholder(action.fileName),
    { id: action.id, side: -1 },
  );
  next = next.add(transaction.doc, [widget]);
  return next;
}

export const AttachmentUploadPlaceholder = Extension.create({
  name: "attachmentUploadPlaceholder",
  addProseMirrorPlugins: () => [new Plugin({
    key: placeholderKey,
    state: {
      init: () => DecorationSet.empty,
      apply: applyPlaceholder,
    },
    props: { decorations: (state) => placeholderKey.getState(state) },
  })],
});

function placeholderPosition(view: EditorView, id: string): number | null {
  return placeholderKey.getState(view.state)
    ?.find(undefined, undefined, (spec) => spec.id === id)[0]?.from ?? null;
}

function removePlaceholder(view: EditorView, id: string): void {
  if (view.isDestroyed) return;
  view.dispatch(view.state.tr.setMeta(placeholderKey, { id, type: "remove" }));
}

function insertImage(view: EditorView, position: number, file: File, src: string): void {
  const image = view.state.schema.nodes.image?.create({ alt: file.name, src, title: file.name });
  if (!image) throw new Error("Editor không hỗ trợ ảnh");
  const resolved = view.state.doc.resolve(Math.min(position, view.state.doc.content.size));
  const transaction = view.state.tr;
  if (resolved.parent.type.name === "paragraph" && resolved.parent.content.size === 0) {
    transaction.replaceRangeWith(resolved.before(), resolved.after(), image);
  } else if (resolved.parent.inlineContent) {
    transaction.insert(resolved.after(), image);
  } else {
    transaction.insert(resolved.pos, image);
  }
  view.dispatch(transaction);
}

function insertFileLink(view: EditorView, position: number, file: File, href: string): void {
  const link = view.state.schema.marks.link;
  if (!link) throw new Error("Editor không hỗ trợ liên kết");
  const text = view.state.schema.text(file.name, [link.create({ href })]);
  const resolved = view.state.doc.resolve(Math.min(position, view.state.doc.content.size));
  const content = resolved.parent.inlineContent
    ? text
    : view.state.schema.nodes.paragraph?.create(null, text);
  if (!content) throw new Error("Editor không hỗ trợ tệp đính kèm");
  view.dispatch(view.state.tr.insert(resolved.pos, content));
}

async function uploadAt(view: EditorView, file: File, position: number, uploadFile: UploadFile) {
  placeholderSequence += 1;
  const id = `note-upload-${placeholderSequence}`;
  view.dispatch(view.state.tr.setMeta(placeholderKey, {
    fileName: file.name, id, position, type: "add",
  }));
  try {
    const src = await uploadFile(file);
    if (view.isDestroyed) return;
    const mappedPosition = placeholderPosition(view, id);
    removePlaceholder(view, id);
    if (mappedPosition === null) return;
    if (file.type.startsWith("image/")) insertImage(view, mappedPosition, file, src);
    else insertFileLink(view, mappedPosition, file, src);
  } catch (error: unknown) {
    removePlaceholder(view, id);
    toast.error(error instanceof Error ? error.message : "Không thể tải tệp lên. Vui lòng thử lại.");
  }
}

function uploadFiles(view: EditorView, files: readonly File[], position: number, uploadFile: UploadFile) {
  for (const file of files) void uploadAt(view, file, position, uploadFile);
}

export function handleFilePaste(
  view: EditorView,
  event: ClipboardEvent,
  uploadFile: UploadFile,
): boolean {
  const files = Array.from(event.clipboardData?.files ?? []);
  if (!files.length) return false;
  event.preventDefault();
  uploadFiles(view, files, view.state.selection.from, uploadFile);
  return true;
}

export function handleFileDrop(
  view: EditorView,
  event: DragEvent,
  uploadFile: UploadFile,
): boolean {
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return false;
  event.preventDefault();
  const droppedAt = view.posAtCoords({ left: event.clientX, top: event.clientY });
  uploadFiles(view, files, droppedAt?.pos ?? view.state.selection.from, uploadFile);
  return true;
}
