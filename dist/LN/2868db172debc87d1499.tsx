import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
const mountApp = () => {
    document.title = 'Neural Decay | 灵能腐蚀';
    const resetScroll = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    resetScroll();
    const rootElement = document.getElementById('app');
    if (!rootElement) {
        throw new Error('Could not find root element to mount to');
    }
    const root = createRoot(rootElement);
    root.render(_jsx(App, {}));
    setTimeout(resetScroll, 0);
    requestAnimationFrame(resetScroll);
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp, { once: true });
}
else {
    mountApp();
}
