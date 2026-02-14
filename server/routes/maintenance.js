const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/maintenance - All maintenance records (optionally by asset)
router.get('/', authenticate, (req, res) => {
    try {
        const { asset_id } = req.query;
        let query = `SELECT m.*, a.asset_name, a.asset_code 
                 FROM maintenance_records m 
                 JOIN assets a ON m.asset_id = a.id`;
        const params = [];
        if (asset_id) {
            query += ' WHERE m.asset_id = ?';
            params.push(asset_id);
        }
        query += ' ORDER BY m.service_date DESC';
        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, (req, res) => {
    try {
        const record = db.prepare(`SELECT m.*, a.asset_name, a.asset_code FROM maintenance_records m JOIN assets a ON m.asset_id = a.id WHERE m.id = ?`).get(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record not found.' });
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/maintenance
router.post('/', authenticate, requireRole('manager'), (req, res) => {
    try {
        const { asset_id, service_type, service_date, cost, description, next_service_due, performed_by } = req.body;
        if (!asset_id || !service_type || !service_date) {
            return res.status(400).json({ error: 'Asset, service type, and date are required.' });
        }
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset_id);
        if (!asset) return res.status(404).json({ error: 'Asset not found.' });

        const id = uuidv4();
        db.prepare(`INSERT INTO maintenance_records (id, asset_id, service_type, service_date, cost, description, next_service_due, performed_by)
                VALUES (?,?,?,?,?,?,?,?)`).run(
            id, asset_id, service_type, service_date, cost || 0,
            description || null, next_service_due || null, performed_by || null
        );
        const record = db.prepare(`SELECT m.*, a.asset_name, a.asset_code FROM maintenance_records m JOIN assets a ON m.asset_id = a.id WHERE m.id = ?`).get(id);
        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/maintenance/:id
router.put('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Record not found.' });

        const { service_type, service_date, cost, description, next_service_due, performed_by } = req.body;
        db.prepare(`UPDATE maintenance_records SET service_type=?, service_date=?, cost=?, description=?, next_service_due=?, performed_by=? WHERE id=?`).run(
            service_type || existing.service_type, service_date || existing.service_date,
            cost ?? existing.cost, description ?? existing.description,
            next_service_due ?? existing.next_service_due, performed_by ?? existing.performed_by,
            req.params.id
        );
        const record = db.prepare(`SELECT m.*, a.asset_name, a.asset_code FROM maintenance_records m JOIN assets a ON m.asset_id = a.id WHERE m.id = ?`).get(req.params.id);
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/maintenance/:id
router.delete('/:id', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Record not found.' });
        db.prepare('DELETE FROM maintenance_records WHERE id = ?').run(req.params.id);
        res.json({ message: 'Record deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
