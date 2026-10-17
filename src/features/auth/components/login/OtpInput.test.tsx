import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from './OtpInput';

function Harness() {
  const [value, setValue] = useState('');
  return (
    <>
      <OtpInput id="otp" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const cell = (n: number): HTMLElement => screen.getByLabelText(`Chữ số ${n}`);

describe('OtpInput', () => {
  it('nên nhảy sang ô kế tiếp khi nhập từng số và bỏ ký tự không phải số', async () => {
    render(<Harness />);

    await userEvent.type(cell(1), '1a23');

    expect(screen.getByTestId('value')).toHaveTextContent('123');
    expect(cell(4)).toHaveFocus();
  });

  it('nên điền đủ 6 ô khi dán chuỗi mã', async () => {
    render(<Harness />);

    await userEvent.click(cell(1));
    await userEvent.paste('654 321');

    expect(screen.getByTestId('value')).toHaveTextContent('654321');
    expect(cell(6)).toHaveValue('1');
  });

  it('nên lùi về ô trước khi bấm Backspace ở ô trống', async () => {
    render(<Harness />);

    await userEvent.type(cell(1), '12');
    await userEvent.keyboard('{Backspace}');

    expect(cell(2)).toHaveFocus();
  });
});
