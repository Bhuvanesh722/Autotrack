import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-soft"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '0.5s' }}></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 animate-slide-up">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-5 shadow-2xl shadow-blue-500/20">
                        <span className="text-white text-3xl font-bold">A</span>
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">AutoTrack</h1>
                    <p className="text-dark-400 text-sm">Automotive Asset & Payroll Management</p>
                </div>

                {/* Login form */}
                <form onSubmit={handleSubmit} className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-xl font-semibold text-dark-100 mb-6">Sign in to your account</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="form-label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    className="form-input pr-10"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                                >
                                    {showPass ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full justify-center py-3 text-base mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </div>
                </form>

                {/* Demo credentials */}
                <div className="mt-6 glass-card p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <p className="text-xs text-dark-400 mb-2 font-medium">Demo Credentials</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { user: 'manager', pass: 'manager123', role: 'Manager' },
                            { user: 'employee', pass: 'employee123', role: 'Employee' },
                        ].map((cred) => (
                            <button
                                key={cred.user}
                                type="button"
                                onClick={() => { setUsername(cred.user); setPassword(cred.pass); }}
                                className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/30 text-center hover:border-primary-500/30 transition-colors cursor-pointer"
                            >
                                <p className="text-xs font-semibold text-dark-200">{cred.role}</p>
                                <p className="text-[10px] text-dark-500 mt-0.5">{cred.user}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
