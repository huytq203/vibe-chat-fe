# 09 — Mã hoá tin nhắn: SERVER vs E2E

> Mỗi conversation có field `encryptionType`. FE đọc field này để biết gửi tin bằng cách nào.

---

## So sánh

| Mode | FE làm gì | BE làm gì | Trade-off |
|---|---|---|---|
| `SERVER` (default) | Gửi `plaintext` thô qua HTTPS | Encrypt AES-256-GCM rồi lưu DB | ✅ Preview push notif, ✅ Search, ✅ Multi-device sync; ⚠️ Server đọc được tin |
| `E2E` (Secret Chat) | Tự encrypt với key thoả thuận → gửi `encrypted` blob | Pass-through, KHÔNG decrypt | ✅ Server hack vẫn không lộ tin; ❌ Không preview push, ❌ Không search, ❌ Multi-device cần sync key thủ công |

## Khi nào FE chọn E2E?

- Conversation nhạy cảm — user chủ động bật "Secret Chat" từ UI.
- Cần compliance privacy cao.
- Mặc định **không bật E2E** cho user thường — UX kém vì mất preview/search.

---

## FE encrypt cho E2E thế nào?

Pattern tối thiểu (browser Web Crypto API):

```ts
// 1. Sinh DEK 1 lần khi tạo Secret Chat — thoả thuận với người kia
//    (qua kênh khác: QR code, ECDH, Signal Protocol... — ngoài scope này)
const dek = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// 2. Encrypt mỗi tin nhắn
async function encryptMessage(plaintext: string, dek: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));   // 12 byte
  const enc = new TextEncoder().encode(plaintext);
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc)
  );
  // Web Crypto trả ciphertext + authTag dính liền — tách 16 byte cuối
  const authTag = ciphertextWithTag.slice(-16);
  const ciphertext = ciphertextWithTag.slice(0, -16);
  return {
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag)),
    keyId: 'conv-uuid-v1',     // FE tự định danh
    keyVersion: 1,
  };
}

// 3. Decrypt khi nhận
async function decryptMessage(blob, dek) {
  const ciphertext = Uint8Array.from(atob(blob.ciphertext), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(blob.iv), c => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(blob.authTag), c => c.charCodeAt(0));
  const combined = new Uint8Array([...ciphertext, ...authTag]);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, combined);
  return new TextDecoder().decode(plain);
}
```

**Quan trọng:**
- DEK **KHÔNG BAO GIỜ** gửi lên server (không dạng plaintext).
- DEK lưu IndexedDB / Keychain — không lưu localStorage.
- Multi-device: phải có cơ chế share DEK an toàn (ECDH giữa 2 device, hoặc nhập manual). Phiên bản hiện tại chưa hỗ trợ — FE tự handle.

---

## Render UI

FE đọc `message.encryptionType`:

```ts
function renderMessage(m: MessageResponse) {
  if (m.encryptionType === 'SERVER') {
    return m.plaintext;
  }
  // E2E
  if (!hasKeyFor(m.conversationId)) {
    return '🔒 [Tin nhắn được mã hoá — không có khoá]';
  }
  return decryptMessage(m.encrypted!, getKey(m.conversationId));
}
```

---

## Mention trong E2E

⚠️ `mentions[]` của tin E2E **KHÔNG được encrypt** (server cần để route notification).

- `userId` của mention sẽ public.
- `startOffset` + `length` không phải là plaintext, nhưng vẫn lộ thông tin về **vị trí** trong message.

→ Nếu cần privacy tuyệt đối, không dùng `mentions` trong E2E conv.

---

**Liên quan:**
- 📨 Endpoint gửi tin → [04-messages.md](./04-messages.md)
- 🏗 Tạo conv E2E → [03-conversations.md](./03-conversations.md#tạo-chat-1-1-direct)
