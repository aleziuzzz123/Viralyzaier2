/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { createRoot } from 'react-dom/client';
import App from './App';

// By letting Vite manage all dependencies (and removing the importmap from index.html),
// we ensure that any necessary parsers are registered on the same PixiJS instance
// that @shotstack/shotstack-studio uses. Vite's `resolve.dedupe` config helps enforce this.

// The AudioLoadParser and FontLoadParser from @shotstack/shotstack-studio are now
// automatically registered, so manual registration is no longer needed.

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
      <App />
  );
}