import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private settingsService: SettingsService) {}

  // ── Core send ────────────────────────────────────────────────────────────
  async sendSms(phoneNumber: string, message: string): Promise<{ success: boolean; status: string }> {
    const enabled = await this.settingsService.getSetting('ENABLE_SMS');
    if (enabled !== 'true') {
      this.logger.log(`[SMS DISABLED] To: ${phoneNumber} | Msg: ${message}`);
      return { success: true, status: 'skipped' };
    }

    const phone = this.normalisePhone(phoneNumber);
    if (!phone) {
      this.logger.warn(`Invalid phone number: ${phoneNumber}`);
      return { success: false, status: 'invalid_number' };
    }

    const provider  = (await this.settingsService.getSetting('SMS_PROVIDER')) || 'africas_talking';
    const apiKey    = (await this.settingsService.getSetting('SMS_API_KEY'))  || '';
    const senderId  = (await this.settingsService.getSetting('SMS_SENDER_ID')) || 'BingoVin';

    try {
      if (provider === 'africas_talking') {
        return await this.sendAfricasTalking(phone, message, apiKey, senderId);
      } else if (provider === 'twilio') {
        return await this.sendTwilio(phone, message, apiKey, senderId);
      } else {
        // Stub for other providers
        this.logger.log(`[SMS STUB] Provider: ${provider} | To: ${phone} | Msg: ${message}`);
        return { success: true, status: 'stub' };
      }
    } catch (err: any) {
      this.logger.error(`SMS failed to ${phone}: ${err.message}`);
      return { success: false, status: 'error' };
    }
  }

  // ── Africa's Talking (Uganda primary) ───────────────────────────────────
  private async sendAfricasTalking(phone: string, message: string, apiKey: string, senderId: string) {
    const username = 'sandbox'; // Change to your AT username in production
    const body = new URLSearchParams({
      username, to: phone, message, from: senderId,
    });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey':       apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body: body.toString(),
    });
    const data: any = await res.json();
    const status = data?.SMSMessageData?.Recipients?.[0]?.status || 'unknown';
    this.logger.log(`[AT SMS] ${phone}: ${status}`);
    return { success: res.ok, status };
  }

  // ── Twilio fallback ──────────────────────────────────────────────────────
  private async sendTwilio(phone: string, message: string, apiKey: string, senderId: string) {
    const [accountSid, authToken] = apiKey.split(':');
    const body = new URLSearchParams({ To: phone, From: senderId, Body: message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const data: any = await res.json();
    this.logger.log(`[Twilio SMS] ${phone}: ${data.status}`);
    return { success: res.ok, status: data.status || 'unknown' };
  }

  // ── Template helpers ─────────────────────────────────────────────────────
  async sendPaymentConfirmation(phone: string, clientName: string, amount: number, balance: number, receiptNo: string) {
    const msg = `Bingo Vintage: Payment of UGX ${amount.toLocaleString()} received. Receipt: ${receiptNo}. Remaining balance: UGX ${balance.toLocaleString()}. Thank you!`;
    return this.sendSms(phone, msg);
  }

  async sendLoanApproval(phone: string, clientName: string, loanNumber: string, weeklyAmount: number) {
    const msg = `Bingo Vintage: Dear ${clientName}, your loan ${loanNumber} has been approved. Weekly installment: UGX ${weeklyAmount.toLocaleString()}. Contact us for details.`;
    return this.sendSms(phone, msg);
  }

  async sendOverdueReminder(phone: string, clientName: string, amount: number, daysOverdue: number) {
    const msg = `Bingo Vintage: Dear ${clientName}, your payment of UGX ${amount.toLocaleString()} is ${daysOverdue} day(s) overdue. Please pay urgently to avoid penalties. Call: 0700000000`;
    return this.sendSms(phone, msg);
  }

  async sendDueReminder(phone: string, clientName: string, amount: number, dueDate: string) {
    const msg = `Bingo Vintage: Dear ${clientName}, UGX ${amount.toLocaleString()} is due on ${dueDate}. Please make your payment on time.`;
    return this.sendSms(phone, msg);
  }

  // ── Phone normaliser (Uganda numbers) ───────────────────────────────────
  private normalisePhone(raw: string): string | null {
    if (!raw) return null;
    let p = raw.toString().replace(/\s+/g, '').replace(/[^+\d]/g, '');
    if (p.startsWith('0'))  p = '+256' + p.slice(1);
    if (p.startsWith('256') && !p.startsWith('+')) p = '+' + p;
    if (!p.startsWith('+')) p = '+256' + p;
    return p.length >= 12 ? p : null;
  }
}