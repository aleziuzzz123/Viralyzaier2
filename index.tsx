/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// MUST come before any "@shotstack/shotstack-studio" usage
// This registers the PixiJS audio loader globally.
import '@pixi/sound';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}