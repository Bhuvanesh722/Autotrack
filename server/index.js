const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const partsRoutes = require('./routes/parts');
const maintenanceRoutes = require('./routes/maintenance');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const dashboardRoutes = require('./routes/dashboard');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/assets', partsRoutes);  // Parts are nested under assets
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'AutoTrack API', timestamp: new Date().toISOString() });
});

// Run seed on first start
const db = require('./db');
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
    console.log('First run detected. Seeding database...');
    require('./seed');
}

app.listen(PORT, () => {
    console.log(`\n🚗 AutoTrack API Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
