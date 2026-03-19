
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../utils/api';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [revenue, setRevenue]     = useState([]);
  const [utilization, setUtil]    = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, revRes, utilRes, custRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/revenue?months=12'),
          api.get('/reports/utilization'),
          api.get('/customers'),
        ]);
        setDashboard(dashRes.data.data);
        setRevenue(revRes.data.data.map((d) => ({
          month: MONTH_NAMES[d._id.month - 1] + ' ' + String(d._id.year).slice(2),
          revenue: d.revenue,
          rentals: d.rentalCount,
        })));
        setUtil(utilRes.data.data.sort((a, b) => b.utilizationPercent - a.utilizationPercent));
        setCustomers(custRes.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-700" /></div>;

  const m = dashboard?.machines || {};
  const rev = dashboard?.revenue || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Business performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Machines', val: m.total },
          { label: 'Rentals (Month)', val: rev.thisMonthRentalCount },
          { label: 'Revenue (Month)', val: `₨${rev.thisMonth?.toLocaleString()}` },
          { label: 'Total Customers', val: customers.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{s.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-sm font-bold text-gray-800 uppercase tracking-tight">Revenue Trend — 12 Months</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer>
            <BarChart data={revenue} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickFormatter={(v) => `₨${v/1000}k`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="revenue" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-tight">Machine Utilization</h2>
          <div className="space-y-4">
            {utilization.slice(0, 5).map(u => (
              <div key={u.machine.id}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="font-semibold text-gray-700">{u.machine.name}</span>
                  <span className="text-gray-400">{u.utilizationPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${u.utilizationPercent > 70 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${u.utilizationPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-tight">Recent Customers</h2>
          <div className="divide-y divide-gray-100">
            {customers.slice(0, 5).map(c => (
              <div key={c._id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">{c.name}</div>
                  <div className="text-[11px] text-gray-400">{c.phone}</div>
                </div>
                <div className="text-[11px] font-medium text-gray-500 uppercase">{c.address?.split(',').pop()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}