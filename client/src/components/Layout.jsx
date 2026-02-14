import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineViewGrid, HiOutlineCube, HiOutlineUsers, HiOutlineCurrencyDollar,
    HiOutlineDocumentReport, HiOutlineCog, HiOutlineLogout, HiOutlineMenu,
    HiOutlineX, HiOutlineChevronDown, HiOutlineDocumentText
} from 'react-icons/hi';

const navItems = [
    { path: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
    { path: '/assets', icon: HiOutlineCube, label: 'Assets' },
    { path: '/employees', icon: HiOutlineUsers, label: 'Employees', managerOnly: true },
    { path: '/maintenance', icon: HiOutlineCog, label: 'Maintenance' },
    { path: '/payroll', icon: HiOutlineCurrencyDollar, label: 'Payroll', managerOnly: true },
    { path: '/payslip', icon: HiOutlineDocumentText, label: 'Payslip Generator', managerOnly: true },
    { path: '/reports', icon: HiOutlineDocumentReport, label: 'Reports', managerOnly: true },
];

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-20'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-r border-dark-700/50`}>

                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-dark-700/50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg font-bold">A</span>
                    </div>
                    {sidebarOpen && (
                        <div className="animate-fade-in">
                            <h1 className="text-lg font-bold gradient-text">AutoTrack</h1>
                            <p className="text-[10px] text-dark-400 uppercase tracking-wider">Asset Management</p>
                        </div>
                    )}
                </div>

                {/* Nav links */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems
                        .filter(item => !item.managerOnly || user?.role === 'manager')
                        .map((item) => {
                            const active = location.pathname === item.path ||
                                (item.path !== '/' && location.pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                                            ? 'bg-primary-600/15 text-primary-400 shadow-lg shadow-primary-900/20'
                                            : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary-400' : ''}`} />
                                    {sidebarOpen && <span className="animate-fade-in">{item.label}</span>}
                                </Link>
                            );
                        })}
                </nav>

                {/* User section */}
                <div className="p-3 border-t border-dark-700/50">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-800/50 ${sidebarOpen ? '' : 'justify-center'}`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-green to-accent-cyan flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{user?.full_name?.charAt(0) || 'U'}</span>
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0 animate-fade-in">
                                <p className="text-sm font-medium text-dark-200 truncate">{user?.full_name}</p>
                                <p className="text-[10px] text-dark-500 uppercase">{user?.role}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        className={`mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${sidebarOpen ? '' : 'justify-center'}`}
                    >
                        <HiOutlineLogout className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-dark-400 hover:text-dark-200">
                            <HiOutlineMenu className="w-6 h-6" />
                        </button>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block text-dark-400 hover:text-dark-200 transition-colors">
                            <HiOutlineMenu className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-dark-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6 bg-dark-950/50">
                    {children}
                </main>
            </div>
        </div>
    );
}
