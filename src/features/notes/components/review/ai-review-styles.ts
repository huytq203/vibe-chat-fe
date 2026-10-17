/**
 * CSS chèn vào iframe khi so sánh thay đổi AI. Khối đổi được tô nền nhạt + viền 1px
 * thay vì gạch ngang cả khối, để bản trước vẫn đọc được trọn vẹn.
 */
export const AI_REVIEW_FRAME_STYLES = `
  body { padding-inline: 0.5rem; }

  .ai-diff-sr {
    position: absolute;
    width: 1px; height: 1px;
    margin: -1px; padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  [data-ai-diff] {
    border-radius: 0.5rem;
    margin-inline: -0.5rem;
    padding-inline: 0.5rem;
  }

  [data-ai-diff="removed"] {
    background: color-mix(in srgb, var(--public-danger) 9%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--public-danger) 28%, transparent);
  }

  [data-ai-diff="added"] {
    background: color-mix(in srgb, var(--public-success) 10%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--public-success) 30%, transparent);
  }

  p[data-ai-diff] { padding-block: 0.125rem; }

  /* Phần đệm trên lớn của heading chuyển thành margin để nền không phình lên trên chữ. */
  :is(h1, h2, h3, h4, h5, h6)[data-ai-diff] {
    margin-top: 1.25rem;
    padding-block: 0.25rem;
  }

  :is(ul, ol)[data-ai-diff] {
    padding-block: 0.25rem;
    padding-inline-start: 2rem;
  }

  /* Bảng, code, embed đã có khung riêng: chỉ đổi màu viền, không lùi lề. */
  :is(table, pre, figure)[data-ai-diff] { margin-inline: 0; }
  :is(table, figure)[data-ai-diff] { padding-inline: 0; }
  pre[data-ai-diff] { padding-inline: 1rem; }

  table[data-ai-diff="removed"], pre[data-ai-diff="removed"], figure[data-ai-diff="removed"] {
    border-color: color-mix(in srgb, var(--public-danger) 45%, transparent);
  }

  table[data-ai-diff="added"], pre[data-ai-diff="added"], figure[data-ai-diff="added"] {
    border-color: color-mix(in srgb, var(--public-success) 50%, transparent);
  }
`;
