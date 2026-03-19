import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext'; // Added for RBAC

const emptyForm = { machine: '', date: '', issue: '', cost: '', nextMaintenanceDate: '', notes: '' };

export default function Maintenance() {
  const { user } = useAuth(); // Retrieve current user
  const isAdmin = user?.role === 'admin';

  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Maintenance Records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/maintenance', { params });
      setRecords(data.data);
    } catch { 
      toast.error('Failed to load maintenance records'); 
    } finally { 
      setLoading(false); 
    }
  };

  // 2. Fetch Machines (for the dropdown)
  const fetchMachines = async () => {
    try {
      const { data } = await api.get('/machines');
      setMachines(data.data);
    } catch {
      toast.error('Could not fetch machines list');
    }
  };

  useEffect(() => { fetchRecords(); }, [filter]);

  // 3. Open Modal Handlers
  const openAdd = () => {
    fetchMachines();
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (r) => {
    fetchMachines();
    setEditing(r);
    setForm({
      machine: r.machine?._id || '',
      date: r.date ? r.date.slice(0, 10) : '',
      issue: r.issue,
      cost: r.cost,
      nextMaintenanceDate: r.nextMaintenanceDate ? r.nextMaintenanceDate.slice(0, 10) : '',
      notes: r.notes || '',
    });
    setShowModal(true);
  };

  // 4. Save Handler
  const handleSave = async () => {
    if (!form.machine || !form.issue || form.cost === '') {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/maintenance/${editing._id}`, form);
        toast.success('Record updated');
      } else {
        await api.post('/maintenance', form);
        toast.success('Maintenance logged & Machine status updated');
      }
      setShowModal(false);
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { 
      setSaving(false); 
    }
  };

  const markComplete = async (id) => {
    try {
      await api.put(`/maintenance/${id}`, { status: 'completed' });
      toast.success('Completed: Machine set to available');
      fetchRecords();
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this maintenance record?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      toast.success('Record deleted');
      fetchRecords();
    } catch (err) { 
      toast.error('Delete failed'); 
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500">Track repairs and scheduled servicing</p>
        </div>
        <button 
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-800" 
          onClick={openAdd}
        >
          + Log maintenance
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Total records</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{records.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">In progress</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {records.filter((r) => r.status === 'in-progress').length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Completed</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {records.filter((r) => r.status === 'completed').length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Total cost</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            ₨{records.reduce((s, r) => s + (r.cost || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        {['all', 'in-progress', 'completed'].map((f) => (
          <button 
            key={f} 
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
              filter === f ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'in-progress' ? 'In progress' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="mb-2 text-3xl">🔧</div>
            <p>No maintenance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 font-semibold uppercase text-gray-500 text-[11px] tracking-wider">
                  <th className="px-6 py-3">Machine</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Issue</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Next Service</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{r.machine?.name}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 truncate max-w-[200px] text-gray-600">{r.issue}</td>
                    <td className="px-6 py-4 font-medium">₨{r.cost?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500">{r.nextMaintenanceDate ? new Date(r.nextMaintenanceDate).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {r.status === 'in-progress' && (
                          <button 
                            className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100 font-bold shadow-sm" 
                            onClick={() => markComplete(r._id)}
                          >
                            DONE
                          </button>
                        )}
                        <button className="rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                        
                        {/* RBAC: Only Admins can see and use the Delete button */}
                        {isAdmin && (
                          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 shadow-sm" onClick={() => handleDelete(r._id)}>
                            Delete
                          </button>
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

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <Modal
          title={editing ? 'Edit maintenance record' : 'Log maintenance'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-800 disabled:opacity-50" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? 'Saving...' : editing ? 'Update Record' : 'Save & Set Offline'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Machine *</label>
              <select className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-blue-600" value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })}>
                <option value="">Select machine...</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.status})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Repair Date *</label>
                <input className="w-full rounded-lg border border-gray-200 p-2 text-sm" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Total Cost (PKR) *</label>
                <input className="w-full rounded-lg border border-gray-200 p-2 text-sm" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Issue Description *</label>
              <textarea className="w-full rounded-lg border border-gray-200 p-2 text-sm min-h-[80px]" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="What was repaired?" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Scheduled Next Service</label>
              <input className="w-full rounded-lg border border-gray-200 p-2 text-sm" type="date" value={form.nextMaintenanceDate} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Additional Notes</label>
              <textarea className="w-full rounded-lg border border-gray-200 p-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Serial numbers of parts, etc." />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}