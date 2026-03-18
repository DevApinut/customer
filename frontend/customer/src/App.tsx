import "./App.css";
import { Menu, Bell, User, Home, BarChart3, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mock data สำหรับ Chart
  const salesData = [
    { month: 'Jan', sales: 4000, revenue: 2400, customers: 240 },
    { month: 'Feb', sales: 3000, revenue: 1398, customers: 221 },
    { month: 'Mar', sales: 2000, revenue: 9800, customers: 229 },
    { month: 'Apr', sales: 2780, revenue: 3908, customers: 200 },
    { month: 'May', sales: 1890, revenue: 4800, customers: 221 },
    { month: 'Jun', sales: 2390, revenue: 3800, customers: 250 },
    { month: 'Jul', sales: 3490, revenue: 4300, customers: 210 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-center">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-slate-700 p-2 rounded transition">
            <Menu size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-2">
          <div className="hover:bg-slate-700 p-3 rounded cursor-pointer flex items-center gap-3 transition">
            <Home size={20} />
            {sidebarOpen && <span className="font-medium">Dashboard</span>}
          </div>
          <div className="hover:bg-slate-700 p-3 rounded cursor-pointer flex items-center gap-3 transition">
            <BarChart3 size={20} />
            {sidebarOpen && <span className="font-medium">Analytics</span>}
          </div>
          <div className="hover:bg-slate-700 p-3 rounded cursor-pointer flex items-center gap-3 transition">
            <Settings size={20} />
            {sidebarOpen && <span className="font-medium">Settings</span>}
          </div>
        </nav>
        
        <div className="p-3 border-t border-slate-700">
          <div className="hover:bg-slate-700 p-3 rounded cursor-pointer flex items-center gap-3 transition">
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-6">
            <button className="text-gray-600 hover:text-gray-900 transition">
              <Bell size={20} />
            </button>
            <button className="text-gray-600 hover:text-gray-900 transition">
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-medium mb-2">Total Users</p>
              <p className="text-3xl font-bold text-blue-900">12,345</p>
              <p className="text-xs text-blue-600 mt-2">↑ 12% from last month</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-medium mb-2">Revenue</p>
              <p className="text-3xl font-bold text-green-900">$45,231</p>
              <p className="text-xs text-green-600 mt-2">↑ 23% from last month</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-medium mb-2">Orders</p>
              <p className="text-3xl font-bold text-purple-900">1,234</p>
              <p className="text-xs text-purple-600 mt-2">↑ 8% from last month</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg shadow p-6 hover:shadow-lg transition">
              <p className="text-gray-600 text-sm font-medium mb-2">Growth</p>
              <p className="text-3xl font-bold text-orange-900">+23%</p>
              <p className="text-xs text-orange-600 mt-2">↑ 5% from last quarter</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Sales Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {[
                  { title: 'New user signup', time: '5 mins ago' },
                  { title: 'Order completed', time: '1 hour ago' },
                  { title: 'Payment received', time: '3 hours ago' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
