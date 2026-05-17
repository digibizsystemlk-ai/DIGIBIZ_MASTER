

/** Set in auth from users.businessId (or user.uid). All scrap_* queries use this — not a hardcoded UID. */
let SCRAP_BUSINESS_ID = '';
const state = { items: [], weights: {}, loans: [] };
const peopleByName = {};
let selectedSupplierPhone = '';
let supplierRefreshTimer = null;
const fmt = (v) => `LKR ${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function smsSkipReasonText(code) {
    if (code === 'event_disabled') return 'SMS skipped: Buying event toggle is OFF.';
    if (code === 'no_phone') return 'SMS skipped: customer phone number missing.';
    if (code === 'wallet_exhausted') return 'SMS skipped: SMS wallet exhausted.';
    if (code === 'quota_exhausted') return 'SMS skipped: Firestore quota exceeded (billing / daily limit).';
    if (code === 'permission') return 'SMS skipped: permission denied for SMS queue.';
    if (code === 'invalid_input') return 'SMS skipped: invalid phone/message input.';
    if (code === 'db_unavailable') return 'SMS skipped: database unavailable.';
    if (code === 'firestore_error') return 'SMS skipped: queue write failed (see detail below).';
    return `SMS skipped: ${code || 'unknown reason'}`;
}
function showSmsDebug(result, extraReason) {
    const el = document.getElementById('smsDebugBadge');
    if (!el) return;
    let ok = false;
    let txt = '';
    if (result && result.ok) {
        ok = true;
        if (result.via === 'rtdb_quota_fallback') {
            txt = 'SMS queued via Realtime Database (Firestore write quota exceeded). Gateway app should send; cloud wallet was not debited — reconcile when Firestore is available again.';
        } else if (result.fallback) {
            txt = 'SMS queued via direct gateway fallback.';
        } else {
            txt = 'SMS queued successfully.';
        }
    } else {
        txt = smsSkipReasonText(extraReason || (result && result.skipped));
        if (result && result.error) {
            txt += ' — ' + String(result.error);
        }
    }
    el.style.display = 'block';
    el.style.background = ok ? '#dcfce7' : '#fee2e2';
    el.style.color = ok ? '#14532d' : '#7f1d1d';
    el.style.border = `1px solid ${ok ? '#86efac' : '#fca5a5'}`;
    el.textContent = txt;
}
function advanceDocId(name) {
    return `ADV_${SCRAP_BUSINESS_ID}_${String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}
