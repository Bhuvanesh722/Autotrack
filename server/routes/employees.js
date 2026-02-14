const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/employees
router.get('/', authenticate, (req, res) => {
    try {
        const { status, department, search } = req.query;
        let query = 'SELECT * FROM employees WHERE 1=1';
        const params = [];
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (department) { query += ' AND department = ?'; params.push(department); }
        if (search) {
            query += ' AND (name LIKE ? OR employee_id LIKE ? OR role LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        query += ' ORDER BY created_at DESC';
        const employees = db.prepare(query).all(...params);
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/employees/:id
router.get('/:id', authenticate, (req, res) => {
    try {
        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
        if (!employee) return res.status(404).json({ error: 'Employee not found.' });

        // Get assigned assets
        employee.assigned_assets = db.prepare('SELECT id, asset_code, asset_name, asset_type, status FROM assets WHERE assigned_employee_id = ?').all(req.params.id);

        // Get salary structure
        employee.salary_structure = db.prepare('SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC LIMIT 1').get(req.params.id) || null;

        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees
router.post('/', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { employee_id, name, role, department, join_date, salary_type, base_salary, status, phone, email, address } = req.body;
        if (!employee_id || !name) return res.status(400).json({ error: 'Employee ID and name are required.' });

        const id = uuidv4();
        db.prepare(`INSERT INTO employees (id, employee_id, name, role, department, join_date, salary_type, base_salary, status, phone, email, address)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
            id, employee_id, name, role || 'Technician', department || null,
            join_date || new Date().toISOString().split('T')[0],
            salary_type || 'Monthly', base_salary || 0, status || 'Active',
            phone || null, email || null, address || null
        );

        // Auto-create salary structure
        if (salary_type === 'Monthly' || !salary_type) {
            const bs = base_salary || 0;
            db.prepare(`INSERT INTO salary_structures (id, employee_id, basic_salary, hra, transport_allowance, medical_allowance, other_allowances, pf_deduction, tax_deduction, other_deductions, overtime_rate, effective_from)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
                uuidv4(), id, bs, Math.round(bs * 0.2), 1500, 1000, 500,
                Math.round(bs * 0.12), Math.round(bs * 0.05), 0,
                Math.round(bs / 26 / 8 * 1.5), new Date().toISOString().split('T')[0]
            );
        }

        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
        res.status(201).json(employee);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Employee ID already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Employee not found.' });

        const { employee_id, name, role, department, join_date, salary_type, base_salary, status, phone, email, address } = req.body;
        db.prepare(`UPDATE employees SET employee_id=?, name=?, role=?, department=?, join_date=?, salary_type=?, base_salary=?, status=?, phone=?, email=?, address=?, updated_at=datetime('now') WHERE id=?`).run(
            employee_id || existing.employee_id, name || existing.name,
            role || existing.role, department ?? existing.department,
            join_date ?? existing.join_date, salary_type || existing.salary_type,
            base_salary ?? existing.base_salary, status || existing.status,
            phone ?? existing.phone, email ?? existing.email, address ?? existing.address,
            req.params.id
        );
        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
        res.json(employee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Employee not found.' });
        // Un-assign assets
        db.prepare("UPDATE assets SET assigned_employee_id = NULL, updated_at = datetime('now') WHERE assigned_employee_id = ?").run(req.params.id);
        db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
        res.json({ message: 'Employee deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
