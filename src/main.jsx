/**
 * ShopFlowTracker — Service Department Board
 * © 2025 Worqflow. All rights reserved.
 *
 * This software and its source code are proprietary
 * and confidential. Unauthorized copying, transfer,
 * or reproduction of the contents of this file, via
 * any medium, is strictly prohibited.
 *
 * Built by Worqflow — worqflow.vercel.app
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