function sessionBillTotal() {
    let t = 0;
    state.items.forEach((item) => {
        const w = Number(state.weights[item.id]) || 0;
        t += w * buyingPrice(item);
    });
    return t;
}
/** Copy weight inputs from DOM into state (fixes print / preview after re-render). */
function syncWeightsFromDom() {
    const wrap = document.getElementById('sheetWrap');
    if (!wrap) return;
    wrap.querySelectorAll('input[data-input="weight"]').forEach((inp) => {
        const id = inp.dataset.id;
        if (id) state.weights[id] = Number(inp.value) || 0;
    });
}
function billItemsSubtotal() {
    syncWeightsFromDom();
    return sessionBillTotal();
}
function miscChargesVal() {
    return Math.max(0, Number(document.getElementById('miscChargesAmount')?.value || 0));
}
function billGrandTotal() {
    return billItemsSubtotal() + miscChargesVal();
}
/** Firestore field names vary (camelCase / PascalCase). Never use generic `type` — it is not loan product. */
function scrapCustomerKindNoise(s) {
    return /^(REGISTERED|LOAN_REGISTERED|OTHERS|BORROWER|CUSTOMER|RETAIL|PERSONAL|SCRAP|MEMBER|SUPPLIER)$/i.test(String(s || '').trim());
}
function readLoanTypeFromRow(L) {
    if (!L || typeof L !== 'object') return '';
    /** `kind` is often customer context — read real loan fields first, then kind with filter. */
    const keys = ['loanType', 'LoanType', 'loan_type', 'loanKind', 'productType', 'kind'];
    for (const k of keys) {
        const v = L[k];
        if (v == null || String(v).trim() === '') continue;
        const t = String(v).trim();
        if (k === 'kind' && scrapCustomerKindNoise(t)) continue;
        return t;
    }
    return '';
}
/** Map legacy / alternate labels to Scrap Debts select values (ADV_LN / STANDARD / INVESTOR_8). */
function normalizeScrapLoanProductCode(s) {
    if (!s) return '';
    const u = String(s).trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
    if (u.includes('HAND')) return 'HAND_LOAN';
    if (/^INVESTOR|^INV_/.test(u) || u.includes('INVESTOR_8') || u === 'INVESTOR8') return 'INVESTOR_8';
    const advTokens = ['ADV_LN', 'ADVLN', 'ADVANCE', 'NO_INTEREST', 'NOINTEREST', 'INTEREST_FREE', 'INTERESTFREE', 'FREE_INTEREST', 'FREEINTEREST', 'NON_INTEREST', 'CASH_ADVANCE', 'CASHADVANCE', 'ZERO_INTEREST'];
    if (advTokens.includes(u) || u.includes('NO_INTEREST') || u.includes('INTEREST_FREE')) return 'ADV_LN';
    if (u.includes('ADV_LN') || (u.includes('ADV') && u.includes('LN') && !u.includes('STANDARD'))) return 'ADV_LN';
    const stdTokens = ['STANDARD', 'STD', 'STDLN', 'INTEREST_LOAN', 'STANDARD_INTEREST', 'PRINCIPAL_PLUS', 'INTEREST'];
    if (stdTokens.includes(u) || (u.includes('STANDARD') && !u.includes('ADV_LN'))) return 'STANDARD';
    return u;
}
function rawLoanTypeString(L) {
    if (L && L._loanSource === 'loan_advanced_entries') return 'INVESTOR_8';
    if (L && L._loanSource === 'loan_interest_entries') return 'STANDARD';
    if (L && L._loanSource === 'loan_no_interest') return 'ADV_LN';
    const s = readLoanTypeFromRow(L);
    if (s) {
        const norm = normalizeScrapLoanProductCode(s);
        if (['ADV_LN', 'STANDARD', 'INVESTOR_8', 'HAND_LOAN'].includes(norm)) return norm;
    }
    const src = String(L.source || '').toUpperCase();
    if (src === 'THIRD_PARTY_INVESTOR') return 'INVESTOR_8';
    const mr = Number(L.monthlyRate);
    if (Number.isFinite(mr) && mr > 0) return 'STANDARD';
    if (Number.isFinite(mr) && mr <= 0) return 'ADV_LN';
    return '';
}
function bucketForLoan(L) {
    const raw = rawLoanTypeString(L);
    let u = String(raw).toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
    if (!u) return 'STANDARD';
    if (u === 'HAND_LOAN' || u.includes('HAND')) return 'HAND';
    if (u === 'INVESTOR_8' || u.startsWith('INVESTOR_8') || /^INVESTOR/.test(u)) return 'INVESTOR_8';
    if (u === 'STANDARD' || u === 'INTEREST' || (u.includes('STANDARD') && !u.includes('ADV_LN'))) return 'STANDARD';
    if (u === 'ADV_LN' || u === 'ADVLN') return 'ADV_LN';
    if (u.includes('NO_INTEREST') || u === 'NOINTEREST') return 'ADV_LN';
    if (u.includes('ADV_LN') || (u.includes('ADV') && u.includes('LN') && !u.includes('STANDARD') && !u.includes('INVESTOR'))) return 'ADV_LN';
    return 'STANDARD';
}
function normalizePersonKey(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function stripNameNoise(s) {
    return String(s || '')
        .replace(/^(mr|mrs|miss|ms|dr)\.?\s+/i, '')
        .trim();
}
/** Bill / ණය ගැලපීමේදී customer “කැටගරි” (type label) නමේ කොටසක් ලෙස නොසලකයි. */
function stripLoanCategoryNoise(s) {
    let t = String(s || '').trim();
    t = t.replace(/\s*[-–—]\s*(INVESTOR|INVESTOR_8|STD|STANDARD|ADV_LN|ADV|LOAN|REGISTERED|LOAN_REGISTERED|OTHERS)[\w\s%]*$/i, '').trim();
    t = t.replace(/\s*\([^)]*(INVESTOR|investor|8%|registered|loan\s*registered|std|standard)[^)]*\)\s*$/i, '').trim();
    return t;
}
function loanPersonKey(row) {
    const raw = stripLoanCategoryNoise(stripNameNoise(
        row.customerName || row.CustomerName || row.supplierName || row.SupplierName
        || row.borrowerName || row.borrower || row.name || row.Name || ''
    ));
    return normalizePersonKey(raw);
}
/** Typed නම vs ණය customerName — කෙටි පළමු නම (“Mahesh” vs “Mahesh Perera”), දිගු substring, category strip පසුව. */
function personRowMatchesTargets(key, targets) {
    if (!key) return false;
    if (targets.has(key)) return true;
    
    const kParts = key.split(' ').filter(p => p.length >= 2);
    for (const t of targets) {
        if (!t) continue;
        if (key.includes(t) || t.includes(key)) return true;
        
        const tParts = t.split(' ').filter(p => p.length >= 2);
        // If any significant part matches exactly
        for (const kp of kParts) {
            if (kp.length >= 4 && tParts.includes(kp)) return true;
        }
    }
    return false;
}
function loanBalance(L) {
    if (!L) return 0;
    // Core loan structures use principalOutstanding + interestOutstanding
    if (L._loanSource === 'loan_advanced_entries' || L._loanSource === 'loan_interest_entries' || L._loanSource === 'loan_no_interest') {
        const p = Number(L.principalOutstanding != null ? L.principalOutstanding : L.balance) || 0;
        const intv = Number(L.interestOutstanding) || 0;
        const s = p + intv;
        if (Number.isFinite(s)) return Math.max(0, s);
    }
    const b = Number(L.balance);
    if (Number.isFinite(b)) return Math.max(0, b);
    const p = Number(L.principal);
    if (Number.isFinite(p)) return Math.max(0, p);
    const o = Number(L.outstanding);
    if (Number.isFinite(o)) return Math.max(0, o);
    return 0;
}
/** loan-advanced-investor.html Receive logic — interest first, then principal; investor due fields update. */
function computeAdvancedReceivePatch(r, pay) {
    let remain = Math.max(0, Number(pay) || 0);
    let int = Number(r.interestOutstanding) || 0;
    let p = Number(r.balance != null ? r.balance : r.principalOutstanding) || 0;
    const intPaid = Math.min(int, remain);
    int -= intPaid;
    remain -= intPaid;
    const principalPaid = Math.min(p, remain);
    p -= principalPaid;
    remain -= principalPaid;
    const totAdv = p + int;
    const colPr = (Number(r.collectedPrincipal) || 0) + principalPaid;
    const colIn = (Number(r.collectedInterest) || 0) + intPaid;
    const duePr = (Number(r.principalDueToInvestor) || 0) + principalPaid;
    const dueIn = (Number(r.interestDueToInvestor) || 0) + intPaid;
    const patch = {
        interestOutstanding: int,
        principalOutstanding: p,
        balance: p,
        collectedPrincipal: colPr,
        collectedInterest: colIn,
        principalDueToInvestor: duePr,
        interestDueToInvestor: dueIn,
        lastPaymentDate: new Date().toISOString().slice(0, 10),
        active: totAdv > 0.0001
    };
    if (totAdv <= 0.0001 && window.LoanZeroCleanup && typeof window.LoanZeroCleanup.removalTimestamp === 'function') {
        patch.pendingRemovalAt = window.LoanZeroCleanup.removalTimestamp();
    } else {
        patch.pendingRemovalAt = firebase.firestore.FieldValue.delete();
    }
    return { intPaid, principalPaid, pay: Number(pay) || 0, patch };
}
function loanCreatedMillis(L) {
    if (!L || typeof L !== 'object') return 0;
    const c = L.createdAt;
    if (c && typeof c.toMillis === 'function') return c.toMillis();
    if (c && typeof c.seconds === 'number') return c.seconds * 1000 + Math.floor((c.nanoseconds || 0) / 1e6);
    const d = L.date || L.created || '';
    const p = Date.parse(String(d));
    return Number.isFinite(p) ? p : 0;
}
/** එකම ශේෂයේ — විශාල ණය පළමුව; එකම ශේෂ නම් නවතම doc (“උඩම”) පළමුව allocate. */
function compareLoansRepayOrder(a, b) {
    const bd = loanBalance(b) - loanBalance(a);
    if (Math.abs(bd) > 0.0001) return bd;
    return loanCreatedMillis(b) - loanCreatedMillis(a);
}
function bucketUiTag(L) {
    return bucketUiTagFromCode(bucketForLoan(L));
}
function bucketUiTagFromCode(b) {
    if (b === 'ADV_LN') return 'ADV';
    if (b === 'INVESTOR_8') return 'Inv';
    if (b === 'HAND') return 'Hand';
    return 'Std';
}
function peoplePickForSupplierInput(supplierName) {
    const core = stripLoanCategoryNoise(stripNameNoise(String(supplierName || '')));
    return peopleByName[normalizePersonKey(core)]
        || peopleByName[core.toLowerCase()]
        || peopleByName[normalizePersonKey(String(supplierName || ''))]
        || peopleByName[String(supplierName || '').toLowerCase()];
}
function collectUniquePeopleRows() {
    const list = [];
    const seen = new Set();
    for (const row of Object.values(peopleByName)) {
        if (!row || typeof row !== 'object') continue;
        const fn = String(row.fullName || '').trim();
        if (!fn) continue;
        const k = normalizePersonKey(stripLoanCategoryNoise(stripNameNoise(fn)));
        if (!k || seen.has(k)) continue;
        seen.add(k);
        list.push(row);
    }
    return list;
}
/** Bill supplier නම — කැටගරි නොව, පුද්ගල නම පමණි; customers.fullName විස්තාරය (කෙටි නම් → පූර්ණ නම). */
function supplierNameAliases(rawInput) {
    const raw = String(rawInput || '').trim();
    const out = [];
    const coreRaw = stripLoanCategoryNoise(stripNameNoise(raw));
    if (raw) out.push(raw);
    if (coreRaw && normalizePersonKey(coreRaw) !== normalizePersonKey(raw)) out.push(coreRaw);
    const pick = peoplePickForSupplierInput(raw);
    if (pick && pick.fullName) {
        const fn = String(stripLoanCategoryNoise(stripNameNoise(pick.fullName))).trim();
        if (fn) out.push(fn);
    }
    const nk = normalizePersonKey(coreRaw || raw);
    if (nk.length >= 3) {
        const seenN = new Set(out.map((x) => normalizePersonKey(String(x))));
        for (const row of collectUniquePeopleRows()) {
            const fnm = String(row.fullName || '').trim();
            const nfn = normalizePersonKey(stripLoanCategoryNoise(stripNameNoise(fnm)));
            if (!nfn || seenN.has(nfn)) continue;
            const first = (nfn.split(' ')[0] || '');
            let hit = false;
            if (nk.length >= 4 && first && (first === nk || first.startsWith(nk) || nk.startsWith(first))) {
                if (first.length >= 4 || nk.length >= 4) hit = true;
            }
            if (!hit && nk.length >= 4 && nfn.includes(nk)) hit = true;
            if (hit) {
                out.push(fnm);
                seenN.add(nfn);
            }
        }
    }
    const dedup = [];
    const seenF = new Set();
    for (const x of out) {
        const k = normalizePersonKey(String(x));
        if (!k || seenF.has(k)) continue;
        seenF.add(k);
        dedup.push(String(x).trim());
    }
    return dedup;
}
/** Hand Loans පිටුවේ `hand_loans` (type GIVEN පමණි — අපි දුන් ණය supplier ආපසු ගෙවයි). */
async function fetchHandLoansForSupplier(rawInput) {
    if (!SCRAP_BUSINESS_ID || !window.db) return [];
    const aliases = supplierNameAliases(rawInput);
    if (!aliases.length) return [];
    const targets = new Set(aliases.map(normalizePersonKey).filter(Boolean));
    const snap = await db.collection('hand_loans')
        .where('businessId', '==', SCRAP_BUSINESS_ID)
        .limit(500)
        .get()
        .catch(() => ({ docs: [] }));
    const out = [];
    snap.docs.forEach((d) => {
        const row = d.data() || {};
        if (row.active === false) return;
        if (String(row.type || '').toUpperCase() !== 'GIVEN') return;
        const key = loanPersonKey({ customerName: row.customerName });
        if (!personRowMatchesTargets(key, targets)) return;
        if ((Number(row.balance) || 0) <= 0.0001) return;
        out.push({
            id: d.id,
            ...row,
            loanType: 'HAND_LOAN',
            _loanSource: 'hand_loans',
            customerName: row.customerName || ''
        });
    });
    return out;
}
/** Advanced Loan (Investor Fund) — `loan_advanced_entries` (modules/core/loan-advanced-investor.html). */
async function fetchAdvancedInvestorLoansForSupplier(rawInput) {
    if (!SCRAP_BUSINESS_ID || !window.db) return [];
    const aliases = supplierNameAliases(rawInput);
    if (!aliases.length) return [];
    const targets = new Set(aliases.map(normalizePersonKey).filter(Boolean));
    const snap = await db.collection('loan_advanced_entries')
        .where('businessId', '==', SCRAP_BUSINESS_ID)
        .limit(500)
        .get()
        .catch(() => ({ docs: [] }));
    const out = [];
    snap.docs.forEach((d) => {
        const row = d.data() || {};
        if (row.active === false) return;
        const bal = Number(row.balance != null ? row.balance : row.principalOutstanding) || 0;
        const intv = Number(row.interestOutstanding) || 0;
        if (bal + intv <= 0.0001) return;
        const key = loanPersonKey({ customerName: row.customerName || row.memberName });
        if (!personRowMatchesTargets(key, targets)) return;
        out.push({
            id: d.id,
            ...row,
            loanType: 'INVESTOR_8',
            _loanSource: 'loan_advanced_entries',
            customerName: row.customerName || row.memberName || ''
        });
    });
    return out;
}
/** No-interest Loan — `loan_no_interest` (modules/core/loan-no-interest.html). */
async function fetchNoInterestLoansForSupplier(rawInput) {
    if (!SCRAP_BUSINESS_ID || !window.db) return [];
    const aliases = supplierNameAliases(rawInput);
    if (!aliases.length) return [];
    const targets = new Set(aliases.map(normalizePersonKey).filter(Boolean));
    const snap = await db.collection('loan_no_interest')
        .where('businessId', '==', SCRAP_BUSINESS_ID)
        .limit(500)
        .get()
        .catch(() => ({ docs: [] }));
    const out = [];
    snap.docs.forEach((d) => {
        const row = d.data() || {};
        if (row.active === false) return;
        const b = Number(row.balance != null ? row.balance : row.principalOutstanding) || 0;
        if (b <= 0.0001) return;
        const key = loanPersonKey({ customerName: row.customerName });
        if (!personRowMatchesTargets(key, targets)) return;
        out.push({
            id: d.id,
            ...row,
            loanType: 'ADV_LN',
            _loanSource: 'loan_no_interest',
            customerName: row.customerName || ''
        });
    });
    return out;
}
/** Interest Loan (10% monthly) — `loan_interest_entries` (modules/core/loan-interest.html). */
async function fetchInterestLoansForSupplier(rawInput) {
    if (!SCRAP_BUSINESS_ID || !window.db) return [];
    const aliases = supplierNameAliases(rawInput);
    if (!aliases.length) return [];
    const targets = new Set(aliases.map(normalizePersonKey).filter(Boolean));
    const snap = await db.collection('loan_interest_entries')
        .where('businessId', '==', SCRAP_BUSINESS_ID)
        .limit(500)
        .get()
        .catch(() => ({ docs: [] }));
    const out = [];
    snap.docs.forEach((d) => {
        const row = d.data() || {};
        if (row.active === false) return;
        const p = Number(row.principalOutstanding) || 0;
        const i = Number(row.interestOutstanding) || 0;
        if (p + i <= 0.0001) return;
        const key = loanPersonKey({ customerName: row.customerName });
        if (!personRowMatchesTargets(key, targets)) return;
        out.push({
            id: d.id,
            ...row,
            loanType: 'STANDARD',
            _loanSource: 'loan_interest_entries',
            customerName: row.customerName || ''
        });
    });
    return out;
}
/** Supplier ණය — scrap_loans (store) + hand_loans + loan_advanced_entries (Investor Fund). */
async function fetchActiveLoansForSupplier(rawInput) {
    if (!SCRAP_BUSINESS_ID) {
        console.warn('[Bill] SCRAP_BUSINESS_ID not set');
        return [];
    }
    const aliases = supplierNameAliases(rawInput);
    console.log(`[FetchLoans] Searching for: "${rawInput}" (Aliases: ${aliases.join(', ')})`);
    
    if (!aliases.length) return [];
    const targets = new Set(aliases.map(normalizePersonKey).filter(Boolean));
    
    let scrapMatched = [];
    if (window.scrapLoansStore && typeof window.scrapLoansStore.fetchAllActive === 'function') {
        const all = await window.scrapLoansStore.fetchAllActive(SCRAP_BUSINESS_ID, { force: true });
        console.log(`[FetchLoans] Total scrap_loans found: ${all.length}`);
        scrapMatched = all.filter((row) => {
            const lk = loanPersonKey(row);
            const match = personRowMatchesTargets(lk, targets);
            if (match) console.log(`[FetchLoans] MATCHED scrap_loan: "${row.customerName || row.supplierName}" (ID: ${row.id})`);
            return match;
        });
    }

    const handMatchedRaw = await fetchHandLoansForSupplier(rawInput);
    console.log(`[FetchLoans] Hand loans found: ${handMatchedRaw.length}`);
    const handMatched = handMatchedRaw.filter(row => {
        const match = personRowMatchesTargets(loanPersonKey(row), targets);
        if (match) console.log(`[FetchLoans] MATCHED hand_loan: "${row.customerName}" (ID: ${row.id})`);
        return match;
    });

    const advMatchedRaw = await fetchAdvancedInvestorLoansForSupplier(rawInput);
    console.log(`[FetchLoans] Advanced investor loans found: ${advMatchedRaw.length}`);
    const advMatched = advMatchedRaw.filter(row => {
        const match = personRowMatchesTargets(loanPersonKey(row), targets);
        if (match) console.log(`[FetchLoans] MATCHED advanced_investor: "${row.customerName}" (ID: ${row.id})`);
        return match;
    });

    const noIntMatchedRaw = await fetchNoInterestLoansForSupplier(rawInput);
    console.log(`[FetchLoans] No-interest loans found: ${noIntMatchedRaw.length}`);
    const noIntMatched = noIntMatchedRaw.filter(row => {
        const match = personRowMatchesTargets(loanPersonKey(row), targets);
        if (match) console.log(`[FetchLoans] MATCHED no_interest: "${row.customerName}" (ID: ${row.id})`);
        return match;
    });

    const intMatchedRaw = await fetchInterestLoansForSupplier(rawInput);
    console.log(`[FetchLoans] Interest loans found: ${intMatchedRaw.length}`);
    const intMatched = intMatchedRaw.filter(row => {
        const match = personRowMatchesTargets(loanPersonKey(row), targets);
        if (match) console.log(`[FetchLoans] MATCHED interest_loan: "${row.customerName}" (ID: ${row.id})`);
        return match;
    });

    const merged = [...scrapMatched, ...handMatched, ...advMatched, ...noIntMatched, ...intMatched];
    merged.sort(compareLoansRepayOrder);
    console.log(`[FetchLoans] TOTAL MATCHED: ${merged.length}`);
    return merged;
}
async function loadSupplierLoansIntoState(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) {
        state.loans = [];
        return [];
    }
    state.loans = await fetchActiveLoansForSupplier(raw);
    return state.loans;
}
function loansInBucket(bucket) {
    return state.loans.filter((L) => bucketForLoan(L) === bucket);
}
function poolSumForBucket(bucket) {
    return loansInBucket(bucket).reduce((s, L) => s + loanBalance(L), 0);
}
function getBucketApply(bucket) {
    const el = document.getElementById(`apply_${bucket}`);
    return Math.max(0, Number(el?.value || 0));
}
function allLoanApplies() {
    return {
        HAND: getBucketApply('HAND'),
        ADV_LN: getBucketApply('ADV_LN'),
        STANDARD: getBucketApply('STANDARD'),
        INVESTOR_8: getBucketApply('INVESTOR_8')
    };
}
function totalLoanApply() {
    const a = allLoanApplies();
    return a.HAND + a.ADV_LN + a.STANDARD + a.INVESTOR_8;
}
function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Split repayment across loans (largest balance first). Returns rows {id, amount, loanType}. */
function allocateAcrossLoans(amount, loanRows) {
    const out = [];
    let left = Math.max(0, Number(amount) || 0);
    if (left <= 0) return out;
    const sorted = [...loanRows].filter((L) => loanBalance(L) > 0.0001)
        .sort(compareLoansRepayOrder);
    for (const L of sorted) {
        if (left <= 0) break;
        const b = loanBalance(L);
        const take = Math.min(b, left);
        if (take > 0.0001) {
            out.push({
                id: L.id,
                amount: take,
                loanType: L.loanType,
                customerName: L.customerName,
                sourceCollection: L._loanSource || 'scrap_loans'
            });
            left -= take;
        }
    }
    return out;
}
function suggestAdvanceFromBanner() {
    const elIn = document.getElementById('supplierAdvanceInline');
    const elModal = document.getElementById('supplierAdvance');
    const advBalText = String(elIn?.textContent || elModal?.textContent || '').replace(/[^0-9.]/g, '');
    const advBal = Number(advBalText || 0);
    const total = billGrandTotal();
    const applyEl = document.getElementById('advanceApplyAmount');
    if (!applyEl || applyEl.dataset.userEdited === '1') return;
    
    // Suggest FULL balance application (capped at bill total)
    const suggested = Math.min(advBal, Math.max(0, total));
    applyEl.value = suggested > 0 ? suggested.toFixed(2) : '';
}

