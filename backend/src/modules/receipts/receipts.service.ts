import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
  ) {}

  async getReceiptData(receiptNumber: string) {
    const payment = await this.paymentRepo.findOne({
      where: { receiptNumber },
      relations: ['loan', 'loan.client'],
    });

    if (!payment) throw new NotFoundException('Receipt not found');
    
    // 🛑 Block receipt viewing for reversed transactions
    if (payment.status === PaymentStatus.REVERSED) {
      throw new BadRequestException('This transaction was reversed and the receipt is void.');
    }

    // ✅ FIXED: Using firstName and lastName (camelCase) to match your Entity property names
    return {
      receipt_no: payment.receiptNumber,
      date: payment.paymentDate,
      client_name: `${payment.loan.client.firstName} ${payment.loan.client.lastName}`,
      amount: payment.amountPaid,
      balance_remaining: payment.loan.balance,
      collected_by: payment.collectedBy,
      status: payment.status,
    };
  }
}