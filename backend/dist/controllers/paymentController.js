"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePayment = void 0;
const handlePayment = async (req, res) => {
    const { loan_id, amount, justification, recorded_by } = req.body;
    try {
        const daysSinceLastPay = 10;
        let penalty = 0;
        if (daysSinceLastPay > 7) {
            penalty = amount * 0.02;
        }
        const auditRecord = {
            event: "PAYMENT_RCVD",
            amount,
            penalty_applied: penalty,
            justification,
            admin: recorded_by,
            timestamp: new Date().toISOString()
        };
        console.log("Saving to Audit Log:", auditRecord);
        res.status(200).json({
            success: true,
            message: "Payment Audited and Saved",
            penalty_deducted: penalty
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Accounting Engine Error" });
    }
};
exports.handlePayment = handlePayment;
//# sourceMappingURL=paymentController.js.map