// src/controllers/paymentController.ts
import { Request, Response } from 'express';

export const handlePayment = async (req: Request, res: Response) => {
  const { loan_id, amount, justification, recorded_by } = req.body;

  try {
    // 1. Logic: Check for "The Gap" (Delinquency)
    // In Python you had scripts; here we do it in a 'Controller'
    const daysSinceLastPay = 10; // This would come from your DB query
    
    let penalty = 0;
    if (daysSinceLastPay > 7) {
      penalty = amount * 0.02; // Apply Policy [2026-01-10]
    }

    // 2. Logic: Create the Immutable Audit Record
    const auditRecord = {
      event: "PAYMENT_RCVD",
      amount,
      penalty_applied: penalty,
      justification,
      admin: recorded_by,
      timestamp: new Date().toISOString()
    };

    // 3. Save to DB (Replacing your old local file saves)
    console.log("Saving to Audit Log:", auditRecord);

    res.status(200).json({ 
      success: true, 
      message: "Payment Audited and Saved",
      penalty_deducted: penalty 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Accounting Engine Error" });
  }
};