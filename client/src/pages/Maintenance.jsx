import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { HiOutlinePlus, HiOutlineSearch } from 'react-icons/hi';

export default function Maintenance() {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';
    const [records, setRecords] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({});

    useEffect(() => { load(); loadAssets(); }, []);

    const load = async () => {
        try { const res = await api.get('/maintenance'); setRecords(res.data); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadAssets = async () => {
        try { const res = await api.get('/assets'); setAssets(res.data); }
        catch (err) { console.error(err); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await api.post('/maintenance', form);
            setModalOpen(false); load();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const filtered = search
        ? records.filter(r => r.asset_name?.toLowerCase().includes(search.toLowerCase()) || r.service_type?.toLowerCase().includes(search.toLowerCase()) || r.asset_code?.toLowerCase().includes(search.toLowerCase()))
        : records;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Maintenance</h1>
                    <p className="text-dark-400 text-sm mt-1">{filtered.length} service records</p>
                </div>
                {isManager && (
                    <button onClick={() => { setForm({ asset_id: '', service_type: '', service_date: '', cost: '', description: '', next_service_due: '' }); setModalOpen(true); }} className="btn btn-primary">
                        <HiOutlinePlus className="w-5 h-5" /> Log Service
                    </button>
                )}
            </div>

            <div className="glass-card p-4">
                <div className="relative">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="Search by asset name, code, or service type..." className="w-full py-3 pl-12 pr-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr><th>Asset</th><th>Service Type</th><th>Date</th><th>Cost</th><th>Description</th><th>Next Due</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8 text-dark-400">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-dark-400">No records found</td></tr>
                            ) : filtered.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <p className="font-medium text-dark-200">{r.asset_name}</p>
                                        <p className="text-xs text-dark-500">{r.asset_code}</p>
                                    </td>
                                    <td><span className="badge badge-info">{r.service_type}</span></td>
                                    <td className="text-dark-300">{r.service_date}</td>
                                    <td className="text-dark-300 font-medium">₹{(r.cost || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-dark-400 max-w-xs truncate">{r.description || '—'}</td>
                                    <td>{r.next_service_due ? <span className="badge badge-warning">{r.next_service_due}</span> : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Maintenance Service">
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="form-label">Asset *</label>
                        <select className="form-select" value={form.asset_id || ''} onChange={e => setForm({ ...form, asset_id: e.target.value })} required>
                            <option value="">Select asset...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_code})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="form-label">Service Type *</label><input className="form-input" value={form.service_type || ''} onChange={e => setForm({ ...form, service_type: e.target.value })} required placeholder="e.g. Oil Change" /></div>
                        <div><label className="form-label">Service Date *</label><input type="date" className="form-input" value={form.service_date || ''} onChange={e => setForm({ ...form, service_date: e.target.value })} required /></div>
                        <div><label className="form-label">Cost (₹)</label><input type="number" className="form-input" value={form.cost || ''} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
                        <div><label className="form-label">Next Service Due</label><input type="date" className="form-input" value={form.next_service_due || ''} onChange={e => setForm({ ...form, next_service_due: e.target.value })} /></div>
                    </div>
                    <div><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Record</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
