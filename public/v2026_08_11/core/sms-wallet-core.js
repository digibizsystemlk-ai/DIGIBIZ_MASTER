/**
 * DigiBiz SMS wallet: trial credits (7 days) + paid credits.
 * Legacy smsBalance is folded into paidSmsBalance while trial is active; expiry uses robust Timestamp parsing.
 */
(function (global) {
    const TRIAL_CREDITS = 300;
    const TRIAL_DAYS = 7;
    const CREDIT_PER_SMS = 1;

    /**
     * Firestore Timestamp, ISO string, epoch ms/s, or { seconds / _seconds }.
     */
    function toMillis(v) {
        if (v == null) return null;
        if (typeof v.toDate === 'function') {
            const d = v.toDate();
            return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
        }
        if (typeof v === 'number' && Number.isFinite(v)) {
            return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
        }
        if (typeof v === 'object') {
            const sec = v.seconds != null ? v.seconds : v._seconds;
            if (sec != null) {
                const ns = Number(v.nanoseconds != null ? v.nanoseconds : v._nanoseconds || 0);
                return Number(sec) * 1000 + ns / 1e6;
            }
        }
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.getTime();
    }

    function trialEndFromStart(startMs) {
        return startMs + TRIAL_DAYS * 86400000;
    }

    function hasNewWalletShape(w) {
        return (
            w.trialSmsExpiresAt != null ||
            w.trialSmsBalance != null ||
            w.paidSmsBalance != null ||
            w.trialBalance != null ||
            w.paidBalance != null ||
            w.trialExpiresAt != null
        );
    }

    /**
     * @param {object} smsWallet
     * @param {*} rootSmsBalance settings.smsBalance (legacy counter at doc root)
     * @param {{ reconcileLegacy?: boolean }} [opts] pass { reconcileLegacy: false } from debitOne after upstream normalize
     */
    function normalizeWallet(smsWallet, rootSmsBalance, opts) {
        const w = smsWallet && typeof smsWallet === 'object' ? { ...smsWallet } : {};
        const hasShape = hasNewWalletShape(w);
        const reconcileLegacy = !opts || opts.reconcileLegacy !== false;

        const rootNumRaw = rootSmsBalance != null && rootSmsBalance !== '' ? Number(rootSmsBalance) : NaN;
        const rootNum = Number.isFinite(rootNumRaw) ? Math.max(0, rootNumRaw) : NaN;

        let legacyMerge = 0;
        if (!reconcileLegacy) {
            legacyMerge = 0;
        } else if (rootSmsBalance != null && rootSmsBalance !== '') {
            const r = Number(rootSmsBalance);
            if (!Number.isFinite(r)) {
                legacyMerge = 0;
            } else if (!hasShape) {
                legacyMerge = Math.max(0, r);
            } else {
                const rootNum = Math.max(0, r);
                const trialB = Math.max(0, Number(w.trialSmsBalance ?? w.trialBalance ?? 0));
                const paidF = Math.max(0, Number(w.paidSmsBalance ?? w.paidBalance ?? 0));
                if (paidF >= 1) {
                    legacyMerge = 0;
                } else if (trialB >= 1 && Math.abs(rootNum - trialB) < 1e-6) {
                    legacyMerge = 0;
                } else if (trialB >= 1 && rootNum >= trialB + trialB + paidF - 1e-6) {
                    legacyMerge = Math.max(0, rootNum - trialB - paidF);
                } else if (trialB >= 1 && rootNum > trialB + paidF + 1e-6) {
                    legacyMerge = rootNum;
                } else {
                    legacyMerge = rootNum;
                }
            }
        } else if (!hasShape) {
            legacyMerge = Math.max(0, Number(w.smsBalance ?? 0));
        } else {
            const paidRaw = Number(w.paidSmsBalance ?? w.paidBalance ?? 0);
            const paidFloor = Number.isFinite(paidRaw) ? Math.max(0, paidRaw) : 0;
            const trialBooked = Math.max(0, Number(w.trialSmsBalance ?? w.trialBalance ?? 0));
            const walletSms = Number(w.smsBalance ?? 0);
            if (paidFloor >= 1) {
                legacyMerge = 0;
            } else if (trialBooked >= 1) {
                if (walletSms > paidFloor + trialBooked + 1e-6) {
                    legacyMerge = Math.max(0, walletSms - paidFloor - trialBooked);
                } else {
                    legacyMerge = 0;
                }
            } else if (walletSms > paidFloor) {
                legacyMerge = Math.max(0, walletSms - paidFloor);
            }
        }

        let paid = Number(w.paidSmsBalance ?? w.paidBalance);
        if (!Number.isFinite(paid)) paid = 0;

        let trial = Number(w.trialSmsBalance ?? w.trialBalance);
        if (!Number.isFinite(trial)) trial = NaN;

        let expMs = toMillis(w.trialSmsExpiresAt || w.trialExpiresAt);
        if (expMs == null || !Number.isFinite(expMs)) {
            expMs = trialEndFromStart(Date.now());
        }

        if (!hasShape) {
            const L = Math.max(0, legacyMerge);
            if (L > 0 && Math.abs(L - TRIAL_CREDITS) < 1e-6) {
                paid = 0;
                trial = TRIAL_CREDITS;
                expMs = trialEndFromStart(Date.now());
            } else if (L > 0) {
                paid = L;
                trial = 0;
                expMs = trialEndFromStart(Date.now());
            } else {
                paid = 0;
                trial = TRIAL_CREDITS;
                expMs = trialEndFromStart(Date.now());
            }
        } else {
            if (!Number.isFinite(trial)) trial = 0;
            if (!Number.isFinite(paid)) paid = 0;
        }

        const now = Date.now();
        const trialActive = now <= expMs;
        let trialEff = trial;
        if (!trialActive) trialEff = 0;

        // Heal legacy double-count where trial was granted AND paid was set to the same trial amount.
        // Common shape: trial=300, paid=300, root smsBalance=600 while still in trial window.
        if (
            hasShape &&
            trialActive &&
            Number.isFinite(trial) &&
            Number.isFinite(paid) &&
            trial > 0 &&
            paid > 0 &&
            Math.abs(trial - TRIAL_CREDITS) < 1e-6 &&
            Math.abs(paid - TRIAL_CREDITS) < 1e-6 &&
            Number.isFinite(rootNum) &&
            Math.abs(rootNum - (trial + paid)) < 1e-6
        ) {
            paid = 0;
        }

        let paidEff = paid;

        if (reconcileLegacy && hasShape && trialActive) {
            // Do not merge legacy root smsBalance into paid during an active trial.
            // Root smsBalance often represented total credits and would double-count with trialSmsBalance.
        }

        if (reconcileLegacy && hasShape && !trialActive && trialEff < 1) {
            if (legacyMerge > paidEff) {
                paidEff = legacyMerge;
            } else if (paidEff < 1) {
                const walletSms = Number(w.smsBalance ?? 0);
                if (walletSms > 0) {
                    paidEff = walletSms;
                }
            }
        }

        const total = Math.max(0, paidEff + trialEff);
        return {
            paidSmsBalance: Math.max(0, paidEff),
            trialSmsBalance: Math.max(0, trial),
            trialSmsExpiresAt: new Date(expMs).toISOString(),
            smsBalance: total,
            lowBalanceThreshold: Number(w.lowBalanceThreshold || 50),
            unitPrice: Number(w.unitPrice || 1),
            monthlyFee: Number(w.monthlyFee || 1000),
            trialCreditsGranted: w.trialCreditsGranted !== false,
            updatedAt: new Date().toISOString()
        };
    }

    function effectiveTrialBalance(w) {
        const exp = toMillis(w.trialSmsExpiresAt || w.trialExpiresAt);
        const trial = Number(w.trialSmsBalance ?? w.trialBalance ?? 0);
        if (exp == null || !Number.isFinite(exp)) return Math.max(0, trial);
        if (Date.now() > exp) return 0;
        return Math.max(0, trial);
    }

    function effectivePaidBalance(w) {
        return Math.max(0, Number(w.paidSmsBalance ?? w.paidBalance ?? 0));
    }

    function effectiveTotal(w) {
        return effectiveTrialBalance(w) + effectivePaidBalance(w);
    }

    function withExpiredTrialZeroed(w) {
        const out = { ...w };
        const exp = toMillis(out.trialSmsExpiresAt || out.trialExpiresAt);
        const now = Date.now();
        if (exp != null && Number.isFinite(exp) && now > exp && Number(out.trialSmsBalance || 0) > 0) {
            out.trialSmsBalance = 0;
        }
        const te = effectiveTrialBalance(out);
        if (te < 1 && exp != null && Number.isFinite(exp) && now > exp) {
            const legacy = Number(out.smsBalance || 0);
            const pd = Number(out.paidSmsBalance || 0);
            if (pd < 1 && legacy > 0) {
                out.paidSmsBalance = legacy;
            }
        }
        out.smsBalance = effectiveTrialBalance(out) + effectivePaidBalance(out);
        out.updatedAt = new Date().toISOString();
        return out;
    }

    function debitOne(smsWalletFragment) {
        const rawLegacy = Number(
            (smsWalletFragment && smsWalletFragment.smsBalance) ??
                (smsWalletFragment && smsWalletFragment.smsWallet && smsWalletFragment.smsWallet.smsBalance) ??
                0
        );
        let w = normalizeWallet(smsWalletFragment, null, { reconcileLegacy: false });
        w = withExpiredTrialZeroed(w);
        const tEff = effectiveTrialBalance(w);
        const pEff = effectivePaidBalance(w);
        const legacyBal = Number(w.smsBalance || 0) || rawLegacy;

        if (tEff + pEff < CREDIT_PER_SMS && legacyBal < CREDIT_PER_SMS) {
            throw new Error(
                'No SMS credits (7-day trial ended or balance 0). Recharge in Billing or contact Super Admin.'
            );
        }

        if (tEff + pEff < CREDIT_PER_SMS && legacyBal >= CREDIT_PER_SMS) {
            const newLegacy = legacyBal - CREDIT_PER_SMS;
            return {
                ...w,
                paidSmsBalance: newLegacy,
                trialSmsBalance: 0,
                smsBalance: newLegacy,
                updatedAt: new Date().toISOString()
            };
        }

        let newTrial = Number(w.trialSmsBalance || 0);
        let newPaid = Number(w.paidSmsBalance || 0);
        if (tEff >= CREDIT_PER_SMS) {
            newTrial = Math.max(0, newTrial - CREDIT_PER_SMS);
        } else {
            newPaid = Math.max(0, newPaid - CREDIT_PER_SMS);
        }
        const out = {
            ...w,
            trialSmsBalance: newTrial,
            paidSmsBalance: newPaid,
            trialSmsExpiresAt: w.trialSmsExpiresAt,
            updatedAt: new Date().toISOString()
        };
        out.smsBalance = effectiveTrialBalance(out) + effectivePaidBalance(out);
        return out;
    }

    async function ensureSeeded(businessId) {
        if (!businessId || !global.db) return;
        const ref = global.db.collection('settings').doc(String(businessId));
        const snap = await ref.get().catch(() => null);
        const data = snap && snap.exists ? snap.data() || {} : {};
        const prev = data.smsWallet || {};
        if (!hasNewWalletShape(prev)) {
            const merged = normalizeWallet(prev, data.smsBalance);
            await ref.set({ smsWallet: merged, smsBalance: merged.smsBalance }, { merge: true });
            return;
        }
        const healed = withExpiredTrialZeroed(normalizeWallet(prev, data.smsBalance));
        const dirty =
            Math.round(Number(healed.trialSmsBalance ?? 0)) !== Math.round(Number(prev.trialSmsBalance ?? 0)) ||
            Math.round(Number(healed.paidSmsBalance ?? 0)) !== Math.round(Number(prev.paidSmsBalance ?? 0)) ||
            Math.round(Number(healed.smsBalance ?? 0)) !== Math.round(Number(prev.smsBalance ?? 0)) ||
            String(healed.trialSmsExpiresAt || '') !== String(prev.trialSmsExpiresAt || '');
        if (dirty) {
            await ref.set({ smsWallet: healed, smsBalance: healed.smsBalance }, { merge: true });
        }
    }

    global.SmsWalletCore = {
        TRIAL_CREDITS,
        TRIAL_DAYS,
        CREDIT_PER_SMS,
        normalizeWallet,
        effectiveTrialBalance,
        effectivePaidBalance,
        effectiveTotal,
        withExpiredTrialZeroed,
        debitOne,
        ensureSeeded,
        isMigratedWallet: hasNewWalletShape
    };
})(typeof window !== 'undefined' ? window : this);
