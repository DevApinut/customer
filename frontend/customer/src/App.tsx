import "./App.css";
import { Menu, Bell, User, Home, BarChart3, Settings, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import {  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';


interface Sheet {
  sheetName: string;
  data: (string | number)[][];
}

interface TransformerPMRow {
  month: string;
  plan: number;
  planold: number;
  plannew: number;
  presentsold: number;
  presentnew: number;
  acceptold: number;
  acceptnew: number;
  notacceptold: number
  notacceptnew: number
}

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [loading, setLoading] = useState(true);
  const [transformerPM, setTransformerPM] = useState<Sheet | null>(null);
  const [chartData, setChartData] = useState<TransformerPMRow[]>([]);
  const [chartData1, setChartData1] = useState<TransformerPMRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://script.google.com/macros/s/AKfycbzwxaeu-8LkJQ_HIBg9_98Q2tkvU8C4ulpNiTkPF5l1x6RUOByspUXsTBT1Ilm3ZDeV8g/exec');
        const data: Sheet[] = response.data;
        console.log('Fetched data:', data);

        // ใช้ sheet ตัวที่สองตามโครงสร้างข้อมูลจาก API
        const sheet = data[1];
        if (sheet && Array.isArray(sheet.data)) {
          const transformerPMdata = sheet.data
            .slice(5, 18) // เอาเเถว 5-17
            .map((row): TransformerPMRow => ({
              month: String(row[0] ?? ''),
              plan: Number(row[1] ?? 0),
              planold: Number(row[2] ?? 0),
              plannew: Number(row[3] ?? 0),
              presentsold: Number(row[4] ?? 0),
              presentnew: Number(row[5] ?? 0),
              acceptold: Number(row[6] ?? 0),
              acceptnew: Number(row[7] ?? 0),
              notacceptold: Number(row[8] ?? 0),
              notacceptnew: Number(row[9] ?? 0)
            }));
          setTransformerPM(sheet);
          setChartData(transformerPMdata);
        }

        // ใช้ sheet ตัวที่สามตามโครงสร้างข้อมูลจาก API
        const sheet1 = data[2];
        if (sheet1 && Array.isArray(sheet1.data)) {
          const transformerPMdata1 = sheet1.data
            .slice(4, 17) // เอาเเถว 5-17
            .map((row): TransformerPMRow => ({
              month: String(row[0] ?? ''),
              plan: Number(row[1] ?? 0),
              planold: Number(row[2] ?? 0),
              plannew: Number(row[3] ?? 0),
              presentsold: Number(row[4] ?? 0),
              presentnew: Number(row[5] ?? 0),
              acceptold: Number(row[6] ?? 0),
              acceptnew: Number(row[7] ?? 0),
              notacceptold: Number(row[8] ?? 0),
              notacceptnew: Number(row[9] ?? 0)
            }));

          setChartData1(transformerPMdata1);
        }

        setLoading(false);
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data: ' + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  


  console.log(transformerPM)
  return (
    <div className="flex bg-gray-50">
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
        <main className="flex flex-col">
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
          <div className="flex border ">
            <div className="flex w-full flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-4 ">แผนการนำเสนอลูกค้าบำรุงรักษาหม้อแปลง</h2>
              {loading ? (
                <p>Loading data...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planold" fill="#1e40af" name="แผนเก่า" />
                    <Bar dataKey="plannew" fill="#60a5fa" name="แผนใหม่" />
                    <Bar dataKey="presentsold" fill="#10b981" name="นำเสนอเก่า" />
                    <Bar dataKey="presentnew" fill="#f59e0b" name="นำเสนอใหม่" />
                    <Bar dataKey="acceptold" fill="#ef4444" name="ตอบรับเก่า" />
                    <Bar dataKey="acceptnew" fill="#8b5cf6" name="ตอบรับใหม่" />
                    <Bar dataKey="notacceptold" fill="#6b7280" name="ไม่ตอบรับเก่า" />
                    <Bar dataKey="notacceptnew" fill="#374151" name="ไม่ตอบรับใหม่" />
                    <Bar dataKey="plan" fill="#3b82f6" name="แผน" />
                  </BarChart>
                </ResponsiveContainer>

              )}
            </div>
            
          </div>
          {/* Charts Section */}
          <div className="flex border ">
            <div className="flex w-full flex-col">
              <h2 className="text-lg font-bold text-gray-900 mb-4 ">แผนการนำเสนอลูกค้า</h2>
              {loading ? (
                <p>Loading data...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData1}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planold" fill="#1e40af" name="แผนเก่า" />
                    <Bar dataKey="plannew" fill="#60a5fa" name="แผนใหม่" />
                    <Bar dataKey="presentsold" fill="#10b981" name="นำเสนอเก่า" />
                    <Bar dataKey="presentnew" fill="#f59e0b" name="นำเสนอใหม่" />
                    <Bar dataKey="acceptold" fill="#ef4444" name="ตอบรับเก่า" />
                    <Bar dataKey="acceptnew" fill="#8b5cf6" name="ตอบรับใหม่" />
                    <Bar dataKey="notacceptold" fill="#6b7280" name="ไม่ตอบรับเก่า" />
                    <Bar dataKey="notacceptnew" fill="#374151" name="ไม่ตอบรับใหม่" />
                    <Bar dataKey="plan" fill="#3b82f6" name="แผน" />
                  </BarChart>
                </ResponsiveContainer>

              )}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
