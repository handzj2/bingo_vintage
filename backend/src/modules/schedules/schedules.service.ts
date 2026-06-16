// patch 2026-06-16: removed ::schedule_status_enum casts — production enum is loan_schedules_status_enum
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanSchedule } from './entities/schedule.entity';
import { LoanAlert } from './entities/alert.entity';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(LoanSchedule) private scheduleRepo: Repository<LoanSchedule>,
    @InjectRepository(LoanAlert)    private alertRepo:    Repository<LoanAlert>,
    @InjectRepository(Loan)         private loanRepo:     Repository<Loan>,
  ) {}

  // ── Get schedule rows for one loan ────────────────────────────────────────
  async getLoanSchedule(loanId: number) {
    const today = new Date().toISOString().slice(0, 10);

    // Schedule rows — join most recent COMPLETED payment per schedule row
    const rows = await this.scheduleRepo.manager.query(
      `SELECT ls.*,
              p.receipt_number,
              p.payment_method,
              p.created_at AS paid_date
         FROM loan_schedules ls
         LEFT JOIN LATERAL (
           SELECT receipt_number, payment_method, created_at
             FROM payments
            WHERE schedule_id = ls.id
              AND status = 'COMPLETED'
            ORDER BY created_at DESC
            LIMIT 1
         ) p ON true
        WHERE ls.loan_id = $1
        ORDER BY ls.installment_number ASC`,
      [loanId],
    );

    // Mark which row is due today
    const rowsWithToday = rows.map((r: any) => ({
      ...r,
      is_today: r.due_date && String(r.due_date).slice(0, 10) === today,
    }));

    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['client', 'bike'],
    });

    // ── Total paid: sum ALL completed payments for this loan (not just schedule-linked ones) ──
    const [payRow] = await this.scheduleRepo.manager.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
         FROM payments
        WHERE loan_id = $1
          AND status  = 'COMPLETED'
          AND reversed_at IS NULL`,
      [loanId],
    );
    const realTotalPaid = Math.round(Number(payRow?.total_paid || 0));

    const totalDue      = rowsWithToday.reduce((s: number, r: any) => s + Number(r.amount_due  || 0), 0);
    const paidCount     = rowsWithToday.filter((r: any) => r.status === 'PAID').length;
    const partialCount  = rowsWithToday.filter((r: any) => r.status === 'PARTIAL').length;
    const overdueCount  = rowsWithToday.filter((r: any) => r.status === 'OVERDUE').length;
    const upcomingCount = rowsWithToday.filter((r: any) => ['PENDING','PARTIAL'].includes(r.status)).length;
    const nextDue       = rowsWithToday.find((r: any) => ['PENDING','PARTIAL','OVERDUE'].includes(r.status));

    // ── Client name: try relation first, fall back to raw SQL join ───────────
    let clientName  = 'Unknown Client';
    let clientPhone: string | null = null;
    let bikePlate:   string | null = null;

    if (loan?.client) {
      const fn = loan.client.firstName ?? (loan.client as any).first_name ?? '';
      const ln = loan.client.lastName  ?? (loan.client as any).last_name  ?? '';
      clientName  = `${fn} ${ln}`.trim() || 'Unknown Client';
      clientPhone = loan.client.phone ?? (loan.client as any).phone_number ?? null;
    } else {
      // Relation failed — fetch directly from DB
      const [clientRow] = await this.scheduleRepo.manager.query(
        `SELECT c.first_name, c.last_name, c.phone
           FROM loans l
           JOIN clients c ON c.id = l.client_id
          WHERE l.id = $1`,
        [loanId],
      );
      if (clientRow) {
        clientName  = `${clientRow.first_name || ''} ${clientRow.last_name || ''}`.trim() || 'Unknown Client';
        clientPhone = clientRow.phone ?? null;
      }
    }

    if (loan?.bike) {
      // FIXED: use the correct property name registration_number (defined in Bike entity)
      bikePlate = loan.bike.registration_number ?? null;
    } else if (loan) {
      // Try raw SQL for bike plate too
      const [bikeRow] = await this.scheduleRepo.manager.query(
        `SELECT b.registration_number
           FROM loans l
           LEFT JOIN bikes b ON b.id = l.bike_id
          WHERE l.id = $1`,
        [loanId],
      );
      bikePlate = bikeRow?.registration_number ?? null;
    }

    const loanOut = loan ? {
      id:          loan.id,
      loanNumber:  loan.loanNumber,
      loan_number: loan.loanNumber,
      loanType:    loan.loanType,
      loan_type:   loan.loanType,
      balance:     loan.balance,
      totalAmount: loan.totalAmount,
      total_amount: loan.totalAmount,
      status:      loan.status,
      startDate:   loan.startDate,
      // ── Computed flat fields the schedule page needs ──
      clientName,
      clientPhone,
      bikePlate,
    } : null;

    return {
      loan: loanOut,
      schedules: rowsWithToday,
      summary: {
        totalInstallments: rowsWithToday.length,
        paidCount, partialCount, overdueCount, upcomingCount,
        totalPaid:     realTotalPaid,
        totalDue:      Math.round(totalDue),
        outstanding:   Math.round(Math.max(0, Number(loan?.balance ?? 0))),
        progressPct:   totalDue > 0 ? Math.round((realTotalPaid / totalDue) * 100) : 0,
        nextDueDate:   nextDue?.due_date || null,
        nextDueAmount: nextDue ? Number(nextDue.amount_due) - Number(nextDue.amount_paid || 0) : 0,
      },
    };
  }

  // ── Overdue scan — run nightly ────────────────────────────────────────────
  // Marks PENDING schedules past due date as OVERDUE
  // Marks loans with overdue schedules as DELINQUENT
  // Creates alert records for new overdues
  async runOverdueScan(graceDays: number = 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // 1. Flip PENDING → OVERDUE
    const updated = await this.scheduleRepo.manager.query(
      `UPDATE loan_schedules
          SET status     = 'OVERDUE',
              updated_at = now()
        WHERE status   = 'PENDING'
          AND due_date < $1
        RETURNING id, loan_id, due_date, amount_due, amount_paid`,
      [cutoffStr],
    );

    // 2. Flip PARTIAL that is also past due to OVERDUE (still owes money)
    await this.scheduleRepo.manager.query(
      `UPDATE loan_schedules
          SET status     = 'OVERDUE',
              updated_at = now()
        WHERE status   = 'PARTIAL'
          AND due_date < $1
          AND amount_paid < amount_due`,
      [cutoffStr],
    );

    // 3. Mark loans DELINQUENT if any overdue schedule exists
    await this.loanRepo.manager.query(
      `UPDATE loans l
          SET status     = 'DELINQUENT',
              updated_at = now()
        WHERE l.status = 'ACTIVE'
          AND EXISTS (
            SELECT 1 FROM loan_schedules ls
             WHERE ls.loan_id = l.id
               AND ls.status  = 'OVERDUE'
          )`,
    );

    // 4. Create alert records for newly overdue schedules (skip if alert already exists)
    for (const row of updated) {
      const existing = await this.alertRepo.findOne({
        where: { loanId: row.loan_id, scheduleId: row.id, alertType: 'OVERDUE' },
      });
      if (existing) continue;

      const today     = new Date();
      const dueDate   = new Date(row.due_date);
      const daysOver  = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const remaining = Number(row.amount_due) - Number(row.amount_paid || 0);

      await this.alertRepo.save(
        this.alertRepo.create({
          loanId:     row.loan_id,
          scheduleId: row.id,
          alertType:  'OVERDUE',
          severity:   daysOver > 14 ? 'critical' : daysOver > 7 ? 'high' : 'medium',
          title:      `Payment Overdue – ${daysOver} day(s)`,
          message:    `Installment due ${row.due_date} is overdue by ${daysOver} day(s). Amount outstanding: UGX ${Math.round(remaining).toLocaleString()}`,
          daysOverdue: daysOver,
          amountDue:   remaining,
        }),
      );
    }

    // 5. Create DUE_TODAY alerts
    const todayStr = new Date().toISOString().slice(0, 10);
    const dueToday = await this.scheduleRepo.manager.query(
      `SELECT ls.id, ls.loan_id, ls.amount_due, ls.amount_paid
         FROM loan_schedules ls
        WHERE ls.due_date = $1
          AND ls.status IN ('PENDING','PARTIAL')`,
      [todayStr],
    );
    for (const row of dueToday) {
      const existing = await this.alertRepo.findOne({
        where: { loanId: row.loan_id, scheduleId: row.id, alertType: 'DUE_TODAY' },
      });
      if (existing) continue;
      const remaining = Number(row.amount_due) - Number(row.amount_paid || 0);
      await this.alertRepo.save(
        this.alertRepo.create({
          loanId: row.loan_id, scheduleId: row.id,
          alertType: 'DUE_TODAY', severity: 'high',
          title: 'Payment Due Today',
          message: `UGX ${Math.round(remaining).toLocaleString()} is due today.`,
          daysOverdue: 0, amountDue: remaining,
        }),
      );
    }

    this.logger.log(`Overdue scan: ${updated.length} schedules flipped to OVERDUE, ${dueToday.length} DUE_TODAY alerts created`);
    return { overdueFlipped: updated.length, dueTodayAlerts: dueToday.length };
  }

  // ── Get all alerts ────────────────────────────────────────────────────────
  async getAlerts(filters: { type?: string; severity?: string; unreadOnly?: boolean } = {}) {
    let q = `
      SELECT a.*,
             l.loan_number, l.balance,
             c.first_name, c.last_name, c.phone
        FROM loan_alerts a
        JOIN loans   l ON l.id = a.loan_id
        JOIN clients c ON c.id = l.client_id
       WHERE a.is_resolved = false
    `;
    const params: any[] = [];

    if (filters.type) {
      params.push(filters.type);
      q += ` AND a.alert_type = $${params.length}`;
    }
    if (filters.severity) {
      params.push(filters.severity);
      q += ` AND a.severity = $${params.length}`;
    }
    if (filters.unreadOnly) {
      q += ` AND a.is_read = false`;
    }
    q += ` ORDER BY a.created_at DESC LIMIT 200`;

    const rows = await this.alertRepo.manager.query(q, params);
    return rows.map((r: any) => ({
      ...r,
      clientName: `${r.first_name} ${r.last_name}`.trim(),
    }));
  }

  async getAlertSummary() {
    const [row] = await this.alertRepo.manager.query(
      `SELECT
         COUNT(*)                                   AS total,
         COUNT(*) FILTER (WHERE is_read = false)    AS unread,
         COUNT(*) FILTER (WHERE alert_type = 'OVERDUE')   AS overdue,
         COUNT(*) FILTER (WHERE alert_type = 'DUE_TODAY') AS due_today,
         COUNT(*) FILTER (WHERE severity   = 'critical')  AS critical,
         SUM(amount_due)                            AS total_at_risk
       FROM loan_alerts
       WHERE is_resolved = false`,
    );
    return {
      total:       Number(row.total),
      unread:      Number(row.unread),
      overdue:     Number(row.overdue),
      dueToday:    Number(row.due_today),
      critical:    Number(row.critical),
      totalAtRisk: Math.round(Number(row.total_at_risk || 0)),
    };
  }

  async markAlertRead(id: number) {
    await this.alertRepo.update(id, { isRead: true });
    return { success: true };
  }

  async markAllRead() {
    await this.alertRepo.update({ isRead: false }, { isRead: true });
    return { success: true };
  }

  async resolveAlert(id: number, resolvedBy: string) {
    await this.alertRepo.update(id, { isResolved: true, resolvedAt: new Date(), resolvedBy });
    return { success: true };
  }
}