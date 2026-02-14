import { useState } from 'react';
import api from '../api';
import { HiOutlineDocumentText, HiOutlinePrinter, HiOutlineSearch } from 'react-icons/hi';

export default function PayslipGenerate() {
    const [empId, setEmpId] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const generate = async () => {
        if (!empId.trim()) { setError('Please enter Employee ID'); return; }
        setLoading(true);
        setError('');
        setPayslip(null);
        try {
            const res = await api.post('/payroll/generate-payslip', { emp_id: empId.trim(), month, year });
            setPayslip(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate payslip');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-dark-100">One-Click Payslip Generator</h1>
                <p className="text-dark-400 text-sm mt-1">Enter Employee ID to instantly generate a payslip</p>
            </div>

            {/* Generator Card */}
            <div className="glass-card p-6 no-print">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="form-label">Employee ID</label>
                        <div className="relative">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                className="w-full py-3 pl-12 pr-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="e.g. EMP001"
                                value={empId}
                                onChange={e => setEmpId(e.target.value.toUpperCase())}
                                onKeyDown={e => e.key === 'Enter' && generate()}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Month</label>
                        <select className="py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Year</label>
                        <select className="py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-600/40 text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button onClick={generate} disabled={loading} className="btn btn-primary py-[10px]">
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Generating...
                            </span>
                        ) : (
                            <>
                                <HiOutlineDocumentText className="w-5 h-5" /> Generate Payslip
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                        {error}
                    </div>
                )}
            </div>

            {/* Payslip Display */}
            {payslip && (
                <div className="glass-card p-8 animate-slide-up max-w-3xl mx-auto" id="payslip">
                    {/* Print Button */}
                    <div className="flex justify-end mb-4 no-print">
                        <button onClick={handlePrint} className="btn btn-ghost text-sm">
                            <HiOutlinePrinter className="w-4 h-4" /> Print Payslip
                        </button>
                    </div>

                    {/* Company Header */}
                    <div className="text-center mb-6 pb-6 border-b border-dark-700/50">
                        <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3">
                            <span className="text-white text-xl font-bold">A</span>
                        </div>
                        <h2 className="text-xl font-bold gradient-text">AutoTrack</h2>
                        <p className="text-dark-400 text-sm mt-1">Payslip - {payslip.period.month_name} {payslip.period.year}</p>
                    </div>

                    {/* Employee Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-dark-800/30">
                        {[
                            ['Employee ID', payslip.employee.employee_id],
                            ['Name', payslip.employee.name],
                            ['Role', payslip.employee.role],
                            ['Department', payslip.employee.department || '—'],
                            ['Join Date', payslip.employee.join_date || '—'],
                            ['Pay Period', `${payslip.period.month_name} ${payslip.period.year}`],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between">
                                <span className="text-xs text-dark-400">{l}</span>
                                <span className="text-xs text-dark-200 font-medium">{v}</span>
                            </div>
                        ))}
                    </div>

                    {/* Attendance Summary */}
                    <div className="mb-6 p-4 rounded-xl bg-dark-800/30">
                        <h4 className="text-sm font-semibold text-dark-300 mb-3">Attendance Summary</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                            {[
                                ['Working Days', payslip.attendance.working_days],
                                ['Present', payslip.attendance.present_days],
                                ['Half Days', payslip.attendance.half_days],
                                ['Absent', payslip.attendance.absent_days],
                                ['Effective Days', payslip.attendance.effective_days],
                                ['Overtime (hrs)', payslip.attendance.overtime_hours],
                            ].map(([l, v]) => (
                                <div key={l} className="p-2 rounded-lg bg-dark-900/50">
                                    <p className="text-lg font-bold text-dark-100">{v}</p>
                                    <p className="text-[10px] text-dark-500 mt-0.5">{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Earnings & Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Earnings */}
                        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                            <h4 className="text-sm font-semibold text-green-400 mb-3">Earnings</h4>
                            <div className="space-y-2">
                                {[
                                    ['Basic Salary', payslip.earnings.basic_salary],
                                    ['HRA', payslip.earnings.hra],
                                    ['Transport Allowance', payslip.earnings.transport_allowance],
                                    ['Medical Allowance', payslip.earnings.medical_allowance],
                                    ['Other Allowances', payslip.earnings.other_allowances],
                                    ['Overtime Pay', payslip.earnings.overtime_pay],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between">
                                        <span className="text-xs text-dark-400">{l}</span>
                                        <span className="text-xs text-green-400 font-medium">₹{(v || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                                <div className="pt-2 mt-2 border-t border-green-500/20 flex justify-between">
                                    <span className="text-sm font-semibold text-dark-200">Gross Salary</span>
                                    <span className="text-sm font-bold text-green-400">₹{payslip.earnings.gross_salary.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                            <h4 className="text-sm font-semibold text-red-400 mb-3">Deductions</h4>
                            <div className="space-y-2">
                                {[
                                    ['Provident Fund (PF)', payslip.deductions.pf],
                                    ['Tax Deduction', payslip.deductions.tax],
                                    ['Other Deductions', payslip.deductions.other],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between">
                                        <span className="text-xs text-dark-400">{l}</span>
                                        <span className="text-xs text-red-400 font-medium">₹{(v || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                                <div className="pt-2 mt-2 border-t border-red-500/20 flex justify-between">
                                    <span className="text-sm font-semibold text-dark-200">Total Deductions</span>
                                    <span className="text-sm font-bold text-red-400">₹{payslip.deductions.total.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-primary-500/20 text-center">
                        <p className="text-sm text-dark-400 mb-1">Net Salary Payable</p>
                        <p className="text-3xl font-bold gradient-text">₹{payslip.net_salary.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-dark-700/50 flex justify-between text-xs text-dark-500">
                        <span>Generated on {new Date(payslip.generated_at).toLocaleString('en-IN')}</span>
                        <span>AutoTrack Payroll System</span>
                    </div>
                </div>
            )}
        </div>
    );
}
