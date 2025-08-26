/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// MUST come before any "@shotstack/shotstack-studio" usage
// This registers the PixiJS audio loader globally.
import '@pixi/sound';

// Bundle CSS files directly for production build
import '@shotstack/shotstack-studio/dist/style.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Non-null assertion (!) is safe here as the element is guaranteed to be in index.html
const rootElement = document.getElementById('root')!;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
