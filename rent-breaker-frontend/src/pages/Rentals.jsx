import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext'; // Added for RBAC

const STATUS_FILTERS = ['all', 'pending', 'active', 'completed', 'overdue'];
const emptyForm = { machine: '', customer: '', startDate: '', endDate: '', advancePayment: '', notes: '' };

export default function Rentals() {
  const { user } = useAuth(); // Get current user
  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  const [rentals, setRentals] = useState([]);
  const [machines, setMachines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null); // State for viewing details
  
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/rentals', { params });
      setRentals(data.data);
    } catch { 
      toast.error('Failed to load rentals'); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        api.get('/machines', { params: { status: 'available' } }),
        api.get('/customers'),
      ]);
      setMachines(mRes.data.data);
      setCustomers(cRes.data.data);
    } catch {
      toast.error('Failed to load form data');
    }
  };

  useEffect(() => { fetchRentals(); }, [filter]);

  const openAdd = () => {
    fetchDropdowns();
    setForm(emptyForm);
    setPreview(null);
    setShowModal(true);
  };

  // Real-time calculation preview
  useEffect(() => {
    if (!form.machine || !form.startDate || !form.endDate) { setPreview(null); return; }
    const machine = machines.find((m) => m._id === form.machine);
    if (!machine) return;
    
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (days <= 0) { setPreview(null); return; }
    
    const total = days * machine.rentalPricePerDay;
    const advance = parseFloat(form.advancePayment) || 0;
    setPreview({ days, total, balance: total - advance, pricePerDay: machine.rentalPricePerDay });
  }, [form.machine, form.startDate, form.endDate, form.advancePayment, machines]);

  const handleSave = async () => {
    if (!form.machine || !form.customer || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields'); return;
    }
    
    // Additional validation
    if (preview && parseFloat(form.advancePayment) > preview.total) {
      toast.error('Advance payment cannot exceed total rent'); return;
    }

    setSaving(true);
    try {
      await api.post('/rentals', form);
      toast.success('Rental booked successfully');
      setShowModal(false);
      fetchRentals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { 
      setSaving(false); 
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Mark this rental as ${status}?`)) return;
    try {
      await api.put(`/rentals/${id}`, { status });
      toast.success(`Rental marked as ${status}`);
      fetchRentals();
      if (showDetail?._id === id) setShowDetail((prev) => ({ ...prev, status }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  // Admin Delete Function
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this rental?')) return;
    try {
      await api.delete(`/rentals/${id}`);
      toast.success('Rental deleted successfully');
      fetchRentals();
      setShowDetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const statusBadge = (s) => {
    const map = { active: 'bg-blue-50 text-blue-700', completed: 'bg-green-50 text-green-700', overdue: 'bg-red-50 text-red-700', pending: 'bg-amber-50 text-amber-700' };
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isCustomer ? 'My Rentals' : 'Rentals'}</h1>
          <p className="text-sm text-gray-500">Book and manage machine rentals</p>
        </div>
        {!isCustomer && (
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 transition-all" onClick={openAdd}>
            + New rental
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((f) => (
          <button 
            key={f} 
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === f ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`} 
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({rentals.filter(r => f === 'all' || r.status === f).length})
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" /></div>
        ) : rentals.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-2 text-3xl">📋</div>
            <p>No rentals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {!isCustomer && <th className="px-6 py-3">Customer</th>}
                  <th className="px-6 py-3">Machine</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {rentals.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    {!isCustomer && <td className="px-6 py-4 font-semibold text-gray-900">{r.customer?.name}</td>}
                    <td className="px-6 py-4 text-gray-600">{r.machine?.name}</td>
                    <td className="px-6 py-4 text-gray-500">{r.totalDays} days</td>
                    <td className="px-6 py-4 font-medium">₨{r.totalRent?.toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${r.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₨{r.remainingBalance?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">{statusBadge(r.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm" onClick={() => setShowDetail(r)}>View</button>
                        
                        {/* Only Staff/Admins can mark rentals as completed directly from the table */}
                        {!isCustomer && (r.status === 'active' || r.status === 'overdue') && (
                          <button className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 shadow-sm" onClick={() => handleStatusUpdate(r._id, 'completed')}>End</button>
                        )}
                        
                        {/* Only Admins can delete */}
                        {isAdmin && (
                          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 shadow-sm" onClick={() => handleDelete(r._id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD NEW RENTAL MODAL */}
      {showModal && (
        <Modal 
          title="Book New Rental" 
          onClose={() => setShowModal(false)} 
          footer={
            <>
              <button className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Booking...' : 'Confirm Booking'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Machine *</label>
              <select className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })}>
                <option value="">Select available machine...</option>
                {machines.map((m) => <option key={m._id} value={m._id}>{m.name} — ₨{m.rentalPricePerDay}/day</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Customer *</label>
              <select className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Start Date *</label>
                <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">End Date *</label>
                <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Advance Payment (PKR)</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" type="number" placeholder="0" value={form.advancePayment} onChange={(e) => setForm({ ...form, advancePayment: e.target.value })} />
            </div>

            {/* Dynamic Preview Box */}
            {preview && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-[13px]">
                <div className="mb-2 font-bold text-blue-700 uppercase tracking-wider text-[10px]">Rental Preview</div>
                <div className="grid grid-cols-2 gap-y-1">
                  <span className="text-gray-500">Duration:</span><span className="font-semibold">{preview.days} days</span>
                  <span className="text-gray-500">Total Rent:</span><span className="font-bold text-blue-700">₨{preview.total.toLocaleString()}</span>
                  <span className="text-gray-500">Advance:</span><span className="font-medium text-gray-800">₨{(parseFloat(form.advancePayment) || 0).toLocaleString()}</span>
                  <span className="text-gray-500 pt-1 border-t border-blue-100">Balance:</span>
                  <span className={`pt-1 border-t border-blue-100 font-bold ${preview.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₨{preview.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* RENTAL DETAIL MODAL (Added to make the "View" button work) */}
      {showDetail && (
        <Modal 
          title={`Rental Details — ${showDetail.machine?.name}`} 
          onClose={() => setShowDetail(null)}
          footer={
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" onClick={() => setShowDetail(null)}>Close</button>
          }
        >
          <div className="space-y-6 text-sm text-gray-800">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 border border-gray-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Customer Details</p>
                <p className="font-semibold">{showDetail.customer?.name}</p>
                <p className="text-gray-600">{showDetail.customer?.phone}</p>
                <p className="text-xs text-gray-500">{showDetail.customer?.address}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Machine Details</p>
                <p className="font-semibold">{showDetail.machine?.name}</p>
                <p className="text-gray-600">{showDetail.machine?.capacity}</p>
                <p className="text-xs text-gray-500">{showDetail.machine?.location}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-100 pb-1">Rental Period</p>
              <div className="flex justify-between">
                <span><span className="text-gray-500">Start:</span> {new Date(showDetail.startDate).toLocaleDateString()}</span>
                <span><span className="text-gray-500">End:</span> {new Date(showDetail.endDate).toLocaleDateString()}</span>
                <span className="font-semibold">{showDetail.totalDays} Days</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-100 pb-1">Financial Summary</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Total Rent:</span> <span>₨{showDetail.totalRent?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Advance Paid:</span> <span>₨{showDetail.advancePayment?.toLocaleString()}</span></div>
                <div className="flex justify-between pt-1 font-bold">
                  <span>Remaining Balance:</span> 
                  <span className={showDetail.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}>₨{showDetail.remainingBalance?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Current Status:</span> 
                {statusBadge(showDetail.status)}
              </div>
              
              {/* Allow Staff/Admin to manually complete it from the detail view */}
              {!isCustomer && (showDetail.status === 'active' || showDetail.status === 'overdue') && (
                <button 
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  onClick={() => {
                    handleStatusUpdate(showDetail._id, 'completed');
                    setShowDetail(null);
                  }}
                >
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}