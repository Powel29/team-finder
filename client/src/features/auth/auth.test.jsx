import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { demoMe, renderApp } from '@/test/render.jsx';
import { ApiError, api } from '@/lib/api.js';
import LoginPage from '@/pages/login.jsx';
import { RequireAuth } from './require-auth.jsx';

vi.mock('@/lib/api.js', async (orig) => ({ ...(await orig()), api: vi.fn() }));

describe('LoginPage', () => {
  it('shows validation messages for empty and invalid input', async () => {
    renderApp(<LoginPage />, { route: '/login' });
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
  });

  it('submits credentials and shows the server error on failure', async () => {
    api.mockRejectedValueOnce(new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password'));
    renderApp(<LoginPage />, { route: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'alice@demo.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(api).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'alice@demo.dev', password: 'wrong-pass' },
    });
  });
});

describe('RequireAuth', () => {
  const tree = (
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/secret" element={<p>secret page</p>} />
      </Route>
    </Routes>
  );

  it('redirects unauthenticated users to /login', async () => {
    renderApp(tree, { route: '/secret', me: null });
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders the page for authenticated users', () => {
    renderApp(tree, { route: '/secret', me: demoMe });
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });
});
