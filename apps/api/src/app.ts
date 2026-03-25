import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import proposalRoutes from './routes/proposals';
import budgetRoutes from './routes/budgets';
import goalRoutes from './routes/goals';
import alertRoutes from './routes/alerts';
import memberRoutes from './routes/members';
import { startAlertEngine } from './services/alertEngine';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', expenseRoutes);
app.use('/api/groups', proposalRoutes);
app.use('/api/groups', budgetRoutes);
app.use('/api/groups', goalRoutes);
app.use('/api/groups', alertRoutes);
app.use('/api/groups', memberRoutes);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`GrupoFinanzas API running on port ${PORT}`);
  startAlertEngine();
});

export default app;
