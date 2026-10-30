import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from './chat-composer.jsx';

describe('ChatComposer', () => {
  it('sends on Enter, trims the text and clears the box', async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, '  hello team  {Enter}');
    expect(onSend).toHaveBeenCalledWith('hello team');
    expect(box).toHaveValue('');
  });

  it('inserts a newline on Shift+Enter instead of sending', async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('line one\nline two');
  });

  it('does not send empty messages and reports typing', async () => {
    const onSend = vi.fn();
    const onTyping = vi.fn();
    render(<ChatComposer onSend={onSend} onTyping={onTyping} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Message'), '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();
    expect(onTyping).toHaveBeenCalled();
  });
});
