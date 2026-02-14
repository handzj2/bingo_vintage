import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDaily(dateString?: string): Promise<{
        date: Date;
        total_collected: number;
        transaction_count: number;
        method_breakdown: any;
        new_loans: number;
    }>;
    getArrears(): Promise<{
        report_date: Date;
        total_loans_in_arrears: number;
        total_overdue_amount: any;
        arrears_loans: any[];
    }>;
}
