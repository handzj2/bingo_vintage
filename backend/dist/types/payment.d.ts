export interface RepaymentPayload {
    loan_id: string;
    amount: number;
    payment_method: 'cash' | 'momo' | 'bank';
    justification: string;
    recorded_by: string;
}
