import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import Customers from './pages/Customers';
import Rentals from './pages/Rentals';
import Billing from './pages/Billing';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import AuthPage from './pages/Login'; // Make sure your AuthPage is imported here
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public Auth Route */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected Main App Routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="machines" element={<Machines />} />
            <Route path="customers" element={<Customers />} />
            <Route path="rentals" element={<Rentals />} />
            
            {/* Admin & Staff only modules */}
            <Route 
              path="billing" 
              element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Billing /></ProtectedRoute>} 
            />
            
            <Route 
              path="maintenance" 
              element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Maintenance /></ProtectedRoute>} 
            />

            {/* Admin Only modules */}
            <Route 
              path="reports" 
              element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} 
            />
          </Route>

          {/* Catch-all: If user types /login or a random URL, send them to auth */}
          <Route path="*" element={<Navigate to="/auth?page=login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}