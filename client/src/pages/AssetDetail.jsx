import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlinePencil, HiOutlineClock, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';

const PART_STATUSES = ['Active', 'Replaced', 'Faulty', 'Retired'];

export default function AssetDetail() {
    const { id } = useParams();
    const [asset, setAsset] = useState(null);
    const [parts, setParts] = useState([]);
    const [maintenance, setMaintenance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [partModal, setPartModal] = useState(false);
    const [techModal, setTechModal] = useState(false);
    const [maintModal, setMaintModal] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [partForm, setPartForm] = useState({});
    const [techForm, setTechForm] = useState({});
    const [maintForm, setMaintForm] = useState({});
    const [expandedPart, setExpandedPart] = useState(null);
    const [partHistories, setPartHistories] = useState({});

    useEffect(() => { loadAll(); }, [id]);

    const loadAll = async () => {
        try {
            const [assetRes, partsRes, maintRes] = await Promise.all([
                api.get(`/assets/${id}`),
                api.get(`/assets/${id}/parts`),
                api.get('/maintenance', { params: { asset_id: id } }),
            ]);
            setAsset(assetRes.data);
            setParts(partsRes.data);
            setMaintenance(maintRes.data);
            if (assetRes.data.technical_details) {
                setTechForm(assetRes.data.technical_details);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadPartHistory = async (partId) => {
        if (partHistories[partId]) {
            setExpandedPart(expandedPart === partId ? null : partId);
            return;
        }
        try {
            const res = await api.get(`/assets/${id}/parts/${partId}/history`);
            setPartHistories(prev => ({ ...prev, [partId]: res.data }));
            setExpandedPart(partId);
        } catch (err) { console.error(err); }
    };

    const savePart = async (e) => {
        e.preventDefault();
        try {
            if (editingPart) {
                await api.put(`/assets/${id}/parts/${editingPart.id}`, partForm);
            } else {
                await api.post(`/assets/${id}/parts`, partForm);
            }
            setPartModal(false);
            loadAll();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const saveTech = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/assets/${id}/technical`, techForm);
            setTechModal(false);
            loadAll();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const saveMaint = async (e) => {
        e.preventDefault();
        try {
            await api.post('/maintenance', { ...maintForm, asset_id: id });
            setMaintModal(false);
            loadAll();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div></div>;
    if (!asset) return <div className="text-center py-20 text-dark-400">Asset not found</div>;

    const statusBadge = (s) => {
        const cls = s === 'In Use' || s === 'Active' ? 'badge-success' : s === 'Under Repair' || s === 'Faulty' ? 'badge-warning' : 'badge-danger';
        return <span className={`badge ${cls}`}>{s}</span>;
    };

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'technical', label: 'Technical Details' },
        { key: 'parts', label: `Parts (${parts.length})` },
        { key: 'maintenance', label: `Maintenance (${maintenance.length})` },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/assets" className="p-2 rounded-xl text-dark-400 hover:text-dark-200 hover:bg-dark-800/50 transition-colors">
                    <HiOutlineArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-dark-100">{asset.asset_name}</h1>
                        {statusBadge(asset.status)}
                    </div>
                    <p className="text-dark-400 text-sm mt-1">{asset.asset_code} • {asset.asset_type} • {[asset.brand, asset.model].filter(Boolean).join(' ')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-700/50 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="text-base font-semibold text-dark-200 mb-4">Asset Information</h3>
                        <div className="space-y-3">
                            {[
                                ['Asset Code', asset.asset_code],
                                ['Type', asset.asset_type],
                                ['Brand', asset.brand || '—'],
                                ['Model', asset.model || '—'],
                                ['Purchase Date', asset.purchase_date || '—'],
                                ['Purchase Cost', `₹${(asset.purchase_cost || 0).toLocaleString('en-IN')}`],
                                ['Location', asset.location || '—'],
                                ['Status', asset.status],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-1.5">
                                    <span className="text-sm text-dark-400">{label}</span>
                                    <span className="text-sm text-dark-200 font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card p-6">
                        <h3 className="text-base font-semibold text-dark-200 mb-4">Assignment & Stats</h3>
                        <div className="space-y-3">
                            {[
                                ['Assigned To', asset.assigned_employee_name || 'Unassigned'],
                                ['Total Parts', asset.parts_count],
                                ['Maintenance Records', asset.maintenance_count],
                                ['Total Maintenance Cost', `₹${(asset.total_maintenance_cost || 0).toLocaleString('en-IN')}`],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-1.5">
                                    <span className="text-sm text-dark-400">{label}</span>
                                    <span className="text-sm text-dark-200 font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                        {asset.notes && (
                            <div className="mt-4 pt-4 border-t border-dark-700/50">
                                <p className="text-sm text-dark-400 mb-1">Notes</p>
                                <p className="text-sm text-dark-300">{asset.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Technical Tab */}
            {activeTab === 'technical' && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-dark-200">Technical Details</h3>
                        <button onClick={() => { setTechForm(asset.technical_details || {}); setTechModal(true); }} className="btn btn-ghost text-sm py-2 px-3">
                            <HiOutlinePencil className="w-4 h-4" /> {asset.technical_details ? 'Edit' : 'Add Details'}
                        </button>
                    </div>
                    {asset.technical_details ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                ['Engine Type', asset.technical_details.engine_type],
                                ['Engine Capacity', asset.technical_details.engine_capacity],
                                ['Fuel Type', asset.technical_details.fuel_type],
                                ['Registration Number', asset.technical_details.registration_number],
                                ['Chassis Number', asset.technical_details.chassis_number],
                                ['Mileage', asset.technical_details.mileage ? `${asset.technical_details.mileage.toLocaleString()} km` : '—'],
                                ['Service Interval', asset.technical_details.service_interval ? `${asset.technical_details.service_interval.toLocaleString()} km` : '—'],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-2 px-3 rounded-lg bg-dark-800/30">
                                    <span className="text-sm text-dark-400">{label}</span>
                                    <span className="text-sm text-dark-200 font-medium">{value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-dark-500 text-sm">No technical details added yet.</p>
                    )}
                </div>
            )}

            {/* Parts Tab with Full History */}
            {activeTab === 'parts' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-semibold text-dark-200">Parts ({parts.length})</h3>
                        <button onClick={() => { setEditingPart(null); setPartForm({ part_name: '', brand: '', serial_number: '', install_date: '', warranty_end_date: '', cost: '', status: 'Active' }); setPartModal(true); }} className="btn btn-primary text-sm py-2">
                            <HiOutlinePlus className="w-4 h-4" /> Add Part
                        </button>
                    </div>

                    {parts.length === 0 ? (
                        <div className="glass-card p-8 text-center text-dark-500">No parts added yet</div>
                    ) : (
                        parts.map((part) => (
                            <div key={part.id} className="glass-card overflow-hidden">
                                {/* Part Header */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${part.status === 'Active' ? 'bg-green-500/15 text-green-400' : part.status === 'Faulty' ? 'bg-orange-500/15 text-orange-400' : 'bg-red-500/15 text-red-400'}`}>
                                            ⚙️
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-dark-200">{part.part_name}</p>
                                            <p className="text-xs text-dark-400">{part.brand || 'N/A'} • {part.serial_number || 'No serial'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {statusBadge(part.status)}
                                        <span className="text-sm text-dark-300 font-medium">₹{(part.cost || 0).toLocaleString('en-IN')}</span>
                                        <button onClick={() => { setEditingPart(part); setPartForm(part); setPartModal(true); }} className="p-1.5 rounded-lg text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                            <HiOutlinePencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => loadPartHistory(part.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors flex items-center gap-1">
                                            <HiOutlineClock className="w-4 h-4" />
                                            {expandedPart === part.id ? <HiOutlineChevronUp className="w-3 h-3" /> : <HiOutlineChevronDown className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Part Details */}
                                <div className="px-4 pb-3 flex gap-6 text-xs text-dark-400">
                                    <span>Install: {part.install_date || '—'}</span>
                                    <span>Warranty: {part.warranty_end_date || '—'}</span>
                                </div>

                                {/* Expanded History Timeline */}
                                {expandedPart === part.id && partHistories[part.id] && (
                                    <div className="border-t border-dark-700/50 p-4 bg-dark-900/30 animate-fade-in">
                                        <h4 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2">
                                            <HiOutlineClock className="w-4 h-4" /> Full Part History
                                        </h4>
                                        {partHistories[part.id].length === 0 ? (
                                            <p className="text-xs text-dark-500">No history records</p>
                                        ) : (
                                            <div className="relative ml-3">
                                                {/* Timeline line */}
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-dark-700/50"></div>

                                                {partHistories[part.id].map((h, i) => (
                                                    <div key={h.id} className="relative pl-6 pb-4 last:pb-0">
                                                        {/* Timeline dot */}
                                                        <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full -translate-x-[3px] ${h.action === 'Installed' ? 'bg-green-400' :
                                                                h.action === 'Status Changed' ? 'bg-orange-400' :
                                                                    h.action === 'Removed' ? 'bg-red-400' :
                                                                        h.action === 'Replaced Previous' ? 'bg-purple-400' :
                                                                            'bg-blue-400'
                                                            }`}></div>

                                                        <div className="bg-dark-800/40 rounded-lg p-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-xs font-semibold ${h.action === 'Installed' ? 'text-green-400' :
                                                                        h.action === 'Status Changed' ? 'text-orange-400' :
                                                                            h.action === 'Removed' ? 'text-red-400' :
                                                                                h.action === 'Replaced Previous' ? 'text-purple-400' :
                                                                                    'text-blue-400'
                                                                    }`}>{h.action}</span>
                                                                <span className="text-[10px] text-dark-500">{h.created_at}</span>
                                                            </div>
                                                            <p className="text-xs text-dark-300">{h.description}</p>
                                                            {h.old_status && h.new_status && (
                                                                <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                                                                    <span className="text-dark-500">{h.old_status}</span>
                                                                    <span className="text-dark-600">→</span>
                                                                    <span className="text-dark-300 font-medium">{h.new_status}</span>
                                                                </div>
                                                            )}
                                                            {h.performed_by && (
                                                                <p className="text-[10px] text-dark-500 mt-1">By: {h.performed_by}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-semibold text-dark-200">Maintenance History</h3>
                        <button onClick={() => { setMaintForm({ service_type: '', service_date: '', cost: '', description: '', next_service_due: '' }); setMaintModal(true); }} className="btn btn-primary text-sm py-2">
                            <HiOutlinePlus className="w-4 h-4" /> Log Service
                        </button>
                    </div>

                    {maintenance.length === 0 ? (
                        <div className="glass-card p-8 text-center text-dark-500">No maintenance records</div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Service Type</th>
                                        <th>Date</th>
                                        <th>Cost</th>
                                        <th>Description</th>
                                        <th>Next Service</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenance.map(m => (
                                        <tr key={m.id}>
                                            <td className="font-medium text-dark-200">{m.service_type}</td>
                                            <td className="text-dark-300">{m.service_date}</td>
                                            <td className="text-dark-300">₹{(m.cost || 0).toLocaleString('en-IN')}</td>
                                            <td className="text-dark-400 max-w-xs truncate">{m.description || '—'}</td>
                                            <td>{m.next_service_due ? <span className="badge badge-warning">{m.next_service_due}</span> : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Part Modal */}
            <Modal isOpen={partModal} onClose={() => setPartModal(false)} title={editingPart ? 'Edit Part' : 'Add Part'}>
                <form onSubmit={savePart} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="form-label">Part Name *</label>
                            <input className="form-input" value={partForm.part_name || ''} onChange={e => setPartForm({ ...partForm, part_name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="form-label">Brand</label>
                            <input className="form-input" value={partForm.brand || ''} onChange={e => setPartForm({ ...partForm, brand: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Serial Number</label>
                            <input className="form-input" value={partForm.serial_number || ''} onChange={e => setPartForm({ ...partForm, serial_number: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Install Date</label>
                            <input type="date" className="form-input" value={partForm.install_date || ''} onChange={e => setPartForm({ ...partForm, install_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Warranty End</label>
                            <input type="date" className="form-input" value={partForm.warranty_end_date || ''} onChange={e => setPartForm({ ...partForm, warranty_end_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Cost (₹)</label>
                            <input type="number" className="form-input" value={partForm.cost || ''} onChange={e => setPartForm({ ...partForm, cost: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={partForm.status || 'Active'} onChange={e => setPartForm({ ...partForm, status: e.target.value })}>
                                {PART_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setPartModal(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingPart ? 'Update Part' : 'Add Part'}</button>
                    </div>
                </form>
            </Modal>

            {/* Technical Details Modal */}
            <Modal isOpen={techModal} onClose={() => setTechModal(false)} title="Technical Details">
                <form onSubmit={saveTech} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            ['Engine Type', 'engine_type', 'text'],
                            ['Engine Capacity', 'engine_capacity', 'text'],
                            ['Fuel Type', 'fuel_type', 'text'],
                            ['Registration Number', 'registration_number', 'text'],
                            ['Chassis Number', 'chassis_number', 'text'],
                            ['Mileage (km)', 'mileage', 'number'],
                            ['Service Interval (km)', 'service_interval', 'number'],
                        ].map(([label, key, type]) => (
                            <div key={key}>
                                <label className="form-label">{label}</label>
                                <input type={type} className="form-input" value={techForm[key] || ''} onChange={e => setTechForm({ ...techForm, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setTechModal(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </Modal>

            {/* Maintenance Modal */}
            <Modal isOpen={maintModal} onClose={() => setMaintModal(false)} title="Log Maintenance">
                <form onSubmit={saveMaint} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="form-label">Service Type *</label>
                            <input className="form-input" value={maintForm.service_type || ''} onChange={e => setMaintForm({ ...maintForm, service_type: e.target.value })} required placeholder="e.g. Oil Change, Brake Service" />
                        </div>
                        <div>
                            <label className="form-label">Service Date *</label>
                            <input type="date" className="form-input" value={maintForm.service_date || ''} onChange={e => setMaintForm({ ...maintForm, service_date: e.target.value })} required />
                        </div>
                        <div>
                            <label className="form-label">Cost (₹)</label>
                            <input type="number" className="form-input" value={maintForm.cost || ''} onChange={e => setMaintForm({ ...maintForm, cost: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="col-span-2">
                            <label className="form-label">Description</label>
                            <textarea className="form-input" rows={2} value={maintForm.description || ''} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Next Service Due</label>
                            <input type="date" className="form-input" value={maintForm.next_service_due || ''} onChange={e => setMaintForm({ ...maintForm, next_service_due: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setMaintModal(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Record</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