function suggestLoans() {
    const total = billGrandTotal();
    if (total <= 0) return;
    const tenPercent = Math.round(total * 0.1);
    const buckets = ['HAND', 'ADV_LN', 'STANDARD', 'INVESTOR_8'];
    buckets.forEach(b => {
        const el = document.getElementById(`apply_${b}`);
        if (!el || el.dataset.userEdited === '1') return;
        const bal = poolSumForBucket(b);
        // Default: Suggest 10% of bill total, but not exceeding available balance
        const suggested = Math.min(bal, tenPercent);
        el.value = suggested > 0 ? suggested.toFixed(2) : '';
    });
}

function updateBillPreview() {
    const itemsSub = billItemsSubtotal();
    const misc = miscChargesVal();
    const grand = itemsSub + misc;
    const elIn = document.getElementById('supplierAdvanceInline');
    const elModal = document.getElementById('supplierAdvance');
    const advBalText = String(elIn?.textContent || elModal?.textContent || '').replace(/[^0-9.]/g, '');
    const advBal = Number(advBalText || 0);
    const requested = Number(document.getElementById('advanceApplyAmount')?.value || 0);
    const applied = Math.min(Math.max(0, requested), Math.max(0, advBal), Math.max(0, grand));
    const la = allLoanApplies();
    const loanSum = la.HAND + la.ADV_LN + la.STANDARD + la.INVESTOR_8;
    const vehicleHire = Math.max(0, Number(document.getElementById('vehicleHireAmount')?.value || 0));
    const cashDue = grand - applied - loanSum - vehicleHire;
    const bi = document.getElementById('billItemsPreview');
    const bm = document.getElementById('billMiscPreview');
    const bt = document.getElementById('billTotalPreview');
    const au = document.getElementById('advanceUsedPreview');
    const cd = document.getElementById('cashDuePreview');
    const boxCash = document.getElementById('boxCash');
    const lblCash = boxCash?.querySelector('.lbl');

    if (cd) {
        cd.textContent = fmt(cashDue);
        if (cashDue < -0.01) {
            if (boxCash) boxCash.style.background = '#f97316'; // Orange for collection
            if (lblCash) lblCash.textContent = 'අපට ලැබිය යුතු මුදල (Receive)';
        } else {
            if (boxCash) boxCash.style.background = ''; // Reset to default CSS
            if (lblCash) lblCash.textContent = 'අතට ගෙවිය යුතු මුදල (Cash Due)';
        }
    }
    const hlu = document.getElementById('handLoanUsedPreview');
    const niu = document.getElementById('noIntUsedPreview');
    const slu = document.getElementById('stdLoanUsedPreview');
    const ilu = document.getElementById('invLoanUsedPreview');
    const grEl = document.getElementById('billGrandRight');
    const vhu = document.getElementById('vehicleHireUsedPreview');
    if (bi) bi.textContent = fmt(itemsSub);
    if (bm) bm.textContent = fmt(misc);
    if (bt) bt.textContent = fmt(grand);
    if (grEl) grEl.textContent = fmt(grand);
    if (au) au.textContent = fmt(applied);
    if (hlu) hlu.textContent = fmt(la.HAND);
    if (niu) niu.textContent = fmt(la.ADV_LN);
    if (slu) slu.textContent = fmt(la.STANDARD);
    if (ilu) ilu.textContent = fmt(la.INVESTOR_8);
    if (vhu) vhu.textContent = fmt(vehicleHire);
    if (cd) cd.textContent = fmt(cashDue);

    // Color Coding Logic
    const mark = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            if (val > 0.01) el.classList.add('has-value');
            else el.classList.remove('has-value');
        }
    };
    mark('boxItems', itemsSub);
    mark('boxMisc', misc);
    mark('boxTotal', grand);
    mark('boxAdv', applied);
    mark('boxHand', la.HAND);
    mark('boxNoInt', la.ADV_LN);
    mark('boxStd', la.STANDARD);
    mark('boxInv', la.INVESTOR_8);
    mark('boxHire', vehicleHire);
}

