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
            // Only perform cache deletion for UNLOCKED clients so version-locked clients are not disturbed
            if ('caches' in window && !(window.isClientVersionLocked && window.isClientVersionLocked())) {
                caches.keys().then(function(names) {
                    names.forEach(function(name) {
                        caches.delete(name);
                    });
                });
            }
            navigator.serviceWorker.register('/sw.js?v=3138').then(function(reg) {
                if (reg && reg.update) reg.update();

                // PWA update notification awareness
                if (reg.waiting) onSWUpdateReady();
                reg.addEventListener('updatefound', function() {
                    const w = reg.installing;
                    if (w) {
                        w.addEventListener('statechange', function() {
                            if (w.state === 'installed' && navigator.serviceWorker.controller) {
                                onSWUpdateReady();
                            }
                        });
                    }
                });

                function onSWUpdateReady() {
                    if (window.isFlagSuppressed && window.isFlagSuppressed('bypassPwaPrompt')) return;
                    showReloadToast();
                }
            }).catch(function (err) {
                console.warn('[PWA] Service worker registration error:', err);
            });
        });
    }

    function showReloadToast() {
        if (document.getElementById('pwaReloadToast')) return;
        const toast = document.createElement('div');
        toast.id = 'pwaReloadToast';
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; z-index:999999; background:#0f172a; color:#fff; padding:14px 20px; border-radius:12px; font-family:Inter,sans-serif; font-size:13px; font-weight:700; box-shadow:0 10px 25px rgba(0,0,0,0.3); border:1px solid #334155; display:flex; align-items:center; gap:12px;';
        toast.innerHTML = `
            <span>🔄 New system update available!</span>
            <button type="button" onclick="window.location.reload()" style="background:#0284c7; color:#fff; border:none; padding:6px 14px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer;">Reload Now</button>
            <button type="button" onclick="this.parentElement.remove()" style="background:transparent; color:#94a3b8; border:none; cursor:pointer; font-size:14px; font-weight:700;">✕</button>
        `;
        document.body.appendChild(toast);
    }

    // Global Client Version Lock Helper Guards
    window.isClientVersionLocked = function() {
        try {
            const raw = sessionStorage.getItem('digibiz_client_version_lock') || localStorage.getItem('digibiz_client_version_lock');
            if (!raw) return false;
            const config = JSON.parse(raw);
            return !!(config.isLocked || config.lockStatus === 'LOCKED');
        } catch (e) {
            return false;
        }
    };

    window.getClientVersionLockConfig = function() {
        try {
            const raw = sessionStorage.getItem('digibiz_client_version_lock') || localStorage.getItem('digibiz_client_version_lock');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    };

    window.isFlagSuppressed = function(flagName) {
        const config = window.getClientVersionLockConfig && window.getClientVersionLockConfig();
        if (!config || !config.flags) return false;
        return config.flags[flagName] !== false;
    };

    window.evaluateSandboxRouting = function() {
        try {
            const config = window.getClientVersionLockConfig && window.getClientVersionLockConfig();
            if (!config) return;

            const isLocked = !!(config.isLocked || config.lockStatus === 'LOCKED');
            const versionTag = config.versionTag || 'STABLE_FREEZE_2026_08_11';
            const currentPath = window.location.pathname;

            const isAlreadyInSnapshot = currentPath.includes('/snapshots/');
            const targetSnapshotPrefix = `/snapshots/${versionTag}/`;

            if (isLocked) {
                if (!isAlreadyInSnapshot && (currentPath.startsWith('/modules/') || currentPath.startsWith('/admin/') || currentPath.endsWith('.html'))) {
                    const targetUrl = targetSnapshotPrefix + currentPath.replace(/^\//, '') + window.location.search + window.location.hash;
                    console.log(`[SandboxGate] 🔒 Routing locked client to frozen snapshot: ${targetUrl}`);
                    window.location.replace(targetUrl);
                }
            } else {
                if (isAlreadyInSnapshot) {
                    const livePath = currentPath.replace(/^\/snapshots\/[^\/]+\//, '/');
                    console.log(`[SandboxGate] 🔓 Routing unlocked client back to live codebase: ${livePath}`);
                    window.location.replace(livePath + window.location.search + window.location.hash);
                }
            }
        } catch(e) {
            console.warn('[SandboxGate] Routing check warn:', e);
        }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(window.evaluateSandboxRouting, 10);
    } else {
        document.addEventListener('DOMContentLoaded', window.evaluateSandboxRouting);
    }
})();
