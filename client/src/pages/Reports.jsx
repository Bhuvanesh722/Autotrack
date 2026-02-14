import { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444', '#f59e0b', '#ec4899'];

export default function Reports() {
    const [activeTab, setActiveTab] = useState('assets');
    const [assetReport, setAssetReport] = useState(null);
    const [payrollReport, setPayrollReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadReports(); }, []);

    const loadReports = async () => {
        try {
            const [assetRes, payrollRes] = await Promise.all([
                api.get('/dashboard/reports/assets'),
                api.get('/dashboard/reports/payroll'),
            ]);
            setAssetReport(assetRes.data);
            setPayrollReport(payrollRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div></div>;

    const tabs = [
        { key: 'assets', label: 'Asset Reports' },
        { key: 'payroll', label: 'Payroll Reports' },
    ];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-dark-100">Reports</h1>
                <p className="text-dark-400 text-sm mt-1">Business insights and analytics</p>
            </div>

            <div className="flex border-b border-dark-700/50">
                {tabs.map(t => (
                    <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Asset Reports */}
            {activeTab === 'assets' && assetReport && (
                <div className="space-y-6">
                    {/* Asset Cost Breakdown */}
                    <div className="glass-card p-6">
                        <h3 className="text-base font-semibold text-dark-200 mb-4">Asset Cost Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Asset</th>
                                        <th>Type</th>
                                        <th>Purchase Cost</th>
                                        <th>Maintenance Cost</th>
                                        <th>Total Cost</th>
                                        <th>Services</th>
                                        <th>Parts</th>
                                        <th>Replaced</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetReport.asset_costs.map(a => (
                                        <tr key={a.id}>
                                            <td>
                                                <p className="font-medium text-dark-200">{a.asset_name}</p>
                                                <p className="text-xs text-dark-500">{a.asset_code}</p>
                                            </td>
                                            <td><span className="badge badge-info">{a.asset_type}</span></td>
                                            <td className="text-dark-300">₹{(a.purchase_cost || 0).toLocaleString('en-IN')}</td>
                                            <td className="text-orange-400">₹{(a.total_maintenance_cost || 0).toLocaleString('en-IN')}</td>
                                            <td className="font-semibold text-dark-100">₹{((a.purchase_cost || 0) + (a.total_maintenance_cost || 0)).toLocaleString('en-IN')}</td>
                                            <td className="text-dark-300">{a.service_count}</td>
                                            <td className="text-dark-300">{a.parts_count}</td>
                                            <td className="text-dark-300">{a.replaced_parts}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Maintenance Cost Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-base font-semibold text-dark-200 mb-4">Maintenance Cost by Asset</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={assetReport.asset_costs.filter(a => a.total_maintenance_cost > 0)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="asset_code" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Cost']} />
                                    <Bar dataKey="total_maintenance_cost" fill="#f97316" radius={[6, 6, 0, 0]} name="Maintenance Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Part Replacements */}
                    {assetReport.part_replacements.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-base font-semibold text-dark-200 mb-4">Part Replacement Frequency</h3>
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead><tr><th>Part</th><th>Brand</th><th>Asset</th><th>Changes</th></tr></thead>
                                    <tbody>
                                        {assetReport.part_replacements.map((p, i) => (
                                            <tr key={i}>
                                                <td className="font-medium text-dark-200">{p.part_name}</td>
                                                <td className="text-dark-400">{p.brand || '—'}</td>
                                                <td className="text-dark-300">{p.asset_name} <span className="text-dark-500">({p.asset_code})</span></td>
                                                <td><span className="badge badge-warning">{p.change_count} changes</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payroll Reports */}
            {activeTab === 'payroll' && payrollReport && (
                <div className="space-y-6">
                    {/* Monthly Payroll Cost Chart */}
                    {payrollReport.monthly_costs.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-base font-semibold text-dark-200 mb-4">Monthly Payroll Cost</h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={payrollReport.monthly_costs.map(m => ({ ...m, label: `${months[m.month - 1]} ${m.year}` })).reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, '']} />
                                        <Bar dataKey="total_gross" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Gross" />
                                        <Bar dataKey="total_net" fill="#10b981" radius={[6, 6, 0, 0]} name="Net" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Monthly Summary Table */}
                    {payrollReport.monthly_costs.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-base font-semibold text-dark-200 mb-4">Monthly Summary</h3>
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead><tr><th>Period</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Overtime</th><th>Net</th></tr></thead>
                                    <tbody>
                                        {payrollReport.monthly_costs.map((m, i) => (
                                            <tr key={i}>
                                                <td className="font-medium text-dark-200">{months[m.month - 1]} {m.year}</td>
                                                <td className="text-dark-300">{m.employee_count}</td>
                                                <td className="text-dark-300">₹{(m.total_gross || 0).toLocaleString('en-IN')}</td>
                                                <td className="text-red-400">₹{(m.total_deductions || 0).toLocaleString('en-IN')}</td>
                                                <td className="text-cyan-400">₹{(m.total_overtime || 0).toLocaleString('en-IN')}</td>
                                                <td className="font-semibold text-green-400">₹{(m.total_net || 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Employee-wise Salary */}
                    {payrollReport.employee_salaries.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="text-base font-semibold text-dark-200 mb-4">Employee-wise Salary Details</h3>
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead><tr><th>Employee</th><th>Department</th><th>Period</th><th>Days</th><th>OT (hrs)</th><th>Net Salary</th></tr></thead>
                                    <tbody>
                                        {payrollReport.employee_salaries.map((s, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <p className="font-medium text-dark-200">{s.employee_name}</p>
                                                    <p className="text-xs text-dark-500">{s.employee_code}</p>
                                                </td>
                                                <td className="text-dark-400">{s.department || '—'}</td>
                                                <td className="text-dark-300">{months[s.month - 1]} {s.year}</td>
                                                <td className="text-dark-300">{s.present_days}/{s.working_days}</td>
                                                <td className="text-dark-300">{s.overtime_hours}</td>
                                                <td className="font-semibold text-dark-100">₹{(s.net_salary || 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