function buyingPrice(item) {
    const cp = Number(item.costPrice);
    if (Number.isFinite(cp) && cp > 0) return cp;
    return 0;
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any current speech
    
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'si-LK';
    msg.volume = 1.0; // සද්දේ වැඩියෙන් (Max volume)
    msg.rate = 0.9;   // වඩාත් ස්වාභාවික වේගය
    msg.pitch = 1.0; 
    
    const voices = window.speechSynthesis.getVoices();
    // වඩාත් තාත්වික Google හඬවල් වලට ප්‍රමුඛතාවය ලබා දීම
    let selectedVoice = voices.find(v => v.lang.includes('si') && v.name.includes('Google'));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('si') && v.name.toLowerCase().includes('male'));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('si'));
    
    if (selectedVoice) {
        msg.voice = selectedVoice;
        // හඬ පිරිමි හඬක් නොවේ නම් Pitch එක අඩු කර පිරිමි හඬකට සමාන කිරීම
        if (selectedVoice.name.toLowerCase().includes('female') || selectedVoice.name.toLowerCase().includes('zira')) {
            msg.pitch = 0.8;
        }
    } else {
        msg.pitch = 0.8;
    }

    window.speechSynthesis.speak(msg);
}

const DRAFT_COL = 'scrap_buying_drafts';
let draftTimer = null;

async function saveDraft() {
    const supplier = document.getElementById('supplierName')?.value;
    if (!supplier || supplier.length < 2) return;
    
    const draftData = {
        businessId: SCRAP_BUSINESS_ID,
        supplierName: supplier,
        weights: state.weights,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const draftId = `${SCRAP_BUSINESS_ID}_${supplier.replace(/\s+/g, '_')}`;
    try {
        await db.collection(DRAFT_COL).doc(draftId).set(draftData, { merge: true });
        console.log('Draft auto-saved');
    } catch (e) { console.warn('Draft save failed', e); }
}

function debounceSaveDraft() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 2000);
}

async function loadDraftForSupplier(name) {
    if (!name || name.length < 2) return;
    const draftId = `${SCRAP_BUSINESS_ID}_${name.replace(/\s+/g, '_')}`;
    try {
        const doc = await db.collection(DRAFT_COL).doc(draftId).get();
        if (doc.exists) {
            const data = doc.data();
            state.weights = data.weights || {};
            renderSheet();
            console.log('Draft loaded for', name);
        }
    } catch (e) { console.warn('Draft load failed', e); }
}

async function deleteDraftForSupplier(name) {
    if (!name) return;
    const draftId = `${SCRAP_BUSINESS_ID}_${name.replace(/\s+/g, '_')}`;
    try {
        await db.collection(DRAFT_COL).doc(draftId).delete();
    } catch (e) {}
}

function listenToDrafts() {
    db.collection(DRAFT_COL).where('businessId', '==', SCRAP_BUSINESS_ID)
      .onSnapshot(snap => {
          const list = document.getElementById('activeDraftsList');
          if(!list) return;
          if (snap.empty) {
              list.innerHTML = '<div style="font-size:11px; color:#94a3b8; font-weight:600;">සක්‍රීය බිල්පත් නැත (No active drafts)</div>';
              return;
          }
          list.innerHTML = snap.docs.map(doc => {
              const d = doc.data();
              return `<div onclick="switchToDraft('${d.supplierName}')" style="background:#e0f2fe; color:#0369a1; padding:8px 16px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; border:1px solid #bae6fd; box-shadow:0 2px 4px rgba(0,0,0,0.05); display:flex; align-items:center; gap:10px;">
                  <span>👤 ${d.supplierName}</span>
                  <span onclick="removeDraft(event, '${d.supplierName}')" style="margin-left:4px; color:#ef4444; font-size:16px; padding:0 4px;" title="Delete Draft">✕</span>
              </div>`;
          }).join('');
      });
}

async function removeDraft(event, name) {
    if (event) event.stopPropagation();
    if (confirm(`${name} ගේ මෙම බිල්පත (Draft) මකා දැමීමට ඔබට සහතිකද?`)) {
        await deleteDraftForSupplier(name);
        speakText(`${name} Removed`);
    }
}

function switchToDraft(name) {
    const inp = document.getElementById('supplierName');
    if (inp) {
        inp.value = name;
        loadDraftForSupplier(name);
        if (name.toUpperCase() !== 'TEMPORARY WALK-IN') {
            speakText(`${name} ලෝඩින්`);
        } else {
            speakText(`ලෝඩින්`);
        }
    }
}

function computeDerived(stock, sellingPrice, profit, costPrice) {
    const s = Number(stock) || 0;
    const sp = Number(sellingPrice) || 0;
    const pf = Number(profit) || 0;
    const cpInput = Number(costPrice);
    const cp = Number.isFinite(cpInput) && cpInput > 0 ? cpInput : 0;
    return {
        costPrice: cp,
        totalBuyingValue: s * cp,
        totalSellingValue: s * sp,
        potentialProfitValue: s * pf
    };
}

function renderSheet() {
    const wrap = document.getElementById('sheetWrap');
    if (!wrap) return;

    const mid = Math.ceil(state.items.length / 2);
    const leftRows = state.items.slice(0, mid);
    const rightRows = state.items.slice(mid);

    const renderTable = (rows, startIdx) => `
        <table class="buy-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="num">Weight</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((item, offset) => {
                    const idx = startIdx + offset;
                    const price = buyingPrice(item);
                    const weight = Number(state.weights[item.id]) || 0;
                    const sub = weight * price;
                    const isZero = (weight <= 0.0001);
                    const rowClass = isZero ? 'zero-weight' : 'has-weight';
                    return `<tr data-id="${item.id}" class="${rowClass}">
                        <td>${item.itemName || item.name || '-'}</td>
                        <td class="num"><input data-input="weight" data-idx="${idx}" data-id="${item.id}" type="number" step="0.01" value="${weight || ''}"></td>
                        <td class="num" data-subtotal="${item.id}">${fmt(sub)}</td>
                    </tr>`;
                }).join('') || '<tr><td colspan="3">No items in scrap_items.</td></tr>'}
            </tbody>
        </table>`;

    wrap.innerHTML = `
        <div>${renderTable(leftRows, 0)}</div>
        <div>${renderTable(rightRows, leftRows.length)}</div>
    `;

    const allInputs = Array.from(wrap.querySelectorAll('input[data-input="weight"]'));
    allInputs.forEach((input) => {
        input.addEventListener('input', () => {
            const id = input.dataset.id;
            const val = Number(input.value) || 0;
            state.weights[id] = val;
            const item = state.items.find((r) => r.id === id);
            const sub = (Number(state.weights[id]) || 0) * buyingPrice(item || {});
            const subEl = wrap.querySelector(`[data-subtotal="${id}"]`);
            if (subEl) subEl.textContent = fmt(sub);
            updateTotals();
            debounceSaveDraft();
        });
        input.addEventListener('change', () => {
            const id = input.dataset.id;
            const val = Number(input.value) || 0;
            if (val > 0) {
                const supplier = document.getElementById('supplierName')?.value || 'Supplier';
                const item = state.items.find((r) => r.id === id);
                speakText(`${supplier}, ${item?.itemName || item?.name}, කිලෝ ${val}යි`);
            }
        });
        input.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter') return;
            ev.preventDefault();
            const idx = Number(input.dataset.idx);
            const next = allInputs.find((el) => Number(el.dataset.idx) === idx + 1);
            if (next) next.focus();
        });
    });

    updateTotals();

    // Populate mobile selector
    const sel = document.getElementById('mobileItemSelector');
    if (sel) {
        const current = sel.value;
        sel.innerHTML = '<option value="">-- භාණ්ඩයක් තෝරන්න --</option>' +
            state.items.map(it => `<option value="${it.id}">${it.itemName || it.name}</option>`).join('');
        sel.value = current;
    }
}

function updateTotals() {
    let total = 0;
    let totalW = 0;
    state.items.forEach((item) => {
        const w = Number(state.weights[item.id]) || 0;
        totalW += w;
        total += w * buyingPrice(item);
    });
    document.getElementById('sessionTotal').textContent = fmt(total);
    document.getElementById('sessionWeight').textContent = totalW.toFixed(2);
    const mlt = document.getElementById('mobileLeftTotal');
    if (mlt) mlt.textContent = fmt(total);
    updateBillPreview();
    suggestAdvanceFromBanner();
    suggestLoans();
}

