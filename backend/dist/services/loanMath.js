"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWeeklySchedule = calculateWeeklySchedule;
function calculateWeeklySchedule(principal, rate, weeks) {
    const scheduleArray = [];
    let remainingBalance = principal;
    for (let i = 1; i <= weeks; i++) {
        const interest = remainingBalance * (rate / 100);
        scheduleArray.push({
            week: i,
            interest: Number(interest.toFixed(2)),
            balance: Number(remainingBalance.toFixed(2))
        });
    }
    return scheduleArray;
}
//# sourceMappingURL=loanMath.js.map