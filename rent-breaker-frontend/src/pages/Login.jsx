import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const { login, signup, loading } = useAuth(); // Assuming signup exists in your context
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine if we are on login or signup based on ?page=...
  const [isLogin, setIsLogin] = useState(searchParams.get('page') !== 'signup');
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'customer' // Default role for signup
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setIsLogin(searchParams.get('page') !== 'signup');
  }, [searchParams]);

  const validate = () => {
    const e = {};
    if (!isLogin && !form.name) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    let result;
    if (isLogin) {
      result = await login(form.email, form.password);
    } else {
      result = await signup(form); // Send full form for signup
    }

    if (result.success) {
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const togglePage = () => {
    const newPage = isLogin ? 'signup' : 'login';
    navigate(`/auth?page=${newPage}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 transition-all">
      <div className="w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white shadow-lg shadow-blue-200">
            RB
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin ? 'Sign in to manage your rentals' : 'Join the Rent Breaker network'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field - Only for Signup */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Full Name</label>
              <input
                className={`w-full rounded-lg border p-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 ${
                  errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-600'
                }`}
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <div className="text-[11px] text-red-500">{errors.name}</div>}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Email Address</label>
            <input
              className={`w-full rounded-lg border p-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 ${
                errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-600'
              }`}
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <div className="text-[11px] text-red-500">{errors.email}</div>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Password</label>
            <input
              className={`w-full rounded-lg border p-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 ${
                errors.password ? 'border-red-500' : 'border-gray-200 focus:border-blue-600'
              }`}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {errors.password && <div className="text-[11px] text-red-500">{errors.password}</div>}
          </div>

          {/* Role Selection - Only for Signup (Admin/Staff roles usually restricted, but included for your SRS requirement) */}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">I am a...</label>
              <select 
                className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="customer">Customer</option>
                <option value="staff">Staff / Operator</option>
                <option value="admin">Owner / Admin</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-800 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={togglePage}
            className="text-xs font-medium text-blue-700 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 Rent Breaker. All rights reserved.
        </p>
      </div>
    </div>
  );
}