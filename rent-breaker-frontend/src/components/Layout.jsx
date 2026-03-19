import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦', roles: ['admin', 'staff', 'customer'] },
  { to: '/machines', label: 'Machines', icon: '⚙', roles: ['admin', 'staff', 'customer'] },
  { to: '/rentals', label: 'Rentals', icon: '📋', roles: ['admin', 'staff', 'customer'] },
  { to: '/customers', label: 'Customers', icon: '👥', roles: ['admin', 'staff'] },
  { to: '/billing', label: 'Billing', icon: '💳', roles: ['admin', 'staff'] },
  { to: '/maintenance', label: 'Maintenance', icon: '🔧', roles: ['admin', 'staff'] },
  { to: '/reports', label: 'Reports', icon: '📊', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

 const handleLogout = () => {
    logout();
    navigate('/auth?page=login'); // Ensure this points to /auth, not /login
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-sm text-gray-800">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-100 p-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white">
            RB
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight text-gray-800">Rent Breaker</div>
            <div className="text-[11px] text-gray-400">Management System</div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-4">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Navigation
          </div>
          
          {/* ---> ADDED FILTER HERE <--- */}
          {navItems
            .filter((item) => item.roles.includes(user?.role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-700 text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-[12px] font-semibold text-gray-700">{user?.name}</div>
              <div className="text-[11px] capitalize text-gray-400">{user?.role}</div>
            </div>
            <button 
              onClick={handleLogout} 
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}