async function loadItems() {
    const snap = await db.collection('scrap_items')
        .where('businessId', '==', SCRAP_BUSINESS_ID)
        .get();
    state.items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            if (a.sortOrder !== undefined && b.sortOrder !== undefined) return a.sortOrder - b.sortOrder;
            if (a.sortOrder !== undefined) return -1;
            if (b.sortOrder !== undefined) return 1;
            return String(a.itemName || '').localeCompare(String(b.itemName || ''));
        });
    renderSheet();

    const sel = document.getElementById('mobileItemSelector');
    if (sel) {
        sel.addEventListener('change', (e) => {
            const id = e.target.value;
            if (!id) return;
            if (!state.weights[id]) state.weights[id] = 0;
            renderSheet();
            setTimeout(() => {
                const tr = document.querySelector(`tr[data-id="${id}"]`);
                if (tr) {
                    tr.classList.remove('zero-weight');
                    tr.classList.add('has-weight');
                    const inp = tr.querySelector('input');
                    if (inp) {
                        inp.focus();
                        inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
            sel.value = '';
        });
    }
}

async function loadPeople() {
    console.log("[loadPeople] Starting for BID:", SCRAP_BUSINESS_ID);
    try {
        if (!SCRAP_BUSINESS_ID) {
            console.error("[loadPeople] FAILED: SCRAP_BUSINESS_ID is empty.");
            return;
        }
        const snap = await db.collection('customers').where('businessId', '==', SCRAP_BUSINESS_ID).limit(1000).get();
        console.log(`[loadPeople] Found ${snap.size} customers.`);
        
        const list = document.getElementById('supplierList');
        if (!list) {
            console.error("[loadPeople] FAILED: datalist#supplierList not found in DOM.");
            return;
        }

        let html = '';
        snap.docs.forEach(d => {
            const row = d.data() || {};
            if (row.isActive === false) return;
            
            const name = String(row.fullName || row.name || '').trim();
            if (!name) return;

            peopleByName[name.toLowerCase()] = row;
            peopleByName[normalizePersonKey(name)] = row;
            
            html += `<option value="${name.replace(/\"/g,'&quot;')}"></option>`;
        });
        
        list.innerHTML = html;
        console.log("[loadPeople] Datalist populated successfully.");
    } catch (e) {
        console.error('[loadPeople] CRITICAL ERROR:', e);
    }
}


async function saveBuyingSession(actionType) {
    const supplierName = String(document.getElementById('supplierName').value || '').trim();
    if (!supplierName) {
        alert('Supplier name is required.');
        return;
    }
    
    const confirmMsg = actionType === 'whatsapp' 
        ? `Save this bill and share via WhatsApp to ${supplierName}?`
        : `Save and print this bill for ${supplierName}?`;

    if (!confirm(confirmMsg)) return;

    syncWeightsFromDom();
    await loadSupplierLoansIntoState(supplierName);
    
    // Vehicle Hire Auto-populate moved to refreshSupplierBalances

    
    const pick = peoplePickForSupplierInput(supplierName);
    if (pick && pick.mobile) {
        selectedSupplierPhone = String(pick.mobile);
    }
    const customerType = document.getElementById('customerType')?.value || 'SUPPLIER';
    const billDateTime = String(document.getElementById('billDateTime')?.value || '').trim();
    const items = state.items
        .map((item) => {
            const weight = Number(state.weights[item.id]) || 0;
            if (!weight) return null;
            const price = buyingPrice(item);
            return {
                itemId: item.id,
                itemName: item.itemName || '',
                weight,
                buyingPrice: price,
                subtotal: weight * price
            };
        })
        .filter(Boolean);

    const miscCharges = miscChargesVal();
    if (!items.length && miscCharges <= 0.0001) {
        alert('Enter at least one item weight, or a positive වෙනත් අයකිරීම් amount.');
        return;
    }

    const totalWeight = items.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    const itemsTotal = items.reduce((s, r) => s + (Number(r.subtotal) || 0), 0);
    const billGrand = itemsTotal + miscCharges;
    const advRef = db.collection('scrap_advances').doc(advanceDocId(supplierName));
    const advSnap = await advRef.get();
    const advanceBalance = advSnap.exists ? (Number(advSnap.data().balance) || 0) : 0;
    const requestedAdvance = Number(document.getElementById('advanceApplyAmount')?.value || 0);
    if (requestedAdvance < 0) {
        alert('Advance apply amount cannot be negative.');
        return;
    }
    if (requestedAdvance > advanceBalance) {
        alert(`Advance apply amount exceeds available balance (${fmt(advanceBalance)}).`);
        return;
    }
    const advanceApplied = Math.min(billGrand, Math.max(0, requestedAdvance));
    const applies = allLoanApplies();
    const buckets = ['HAND', 'ADV_LN', 'STANDARD', 'INVESTOR_8'];
    for (const b of buckets) {
        const pool = poolSumForBucket(b);
        const req = applies[b];
        if (req > pool + 0.02) {
            alert(`${b} ණය කැපීම (${fmt(req)}) එකතු ශේෂය (${fmt(pool)}) ඉක්මවයි.`);
            return;
        }
    }
    const allocHand = allocateAcrossLoans(applies.HAND, loansInBucket('HAND'));
    const allocAdv = allocateAcrossLoans(applies.ADV_LN, loansInBucket('ADV_LN'));
    const allocStd = allocateAcrossLoans(applies.STANDARD, loansInBucket('STANDARD'));
    const allocInv = allocateAcrossLoans(applies.INVESTOR_8, loansInBucket('INVESTOR_8'));
    const loanAllocations = [...allocHand, ...allocAdv, ...allocStd, ...allocInv];
    const sumAlloc = (arr, tgt) => {
        const s = arr.reduce((a, x) => a + x.amount, 0);
        if (tgt > 0.02 && Math.abs(s - tgt) > 0.05) return false;
        return true;
    };
    if (!sumAlloc(allocHand, applies.HAND) || !sumAlloc(allocAdv, applies.ADV_LN)
        || !sumAlloc(allocStd, applies.STANDARD) || !sumAlloc(allocInv, applies.INVESTOR_8)) {
        alert('ණය කැපීම allocate කරන්න බැරි විය (දත්ත පරීක්ෂා කරන්න).');
        return;
    }
    const loanPayTotal = applies.HAND + applies.ADV_LN + applies.STANDARD + applies.INVESTOR_8;
    const loanDeduction = applies.HAND + applies.STANDARD + applies.INVESTOR_8;
    const advanceLoanDeduction = applies.ADV_LN;
    const vehicleHireApplied = Math.max(0, Number(document.getElementById('vehicleHireAmount')?.value || 0));
    const cashPaid = billGrand - advanceApplied - loanPayTotal - vehicleHireApplied;
    const customerRow = pick || null;
    const smsSettingsSnap = await db.collection('scrap_sms_settings').doc(SCRAP_BUSINESS_ID).get();
    const smsSettings = smsSettingsSnap.exists ? smsSettingsSnap.data() : {};
    for (const line of items) {
        const itemRef = db.collection('scrap_items').doc(line.itemId);
        const itemSnap = await itemRef.get();
        if (!itemSnap.exists) continue;
        const row = itemSnap.data();
        const currentStock = Number(row.currentStock) || 0;
        const nextStock = currentStock + (Number(line.weight) || 0);
        const derived = computeDerived(nextStock, row.sellingPrice, row.profit, row.costPrice);
        await itemRef.update({
            currentStock: nextStock,
            costPrice: derived.costPrice,
            totalBuyingValue: derived.totalBuyingValue,
            totalSellingValue: derived.totalSellingValue,
            potentialProfitValue: derived.potentialProfitValue,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    const session = {
        businessId: SCRAP_BUSINESS_ID,
        customerType,
        supplierName,
        supplierPhone: selectedSupplierPhone || customerRow?.mobile || customerRow?.phone || '',
        date: new Date().toISOString(),
        billDateTime: billDateTime || new Date().toISOString(),
        items,
        totalWeight,
        totalAmount: itemsTotal,
        miscCharges,
        billGrandTotal: billGrand,
        advanceApplied,
        loanDeduction,
        advanceLoanDeduction,
        loanApplyBreakdown: applies,
        vehicleHireApplied,
        cashPaid,
        loanAllocations,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('buying_history').add(session);
    await db.collection('scrap_buying_sessions').add(session);
    await deleteDraftForSupplier(supplierName);
    state.weights = {};
    renderSheet();

    if (vehicleHireApplied > 0) {
        await db.collection('scrap_revenue_history').add({
            businessId: SCRAP_BUSINESS_ID,
            supplierName,
            amount: vehicleHireApplied,
            type: 'VEHICLE_HIRE',
            date: new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    if (advanceApplied > 0) {
        await db.collection('scrap_advance_history').add({
            businessId: SCRAP_BUSINESS_ID,
            supplierName,
            amount: -Math.abs(advanceApplied),
            note: 'Applied in bill',
            date: new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'APPLIED_IN_BILL'
        });
    }
    let scrapLoanCredit = 0;
    let handLoanCredit = 0;
    let advLoanPrincipalCredit = 0;
    let advLoanInterestCredit = 0;
    for (const row of loanAllocations) {
        const amt = Number(row.amount) || 0;
        if (amt <= 0.0001) continue;
        const src = row.sourceCollection || 'scrap_loans';
        if (src === 'hand_loans') {
            const ref = db.collection('hand_loans').doc(row.id);
            const s = await ref.get();
            if (!s.exists) continue;
            const r = s.data() || {};
            const b = Number(r.balance) || 0;
            const next = Math.max(0, b - amt);
            await ref.update({
                balance: next,
                active: next > 0.0001,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            handLoanCredit += amt;
            continue;
        }
        if (src === 'loan_advanced_entries') {
            const ref = db.collection('loan_advanced_entries').doc(row.id);
            const s = await ref.get();
            if (!s.exists) continue;
            const r = s.data() || {};
            const comp = computeAdvancedReceivePatch(r, amt);
            await ref.set({
                ...comp.patch,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            advLoanPrincipalCredit += comp.principalPaid;
            advLoanInterestCredit += comp.intPaid;
            continue;
        }
        if (src === 'loan_interest_entries') {
            const ref = db.collection('loan_interest_entries').doc(row.id);
            const s = await ref.get();
            if (!s.exists) continue;
            const r = s.data() || {};
            let remain = amt;
            let intOut = Number(r.interestOutstanding) || 0;
            let principal = Number(r.principalOutstanding) || 0;
            const intPaid = Math.min(intOut, remain);
            intOut -= intPaid;
            remain -= intPaid;
            const principalPaid = Math.min(principal, remain);
            principal -= principalPaid;
            remain -= principalPaid;
            const tot = principal + intOut;
            const patch = {
                interestOutstanding: intOut,
                principalOutstanding: principal,
                active: tot > 0.0001,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (tot <= 0.0001 && window.LoanZeroCleanup && typeof window.LoanZeroCleanup.removalTimestamp === 'function') {
                patch.pendingRemovalAt = window.LoanZeroCleanup.removalTimestamp();
            } else {
                patch.pendingRemovalAt = firebase.firestore.FieldValue.delete();
            }
            await ref.set(patch, { merge: true });
            scrapLoanCredit += amt;
            continue;
        }
        if (src === 'loan_no_interest') {
            const ref = db.collection('loan_no_interest').doc(row.id);
            const s = await ref.get();
            if (!s.exists) continue;
            const r = s.data() || {};
            const b = Number(r.balance != null ? r.balance : r.principalOutstanding) || 0;
            const next = Math.max(0, b - amt);
            const patch = {
                balance: next,
                principalOutstanding: next,
                active: next > 0.0001,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (next <= 0.0001 && window.LoanZeroCleanup && typeof window.LoanZeroCleanup.removalTimestamp === 'function') {
                patch.pendingRemovalAt = window.LoanZeroCleanup.removalTimestamp();
            } else {
                patch.pendingRemovalAt = firebase.firestore.FieldValue.delete();
            }
            await ref.set(patch, { merge: true });
            scrapLoanCredit += amt;
            continue;
        }
        const ref = db.collection('scrap_loans').doc(row.id);
        const s = await ref.get();
        if (!s.exists) continue;
        const b = Number(s.data().balance) || 0;
        await ref.update({
            balance: Math.max(0, b - amt),
            lastSupplyAt: new Date().toISOString(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        scrapLoanCredit += amt;
    }
    if (window.scrapVbaCore && typeof window.scrapVbaCore.postJournalEntry === 'function') {
        const inventoryDebit = itemsTotal + miscCharges;
        const lines = [{ accountCode: '1-1030-01', accountName: 'Scrap Inventory', debit: inventoryDebit, credit: 0 }];
        const payMethod = String(document.getElementById('paymentMethod')?.value || 'CASH').toUpperCase();
        if (Math.abs(cashPaid) > 0.001) {
            const isCollection = cashPaid < 0;
            const absAmt = Math.abs(cashPaid);
            const accCode = payMethod === 'BANK' ? '1-1020-01' : '1-1010-01';
            const accName = payMethod === 'BANK' ? 'Bank - Current Account' : 'Cash - Main';
            
            if (isCollection) {
                // Supplier pays us (Debit Cash/Bank)
                lines.push({ accountCode: accCode, accountName: accName, debit: absAmt, credit: 0 });
            } else {
                // We pay supplier (Credit Cash/Bank)
                lines.push({ accountCode: accCode, accountName: accName, debit: 0, credit: absAmt });
            }
        }
        if (vehicleHireApplied > 0.01) {
            lines.push({ accountCode: '4-4050-01', accountName: 'Vehicle Hire Revenue (Scrap)', debit: 0, credit: vehicleHireApplied });
        }
        if (advanceApplied > 0) lines.push({ accountCode: '1-1060-01', accountName: 'Supplier Advances (Scrap)', debit: 0, credit: advanceApplied });
        if (scrapLoanCredit > 0.01) lines.push({ accountCode: '1-1050-01', accountName: 'Loans Given', debit: 0, credit: scrapLoanCredit });
        if (handLoanCredit > 0.01) {
            lines.push({ accountCode: '1-1030-10', accountName: 'A/R — Hand loans (given)', debit: 0, credit: handLoanCredit });
        }
        if (advLoanPrincipalCredit > 0.01) {
            lines.push({ accountCode: '1-1030-13', accountName: 'A/R — Advanced (investor) loans', debit: 0, credit: advLoanPrincipalCredit });
        }
        if (advLoanInterestCredit > 0.01) {
            lines.push({ accountCode: '2-2060-10', accountName: 'Investor funds payable — Advanced loans', debit: 0, credit: advLoanInterestCredit });
        }
        await window.scrapVbaCore.postJournalEntry(SCRAP_BUSINESS_ID, {
            description: `Scrap buying - ${supplierName}`,
            reference: supplierName,
            referenceType: 'SCRAP_BUYING',
            date: new Date().toISOString(),
            entries: lines
        });
    }
    if (advanceApplied > 0) {
        await advRef.set({
            businessId: SCRAP_BUSINESS_ID,
            supplierName,
            balance: advanceBalance - advanceApplied,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    if (window.scrapVbaCore && typeof window.scrapVbaCore.enqueuePendingSms === 'function') {
        const enabled = window.scrapVbaCore.isScrapSmsEventEnabled
            ? await window.scrapVbaCore.isScrapSmsEventEnabled(SCRAP_BUSINESS_ID, 'buying')
            : false;
        const phone = selectedSupplierPhone || customerRow?.mobile || customerRow?.phone || '';
        if (enabled && phone) {
            // Re-fetch balances for detailed SMS
            const latestLoans = await fetchActiveLoansForSupplier(supplierName);
            const balMap = { HAND: 0, STANDARD: 0, INVESTOR_8: 0, ADV_LN: 0 };
            latestLoans.forEach(L => {
                const b = bucketForLoan(L);
                if (balMap[b] !== undefined) balMap[b] += loanBalance(L);
            });
            const remAdv = Math.max(0, advanceBalance - advanceApplied);
            
            // Comprehensive and detailed SMS body
            let smsBody = `Bill:${fmt(billGrand)}. Paid:${fmt(cashPaid)}.`;
            const deds = [];
            if (advanceApplied > 0.01) deds.push(`Adv:${fmt(advanceApplied)}`);
            if (applies.HAND > 0.01) deds.push(`Hand:${fmt(applies.HAND)}`);
            if (applies.ADV_LN > 0.01) deds.push(`NoInt:${fmt(applies.ADV_LN)}`);
            if (applies.STANDARD > 0.01) deds.push(`Std:${fmt(applies.STANDARD)}`);
            if (applies.INVESTOR_8 > 0.01) deds.push(`Inv:${fmt(applies.INVESTOR_8)}`);
            if (vehicleHireApplied > 0.01) deds.push(`Hire:${fmt(vehicleHireApplied)}`);
            if (deds.length) smsBody += ` Ded: ${deds.join(', ')}.`;
            
            const bals = [];
            if (remAdv > 1) bals.push(`Adv:${fmt(remAdv)}`);
            if (balMap.HAND > 1) bals.push(`Hand:${fmt(balMap.HAND)}`);
            if (balMap.STANDARD > 1) bals.push(`Std:${fmt(balMap.STANDARD)}`);
            if (balMap.INVESTOR_8 > 1) bals.push(`Inv:${fmt(balMap.INVESTOR_8)}`);
            if (balMap.ADV_LN > 1) bals.push(`NoInt:${fmt(balMap.ADV_LN)}`);
            if (bals.length) smsBody += ` Bal: ${bals.join(', ')}.`;
            
            let smsRes;
            const finalMsg = `Dear ${supplierName}, ${smsBody} Thank you.`;
            if (typeof window.scrapVbaCore.enqueuePendingSmsForScrap === 'function') {
                smsRes = await window.scrapVbaCore.enqueuePendingSmsForScrap(phone, finalMsg);
            } else {
                smsRes = await window.scrapVbaCore.enqueuePendingSms(SCRAP_BUSINESS_ID, phone, finalMsg);
            }
            showSmsDebug(smsRes);
        } else {
            showSmsDebug(null, enabled ? 'no_phone' : 'event_disabled');
        }
    if (window.scrapVbaCore && typeof window.scrapVbaCore.logEvent === 'function') {
        await window.scrapVbaCore.logEvent(SCRAP_BUSINESS_ID, 'BUYING_SESSION', `${supplierName} total ${billGrand}`, 'Admin');
        await window.scrapVbaCore.upsertCustomerLedger(SCRAP_BUSINESS_ID, supplierName);
        if (typeof window.scrapVbaCore.syncInventoryAssetWithStock === 'function') {
            await window.scrapVbaCore.syncInventoryAssetWithStock(SCRAP_BUSINESS_ID);
        }
    }
    const loansForTouch = await fetchActiveLoansForSupplier(supplierName);
    for (const L of loansForTouch) {
        if (L._loanSource === 'hand_loans') {
            await db.collection('hand_loans').doc(L.id).update({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else if (L._loanSource === 'loan_advanced_entries') {
            await db.collection('loan_advanced_entries').doc(L.id).set({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else {
            await db.collection('scrap_loans').doc(L.id).update({
                lastSupplyAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    state.weights = {};
    renderSheet();
    ['apply_HAND', 'apply_ADV_LN', 'apply_STANDARD', 'apply_INVESTOR_8'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '0';
    });
    const miscEl = document.getElementById('miscChargesAmount');
    if (miscEl) miscEl.value = '0';
    if (window.scrapVbaCore && typeof window.scrapVbaCore.checkClosedLoans === 'function') {
        await window.scrapVbaCore.checkClosedLoans(SCRAP_BUSINESS_ID);
    }
    if (window.scrapLoansStore && typeof window.scrapLoansStore.invalidate === 'function') {
        window.scrapLoansStore.invalidate();
    }
    await refreshSupplierBalances();
    updateBillPreview();
    await loadBuyingHistory();
    if (actionType === 'whatsapp') {
        await shareBillViaWhatsapp();
    } else {
        if (confirm('Buying session saved successfully!\n\nDo you want to print the bill now?')) {
            await printA5Bill();
        } else {
            alert('Bill saved successfully!');
        }
    }
}


async function shareBillViaWhatsapp() {
    const name = document.getElementById('supplierName').value.trim();
    const person = peopleByName[name] || peopleByName[name.toLowerCase()];
    const wa = person?.whatsapp || person?.phone || '';
    if (!wa) {
        alert('WhatsApp number not found for this customer. Please update their profile.');
        return;
    }

    const lines = getCurrentBillLines();
    const sub = billItemsSubtotal();
    const misc = miscChargesVal();
    const appliedAdv = Number(document.getElementById('advanceApplyAmount')?.value || 0);
    const loans = totalLoanApply();
    const hire = Number(document.getElementById('vehicleHireAmount')?.value || 0);
    const cash = billGrandTotal() - appliedAdv - loans - hire;
    const grand = billGrandTotal();

    let msg = `*📜 SCRAP BUYING BILL*\n`;
    msg += `--------------------------\n`;
    msg += `*Customer:* ${name}\n`;
    msg += `*Date:* ${new Date().toLocaleString('en-GB')}\n`;
    msg += `--------------------------\n`;
    
    lines.filter(l => !l.isMisc).forEach(l => {
        msg += `• ${l.name}: ${l.weight.toFixed(2)}kg x ${l.unit.toFixed(2)} = *LKR ${l.amount.toLocaleString()}*\n`;
    });
    
    msg += `--------------------------\n`;
    msg += `*Subtotal:* LKR ${sub.toLocaleString()}\n`;
    if (misc > 0.01) msg += `*Other Charges:* LKR ${misc.toLocaleString()}\n`;
    msg += `*Grand Total: LKR ${grand.toLocaleString()}*\n`;
    msg += `--------------------------\n`;
    
    if (appliedAdv > 0.01) msg += `*Advance Ded:* -LKR ${appliedAdv.toLocaleString()}\n`;
    if (loans > 0.01) msg += `*Loan Ded:* -LKR ${loans.toLocaleString()}\n`;
    if (hire > 0.01) msg += `*Hire:* -LKR ${hire.toLocaleString()}\n`;
    
    msg += `\n*✅ CASH PAID: LKR ${cash.toLocaleString()}*\n`;
    msg += `--------------------------\n`;
    msg += `_Generated via DIGIBIZ System_`;

    const cleanWa = wa.replace(/[^0-9]/g, '');
    let finalPhone = cleanWa;
    if (finalPhone.startsWith('0')) finalPhone = '94' + finalPhone.substring(1);
    else if (!finalPhone.startsWith('94')) finalPhone = '94' + finalPhone;

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${finalPhone}?text=${encoded}`;
    
    // Attempt to open in a way that works for both desktop and mobile
    const win = window.open(url, '_blank');
    if (!win) {
        // Fallback for mobile browser restrictions
        location.href = url;
    }
}

function setAdvanceBalanceText(bal) {
    const t = fmt(bal);
    const a = document.getElementById('supplierAdvance');
    if (a) a.textContent = t;
    const inline = document.getElementById('supplierAdvanceInline');
    if (inline) inline.textContent = t;
}
async function refreshSupplierBalances() {
    const supplierName = String(document.getElementById('supplierName').value || '').trim();
    state.loans = [];
    if (!supplierName) {
        setAdvanceBalanceText(0);
        ['HAND', 'ADV_LN', 'STANDARD', 'INVESTOR_8'].forEach((b) => {
            const el = document.getElementById(`bal_${b}`);
            if (el) el.textContent = fmt(0);
        });
        const vhEl = document.getElementById('vehicleHireAmount');
        if (vhEl) vhEl.addEventListener('input', updateBillPreview);
        const lr = document.getElementById('loanPerRow');
        if (lr) lr.innerHTML = '';
        const applyEl = document.getElementById('advanceApplyAmount');
        if (applyEl) applyEl.value = '';
        updateBillPreview();
        return;
    }
    const pick = peoplePickForSupplierInput(supplierName);
    selectedSupplierPhone = pick && pick.mobile ? String(pick.mobile) : '';
    const advSnap = await db.collection('scrap_advances').doc(advanceDocId(supplierName)).get().catch(() => null);
    const bal = advSnap && advSnap.exists ? (Number(advSnap.data().balance) || 0) : 0;
    setAdvanceBalanceText(bal);
    const elIn = document.getElementById('supplierAdvanceInline');
    if (elIn) elIn.textContent = fmt(bal);

    await loadSupplierLoansIntoState(supplierName);
    ['HAND', 'ADV_LN', 'STANDARD', 'INVESTOR_8'].forEach((b) => {
        const el = document.getElementById(`bal_${b}`);
        if (el) el.textContent = fmt(poolSumForBucket(b));
    });
    const hint = document.getElementById('loanMatchHint');
    if (hint) {
        const nm = escHtml(supplierName);
        if (!state.loans.length) {
            hint.innerHTML = `මෙම නමට (<b>${nm}</b>) ගැලපුණු ණය <b>0</b>. <strong>Scrap Debts</strong>, <strong>Hand Loans</strong> (Loan Given), හෝ <strong>Advanced Loan (Investor Fund)</strong> පිටුවේ member නම මෙහි supplier නමට සමානදැයි බලන්න. Supplier <strong>advance</strong> ණය bucket නොවේ.`;
        } else {
            const parts = ['HAND', 'ADV_LN', 'STANDARD', 'INVESTOR_8'].map((b) => `${bucketUiTagFromCode(b)}:${fmt(poolSumForBucket(b))}`);
            hint.innerHTML = `ගැලපුණු ණය <b>${state.loans.length}</b> — bucket ශේෂ: ${parts.join(' · ')}`;
        }
    }
    const lr = document.getElementById('loanPerRow');
    if (lr) {
        lr.innerHTML = state.loans.length
            ? state.loans.map((L) => {
                const rawT = L._loanSource === 'loan_advanced_entries'
                    ? 'Investor (Adv. fund sheet)'
                    : (readLoanTypeFromRow(L) || rawLoanTypeString(L) || '-');
                const tag = bucketUiTag(L);
                return `<div>• <b>[${tag}]</b> ${escHtml(rawT)} — ${fmt(loanBalance(L))} <span class="small">(${String(L.id).slice(-8)})</span></div>`;
            }).join('')
            : '';
    }
    suggestAdvanceFromBanner();
    suggestLoans();
    updateBillPreview();

    // Auto-fetch Vehicle Hire rate
    try {
        const vSnap = await db.collection('scrap_vehicles').where('businessId', '==', SCRAP_BUSINESS_ID).get();
        const vehicles = vSnap.docs.map(d => d.data());
        const match = vehicles.find(v => v.active === true && String(v.assignedToName || '').trim().toLowerCase() === supplierName.toLowerCase());
        const vHireEl = document.getElementById('vehicleHireAmount');
        if (match && vHireEl) {
            vHireEl.value = Number(match.defaultHireRate || 2500).toFixed(2);
            updateBillPreview();
        }
    } catch (e) { console.warn('Vehicle hire fetch error:', e); }
}


async function loadBuyingHistory() {
    const body = document.getElementById('buyHistBody');
    if (!body) return;
    const snap = await db.collection('buying_history').where('businessId', '==', SCRAP_BUSINESS_ID).limit(120).get().catch(() => ({ docs: [] }));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    body.innerHTML = rows.slice(0, 50).map((r) => {
        const dt = r.date ? new Date(r.date).toLocaleString() : '-';
        const br = r.loanApplyBreakdown || {};
        const hasBr = br && typeof br === 'object' && ('HAND' in br || 'ADV_LN' in br);
        const la = hasBr
            ? (Number(br.HAND) || 0) + (Number(br.ADV_LN) || 0) + (Number(br.STANDARD) || 0) + (Number(br.INVESTOR_8) || 0)
            : (Number(r.loanDeduction) || 0) + (Number(r.advanceLoanDeduction) || 0);
        const dispAmt = Number(r.billGrandTotal) || (Number(r.totalAmount) || 0) + (Number(r.miscCharges) || 0);
        return `<tr><td>${dt}</td><td>${String(r.supplierName || '-')}</td><td>${String(r.customerType || '-')}</td><td class="num">${(Number(r.totalWeight) || 0).toFixed(2)}</td><td class="num">${fmt(dispAmt)}</td><td class="num">${fmt(r.advanceApplied)}</td><td class="num">${fmt(r.cashPaid)}</td><td class="num small">${la > 0 ? fmt(la) : '—'}</td><td>—</td></tr>`;
    }).join('') || '<tr><td colspan="9">No history</td></tr>';
}
function getCurrentBillLines() {
    syncWeightsFromDom();
    const out = state.items.map((item) => {
        const weight = Number(state.weights[item.id]) || 0;
        if (!weight) return null;
        const unit = buyingPrice(item);
        return { name: item.itemName || '-', weight, unit, amount: weight * unit };
    }).filter(Boolean);
    const misc = miscChargesVal();
    if (misc > 0.0001) {
        out.push({ name: 'වෙනත් අයකිරීම්', weight: null, unit: null, amount: misc, isMisc: true });
    }
    return out;
}
async function printA5Bill() {
    let billTitle = 'DIGIBIZ Scrap';
    let billSub = '';
    try {
        const s = await db.collection('scrap_sms_settings').doc(SCRAP_BUSINESS_ID).get();
        if (s.exists) {
            const d = s.data() || {};
            billTitle = String(d.billPrintTitle || d.businessDisplayName || billTitle).trim() || billTitle;
            billSub = String(d.billPrintSubtitle || d.billPrintPhone || '').trim();
        }
    } catch (_) {}
    const supplier = String(document.getElementById('supplierName').value || '').trim().replace(/</g, '&lt;') || 'TEMPORARY WALK-IN';
    const lines = getCurrentBillLines();
    if (!lines.length) { alert('No bill lines to print.'); return; }
    const itemsSub = lines.filter((x) => !x.isMisc).reduce((s, x) => s + x.amount, 0);
    const miscPart = lines.filter((x) => x.isMisc).reduce((s, x) => s + x.amount, 0);
    const total = itemsSub + miscPart;
    const advBalText = String(document.getElementById('supplierAdvance')?.textContent || '').replace(/[^0-9.]/g,'');
    const advBal = Number(advBalText || 0);
    const requested = Number(document.getElementById('advanceApplyAmount')?.value || 0);
    const applied = Math.min(Math.max(0, requested), Math.max(0, advBal), Math.max(0, total));
    const la = allLoanApplies();
    const loanDeductHand = la.HAND;
    const advLoanDeduct = la.ADV_LN;
    const loanDeductStd = la.STANDARD;
    const loanDeductInv = la.INVESTOR_8;
    const loanSum = totalLoanApply();
    const cashDue = total - applied - loanSum;
    const cashLabel = cashDue < -0.01 ? 'Amount to Receive (Collected)' : 'Final Cash Due';
    const billDtRaw = String(document.getElementById('billDateTime')?.value || '').trim();
    const billDt = billDtRaw ? new Date(billDtRaw).toLocaleString() : new Date().toLocaleString();
    const payMethod = String(document.getElementById('paymentMethod')?.value || 'CASH').toUpperCase();

    const win = window.open('', '_blank');
    if (!win) { alert('Popup blocked.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>A5 Bill</title>
    <style>
      @page { size: A5 portrait; margin: 8mm; }
      body{font-family:Inter,Arial,sans-serif;color:#0f172a;}
      h2{margin:0 0 6px;} .meta{font-size:12px;margin:2px 0;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
      th,td{border:1px solid #0f172a;padding:5px;}
      .r{text-align:right;} .tot{margin-top:6px;font-size:12px;}
      .copy{border:1px solid #0f172a;padding:6px;margin-bottom:8px;}
      .headBar{display:flex;justify-content:space-between;align-items:center;}
      .logo{font-weight:900;font-size:20px;letter-spacing:.8px;}
      .signRow{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .sign{padding-top:18px;border-top:1px solid #111827;font-size:11px;text-align:center;}
    </style></head><body id="a5PrintSheet">
      ${['ORIGINAL COPY','OFFICE COPY'].map((copy)=>`
      <div class="copy">
        <div class="headBar">
          <div class="logo">${billTitle.replace(/</g,'&lt;')}</div>
          <div style="font-size:11px;font-weight:700;">${copy}</div>
        </div>
        ${billSub ? `<div class="meta">${billSub.replace(/</g,'&lt;')}</div>` : ''}
        <div class="meta">Supplier: ${supplier.replace(/</g,'&lt;')}</div>
        <div class="meta">Bill Date/Time: ${billDt}</div>
        <div class="meta">Payment: ${payMethod}</div>
        <table><thead><tr><th>Item</th><th class="r">Weight</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
        <tbody>${lines.map((l)=>`<tr><td>${String(l.name).replace(/</g,'&lt;')}</td><td class="r">${l.isMisc ? '—' : l.weight.toFixed(2)}</td><td class="r">${l.isMisc ? '—' : l.unit.toFixed(2)}</td><td class="r">${l.amount.toFixed(2)}</td></tr>`).join('')}</tbody></table>
        <div class="tot">භාණ්ඩ මුළුව: <b>${fmt(itemsSub)}</b></div>
        ${miscPart > 0.0001 ? `<div class="tot">වෙනත් අයකිරීම්: <b>${fmt(miscPart)}</b></div>` : ''}
        <div class="tot">Bill ගෙවිය යුතු මුළුව: <b>${fmt(total)}</b></div>
        <div class="tot">Advance Deduction: <b>${fmt(applied)}</b></div>
        <div class="tot">Hand loan: <b>${fmt(loanDeductHand)}</b></div>
        <div class="tot">No-interest (ADV-LN): <b>${fmt(advLoanDeduct)}</b></div>
        <div class="tot">Interest (Standard): <b>${fmt(loanDeductStd)}</b></div>
        <div class="tot">Investor (8%): <b>${fmt(loanDeductInv)}</b></div>
        <div class="tot">${cashLabel}: <b>${fmt(cashDue)}</b></div>
        <div class="signRow">
          <div class="sign">Supplier Signature</div>
          <div class="sign">Authorized Signature</div>
        </div>
      </div>`).join('')}
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
}

document.getElementById('saveSessionBtn').addEventListener('click', () => saveBuyingSession('print'));
document.getElementById('whatsappShareBtn')?.addEventListener('click', () => saveBuyingSession('whatsapp'));
function scheduleSupplierRefresh(immediate) {
    if (supplierRefreshTimer) {
        clearTimeout(supplierRefreshTimer);
        supplierRefreshTimer = null;
    }
    const run = () => {
        supplierRefreshTimer = null;
        refreshSupplierBalances().catch((e) => console.warn(e));
    };
    if (immediate) run();
    else supplierRefreshTimer = setTimeout(run, 300);
}
function onSupplierNameChanged(ev) {
    ['advanceApplyAmount', 'apply_HAND', 'apply_ADV_LN', 'apply_STANDARD', 'apply_INVESTOR_8'].forEach(id => {
        const el = document.getElementById(id);
        if (el) delete el.dataset.userEdited;
    });
    const name = (ev && ev.target && ev.target.value) || document.getElementById('supplierName').value || '';
    const immediate = !!(ev && (ev.type === 'change' || ev.type === 'blur'));
    
    // New Customer Detection
    const checkName = name.trim().toLowerCase();
    if (immediate && name.trim() && name.toUpperCase() !== 'TEMPORARY WALK-IN' && !peopleByName[checkName]) {
        showNewCustomerModal(name.trim());
    }


    if (immediate && name.trim() && name.toUpperCase() !== 'TEMPORARY WALK-in') {
        loadDraftForSupplier(name.trim());
    }
    scheduleSupplierRefresh(immediate);
}

function showNewCustomerModal(name) {
    document.getElementById('newCustName').value = name;
    document.getElementById('newCustModal').style.display = 'flex';
}

function closeNewCustModal() {
    document.getElementById('newCustModal').style.display = 'none';
}

async function saveNewCustomer() {
    const name = document.getElementById('newCustName').value.trim();
    const phone = document.getElementById('newCustPhone').value.trim();
    const whatsapp = document.getElementById('newCustWhatsapp').value.trim();
    const address = document.getElementById('newCustAddress').value.trim();
    const type = document.getElementById('newCustType').value;

    if (!name || !phone) {
        alert('කරුණාකර නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
        return;
    }

    try {
        const btn = document.getElementById('saveCustBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const personDoc = {
            fullName: name,
            firstName: name.split(' ')[0],
            mobile: phone,
            whatsapp,
            address,
            type,
            businessId: SCRAP_BUSINESS_ID,
            businessType: 'scrap_collection_center',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use a consistent ID format if possible, or just .add()
        // Standard in this system is businessId_mobile
        const cleanMobile = phone.replace(/[^0-9]/g, '');
        const docId = cleanMobile ? `${SCRAP_BUSINESS_ID}_${cleanMobile}` : null;
        
        if (docId) {
            await db.collection('customers').doc(docId).set(personDoc, { merge: true });
        } else {
            await db.collection('customers').add(personDoc);
        }

        
        // Add to local state
        peopleByName[name.trim().toLowerCase()] = personDoc;

        const list = document.getElementById('supplierList');
        if (list) {
            const opt = document.createElement('option');
            opt.value = name;
            list.appendChild(opt);
        }

        // Send Registration SMS
        if (window.scrapVbaCore && typeof window.scrapVbaCore.enqueuePendingSmsForScrap === 'function') {
            const msg = `You have been successfully registered in our system. Thank you.`;
            await window.scrapVbaCore.enqueuePendingSmsForScrap(phone, msg);
        }

        alert('අලුත් කස්ටමර් සාර්ථකව සේව් කරගත්තා!');
        closeNewCustModal();
    } catch (e) {
        console.error(e);
        alert('Error saving customer: ' + e.message);
    } finally {
        const btn = document.getElementById('saveCustBtn');
        btn.disabled = false;
        btn.textContent = 'Save Customer';
    }
}
document.getElementById('supplierName').addEventListener('input', onSupplierNameChanged);
document.getElementById('supplierName').addEventListener('change', onSupplierNameChanged);
document.getElementById('advanceApplyAmount').addEventListener('input', () => {
    const a = document.getElementById('advanceApplyAmount');
    if (a) a.dataset.userEdited = '1';
    updateBillPreview();
});
document.getElementById('supplierName').addEventListener('focus', (e) => {
    if (String(e.target.value || '').trim().toUpperCase() === 'TEMPORARY WALK-IN') {
        e.target.value = '';
    }
});
document.getElementById('supplierName').addEventListener('blur', (e) => {
    if (!String(e.target.value || '').trim()) {
        e.target.value = 'TEMPORARY WALK-IN';
    }
    onSupplierNameChanged({ type: 'blur' });
});
['apply_HAND', 'apply_ADV_LN', 'apply_STANDARD', 'apply_INVESTOR_8', 'miscChargesAmount'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            if (id.startsWith('apply_')) el.dataset.userEdited = '1';
            updateBillPreview();
        });
    }
});
document.getElementById('printA5Btn').addEventListener('click', () => { printA5Bill().catch((e) => alert(String(e && e.message || e))); });

auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = '/'; return; }
    /** Hand Loans පිටුවට සමාන businessId (getContext: users.businessId + storedBusinessId fallback). */
    let businessId = user.uid;
    if (window.dashboardCore && typeof window.dashboardCore.getContext === 'function') {
        const ctx = await window.dashboardCore.getContext(user);
        businessId = String((ctx && ctx.businessId) || user.uid);
    } else {
        const userDoc = await db.collection('users').doc(user.uid).get();
        businessId = userDoc.exists ? (userDoc.data().businessId || user.uid) : user.uid;
    }
    const bizDoc = await db.collection('businesses').doc(businessId).get();
    const businessType = bizDoc.exists ? String(bizDoc.data().businessType || '').toLowerCase() : '';
    if (businessType !== 'scrap_collection_center') {
        window.location.href = '/modules/core/dashboard.html';
        return;
    }
    SCRAP_BUSINESS_ID = businessId;
    await loadPeople();
    if (!document.getElementById('supplierName').value) {
        document.getElementById('supplierName').value = 'TEMPORARY WALK-IN';
    }
    if (document.getElementById('billDateTime')) {
        const n = new Date();
        n.setSeconds(0,0);
        document.getElementById('billDateTime').value = new Date(n.getTime() - n.getTimezoneOffset()*60000).toISOString().slice(0,16);
    }
    await loadItems();
    await refreshSupplierBalances();
    updateBillPreview();
    await loadBuyingHistory();
    listenToDrafts();
});

// WhatsApp Share Button handled via saveBuyingSession now.
