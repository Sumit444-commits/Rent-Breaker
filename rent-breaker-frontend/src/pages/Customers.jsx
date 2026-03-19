import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext'; // Added for RBAC

const emptyForm = { name: '', phone: '', cnic: '', address: '', notes: '' };

export default function Customers() {
  const { user } = useAuth(); // Get current user to check roles
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  
  // Form States
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const { data } = await api.get('/customers', { params });
      setCustomers(data.data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  // Debounced search
  const handleSearch = (e) => {
    setSearch(e.target.value);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => fetchCustomers(), 400);
  };

  const openAdd = () => { 
    setEditing(null); 
    setForm(emptyForm); 
    setShowModal(true); 
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ 
      name: c.name, 
      phone: c.phone, 
      cnic: c.cnic, 
      address: c.address, 
      notes: c.notes || '' 
    });
    setShowModal(true);
  };

  const openHistory = async (c) => {
    setShowHistory(c);
    setHistoryData(null); // Reset history data before fetching new
    try {
      const { data } = await api.get(`/customers/${c._id}`);
      setHistoryData(data.data);
    } catch {
      toast.error('Failed to load history');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.cnic || !form.address) {
      toast.error('Please fill all required fields'); 
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing._id}`, form);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added successfully');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const statusBadge = (s) => {
    const map = { 
        active: 'bg-blue-50 text-blue-700', 
        completed: 'bg-green-50 text-green-700', 
        overdue: 'bg-red-50 text-red-700', 
        pending: 'bg-amber-50 text-amber-700' 
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${map[s] || 'bg-gray-100 text-gray-600'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} registered customers</p>
        </div>
        <button 
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-800"
          onClick={openAdd}
        >
          + Add customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" 
            placeholder="Search by name, phone, CNIC…" 
            value={search} 
            onChange={handleSearch} 
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-2 text-3xl">👥</div>
            <p>{search ? 'No matches found for your search' : 'No customers found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">CNIC</th>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {customers.map((c) => (
                  <tr key={c._id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-gray-600">{c.phone}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{c.cnic}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">{c.address}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm" onClick={() => openHistory(c)}>History</button>
                        <button className="rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm" onClick={() => openEdit(c)}>Edit</button>
                        
                        {/* RBAC: Only Admins can see and use the Delete button */}
                        {user?.role === 'admin' && (
                          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 shadow-sm" onClick={() => handleDelete(c._id)}>Delete</button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal
          title={editing ? 'Edit customer' : 'Add new customer'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 shadow-sm" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add customer'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Full name *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rashid Enterprises" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Phone *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">CNIC *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="42101-1234567-1" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Address *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, Area" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-semibold text-gray-700">Notes</label>
            <textarea className="min-h-[80px] w-full resize-y rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes…" />
          </div>
        </Modal>
      )}

      {/* Rental History Modal */}
      {showHistory && (
        <Modal 
          title={`Rental history — ${showHistory.name}`} 
          onClose={() => { setShowHistory(null); setHistoryData(null); }}
        >
          {!historyData ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : historyData.rentals.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p>No rental history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Machine</th>
                    <th className="py-3 px-4 text-center">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px]">
                  {historyData.rentals.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">{r.machine?.name || '—'}</td>
                      <td className="py-3 px-4 text-center text-gray-500">
                        {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-center">{r.totalDays}</td>
                      <td className="py-3 px-4 font-medium">₨{(r.totalRent || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}