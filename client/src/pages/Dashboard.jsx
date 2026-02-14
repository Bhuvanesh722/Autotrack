import { useState, useEffect } from 'react';
import api from '../api';
import { HiOutlineCube, HiOutlineUsers, HiOutlineCurrencyDollar, HiOutlineCog, HiOutlineExclamation } from 'react-icons/hi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ef4444'];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [distribution, setDistribution] = useState(null);
    const [trends, setTrends] = useState([]);
    const [activities, setActivities] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, distRes, trendsRes, actRes, upRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/asset-distribution'),
                api.get('/dashboard/cost-trends'),
                api.get('/dashboard/recent-activities'),
                api.get('/dashboard/upcoming-services'),
            ]);
            setStats(statsRes.data);
            setDistribution(distRes.data);
            setTrends(trendsRes.data);
            setActivities(actRes.data);
            setUpcoming(upRes.data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const statCards = [
        { label: 'Total Assets', value: stats?.assets?.total || 0, icon: HiOutlineCube, gradient: 'stat-blue', sub: `${stats?.assets?.active || 0} active` },
        { label: 'Active Employees', value: stats?.employees?.active || 0, icon: HiOutlineUsers, gradient: 'stat-green', sub: `${stats?.employees?.total || 0} total` },
        { label: 'Total Asset Value', value: formatCurrency(stats?.costs?.total_asset_value), icon: HiOutlineCurrencyDollar, gradient: 'stat-purple', sub: 'Purchase cost' },
        { label: 'Maintenance Cost', value: formatCurrency(stats?.costs?.total_maintenance_cost), icon: HiOutlineCog, gradient: 'stat-orange', sub: 'All time' },
        { label: 'Under Repair', value: stats?.assets?.under_repair || 0, icon: HiOutlineExclamation, gradient: 'stat-red', sub: 'Assets needing attention' },
        { label: 'Faulty Parts', value: stats?.parts?.faulty || 0, icon: HiOutlineCog, gradient: 'stat-amber', sub: `${stats?.parts?.total || 0} total parts` },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
                <p className="text-dark-400 text-sm mt-1">Overview of your automotive business</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className={`${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden animate-slide-up`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                            <card.icon className="w-full h-full" />
                        </div>
                        <card.icon className="w-6 h-6 mb-3 opacity-80" />
                        <p className="text-2xl font-bold">{card.value}</p>
                        <p className="text-sm font-medium opacity-90 mt-1">{card.label}</p>
                        <p className="text-xs opacity-60 mt-0.5">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Asset Distribution Pie */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Asset Distribution by Type</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={distribution?.by_type || []}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    innerRadius={50}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {(distribution?.by_type || []).map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Bar Chart */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Assets by Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution?.by_status || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {(distribution?.by_status || []).map((entry, i) => (
                                        <Cell key={i} fill={entry.name === 'In Use' ? '#10b981' : entry.name === 'Under Repair' ? '#f97316' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Cost Trends */}
            {trends.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Cost Trends (Last 12 Months)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="maintenance" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: '#f97316' }} name="Maintenance" />
                                <Line type="monotone" dataKey="payroll" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} name="Payroll" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Recent Activities</h3>
                    <div className="space-y-3">
                        {activities.length === 0 ? (
                            <p className="text-dark-500 text-sm">No recent activities</p>
                        ) : (
                            activities.map((act, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors">
                                    <span className="text-lg">{act.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-dark-200 font-medium truncate">{act.summary}</p>
                                        <p className="text-xs text-dark-500 mt-1">{act.date}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Services */}
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold text-dark-200 mb-4">Upcoming Services</h3>
                    <div className="space-y-3">
                        {upcoming.length === 0 ? (
                            <p className="text-dark-500 text-sm">No upcoming services</p>
                        ) : (
                            upcoming.map((u, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-800/30 hover:bg-dark-800/50 transition-colors">
                                    <div>
                                        <p className="text-sm text-dark-200 font-medium">{u.asset_name} <span className="text-dark-500">({u.asset_code})</span></p>
                                        <p className="text-xs text-dark-400 mt-0.5">{u.service_type}</p>
                                    </div>
                                    <span className="badge badge-warning">{u.next_service_due}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
