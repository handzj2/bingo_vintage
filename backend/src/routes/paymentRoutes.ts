// src/routes/paymentRoutes.ts
import express from 'express';
import { handlePayment } from '../controllers/paymentController';

const router = express.Router();

// The web app will call: POST /api/payments/record
router.post('/record', handlePayment);

export default router;