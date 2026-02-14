import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { HiOutlineArrowLeft, HiOutlineCube } from 'react-icons/hi';

export default function EmployeeDetail() {
    const { id } = useParams();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/employees/${id}`).then(res => setEmployee(res.data)).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div></div>;
    if (!employee) return <div className="text-center py-20 text-dark-400">Employee not found</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <Link to="/employees" className="p-2 rounded-xl text-dark-400 hover:text-dark-200 hover:bg-dark-800/50 transition-colors">
                    <HiOutlineArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-dark-100">{employee.name}</h1>
                        <span className={`badge ${employee.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{employee.status}</span>
                    </div>
                    <p className="text-dark-400 text-sm mt-1">{employee.employee_id} • {employee.role} • {employee.department || 'No department'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Info */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Personal Information</h3>
                    <div className="space-y-3">
                        {[
                            ['Employee ID', employee.employee_id],
                            ['Full Name', employee.name],
                            ['Role', employee.role],
                            ['Department', employee.department || '—'],
                            ['Join Date', employee.join_date || '—'],
                            ['Phone', employee.phone || '—'],
                            ['Email', employee.email || '—'],
                            ['Salary Type', employee.salary_type],
                            ['Base Salary', `₹${(employee.base_salary || 0).toLocaleString('en-IN')}`],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between py-1.5">
                                <span className="text-sm text-dark-400">{l}</span>
                                <span className="text-sm text-dark-200 font-medium">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Salary Structure */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Salary Structure</h3>
                    {employee.salary_structure ? (
                        <div className="space-y-3">
                            <div className="pb-2 mb-2 border-b border-dark-700/30">
                                <p className="text-xs text-dark-500 font-medium mb-2">EARNINGS</p>
                                {[
                                    ['Basic Salary', employee.salary_structure.basic_salary],
                                    ['HRA', employee.salary_structure.hra],
                                    ['Transport', employee.salary_structure.transport_allowance],
                                    ['Medical', employee.salary_structure.medical_allowance],
                                    ['Other Allowances', employee.salary_structure.other_allowances],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between py-1">
                                        <span className="text-sm text-dark-400">{l}</span>
                                        <span className="text-sm text-green-400">₹{(v || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pb-2 mb-2 border-b border-dark-700/30">
                                <p className="text-xs text-dark-500 font-medium mb-2">DEDUCTIONS</p>
                                {[
                                    ['PF', employee.salary_structure.pf_deduction],
                                    ['Tax', employee.salary_structure.tax_deduction],
                                    ['Other', employee.salary_structure.other_deductions],
                                ].map(([l, v]) => (
                                    <div key={l} className="flex justify-between py-1">
                                        <span className="text-sm text-dark-400">{l}</span>
                                        <span className="text-sm text-red-400">₹{(v || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-sm text-dark-400">Overtime Rate</span>
                                <span className="text-sm text-dark-200">₹{(employee.salary_structure.overtime_rate || 0).toLocaleString('en-IN')}/hr</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-dark-500 text-sm">No salary structure defined</p>
                    )}
                </div>
            </div>

            {/* Assigned Assets */}
            <div className="glass-card p-6">
                <h3 className="text-base font-semibold text-dark-200 mb-4">Assigned Assets ({employee.assigned_assets?.length || 0})</h3>
                {employee.assigned_assets?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {employee.assigned_assets.map(asset => (
                            <Link key={asset.id} to={`/assets/${asset.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                                    <HiOutlineCube className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-dark-200">{asset.asset_name}</p>
                                    <p className="text-xs text-dark-400">{asset.asset_code} • {asset.asset_type}</p>
                                </div>
                                <span className={`ml-auto badge ${asset.status === 'In Use' ? 'badge-success' : 'badge-warning'}`}>{asset.status}</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-dark-500 text-sm">No assets assigned</p>
                )}
            </div>
        </div>
    );
}
