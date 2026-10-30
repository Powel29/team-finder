import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ErrorBoundary } from './components/layout/error-boundary.jsx';
import { AppProviders } from './providers.jsx';
import { createQueryClient } from './lib/query-client.js';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders client={createQueryClient()}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
