const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/assets/:assetId/parts - Get all parts for an asset
router.get('/:assetId/parts', authenticate, (req, res) => {
    try {
        const parts = db.prepare('SELECT * FROM asset_parts WHERE asset_id = ? ORDER BY install_date DESC').all(req.params.assetId);
        res.json(parts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/assets/:assetId/parts/:partId - Get single part with history
router.get('/:assetId/parts/:partId', authenticate, (req, res) => {
    try {
        const part = db.prepare('SELECT * FROM asset_parts WHERE id = ? AND asset_id = ?').get(req.params.partId, req.params.assetId);
        if (!part) return res.status(404).json({ error: 'Part not found.' });

        part.history = db.prepare('SELECT * FROM part_history WHERE part_id = ? ORDER BY created_at DESC').all(req.params.partId);
        res.json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/assets/:assetId/parts/:partId/history - Full part history
router.get('/:assetId/parts/:partId/history', authenticate, (req, res) => {
    try {
        const history = db.prepare('SELECT * FROM part_history WHERE part_id = ? AND asset_id = ? ORDER BY created_at DESC').all(req.params.partId, req.params.assetId);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/assets/:assetId/parts - Add a part
router.post('/:assetId/parts', authenticate, requireRole('manager'), (req, res) => {
    try {
        const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.assetId);
        if (!asset) return res.status(404).json({ error: 'Asset not found.' });

        const { part_name, brand, serial_number, install_date, warranty_end_date, cost, status } = req.body;
        if (!part_name) return res.status(400).json({ error: 'Part name is required.' });

        const id = uuidv4();
        db.prepare(`INSERT INTO asset_parts (id, asset_id, part_name, brand, serial_number, install_date, warranty_end_date, cost, status)
                VALUES (?,?,?,?,?,?,?,?,?)`).run(
            id, req.params.assetId, part_name, brand || null, serial_number || null,
            install_date || new Date().toISOString().split('T')[0],
            warranty_end_date || null, cost || 0, status || 'Active'
        );

        // Log history
        db.prepare('INSERT INTO part_history (id, part_id, asset_id, action, description, old_status, new_status, performed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
            uuidv4(), id, req.params.assetId, 'Installed',
            `${part_name} (${brand || 'N/A'}) installed. Serial: ${serial_number || 'N/A'}. Cost: ₹${cost || 0}`,
            null, status || 'Active', req.user.full_name,
            install_date || new Date().toISOString().split('T')[0]
        );

        const part = db.prepare('SELECT * FROM asset_parts WHERE id = ?').get(id);
        res.status(201).json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/assets/:assetId/parts/:partId - Update a part
router.put('/:assetId/parts/:partId', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM asset_parts WHERE id = ? AND asset_id = ?').get(req.params.partId, req.params.assetId);
        if (!existing) return res.status(404).json({ error: 'Part not found.' });

        const { part_name, brand, serial_number, install_date, warranty_end_date, cost, status } = req.body;
        const newStatus = status || existing.status;

        // Build change description
        const changes = [];
        if (part_name && part_name !== existing.part_name) changes.push(`Name: ${existing.part_name} → ${part_name}`);
        if (brand && brand !== existing.brand) changes.push(`Brand: ${existing.brand || 'N/A'} → ${brand}`);
        if (serial_number && serial_number !== existing.serial_number) changes.push(`Serial: ${existing.serial_number || 'N/A'} → ${serial_number}`);
        if (cost !== undefined && cost !== existing.cost) changes.push(`Cost: ₹${existing.cost} → ₹${cost}`);
        if (status && status !== existing.status) changes.push(`Status: ${existing.status} → ${status}`);

        db.prepare(`UPDATE asset_parts SET part_name=?, brand=?, serial_number=?, install_date=?, warranty_end_date=?, cost=?, status=?, updated_at=datetime('now') WHERE id=?`).run(
            part_name || existing.part_name, brand ?? existing.brand, serial_number ?? existing.serial_number,
            install_date ?? existing.install_date, warranty_end_date ?? existing.warranty_end_date,
            cost ?? existing.cost, newStatus, req.params.partId
        );

        // Log history if changes
        if (changes.length > 0) {
            const action = status && status !== existing.status ? 'Status Changed' : 'Updated';
            db.prepare('INSERT INTO part_history (id, part_id, asset_id, action, description, old_status, new_status, old_values, new_values, performed_by) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
                uuidv4(), req.params.partId, req.params.assetId, action,
                changes.join('. '), existing.status, newStatus,
                JSON.stringify({ part_name: existing.part_name, brand: existing.brand, serial_number: existing.serial_number, cost: existing.cost, status: existing.status }),
                JSON.stringify({ part_name: part_name || existing.part_name, brand: brand ?? existing.brand, serial_number: serial_number ?? existing.serial_number, cost: cost ?? existing.cost, status: newStatus }),
                req.user.full_name
            );
        }

        const part = db.prepare('SELECT * FROM asset_parts WHERE id = ?').get(req.params.partId);
        res.json(part);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/assets/:assetId/parts/:partId
router.delete('/:assetId/parts/:partId', authenticate, requireRole('manager'), (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM asset_parts WHERE id = ? AND asset_id = ?').get(req.params.partId, req.params.assetId);
        if (!existing) return res.status(404).json({ error: 'Part not found.' });

        // Log removal
        db.prepare('INSERT INTO part_history (id, part_id, asset_id, action, description, old_status, new_status, performed_by) VALUES (?,?,?,?,?,?,?,?)').run(
            uuidv4(), req.params.partId, req.params.assetId, 'Removed',
            `${existing.part_name} (${existing.brand || 'N/A'}) removed from asset.`,
            existing.status, 'Removed', req.user.full_name
        );

        db.prepare('DELETE FROM asset_parts WHERE id = ?').run(req.params.partId);
        res.json({ message: 'Part deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
