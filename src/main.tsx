import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import AppRoutes from './AppRoutes.tsx';
import {AuthProvider} from './lib/AuthContext.tsx';
import {AudioPlayerProvider} from './lib/AudioPlayerContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AudioPlayerProvider>
          <AppRoutes />
        </AudioPlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
