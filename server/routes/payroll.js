const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// === Salary Structure ===

// GET /api/payroll/salary-structure/:employeeId
router.get('/salary-structure/:employeeId', authenticate, (req, res) => {
    try {
        const structure = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(req.params.employeeId);
        res.json(structure || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/payroll/salary-structure/:employeeId
router.put('/salary-structure/:employeeId', authenticate, requireRole('manager'), (req, res) => {
    try {
        const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.employeeId);
        if (!emp) return res.status(404).json({ error: 'Employee not found.' });

        const { basic_salary, hra, transport_allowance, medical_allowance, other_allowances, pf_deduction, tax_deduction, other_deductions, overtime_rate, effective_from } = req.body;

        const existing = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(req.params.employeeId);

        if (existing) {
            db.prepare(`UPDATE salary_structures SET basic_salary=?, hra=?, transport_allowance=?, medical_allowance=?, other_allowances=?, pf_deduction=?, tax_deduction=?, other_deductions=?, overtime_rate=?, effective_from=?, updated_at=datetime('now') WHERE id=?`).run(
                basic_salary ?? existing.basic_salary, hra ?? existing.hra,
                transport_allowance ?? existing.transport_allowance,
                medical_allowance ?? existing.medical_allowance,
                other_allowances ?? existing.other_allowances,
                pf_deduction ?? existing.pf_deduction, tax_deduction ?? existing.tax_deduction,
                other_deductions ?? existing.other_deductions, overtime_rate ?? existing.overtime_rate,
                effective_from || existing.effective_from, existing.id
            );
        } else {
            const bs = basic_salary || emp.base_salary || 0;
            db.prepare(`INSERT INTO salary_structures (id, employee_id, basic_salary, hra, transport_allowance, medical_allowance, other_allowances, pf_deduction, tax_deduction, other_deductions, overtime_rate, effective_from) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
                uuidv4(), req.params.employeeId, bs, hra || 0, transport_allowance || 0,
                medical_allowance || 0, other_allowances || 0, pf_deduction || 0,
                tax_deduction || 0, other_deductions || 0, overtime_rate || 0,
                effective_from || new Date().toISOString().split('T')[0]
            );
        }

        const structure = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(req.params.employeeId);
        res.json(structure);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === Attendance ===

// GET /api/payroll/attendance
router.get('/attendance', authenticate, (req, res) => {
    try {
        const { employee_id, month, year } = req.query;
        let query = `SELECT a.*, e.name as employee_name, e.employee_id as employee_code
                 FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE 1=1`;
        const params = [];
        if (employee_id) { query += ' AND a.employee_id = ?'; params.push(employee_id); }
        if (month && year) {
            query += " AND strftime('%m', a.date) = ? AND strftime('%Y', a.date) = ?";
            params.push(String(month).padStart(2, '0'), String(year));
        }
        query += ' ORDER BY a.date DESC LIMIT 500';
        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payroll/attendance
router.post('/attendance', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { employee_id, date, status, check_in, check_out, overtime_hours, notes } = req.body;
        if (!employee_id || !date) return res.status(400).json({ error: 'Employee and date are required.' });

        const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
        if (!emp) return res.status(404).json({ error: 'Employee not found.' });

        const id = uuidv4();
        db.prepare(`INSERT INTO attendance (id, employee_id, date, status, check_in, check_out, overtime_hours, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
            id, employee_id, date, status || 'Present', check_in || null,
            check_out || null, overtime_hours || 0, notes || null
        );
        const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
        res.status(201).json(record);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Attendance already logged for this date.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// === Payroll Processing ===

// GET /api/payroll/records
router.get('/records', authenticate, (req, res) => {
    try {
        const { month, year } = req.query;
        let query = `SELECT p.*, e.name as employee_name, e.employee_id as employee_code
                 FROM payroll p JOIN employees e ON p.employee_id = e.id WHERE 1=1`;
        const params = [];
        if (month) { query += ' AND p.month = ?'; params.push(parseInt(month)); }
        if (year) { query += ' AND p.year = ?'; params.push(parseInt(year)); }
        query += ' ORDER BY p.generated_at DESC';
        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payroll/generate-payslip - ONE CLICK PAYSLIP
router.post('/generate-payslip', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { emp_id, month, year } = req.body;
        if (!emp_id) return res.status(400).json({ error: 'Employee ID (emp_id) is required.' });

        // Get current month/year if not provided
        const now = new Date();
        const targetMonth = month || (now.getMonth() + 1);
        const targetYear = year || now.getFullYear();

        // Find employee by employee_id code (e.g. EMP001)
        const employee = db.prepare('SELECT * FROM employees WHERE employee_id = ? OR id = ?').get(emp_id, emp_id);
        if (!employee) return res.status(404).json({ error: `Employee not found with ID: ${emp_id}` });

        // Get salary structure
        const salary = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(employee.id);
        if (!salary) return res.status(400).json({ error: 'No salary structure found for this employee. Please set up salary first.' });

        // Calculate attendance for the month
        const attendanceRecords = db.prepare(`
      SELECT * FROM attendance WHERE employee_id = ? 
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `).all(employee.id, String(targetMonth).padStart(2, '0'), String(targetYear));

        const presentDays = attendanceRecords.filter(a => a.status === 'Present').length;
        const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
        const totalOvertimeHours = attendanceRecords.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

        // Calculate working days in the month (excluding Sundays)
        const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
        let workingDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const day = new Date(targetYear, targetMonth - 1, d).getDay();
            if (day !== 0) workingDays++;
        }

        const effectiveDays = presentDays + (halfDays * 0.5);

        // Calculate salary
        const dailyRate = salary.basic_salary / workingDays;
        const earnedBasic = Math.round(dailyRate * effectiveDays);
        const totalAllowances = Math.round(
            ((salary.hra + salary.transport_allowance + salary.medical_allowance + salary.other_allowances) / workingDays) * effectiveDays
        );
        const overtimePay = Math.round(totalOvertimeHours * salary.overtime_rate);
        const grossSalary = earnedBasic + totalAllowances + overtimePay;
        const totalDeductions = salary.pf_deduction + salary.tax_deduction + salary.other_deductions;
        const netSalary = grossSalary - totalDeductions;

        // Check if payslip already exists
        const existing = db.prepare('SELECT * FROM payroll WHERE employee_id = ? AND month = ? AND year = ?').get(employee.id, targetMonth, targetYear);

        let payrollId;
        if (existing) {
            // Update existing
            db.prepare(`UPDATE payroll SET working_days=?, present_days=?, overtime_hours=?, basic_salary=?, total_allowances=?, total_deductions=?, overtime_pay=?, gross_salary=?, net_salary=?, status='Generated', generated_at=datetime('now') WHERE id=?`).run(
                workingDays, effectiveDays, totalOvertimeHours, earnedBasic,
                totalAllowances, totalDeductions, overtimePay, grossSalary, netSalary, existing.id
            );
            payrollId = existing.id;
        } else {
            payrollId = uuidv4();
            db.prepare(`INSERT INTO payroll (id, employee_id, month, year, working_days, present_days, overtime_hours, basic_salary, total_allowances, total_deductions, overtime_pay, gross_salary, net_salary, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
                payrollId, employee.id, targetMonth, targetYear, workingDays, effectiveDays,
                totalOvertimeHours, earnedBasic, totalAllowances, totalDeductions,
                overtimePay, grossSalary, netSalary, 'Generated'
            );
        }

        // Return full payslip
        const payslip = {
            id: payrollId,
            employee: {
                id: employee.id,
                employee_id: employee.employee_id,
                name: employee.name,
                role: employee.role,
                department: employee.department,
                join_date: employee.join_date,
            },
            period: {
                month: targetMonth,
                year: targetYear,
                month_name: new Date(targetYear, targetMonth - 1).toLocaleString('en', { month: 'long' }),
            },
            attendance: {
                working_days: workingDays,
                present_days: presentDays,
                half_days: halfDays,
                effective_days: effectiveDays,
                absent_days: workingDays - presentDays - halfDays,
                overtime_hours: totalOvertimeHours,
            },
            earnings: {
                basic_salary: earnedBasic,
                hra: Math.round((salary.hra / workingDays) * effectiveDays),
                transport_allowance: Math.round((salary.transport_allowance / workingDays) * effectiveDays),
                medical_allowance: Math.round((salary.medical_allowance / workingDays) * effectiveDays),
                other_allowances: Math.round((salary.other_allowances / workingDays) * effectiveDays),
                overtime_pay: overtimePay,
                gross_salary: grossSalary,
            },
            deductions: {
                pf: salary.pf_deduction,
                tax: salary.tax_deduction,
                other: salary.other_deductions,
                total: totalDeductions,
            },
            net_salary: netSalary,
            generated_at: new Date().toISOString(),
            status: 'Generated',
        };

        res.json(payslip);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payroll/run - Run payroll for all active employees
router.post('/run', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { month, year } = req.body;
        const now = new Date();
        const targetMonth = month || (now.getMonth() + 1);
        const targetYear = year || now.getFullYear();

        const activeEmployees = db.prepare("SELECT * FROM employees WHERE status = 'Active'").all();
        const results = [];

        for (const emp of activeEmployees) {
            const salary = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(emp.id);
            if (!salary) continue;

            const attendanceRecords = db.prepare(`
        SELECT * FROM attendance WHERE employee_id = ?
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).all(emp.id, String(targetMonth).padStart(2, '0'), String(targetYear));

            const presentDays = attendanceRecords.filter(a => a.status === 'Present').length;
            const halfDays = attendanceRecords.filter(a => a.status === 'Half Day').length;
            const totalOT = attendanceRecords.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

            const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
            let workingDays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                if (new Date(targetYear, targetMonth - 1, d).getDay() !== 0) workingDays++;
            }

            const effectiveDays = presentDays + (halfDays * 0.5);
            const dailyRate = salary.basic_salary / workingDays;
            const earnedBasic = Math.round(dailyRate * effectiveDays);
            const totalAllowances = Math.round(
                ((salary.hra + salary.transport_allowance + salary.medical_allowance + salary.other_allowances) / workingDays) * effectiveDays
            );
            const overtimePay = Math.round(totalOT * salary.overtime_rate);
            const grossSalary = earnedBasic + totalAllowances + overtimePay;
            const totalDeductions = salary.pf_deduction + salary.tax_deduction + salary.other_deductions;
            const netSalary = grossSalary - totalDeductions;

            const existing = db.prepare('SELECT * FROM payroll WHERE employee_id = ? AND month = ? AND year = ?').get(emp.id, targetMonth, targetYear);
            if (existing) {
                db.prepare(`UPDATE payroll SET working_days=?, present_days=?, overtime_hours=?, basic_salary=?, total_allowances=?, total_deductions=?, overtime_pay=?, gross_salary=?, net_salary=?, status='Generated', generated_at=datetime('now') WHERE id=?`).run(
                    workingDays, effectiveDays, totalOT, earnedBasic, totalAllowances, totalDeductions, overtimePay, grossSalary, netSalary, existing.id
                );
            } else {
                db.prepare(`INSERT INTO payroll (id, employee_id, month, year, working_days, present_days, overtime_hours, basic_salary, total_allowances, total_deductions, overtime_pay, gross_salary, net_salary, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
                    uuidv4(), emp.id, targetMonth, targetYear, workingDays, effectiveDays, totalOT, earnedBasic, totalAllowances, totalDeductions, overtimePay, grossSalary, netSalary, 'Generated'
                );
            }

            results.push({ employee_id: emp.employee_id, name: emp.name, net_salary: netSalary });
        }

        res.json({ message: `Payroll generated for ${results.length} employees.`, month: targetMonth, year: targetYear, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
