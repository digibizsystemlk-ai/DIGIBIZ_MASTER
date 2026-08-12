/**
 * Daily Loan Logic for Scrap Business
 * 
 * Features:
 * - 10% Monthly Interest calculated on remaining principal balance
 * - Open-ended (no 30 days limit)
 * - Track principalOutstanding and interestOutstanding separately
 */

window.DailyLoanCore = (function() {
    const MONTHLY_RATE = 0.10;

    function getDaysBetween(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1 + 'T00:00:00Z');
        const d2 = new Date(dateStr2 + 'T00:00:00Z');
        const diffMs = d2.getTime() - d1.getTime();
        return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
        getDaysBetween,

        refreshDailyLoanAccruedInterest(loan, todayStr = new Date().toISOString().split('T')[0]) {
            let principal = Number(loan.principalOutstanding);
            let interest = loan.noInterest === true ? 0 : Number(loan.interestOutstanding);
            
            if (isNaN(principal) || loan.principalOutstanding === undefined) {
                // Legacy support: Map old schedule-based loan to outstanding model
                const pAmt = Number(loan.principalAmount || 0);
                const iAmt = Number(loan.interestAmount || 0);
                const totPay = pAmt + iAmt;
                const paid = Number(loan.totalPaid || 0);
                if (totPay > 0) {
                    const piRatio = pAmt / totPay;
                    const paidPrincipal = paid * piRatio;
                    const paidInterest = paid * (1 - piRatio);
                    principal = Math.max(0, pAmt - paidPrincipal);
                    interest = loan.noInterest === true ? 0 : Math.max(0, iAmt - paidInterest);
                } else {
                    principal = Number(loan.balance || 0);
                    interest = 0;
                }
            }
            
            const lastCalc = loan.lastInterestCalcAt || loan.date || todayStr;
            const diffDays = getDaysBetween(lastCalc, todayStr);
            let accrued = 0;
            if (loan.noInterest !== true && diffDays > 0 && principal > 0.01) {
                const dailyRate = MONTHLY_RATE / 30;
                accrued = Math.round((principal * dailyRate * diffDays) * 100) / 100;
                interest += accrued;
            }
            
            const balance = Math.round((principal + interest) * 100) / 100;
            
            return {
                ...loan,
                principalOutstanding: Math.round(principal * 100) / 100,
                interestOutstanding: Math.round(interest * 100) / 100,
                accruedInterestThisPeriod: accrued,
                balance,
                lastInterestCalcAt: todayStr
            };
        }
    };
})();
