import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const STATUS_FILTERS = ['all', 'available', 'rented', 'maintenance'];
const emptyForm = { name: '', capacity: '', rentalPricePerDay: '', location: '', status: 'available', description: '' };

export default function Machines() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [machines, setMachines] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      const { data } = await api.get('/machines', { params });
      setMachines(data.data);
    } catch {
      toast.error('Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMachines(); }, [filter]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m) => { 
    setEditing(m); 
    setForm({ 
      name: m.name, 
      capacity: m.capacity, 
      rentalPricePerDay: m.rentalPricePerDay, 
      location: m.location, 
      status: m.status, 
      description: m.description || '' 
    }); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    if (!form.name || !form.capacity || !form.rentalPricePerDay || !form.location) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/machines/${editing._id}`, form);
        toast.success('Machine updated');
      } else {
        await api.post('/machines', form);
        toast.success('Machine added');
      }
      setShowModal(false);
      fetchMachines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this machine?')) return;
    try {
      await api.delete(`/machines/${id}`);
      toast.success('Machine deleted');
      fetchMachines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const statusBadge = (s) => {
    const map = { 
      available: 'bg-green-50 text-green-700', 
      rented: 'bg-blue-50 text-blue-700', 
      maintenance: 'bg-amber-50 text-amber-700' 
    };
    return (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${map[s] || 'bg-gray-100 text-gray-600'}`}>
        {s}
      </span>
    );
  };

  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? machines.length : machines.filter((m) => m.status === f).length;
    return acc;
  }, {});

  const filtered = machines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Machines</h1>
          <p className="text-sm text-gray-500">Manage your breaker machine fleet</p>
        </div>
        {isAdmin && (
          <button 
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-800" 
            onClick={openAdd}
          >
            + Add machine
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button 
              key={f} 
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                filter === f 
                ? 'border-blue-200 bg-blue-50 text-blue-700' 
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] || 0})
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" 
            placeholder="Search machines..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-2 text-3xl">⚙</div>
            <p>No machines found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Machine Name</th>
                  <th className="px-6 py-3">Capacity</th>
                  <th className="px-6 py-3">Price/Day</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {filtered.map((m) => (
                  <tr key={m._id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-gray-600">{m.capacity}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">₨{m.rentalPricePerDay.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">{m.location}</td>
                    <td className="px-6 py-4 text-center">{statusBadge(m.status)}</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button className="rounded border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50" onClick={() => openEdit(m)}>Edit</button>
                          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100" onClick={() => handleDelete(m._id)}>Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit machine' : 'Add new machine'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add machine'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Machine name *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. BM-100 Hydraulic" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Capacity *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 5 ton" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Price / Day (PKR) *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" type="number" value={form.rentalPricePerDay} onChange={(e) => setForm({ ...form, rentalPricePerDay: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Location *</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Korangi, Karachi" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-semibold text-gray-700">Status</label>
            <select className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-semibold text-gray-700">Description</label>
            <textarea className="min-h-[80px] w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes about this machine…" />
          </div>
        </Modal>
      )}
    </div>
  );
}