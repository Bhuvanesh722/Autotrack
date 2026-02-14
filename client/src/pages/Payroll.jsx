import { useState, useEffect } from 'react';
import api from '../api';
import { HiOutlineRefresh, HiOutlineUsers } from 'react-icons/hi';

export default function Payroll() {
    const [employees, setEmployees] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [runLoading, setRunLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [message, setMessage] = useState('');

    useEffect(() => { load(); }, [month, year]);

    const load = async () => {
        setLoading(true);
        try {
            const [empRes, recRes] = await Promise.all([
                api.get('/employees', { params: { status: 'Active' } }),
                api.get('/payroll/records', { params: { month, year } }),
            ]);
            setEmployees(empRes.data);
            setRecords(recRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const runPayroll = async () => {
        if (!confirm(`Run payroll for ${month}/${year} for all active employees?`)) return;
        setRunLoading(true);
        setMessage('');
        try {
            const res = await api.post('/payroll/run', { month, year });
            setMessage(res.data.message);
            load();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
        finally { setRunLoading(false); }
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Payroll</h1>
                    <p className="text-dark-400 text-sm mt-1">Monthly payroll management</p>
                </div>
                <div className="flex items-center gap-3">
                    <select className="form-select w-auto" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="form-select w-auto" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={runPayroll} disabled={runLoading} className="btn btn-success">
                        <HiOutlineRefresh className={`w-5 h-5 ${runLoading ? 'animate-spin' : ''}`} />
                        {runLoading ? 'Processing...' : 'Run Payroll'}
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-fade-in">
                    ✅ {message}
                </div>
            )}

            {/* Summary cards */}
            {records.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4">
                        <p className="text-xs text-dark-500 font-medium mb-1">Employees Paid</p>
                        <p className="text-2xl font-bold text-dark-100">{records.length}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-dark-500 font-medium mb-1">Total Gross</p>
                        <p className="text-2xl font-bold text-green-400">₹{records.reduce((s, r) => s + r.gross_salary, 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-dark-500 font-medium mb-1">Total Deductions</p>
                        <p className="text-2xl font-bold text-red-400">₹{records.reduce((s, r) => s + r.total_deductions, 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-dark-500 font-medium mb-1">Net Payable</p>
                        <p className="text-2xl font-bold text-primary-400">₹{records.reduce((s, r) => s + r.net_salary, 0).toLocaleString('en-IN')}</p>
                    </div>
                </div>
            )}

            {/* Payroll Records */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Working Days</th>
                                <th>Present</th>
                                <th>Overtime (hrs)</th>
                                <th>Basic</th>
                                <th>Allowances</th>
                                <th>OT Pay</th>
                                <th>Deductions</th>
                                <th>Net Salary</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={10} className="text-center py-8 text-dark-400">Loading...</td></tr>
                            ) : records.length === 0 ? (
                                <tr><td colSpan={10} className="text-center py-8 text-dark-400">No payroll records for {months[month - 1]} {year}. Click "Run Payroll" to generate.</td></tr>
                            ) : records.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <p className="font-medium text-dark-200">{r.employee_name}</p>
                                        <p className="text-xs text-dark-500">{r.employee_code}</p>
                                    </td>
                                    <td className="text-dark-300">{r.working_days}</td>
                                    <td className="text-dark-300">{r.present_days}</td>
                                    <td className="text-dark-300">{r.overtime_hours}</td>
                                    <td className="text-dark-300">₹{(r.basic_salary || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-green-400">₹{(r.total_allowances || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-cyan-400">₹{(r.overtime_pay || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-red-400">₹{(r.total_deductions || 0).toLocaleString('en-IN')}</td>
                                    <td className="font-semibold text-dark-100">₹{(r.net_salary || 0).toLocaleString('en-IN')}</td>
                                    <td><span className="badge badge-success">{r.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
