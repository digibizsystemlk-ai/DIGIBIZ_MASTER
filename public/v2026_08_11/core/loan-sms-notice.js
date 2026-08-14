/**
 * Loan module SMS / status lines: show message then clear after 1 minute (all loan pages).
 */
(function () {
    var SMS_NOTICE_MS = 60 * 1000;
    var timers = Object.create(null);

    function show(elementId, text, ok) {
        var el = document.getElementById(elementId);
        if (!el) return;
        var key = String(elementId || "smsDebug");
        if (timers[key]) {
            clearTimeout(timers[key]);
            timers[key] = null;
        }
        el.textContent = text || "";
        el.style.color = ok ? "#166534" : "#b91c1c";
        timers[key] = setTimeout(function () {
            if (el && document.body.contains(el)) {
                el.textContent = "";
                el.style.color = "";
            }
            delete timers[key];
        }, SMS_NOTICE_MS);
    }

    window.LoanSmsNotice = {
        SMS_NOTICE_MS: SMS_NOTICE_MS,
        show: show
    };
})();
