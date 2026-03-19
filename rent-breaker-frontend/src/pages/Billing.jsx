import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useReactToPrint } from 'react-to-print';

export default function Billing() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Invoice Printing Refs and States
  const invoiceRef = useRef(null);
  const [invoiceData, setInvoiceData] = useState(null);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rentals');
      setRentals(data.data);
    } catch { 
      toast.error('Failed to load billing data'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchRentals(); }, []);

  // Calculate top stats
  const totalInvoiced = rentals.reduce((s, r) => s + (r.totalRent || 0), 0);
  const totalAdvance  = rentals.reduce((s, r) => s + (r.advancePayment || 0), 0);
  const totalBalance  = rentals.reduce((s, r) => s + (r.remainingBalance || 0), 0);

  const handleUpdatePayment = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid amount'); return; }
    if (amt > showPayModal.totalRent) { toast.error('Payment cannot exceed total rent'); return; }
    
    setSaving(true);
    try {
      await api.patch(`/rentals/${showPayModal._id}/payment`, { advancePayment: amt });
      toast.success('Payment updated');
      setShowPayModal(null);
      fetchRentals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { 
      setSaving(false); 
    }
  };

  const getStatusStyles = (r) => {
    if ((r.remainingBalance || 0) <= 0) return 'bg-green-50 text-green-700';
    if ((r.advancePayment || 0) > 0) return 'bg-amber-50 text-amber-700';
    if (r.status === 'overdue') return 'bg-red-50 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  // --- Print Logic ---
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef, 
    documentTitle: `Invoice_${invoiceData?.customer?.name || 'Customer'}`,
    onAfterPrint: () => setInvoiceData(null) // Clear data after print dialog closes
  });

  // Trigger print process when invoiceData is set and rendered
  useEffect(() => {
    if (invoiceData) {
      // A tiny 50ms delay gives React enough time to attach the ref to the DOM
      const timer = setTimeout(() => {
        handlePrint();
      }, 50); 
      return () => clearTimeout(timer);
    }
  }, [invoiceData, handlePrint]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-sm text-gray-500">Track payments and generate receipts</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Total invoiced</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">₨{totalInvoiced.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-gray-400">{rentals.length} rentals total</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Advance collected</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">₨{totalAdvance.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-green-600">
            {totalInvoiced > 0 ? Math.round((totalAdvance / totalInvoiced) * 100) : 0}% of total
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Outstanding balance</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">₨{totalBalance.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-red-600">Remaining to collect</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Fully paid rentals</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {rentals.filter((r) => (r.remainingBalance || 0) <= 0).length}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">of {rentals.length} total</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-[14px] font-semibold text-gray-800">All invoices</h2>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : rentals.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-3xl mb-2">💳</div>
            <p>No billing records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Machine</th>
                  <th className="px-6 py-3">Total Rent</th>
                  <th className="px-6 py-3">Balance</th>
                  <th className="px-6 py-3">Payment Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {rentals.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{r.customer?.name || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{r.machine?.name || '—'}</td>
                    <td className="px-6 py-4 font-medium">₨{(r.totalRent || 0).toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${(r.remainingBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₨{(r.remainingBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${getStatusStyles(r)}`}>
                        {((r.remainingBalance || 0) <= 0) ? 'Paid' : (r.advancePayment > 0 ? 'Partial' : 'Unpaid')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setInvoiceData(r)}
                          className="rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                        >
                          🖨️ Print
                        </button>
                        <button 
                          onClick={() => { setShowPayModal(r); setPayAmount(r.advancePayment || ''); }}
                          className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 shadow-sm transition-all"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPDATE PAYMENT MODAL */}
      {showPayModal && (
        <Modal
          title={`Update payment — ${showPayModal.customer?.name}`}
          onClose={() => setShowPayModal(null)}
          footer={
            <>
              <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all" onClick={() => setShowPayModal(null)}>Cancel</button>
              <button 
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-all disabled:opacity-50"
                onClick={handleUpdatePayment} 
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Update Payment'}
              </button>
            </>
          }
        >
          <div className="mb-6 grid grid-cols-2 gap-y-2 rounded-lg bg-gray-50 p-4 text-[13px] border border-gray-100">
            <span className="text-gray-500">Machine:</span><span className="font-semibold">{showPayModal.machine?.name}</span>
            <span className="text-gray-500">Total rent:</span><span className="font-semibold">₨{(showPayModal.totalRent || 0).toLocaleString()}</span>
            <span className="text-gray-500">Current advance:</span><span className="font-semibold">₨{(showPayModal.advancePayment || 0).toLocaleString()}</span>
            <span className="text-gray-500">Current balance:</span>
            <span className={`font-bold ${(showPayModal.remainingBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₨{(showPayModal.remainingBalance || 0).toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Total advance received (PKR)</label>
            <input
              className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Enter total amount"
            />
            {payAmount && !isNaN(parseFloat(payAmount)) && (
              <p className="mt-1 text-xs text-gray-500">
                New balance: <span className="font-semibold text-gray-900">₨{Math.max(0, (showPayModal.totalRent || 0) - parseFloat(payAmount)).toLocaleString()}</span>
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* --- HIDDEN PRINTABLE INVOICE COMPONENT --- */}
      <div className="hidden">
        {invoiceData && (
          <div ref={invoiceRef} className="p-12 text-gray-800 bg-white min-h-screen font-sans">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black text-blue-700 tracking-tighter">RENT BREAKER</h1>
                <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest">Machine Management System</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-400">INVOICE</h2>
                <p className="text-sm font-semibold mt-2">Date: {new Date().toLocaleDateString()}</p>
                <p className="text-sm font-semibold">Ref: #{invoiceData._id.slice(-6).toUpperCase()}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="mb-10">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
              <p className="text-lg font-bold text-gray-900">{invoiceData.customer?.name}</p>
              <p className="text-sm mt-1">{invoiceData.customer?.phone}</p>
              <p className="text-sm">{invoiceData.customer?.address}</p>
            </div>

            {/* Rental Details Table */}
            <table className="w-full text-left mb-10 border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 text-sm font-bold text-gray-600 uppercase">Machine Description</th>
                  <th className="py-3 text-sm font-bold text-gray-600 uppercase">Rental Period</th>
                  <th className="py-3 text-sm font-bold text-gray-600 uppercase text-center">Days</th>
                  <th className="py-3 text-sm font-bold text-gray-600 uppercase text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 text-sm font-medium">{invoiceData.machine?.name}</td>
                  <td className="py-4 text-sm">
                    {new Date(invoiceData.startDate).toLocaleDateString()} - {new Date(invoiceData.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 text-sm text-center">{invoiceData.totalDays}</td>
                  <td className="py-4 text-sm font-bold text-right">₨{invoiceData.totalRent?.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Subtotal:</span>
                  <span>₨{invoiceData.totalRent?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-600">Advance Paid:</span>
                  <span>- ₨{invoiceData.advancePayment?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-800 pt-3 text-lg font-black">
                  <span>Balance Due:</span>
                  <span className={invoiceData.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                    ₨{invoiceData.remainingBalance?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-24 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
              <p>Thank you for choosing Rent Breaker. For any inquiries, please contact support.</p>
              <p className="mt-1">Status: {invoiceData.remainingBalance <= 0 ? 'PAID IN FULL' : 'PAYMENT PENDING'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}