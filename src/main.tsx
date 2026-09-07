import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCmsCanvasBridge } from './lib/cms-canvas-bridge'

initCmsCanvasBridge();
createRoot(document.getElementById("root")!).render(<App />);
