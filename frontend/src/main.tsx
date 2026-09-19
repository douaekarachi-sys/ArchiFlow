import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono/400.css';
import './styles/globals.css';
import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Providers } from './app/providers';
import { createRouter } from './app/router';
import { SessionBootstrap } from './auth/guards';

const router = createRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <SessionBootstrap>
        <RouterProvider router={router} />
      </SessionBootstrap>
    </Providers>
  </StrictMode>,
);
