const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/assets - List all assets with filters
router.get('/', authenticate, (req, res) => {
    try {
        const { type, status, search, assigned } = req.query;
        let query = `SELECT a.*, e.name as assigned_employee_name, e.employee_id as assigned_employee_code
                 FROM assets a LEFT JOIN employees e ON a.assigned_employee_id = e.id WHERE 1=1`;
        const params = [];

        if (type) { query += ' AND a.asset_type = ?'; params.push(type); }
        if (status) { query += ' AND a.status = ?'; params.push(status); }
        if (assigned === 'true') { query += ' AND a.assigned_employee_id IS NOT NULL'; }
        if (assigned === 'false') { query += ' AND a.assigned_employee_id IS NULL'; }
        if (search) {
            query += ' AND (a.asset_name LIKE ? OR a.asset_code LIKE ? OR a.brand LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        query += ' ORDER BY a.created_at DESC';

        const assets = db.prepare(query).all(...params);
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/assets/:id - Get single asset with details
router.get('/:id', authenticate, (req, res) => {
    try {
        const asset = db.prepare(`
      SELECT a.*, e.name as assigned_employee_name, e.employee_id as assigned_employee_code
      FROM assets a LEFT JOIN employees e ON a.assigned_employee_id = e.id
      WHERE a.id = ?
    `).get(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found.' });

        // Get technical details
        asset.technical_details = db.prepare('SELECT * FROM asset_technical_details WHERE asset_id = ?').get(req.params.id) || null;

        // Get parts count
        asset.parts_count = db.prepare('SELECT COUNT(*) as count FROM asset_parts WHERE asset_id = ?').get(req.params.id).count;

        // Get maintenance count and total cost
        const maintStats = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(cost),0) as total_cost FROM maintenance_records WHERE asset_id = ?').get(req.params.id);
        asset.maintenance_count = maintStats.count;
        asset.total_maintenance_cost = maintStats.total_cost;

        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/assets - Create asset
router.post('/', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { asset_code, asset_name, asset_type, brand, model, purchase_date, purchase_cost, status, location, assigned_employee_id, notes } = req.body;
        if (!asset_code || !asset_name || !asset_type) {
            return res.status(400).json({ error: 'Asset code, name, and type are required.' });
        }
        const id = uuidv4();
        db.prepare(`INSERT INTO assets (id, asset_code, asset_name, asset_type, brand, model, purchase_date, purchase_cost, status, location, assigned_employee_id, notes)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
            id, asset_code, asset_name, asset_type, brand || null, model || null,
            purchase_date || null, purchase_cost || 0, status || 'In Use',
            location || null, assigned_employee_id || null, notes || null
        );
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
        res.status(201).json(asset);
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Asset code already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/assets/:id - Update asset
router.put('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Asset not found.' });

        const { asset_code, asset_name, asset_type, brand, model, purchase_date, purchase_cost, status, location, assigned_employee_id, notes } = req.body;
        db.prepare(`UPDATE assets SET asset_code=?, asset_name=?, asset_type=?, brand=?, model=?, purchase_date=?, purchase_cost=?, status=?, location=?, assigned_employee_id=?, notes=?, updated_at=datetime('now')
                WHERE id=?`).run(
            asset_code || existing.asset_code, asset_name || existing.asset_name,
            asset_type || existing.asset_type, brand ?? existing.brand, model ?? existing.model,
            purchase_date ?? existing.purchase_date, purchase_cost ?? existing.purchase_cost,
            status || existing.status, location ?? existing.location,
            assigned_employee_id ?? existing.assigned_employee_id, notes ?? existing.notes,
            req.params.id
        );
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/assets/:id
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Asset not found.' });
        db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
        res.json({ message: 'Asset deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/assets/:id/assign - Assign asset to employee
router.put('/:id/assign', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { employee_id } = req.body;
        const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Asset not found.' });

        if (employee_id) {
            const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
            if (!emp) return res.status(404).json({ error: 'Employee not found.' });
        }

        db.prepare("UPDATE assets SET assigned_employee_id = ?, updated_at = datetime('now') WHERE id = ?").run(employee_id || null, req.params.id);
        const asset = db.prepare(`SELECT a.*, e.name as assigned_employee_name FROM assets a LEFT JOIN employees e ON a.assigned_employee_id = e.id WHERE a.id = ?`).get(req.params.id);
        res.json(asset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Technical Details ---

// GET /api/assets/:id/technical
router.get('/:id/technical', authenticate, (req, res) => {
    try {
        const details = db.prepare('SELECT * FROM asset_technical_details WHERE asset_id = ?').get(req.params.id);
        res.json(details || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/assets/:id/technical - Create or update
router.put('/:id/technical', authenticate, requireRole('manager'), (req, res) => {
    try {
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found.' });

        const { engine_type, engine_capacity, fuel_type, registration_number, chassis_number, mileage, service_interval } = req.body;
        const existing = db.prepare('SELECT * FROM asset_technical_details WHERE asset_id = ?').get(req.params.id);

        if (existing) {
            db.prepare(`UPDATE asset_technical_details SET engine_type=?, engine_capacity=?, fuel_type=?, registration_number=?, chassis_number=?, mileage=?, service_interval=?, updated_at=datetime('now') WHERE asset_id=?`).run(
                engine_type ?? existing.engine_type, engine_capacity ?? existing.engine_capacity,
                fuel_type ?? existing.fuel_type, registration_number ?? existing.registration_number,
                chassis_number ?? existing.chassis_number, mileage ?? existing.mileage,
                service_interval ?? existing.service_interval, req.params.id
            );
        } else {
            db.prepare('INSERT INTO asset_technical_details (id, asset_id, engine_type, engine_capacity, fuel_type, registration_number, chassis_number, mileage, service_interval) VALUES (?,?,?,?,?,?,?,?,?)').run(
                uuidv4(), req.params.id, engine_type || null, engine_capacity || null,
                fuel_type || null, registration_number || null, chassis_number || null,
                mileage || 0, service_interval || 5000
            );
        }
        const details = db.prepare('SELECT * FROM asset_technical_details WHERE asset_id = ?').get(req.params.id);
        res.json(details);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
