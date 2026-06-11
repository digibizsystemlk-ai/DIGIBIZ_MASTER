/**
 * Refined Weekly Loan Logic for Scrap Business
 * 
 * Features:
 * - 10% Monthly Interest (fixed upfront)
 * - Preferred Payment Day selection
 * - Pro-rata First Installment
 * - 10% Daily Compound Interest on Overdue installments
 */

window.WeeklyLoanCore = (function() {
    const MONTHLY_RATE = 0.10;
    const DAILY_OVERDUE_RATE = 0.10;

    return {
        /**
         * Calculate loan breakdown
         */
        calculateLoanBasis(principal, months) {
            const p = Number(principal) || 0;
            const m = Number(months) || 0;
            const totalInterest = p * MONTHLY_RATE * m;
            const totalPayable = p + totalInterest;
            const totalWeeks = m * 4; // Simplified as per user example (2 months = 8 weeks)
            const standardWeekly = totalPayable / totalWeeks;

            return {
                principal: p,
                months: m,
                totalInterest,
                totalPayable,
                totalWeeks,
                standardWeekly: Math.round(standardWeekly * 100) / 100
            };
        },

        /**
         * Get days until the next preferred day
         * @param {string} startDateStr 
         * @param {number} preferredDay 0 (Sun) - 6 (Sat)
         */
        getDaysUntilPreferred(startDateStr, preferredDay) {
            const start = new Date(startDateStr);
            const startDay = start.getDay();
            
            // If preferredDay is 5 (Fri) and startDay is 3 (Wed), diff is 2.
            // If preferredDay is 2 (Tue) and startDay is 3 (Wed), diff is 6.
            let diff = preferredDay - startDay;
            if (diff <= 0) diff += 7; // Ensure it's in the future
            return diff;
        },

        /**
         * Generate a strict schedule based on preferred day and pro-rata
         */
        generateSchedule(principal, months, startDateStr, preferredDay) {
            const basis = this.calculateLoanBasis(principal, months);
            const daysToFirst = this.getDaysUntilPreferred(startDateStr, preferredDay);
            
            const schedule = [];
            let current = new Date(startDateStr);
            
            // First Installment (Pro-rata)
            current.setDate(current.getDate() + daysToFirst);
            const firstAmt = (basis.standardWeekly / 7) * daysToFirst;
            
            schedule.push({
                installmentNo: 1,
                dueDate: current.toISOString().split('T')[0],
                amount: Math.round(firstAmt * 100) / 100,
                paidAmount: 0,
                overdueInterest: 0,
                status: 'PENDING',
                isProRata: daysToFirst < 7
            });

            // Subsequent Installments (Full)
            // Note: If we had a pro-rata first week, do we still do 'totalWeeks' number of installments?
            // User's example: 8 weeks for 2 months. 
            // We'll do totalWeeks installments.
            for (let i = 2; i <= basis.totalWeeks; i++) {
                current.setDate(current.getDate() + 7);
                schedule.push({
                    installmentNo: i,
                    dueDate: current.toISOString().split('T')[0],
                    amount: basis.standardWeekly,
                    paidAmount: 0,
                    overdueInterest: 0,
                    status: 'PENDING',
                    isProRata: false
                });
            }

            // Adjustment: If pro-rata made the total less than basis.totalPayable,
            // we should probably adjust the last installment to ensure full recovery.
            const scheduledTotal = schedule.reduce((s, inst) => s + inst.amount, 0);
            const diff = basis.totalPayable - scheduledTotal;
            if (Math.abs(diff) > 0.01) {
                schedule[schedule.length - 1].amount = Math.round((schedule[schedule.length - 1].amount + diff) * 100) / 100;
            }

            return {
                ...basis,
                startDate: startDateStr,
                preferredDay,
                schedule,
                totalPayable: Math.round(schedule.reduce((s, i) => s + i.amount, 0) * 100) / 100
            };
        },

        /**
         * Calculate daily compound interest based on 10% monthly rate (compounded daily at 10%/30 per day)
         */
        calculateOverduePenalty(unpaidAmount, daysOverdue) {
            if (daysOverdue <= 0) return 0;
            // Daily rate is 10% / 30
            const dailyRate = MONTHLY_RATE / 30;
            const totalWithPenalty = unpaidAmount * Math.pow(1 + dailyRate, daysOverdue);
            return totalWithPenalty - unpaidAmount;
        },

        /**
         * Refresh statuses
         */
        refreshScheduleStatus(loanData, todayStr = new Date().toISOString().split('T')[0]) {
            const today = new Date(todayStr);
            let totalOverdueInterest = 0;

            loanData.schedule.forEach(inst => {
                inst.daysOverdue = 0; // Initialize default daysOverdue
                if (inst.status === 'PAID') return;

                const dueDate = new Date(inst.dueDate);
                if (today > dueDate) {
                    const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    const unpaid = inst.amount - (inst.paidAmount || 0);
                    if (unpaid > 0) {
                        inst.daysOverdue = daysDiff;
                        inst.overdueInterest = this.calculateOverduePenalty(unpaid, daysDiff);
                        inst.status = 'OVERDUE';
                        totalOverdueInterest += inst.overdueInterest;
                    }
                } else {
                    inst.status = 'PENDING';
                }
            });

            loanData.totalOverdueInterest = Math.round(totalOverdueInterest * 100) / 100;
            return loanData;
        }
    };
})();
