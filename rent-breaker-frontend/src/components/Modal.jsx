import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <span className="text-base font-semibold text-gray-900">{title}</span>
          <button 
            className="rounded-md p-1 text-2xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700" 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}