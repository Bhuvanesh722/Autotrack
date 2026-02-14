import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineEye, HiOutlineFilter } from 'react-icons/hi';

const ASSET_TYPES = ['Vehicle', 'Tool', 'Machine'];
const STATUSES = ['In Use', 'Under Repair', 'Retired'];

export default function Assets() {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => { loadAssets(); loadEmployees(); }, []);
    useEffect(() => { loadAssets(); }, [search, filterType, filterStatus]);

    const loadAssets = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (filterType) params.type = filterType;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/assets', { params });
            setAssets(res.data);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const loadEmployees = async () => {
        try {
            const res = await api.get('/employees', { params: { status: 'Active' } });
            setEmployees(res.data);
        } catch (err) { console.error(err); }
    };

    const openCreate = () => {
        setEditingAsset(null);
        setForm({ asset_code: '', asset_name: '', asset_type: 'Vehicle', brand: '', model: '', purchase_date: '', purchase_cost: '', status: 'In Use', location: '', assigned_employee_id: '', notes: '' });
        setModalOpen(true);
    };

    const openEdit = (asset) => {
        setEditingAsset(asset);
        setForm({ ...asset, assigned_employee_id: asset.assigned_employee_id || '' });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingAsset) {
                await api.put(`/assets/${editingAsset.id}`, form);
            } else {
                await api.post('/assets', form);
            }
            setModalOpen(false);
            loadAssets();
        } catch (err) {
            alert(err.response?.data?.error || 'Error saving asset');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            await api.delete(`/assets/${id}`);
            loadAssets();
        } catch (err) {
            alert(err.response?.data?.error || 'Error deleting asset');
        }
    };

    const statusBadge = (status) => {
        const cls = status === 'In Use' ? 'badge-success' : status === 'Under Repair' ? 'badge-warning' : 'badge-danger';
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    const typeBadge = (type) => {
        const cls = type === 'Vehicle' ? 'badge-info' : type === 'Machine' ? 'badge-purple' : 'badge-success';
        return <span className={`badge ${cls}`}>{type}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Assets</h1>
                    <p className="text-dark-400 text-sm mt-1">{assets.length} assets found</p>
                </div>
                {isManager && (
                    <button onClick={openCreate} className="btn btn-primary">
                        <HiOutlinePlus className="w-5 h-5" /> Add Asset
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[250px]">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search assets by name, code, or brand..."
                        className="w-full py-3 pl-12 pr-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <HiOutlineFilter className="w-4 h-4 text-slate-400" />
                        <select className="py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[140px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="">All Types</option>
                            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <select className="py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[140px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Status</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Brand / Model</th>
                                <th>Status</th>
                                <th>Location</th>
                                <th>Assigned To</th>
                                <th>Cost</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-8 text-dark-400">Loading...</td></tr>
                            ) : assets.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-8 text-dark-400">No assets found</td></tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset.id}>
                                        <td className="font-mono text-sm text-primary-400">{asset.asset_code}</td>
                                        <td className="font-medium text-dark-200">{asset.asset_name}</td>
                                        <td>{typeBadge(asset.asset_type)}</td>
                                        <td className="text-dark-300">{[asset.brand, asset.model].filter(Boolean).join(' ') || '—'}</td>
                                        <td>{statusBadge(asset.status)}</td>
                                        <td className="text-dark-400">{asset.location || '—'}</td>
                                        <td className="text-dark-300">{asset.assigned_employee_name || <span className="text-dark-500">Unassigned</span>}</td>
                                        <td className="text-dark-300">₹{(asset.purchase_cost || 0).toLocaleString('en-IN')}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Link to={`/assets/${asset.id}`} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                                                    <HiOutlineEye className="w-4 h-4" />
                                                </Link>
                                                {isManager && (
                                                    <button onClick={() => openEdit(asset)} className="p-1.5 rounded-lg text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                                        <HiOutlinePencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {isManager && (
                                                    <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAsset ? 'Edit Asset' : 'Add New Asset'} size="lg">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Asset Code *</label>
                            <input className="form-input" value={form.asset_code || ''} onChange={e => setForm({ ...form, asset_code: e.target.value })} required placeholder="e.g. VH-005" />
                        </div>
                        <div>
                            <label className="form-label">Asset Name *</label>
                            <input className="form-input" value={form.asset_name || ''} onChange={e => setForm({ ...form, asset_name: e.target.value })} required placeholder="e.g. Tata Ace" />
                        </div>
                        <div>
                            <label className="form-label">Asset Type *</label>
                            <select className="form-select" value={form.asset_type || 'Vehicle'} onChange={e => setForm({ ...form, asset_type: e.target.value })}>
                                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={form.status || 'In Use'} onChange={e => setForm({ ...form, status: e.target.value })}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Brand</label>
                            <input className="form-input" value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Tata" />
                        </div>
                        <div>
                            <label className="form-label">Model</label>
                            <input className="form-input" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g. Ace Gold" />
                        </div>
                        <div>
                            <label className="form-label">Purchase Date</label>
                            <input type="date" className="form-input" value={form.purchase_date || ''} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Purchase Cost (₹)</label>
                            <input type="number" className="form-input" value={form.purchase_cost || ''} onChange={e => setForm({ ...form, purchase_cost: parseFloat(e.target.value) || 0 })} placeholder="0" />
                        </div>
                        <div>
                            <label className="form-label">Location</label>
                            <input className="form-input" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Yard" />
                        </div>
                        <div>
                            <label className="form-label">Assign to Employee</label>
                            <select className="form-select" value={form.assigned_employee_id || ''} onChange={e => setForm({ ...form, assigned_employee_id: e.target.value || null })}>
                                <option value="">Unassigned</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Notes</label>
                        <textarea className="form-input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingAsset ? 'Update Asset' : 'Create Asset'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
