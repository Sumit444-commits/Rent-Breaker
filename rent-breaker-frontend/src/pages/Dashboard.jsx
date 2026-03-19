import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const { user } = useAuth();
  
  // States for Admin/Staff
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [recentRentals, setRecentRentals] = useState([]);
  
  // States for Customer
  const [customerRentals, setCustomerRentals] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (user?.role === 'admin' || user?.role === 'staff') {
          // Fetch operational stats for Admin and Staff
          const dashRes = await api.get('/reports/dashboard');
          const rentRes = await api.get('/rentals?status=active');
          
          setStats(dashRes.data.data);
          setRecentRentals(rentRes.data.data.slice(0, 5));

          // Fetch financial data ONLY for Admin
          if (user.role === 'admin') {
            const revRes = await api.get('/reports/revenue?months=6');
            const revData = revRes.data.data.map((d) => ({
              month: MONTH_NAMES[d._id.month - 1],
              revenue: d.revenue,
              count: d.rentalCount,
            }));
            setRevenue(revData);
          }
        } else if (user?.role === 'customer') {
          // Fetch specific data for Customers
          const [myRentalsRes, machinesRes] = await Promise.all([
            api.get('/rentals'), // Backend should filter this by req.user._id
            api.get('/machines?status=available')
          ]);
          setCustomerRentals(myRentalsRes.data.data);
          setAvailableMachines(machinesRes.data.data.slice(0, 4)); // Show 4 available
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-700" />
    </div>
  );

  const fmt = (n) => '₨' + (n || 0).toLocaleString();

  const statusBadge = (s) => {
    const map = { active: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700', overdue: 'bg-red-50 text-red-700', pending: 'bg-amber-50 text-amber-700' };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  // --- SUB-COMPONENTS FOR DIFFERENT ROLES ---

  const renderAdminDashboard = () => {
    const m = stats?.machines || {};
    const rev = stats?.revenue || {};
    return (
      <>
        {/* Admin Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Total machines</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{m.total || 0}</div>
            <div className="mt-1 text-[11px] text-gray-400">{m.available} available · {m.maintenance} in maintenance</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Active rentals</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats?.rentals?.active || 0}</div>
            <div className="mt-1 text-[11px] text-gray-400">{m.rented} machines rented out</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Revenue this month</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{fmt(rev.thisMonth)}</div>
            <div className={`mt-1 text-[11px] font-medium ${parseFloat(rev.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {rev.changePercent >= 0 ? '↑' : '↓'} {Math.abs(rev.changePercent)}% vs last month
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Pending balance</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{fmt(stats?.billing?.pendingBalance)}</div>
            <div className="mt-1 text-[11px] text-red-500">Outstanding from customers</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-semibold text-gray-800">Monthly revenue (PKR)</div>
            {revenue.length === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-gray-400">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenue} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: 'transparent' }} formatter={(v) => [fmt(v), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenue.map((_, i) => <Cell key={i} fill={i === revenue.length - 1 ? '#1D4ED8' : '#DBEAFE'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {renderMachineStatusBox()}
        </div>
        {renderActiveRentalsTable()}
      </>
    );
  };

  const renderStaffDashboard = () => {
    const m = stats?.machines || {};
    return (
      <>
        {/* Staff Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Total fleet</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{m.total || 0}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Machines Available</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{m.available || 0}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Needs Maintenance</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">{m.maintenance || 0}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {renderMachineStatusBox()}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="text-4xl mb-3">🛠️</div>
            <h3 className="font-bold text-gray-800">Staff Operations Hub</h3>
            <p className="text-sm text-gray-500 mt-2">Manage machine dispatch, returns, and maintenance logs from the sidebar menu.</p>
          </div>
        </div>
        {renderActiveRentalsTable()}
      </>
    );
  };

  const renderCustomerDashboard = () => {
    const activeRentals = customerRentals.filter(r => r.status === 'active' || r.status === 'overdue');
    const myPendingBalance = customerRentals.reduce((sum, r) => sum + (r.remainingBalance || 0), 0);

    return (
      <>
        {/* Customer Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 border-l-blue-600">
            <div className="text-xs font-semibold text-gray-500">My Active Rentals</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{activeRentals.length}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold text-gray-500">Total Rentals History</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{customerRentals.length}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 border-l-red-500">
            <div className="text-xs font-semibold text-gray-500">My Outstanding Balance</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{fmt(myPendingBalance)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
          {/* Customer's Active Rentals Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-[14px] font-semibold text-gray-800">My Current Rentals</h2>
            </div>
            {activeRentals.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">You have no active rentals.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] font-semibold uppercase text-gray-500">
                      <th className="px-6 py-3">Machine</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3 text-right">Balance</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[13px]">
                    {activeRentals.map(r => (
                      <tr key={r._id}>
                        <td className="px-6 py-4 font-medium">{r.machine?.name}</td>
                        <td className="px-6 py-4">{new Date(r.endDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">{fmt(r.remainingBalance)}</td>
                        <td className="px-6 py-4 text-center">{statusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Available Machines to Rent */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
             <div className="border-b border-gray-100 px-6 py-4 bg-blue-50">
              <h2 className="text-[14px] font-semibold text-blue-800">Available to Rent</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {availableMachines.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No machines currently available.</div>
              ) : (
                availableMachines.map(m => (
                  <div key={m._id} className="p-4 px-6 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{m.name}</div>
                      <div className="text-[11px] text-gray-500">{m.capacity} · {m.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-sm">{fmt(m.rentalPricePerDay)}<span className="text-[10px] text-gray-500 font-normal">/day</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  // --- REUSABLE UI BLOCKS ---

  const renderMachineStatusBox = () => {
    const m = stats?.machines || {};
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 text-sm font-semibold text-gray-800">Machine status</div>
        <div className="space-y-5">
          {[
            { label: 'Available', count: m.available, color: 'bg-green-600', text: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rented', count: m.rented, color: 'bg-blue-700', text: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Maintenance', count: m.maintenance, color: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg font-bold ${s.bg} ${s.text}`}>
                {s.count || 0}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-medium text-gray-700">{s.label}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${m.total ? ((s.count || 0) / m.total) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="text-[12px] text-gray-400">{m.total ? Math.round(((s.count || 0) / m.total) * 100) : 0}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveRentalsTable = () => (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mt-6">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-[14px] font-semibold text-gray-800">Recent active rentals</h2>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">{stats?.rentals?.active || 0} active</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Machine</th>
              <th className="px-6 py-3">Dates</th>
              <th className="px-6 py-3">Total Rent</th>
              <th className="px-6 py-3 text-right">Balance</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[13px]">
            {recentRentals.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{r.customer?.name || '—'}</td>
                <td className="px-6 py-4 text-gray-600">{r.machine?.name || '—'}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium">{fmt(r.totalRent)}</td>
                <td className={`px-6 py-4 text-right font-bold ${r.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(r.remainingBalance)}</td>
                <td className="px-6 py-4 text-right">{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome back, {user?.name.split(' ')[0]} — here's your overview.
          </p>
        </div>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 uppercase tracking-widest">
          {user?.role} View
        </span>
      </div>

      {user?.role === 'admin' && renderAdminDashboard()}
      {user?.role === 'staff' && renderStaffDashboard()}
      {user?.role === 'customer' && renderCustomerDashboard()}
    </div>
  );
}