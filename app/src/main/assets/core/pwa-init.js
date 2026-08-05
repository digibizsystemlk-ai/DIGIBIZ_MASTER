/**
 * DigiBiz PWA bootstrap: manifest + install meta + service worker cache invalidation.
 */
(function () {
    function appendHead(node) {
        document.head.appendChild(node);
    }

    function ensureManifest() {
        if (document.querySelector('link[rel="manifest"]')) return;
        var l = document.createElement('link');
        l.rel = 'manifest';
        l.href = '/manifest.json';
        appendHead(l);
    }

    function ensureMeta(name, content) {
        if (document.querySelector('meta[name="' + name + '"]')) return;
        var m = document.createElement('meta');
        m.setAttribute('name', name);
        m.setAttribute('content', content);
        appendHead(m);
    }

    function ensureLink(rel, href, extra) {
        var sel = 'link[rel="' + rel + '"][href="' + href + '"]';
        if (document.querySelector(sel)) return;
        var l = document.createElement('link');
        l.rel = rel;
        l.href = href;
        if (extra) {
            Object.keys(extra).forEach(function (k) {
                l.setAttribute(k, extra[k]);
            });
        }
        appendHead(l);
    }

    ensureManifest();
    ensureMeta('theme-color', '#0f3b2c');
    ensureMeta('mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('apple-mobile-web-app-title', 'DigiBiz');

    ensureLink('apple-touch-icon', '/icons/icon-192.svg');
    ensureLink('icon', '/icons/icon-192.svg', { type: 'image/svg+xml', sizes: '192x192' });
    ensureLink('icon', '/icons/icon-512.svg', { type: 'image/svg+xml', sizes: '512x512' });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function (err) {
                console.warn('[PWA] Service worker registration error:', err);
            });
        });
    }
})();
