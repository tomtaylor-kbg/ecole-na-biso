import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import auditLogsRoutes from './routes/auditLogs.js';
import authRoutes from './routes/auth.js';
import balancesRoutes from './routes/balances.js';
import classesRoutes from './routes/classes.js';
import dashboardRoutes from './routes/dashboard.js';
import feesRoutes from './routes/fees.js';
import healthRoutes from './routes/health.js';
import paymentsRoutes from './routes/payments.js';
import printoutsRoutes from './routes/printouts.js';
import schoolYearsRoutes from './routes/schoolYears.js';
import settingsRoutes from './routes/settings.js';
import studentsRoutes from './routes/students.js';
import usersRoutes from './routes/users.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'School Fees API' });
});

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

app.use(requireAuth);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/balances', balancesRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/printouts', printoutsRoutes);
app.use('/api/school-years', schoolYearsRoutes);

app.get('/api/me', (req, res) => {
  res.json({ user: req.user });
});

app.use(notFoundHandler);
app.use(errorHandler);


export default app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
}
