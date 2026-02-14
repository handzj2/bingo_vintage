// src/server.ts
import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/paymentRoutes';

const app = express();
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Bingo Backend running on http://localhost:${PORT}`);
});