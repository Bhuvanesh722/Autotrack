import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi';

export default function Employees() {
    const { user } = useAuth();
    const isManager = user?.role === 'manager';
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => { load(); }, [search, filterStatus]);

    const load = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/employees', { params });
            setEmployees(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ employee_id: '', name: '', role: 'Technician', department: '', join_date: '', salary_type: 'Monthly', base_salary: '', status: 'Active', phone: '', email: '', address: '' });
        setModalOpen(true);
    };

    const openEdit = (emp) => { setEditing(emp); setForm(emp); setModalOpen(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/employees/${editing.id}`, form); }
            else { await api.post('/employees', form); }
            setModalOpen(false); load();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this employee?')) return;
        try { await api.delete(`/employees/${id}`); load(); }
        catch (err) { alert(err.response?.data?.error || 'Error'); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Employees</h1>
                    <p className="text-dark-400 text-sm mt-1">{employees.length} employees</p>
                </div>
                {isManager && <button onClick={openCreate} className="btn btn-primary"><HiOutlinePlus className="w-5 h-5" /> Add Employee</button>}
            </div>

            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[250px]">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" placeholder="Search employees by name, ID, or role..." className="w-full py-3 pl-12 pr-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[140px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Join Date</th>
                                <th>Salary Type</th>
                                <th>Base Salary</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-8 text-dark-400">Loading...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-8 text-dark-400">No employees found</td></tr>
                            ) : employees.map(emp => (
                                <tr key={emp.id}>
                                    <td className="font-mono text-sm text-primary-400">{emp.employee_id}</td>
                                    <td className="font-medium text-dark-200">{emp.name}</td>
                                    <td className="text-dark-300">{emp.role}</td>
                                    <td className="text-dark-400">{emp.department || '—'}</td>
                                    <td className="text-dark-400">{emp.join_date || '—'}</td>
                                    <td><span className="badge badge-info">{emp.salary_type}</span></td>
                                    <td className="text-dark-300">₹{(emp.base_salary || 0).toLocaleString('en-IN')}</td>
                                    <td>
                                        <span className={`badge ${emp.status === 'Active' ? 'badge-success' : emp.status === 'On Leave' ? 'badge-warning' : 'badge-danger'}`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <Link to={`/employees/${emp.id}`} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors">
                                                <HiOutlineEye className="w-4 h-4" />
                                            </Link>
                                            {isManager && (
                                                <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg text-dark-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isManager && (
                                                <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Employee' : 'Add Employee'} size="lg">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="form-label">Employee ID *</label><input className="form-input" value={form.employee_id || ''} onChange={e => setForm({ ...form, employee_id: e.target.value })} required placeholder="e.g. EMP007" /></div>
                        <div><label className="form-label">Full Name *</label><input className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div><label className="form-label">Role</label><input className="form-input" value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Mechanic" /></div>
                        <div><label className="form-label">Department</label><input className="form-input" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                        <div><label className="form-label">Join Date</label><input type="date" className="form-input" value={form.join_date || ''} onChange={e => setForm({ ...form, join_date: e.target.value })} /></div>
                        <div>
                            <label className="form-label">Salary Type</label>
                            <select className="form-select" value={form.salary_type || 'Monthly'} onChange={e => setForm({ ...form, salary_type: e.target.value })}>
                                <option value="Monthly">Monthly</option><option value="Daily">Daily</option><option value="Hourly">Hourly</option>
                            </select>
                        </div>
                        <div><label className="form-label">Base Salary (₹)</label><input type="number" className="form-input" value={form.base_salary || ''} onChange={e => setForm({ ...form, base_salary: parseFloat(e.target.value) || 0 })} /></div>
                        <div>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={form.status || 'Active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                                <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="On Leave">On Leave</option>
                            </select>
                        </div>
                        <div><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><label className="form-label">Email</label><input type="email" className="form-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    </div>
                    <div><label className="form-label">Address</label><textarea className="form-input" rows={2} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
