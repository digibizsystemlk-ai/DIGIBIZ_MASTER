// Core Customers Module Proxy - Redirects to /modules/core/customers.js
(function() {
    if (!document.querySelector('script[src*="/modules/core/customers.js"]')) {
        const script = document.createElement('script');
        script.src = '/modules/core/customers.js?v=100';
        document.head.appendChild(script);
    }
})();
