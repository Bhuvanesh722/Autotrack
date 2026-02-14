const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, (req, res) => {
    try {
        const totalAssets = db.prepare('SELECT COUNT(*) as count FROM assets').get().count;
        const activeAssets = db.prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'In Use'").get().count;
        const underRepair = db.prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'Under Repair'").get().count;
        const retiredAssets = db.prepare("SELECT COUNT(*) as count FROM assets WHERE status = 'Retired'").get().count;
        const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
        const activeEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status = 'Active'").get().count;
        const totalParts = db.prepare('SELECT COUNT(*) as count FROM asset_parts').get().count;
        const faultyParts = db.prepare("SELECT COUNT(*) as count FROM asset_parts WHERE status = 'Faulty'").get().count;

        // Monthly costs
        const now = new Date();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        const currentYear = String(now.getFullYear());

        const monthlyMaintCost = db.prepare(`
      SELECT COALESCE(SUM(cost), 0) as total FROM maintenance_records 
      WHERE strftime('%m', service_date) = ? AND strftime('%Y', service_date) = ?
    `).get(currentMonth, currentYear).total;

        const monthlyPayroll = db.prepare(`
      SELECT COALESCE(SUM(net_salary), 0) as total FROM payroll 
      WHERE month = ? AND year = ?
    `).get(parseInt(currentMonth), parseInt(currentYear)).total;

        const totalAssetValue = db.prepare('SELECT COALESCE(SUM(purchase_cost), 0) as total FROM assets').get().total;
        const totalMaintenanceCost = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM maintenance_records').get().total;

        res.json({
            assets: { total: totalAssets, active: activeAssets, under_repair: underRepair, retired: retiredAssets },
            employees: { total: totalEmployees, active: activeEmployees },
            parts: { total: totalParts, faulty: faultyParts },
            costs: {
                total_asset_value: totalAssetValue,
                total_maintenance_cost: totalMaintenanceCost,
                monthly_maintenance: monthlyMaintCost,
                monthly_payroll: monthlyPayroll,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/asset-distribution
router.get('/asset-distribution', authenticate, (req, res) => {
    try {
        const byType = db.prepare('SELECT asset_type as name, COUNT(*) as value FROM assets GROUP BY asset_type').all();
        const byStatus = db.prepare('SELECT status as name, COUNT(*) as value FROM assets GROUP BY status').all();
        res.json({ by_type: byType, by_status: byStatus });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/cost-trends
router.get('/cost-trends', authenticate, (req, res) => {
    try {
        // Last 12 months maintenance costs
        const maintenanceTrends = db.prepare(`
      SELECT strftime('%Y-%m', service_date) as period, 
             SUM(cost) as maintenance_cost 
      FROM maintenance_records 
      WHERE service_date >= date('now', '-12 months')
      GROUP BY period ORDER BY period
    `).all();

        // Last 12 months payroll costs
        const payrollTrends = db.prepare(`
      SELECT (year || '-' || printf('%02d', month)) as period,
             SUM(net_salary) as payroll_cost
      FROM payroll 
      GROUP BY period ORDER BY period
    `).all();

        // Merge into combined trend data
        const periodMap = {};
        maintenanceTrends.forEach(m => {
            periodMap[m.period] = { period: m.period, maintenance: m.maintenance_cost, payroll: 0 };
        });
        payrollTrends.forEach(p => {
            if (periodMap[p.period]) {
                periodMap[p.period].payroll = p.payroll_cost;
            } else {
                periodMap[p.period] = { period: p.period, maintenance: 0, payroll: p.payroll_cost };
            }
        });

        const trends = Object.values(periodMap).sort((a, b) => a.period.localeCompare(b.period));
        res.json(trends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/recent-activities
router.get('/recent-activities', authenticate, (req, res) => {
    try {
        const activities = [];

        // Recent maintenance
        const recentMaint = db.prepare(`
      SELECT m.id, 'maintenance' as type, m.service_type as title, 
             m.description, m.service_date as date, m.cost,
             a.asset_name, a.asset_code
      FROM maintenance_records m JOIN assets a ON m.asset_id = a.id
      ORDER BY m.created_at DESC LIMIT 5
    `).all();
        activities.push(...recentMaint.map(m => ({
            ...m, icon: '🔧',
            summary: `${m.service_type} on ${m.asset_name} (${m.asset_code}) - ₹${m.cost}`
        })));

        // Recent part changes
        const recentParts = db.prepare(`
      SELECT ph.id, 'part' as type, ph.action as title,
             ph.description, ph.created_at as date,
             a.asset_name, a.asset_code
      FROM part_history ph JOIN assets a ON ph.asset_id = a.id
      ORDER BY ph.created_at DESC LIMIT 5
    `).all();
        activities.push(...recentParts.map(p => ({
            ...p, icon: '⚙️',
            summary: `${p.action}: ${p.description}`
        })));

        // Sort all by date desc
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(activities.slice(0, 10));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/upcoming-services
router.get('/upcoming-services', authenticate, (req, res) => {
    try {
        const upcoming = db.prepare(`
      SELECT m.id, m.next_service_due, m.service_type, m.asset_id,
             a.asset_name, a.asset_code, a.asset_type
      FROM maintenance_records m JOIN assets a ON m.asset_id = a.id
      WHERE m.next_service_due IS NOT NULL AND m.next_service_due >= date('now')
      GROUP BY m.asset_id
      HAVING m.service_date = MAX(m.service_date)
      ORDER BY m.next_service_due ASC LIMIT 10
    `).all();
        res.json(upcoming);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/reports/assets
router.get('/reports/assets', authenticate, (req, res) => {
    try {
        const assetCosts = db.prepare(`
      SELECT a.id, a.asset_code, a.asset_name, a.asset_type, a.purchase_cost,
             COALESCE(SUM(m.cost),0) as total_maintenance_cost,
             COUNT(m.id) as service_count,
             (SELECT COUNT(*) FROM asset_parts WHERE asset_id = a.id) as parts_count,
             (SELECT COUNT(*) FROM asset_parts WHERE asset_id = a.id AND status = 'Replaced') as replaced_parts
      FROM assets a LEFT JOIN maintenance_records m ON a.id = m.asset_id
      GROUP BY a.id ORDER BY total_maintenance_cost DESC
    `).all();

        const partReplacements = db.prepare(`
      SELECT ap.part_name, ap.brand, COUNT(ph.id) as change_count,
             a.asset_name, a.asset_code
      FROM part_history ph 
      JOIN asset_parts ap ON ph.part_id = ap.id
      JOIN assets a ON ph.asset_id = a.id
      WHERE ph.action IN ('Replaced', 'Status Changed', 'Replaced Previous')
      GROUP BY ap.part_name, a.id
      ORDER BY change_count DESC LIMIT 20
    `).all();

        res.json({ asset_costs: assetCosts, part_replacements: partReplacements });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/reports/payroll
router.get('/reports/payroll', authenticate, (req, res) => {
    try {
        const monthlyCosts = db.prepare(`
      SELECT month, year, SUM(net_salary) as total_net, SUM(gross_salary) as total_gross,
             SUM(total_deductions) as total_deductions, SUM(overtime_pay) as total_overtime,
             COUNT(*) as employee_count
      FROM payroll GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 12
    `).all();

        const employeeSalaries = db.prepare(`
      SELECT p.*, e.name as employee_name, e.employee_id as employee_code, e.department
      FROM payroll p JOIN employees e ON p.employee_id = e.id
      ORDER BY p.year DESC, p.month DESC, p.net_salary DESC
    `).all();

        res.json({ monthly_costs: monthlyCosts, employee_salaries: employeeSalaries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
