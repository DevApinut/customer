import "./App.css";
import { Menu, Bell, User, Home, BarChart3, Settings, LogOut, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
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
  notacceptold: number;
  notacceptnew: number;
  presentTotal: number;
  acceptTotal: number;
  notAcceptTotal: number;
  acceptRate: number;
  cumulativePlan: number;
  cumulativeAccept: number;
  remark: string;
  sourceSheet: string;
}

interface DashboardSummary {
  totalPlan: number;
  totalPresent: number;
  totalAccept: number;
  totalNotAccept: number;
  overallAcceptRate: number;
}

interface DashboardData {
  title: string;
  rows: TransformerPMRow[];
  summary: DashboardSummary;
  pieData: { name: string; value: number; color: string }[];
}

const MONTH_PATTERN = /^(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/;
const MAINTENANCE_SHEET_NAME = 'งานบำรุงรักษาหม้อแปลง(หาดใหญ่)';

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const transformSheetToDashboard = (sheet: Sheet): DashboardData => {
  let cumulativePlan = 0;
  let cumulativeAccept = 0;

  const rows = sheet.data
    .filter((row) => MONTH_PATTERN.test(String(row[0] ?? '').trim()))
    .map((row): TransformerPMRow => {
      const plan = toNumber(row[1]);
      const planold = toNumber(row[2]);
      const plannew = toNumber(row[3]);
      const presentsold = toNumber(row[4]);
      const presentnew = toNumber(row[5]);
      const acceptold = toNumber(row[6]);
      const acceptnew = toNumber(row[7]);
      const notacceptold = toNumber(row[8]);
      const notacceptnew = toNumber(row[9]);
      const remark = String(row[10] ?? '').trim();

      const presentTotal = presentsold + presentnew;
      const acceptTotal = acceptold + acceptnew;
      const notAcceptTotal = notacceptold + notacceptnew;
      const acceptRate = presentTotal > 0 ? (acceptTotal / presentTotal) * 100 : 0;

      cumulativePlan += plan;
      cumulativeAccept += acceptTotal;

      return {
        month: String(row[0] ?? ''),
        plan,
        planold,
        plannew,
        presentsold,
        presentnew,
        acceptold,
        acceptnew,
        notacceptold,
        notacceptnew,
        presentTotal,
        acceptTotal,
        notAcceptTotal,
        acceptRate,
        cumulativePlan,
        cumulativeAccept,
        remark,
        sourceSheet: sheet.sheetName || 'ไม่ระบุชื่อชุดข้อมูล'
      };
    });

  const summary = rows.reduce<DashboardSummary>(
    (acc, row) => {
      acc.totalPlan += row.plan;
      acc.totalPresent += row.presentTotal;
      acc.totalAccept += row.acceptTotal;
      acc.totalNotAccept += row.notAcceptTotal;
      return acc;
    },
    {
      totalPlan: 0,
      totalPresent: 0,
      totalAccept: 0,
      totalNotAccept: 0,
      overallAcceptRate: 0
    }
  );

  summary.overallAcceptRate =
    summary.totalPresent > 0 ? (summary.totalAccept / summary.totalPresent) * 100 : 0;

  const pendingFollowUp = Math.max(summary.totalPresent - summary.totalAccept - summary.totalNotAccept, 0);
  const pieData = [
    { name: 'ตอบรับ', value: summary.totalAccept, color: '#22c55e' },
    { name: 'ไม่ตอบรับ', value: summary.totalNotAccept, color: '#ef4444' },
    { name: 'รอติดตาม', value: pendingFollowUp, color: '#f59e0b' }
  ];

  return {
    title: sheet.sheetName || 'Dashboard',
    rows,
    summary,
    pieData
  };
};

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<'dashboard' | 'maintenance'>('dashboard');

  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [minPlanFilter, setMinPlanFilter] = useState('');
  const [selectedFillRowKey, setSelectedFillRowKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://script.google.com/macros/s/AKfycbzwxaeu-8LkJQ_HIBg9_98Q2tkvU8C4ulpNiTkPF5l1x6RUOByspUXsTBT1Ilm3ZDeV8g/exec');
        const payload = response.data;
        const sheets: Sheet[] = Array.isArray(payload) ? payload : [payload];

        const validSheets = sheets.filter(
          (sheet): sheet is Sheet => !!sheet && Array.isArray(sheet.data) && sheet.data.length > 0
        );

        const transformed = validSheets.map(transformSheetToDashboard).filter((item) => item.rows.length > 0);

        if (transformed.length === 0) {
          throw new Error('ไม่พบข้อมูลรายเดือนที่นำไปสร้างกราฟได้');
        }

        setDashboards(transformed);
        setSelectedSheetIndex(0);

        setLoading(false);
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data: ' + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeDashboard = dashboards[selectedSheetIndex] ?? null;

  const activeRows = activeDashboard?.rows ?? [];
  const summary = activeDashboard?.summary;
  const pieData = activeDashboard?.pieData ?? [];

  const performanceData = useMemo(
    () =>
      activeRows.map((row) => ({
        month: row.month,
        acceptRate: Number(row.acceptRate.toFixed(2)),
        presentTotal: row.presentTotal
      })),
    [activeRows]
  );

  const maintenanceDashboard = useMemo(() => {
    const normalize = (value: string) => value.replace(/\s+/g, '');
    const expected = normalize(MAINTENANCE_SHEET_NAME);

    return dashboards.find((item) => normalize(item.title).includes(expected)) ?? null;
  }, [dashboards]);

  const customerRows = useMemo(() => {
    if (!maintenanceDashboard) {
      return [];
    }

    return maintenanceDashboard.rows.map((row) => {
        const status =
          row.acceptTotal > 0
            ? 'accepted'
            : row.notAcceptTotal > 0
              ? 'rejected'
              : row.presentTotal > 0
                ? 'followup'
                : 'planned';

        return {
          ...row,
          sheetTitle: maintenanceDashboard.title,
          status
        };
      });
  }, [maintenanceDashboard]);

  const maintenanceMonths = useMemo(() => {
    return Array.from(new Set(customerRows.map((row) => row.month)));
  }, [customerRows]);

  const filteredMaintenanceRows = useMemo(() => {
    const minPlan = minPlanFilter.trim() === '' ? null : Number(minPlanFilter);

    return customerRows.filter((row) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchSearch =
        normalizedSearch.length === 0 ||
        row.month.toLowerCase().includes(normalizedSearch) ||
        row.sheetTitle.toLowerCase().includes(normalizedSearch) ||
        row.remark.toLowerCase().includes(normalizedSearch) ||
        String(row.plan).includes(normalizedSearch) ||
        String(row.acceptTotal).includes(normalizedSearch);

      const matchSheet = row.sheetTitle === maintenanceDashboard?.title;
      const matchMonth = monthFilter === 'all' || row.month === monthFilter;

      const matchStatus = statusFilter === 'all' || statusFilter === row.status;

      const customerType = row.planold > 0 && row.plannew > 0 ? 'mixed' : row.planold > 0 ? 'old' : row.plannew > 0 ? 'new' : 'none';
      const matchCustomerType =
        customerTypeFilter === 'all' ||
        (customerTypeFilter === 'old' && (customerType === 'old' || customerType === 'mixed')) ||
        (customerTypeFilter === 'new' && (customerType === 'new' || customerType === 'mixed'));

      const matchMinPlan = minPlan === null || Number.isNaN(minPlan) || row.plan >= minPlan;

      return matchSearch && matchSheet && matchMonth && matchStatus && matchCustomerType && matchMinPlan;
    });
  }, [customerRows, searchTerm, monthFilter, statusFilter, customerTypeFilter, minPlanFilter, maintenanceDashboard]);

  const selectedFillRow = useMemo(() => {
    if (!selectedFillRowKey) {
      return filteredMaintenanceRows[0] ?? null;
    }

    return (
      filteredMaintenanceRows.find((row) => `${row.sheetTitle}-${row.month}` === selectedFillRowKey) ??
      filteredMaintenanceRows[0] ??
      null
    );
  }, [filteredMaintenanceRows, selectedFillRowKey]);

  const filteredSummary = useMemo(
    () =>
      filteredMaintenanceRows.reduce(
        (acc, row) => {
          acc.plan += row.plan;
          acc.present += row.presentTotal;
          acc.accept += row.acceptTotal;
          return acc;
        },
        { plan: 0, present: 0, accept: 0 }
      ),
    [filteredMaintenanceRows]
  );

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
          <div
            onClick={() => setActivePage('dashboard')}
            className={`p-3 rounded cursor-pointer flex items-center gap-3 transition ${
              activePage === 'dashboard' ? 'bg-slate-700' : 'hover:bg-slate-700'
            }`}
          >
            <Home size={20} />
            {sidebarOpen && <span className="font-medium">Dashboard</span>}
          </div>
          <div
            onClick={() => setActivePage('maintenance')}
            className={`p-3 rounded cursor-pointer flex items-center gap-3 transition ${
              activePage === 'maintenance' ? 'bg-slate-700' : 'hover:bg-slate-700'
            }`}
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span className="font-medium">งานบำรุงรักษาหม้อแปลง(หาดใหญ่)</span>}
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
          <h1 className="text-2xl font-bold text-gray-800">
            {activePage === 'dashboard'
              ? 'Customer Presentation Dashboard'
              : 'ฐานข้อมูลสำหรับ Fill - งานบำรุงรักษาหม้อแปลง(หาดใหญ่)'}
          </h1>
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
        <main className="flex flex-col p-6 gap-6 overflow-y-auto">
          {loading ? (
            <p>Loading data...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : activePage === 'dashboard' && (!activeDashboard || !summary) ? (
            <p className="text-red-500">ไม่พบข้อมูลที่พร้อมแสดงผล</p>
          ) : activePage === 'maintenance' && customerRows.length === 0 ? (
            <p className="text-red-500">ไม่พบข้อมูลลูกค้าที่ใช้สำหรับการกรอง</p>
          ) : activePage === 'maintenance' ? (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">ค้นหาและกรองฐานข้อมูลสำหรับ Fill</h2>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ค้นหาเดือน/หมายเหตุ/ค่าแผน/ค่าตอบรับ"
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 flex items-center">
                    ชีทที่ใช้งาน: {maintenanceDashboard?.title ?? MAINTENANCE_SHEET_NAME}
                  </div>

                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">ลูกค้าทั้งหมด</option>
                    <option value="old">กลุ่มลูกค้าเก่า</option>
                    <option value="new">กลุ่มลูกค้าใหม่</option>
                  </select>

                  <input
                    value={minPlanFilter}
                    onChange={(e) => setMinPlanFilter(e.target.value)}
                    placeholder="แผนขั้นต่ำ"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">ทุกเดือน</option>
                    {maintenanceMonths.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="accepted">ตอบรับ</option>
                    <option value="rejected">ไม่ตอบรับ</option>
                    <option value="followup">รอติดตาม</option>
                    <option value="planned">เฉพาะแผน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 border-l-4 border-sky-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">แผนรวม (หลังกรอง)</p>
                  <p className="text-2xl font-bold text-sky-900">{filteredSummary.plan.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">นำเสนอรวม (หลังกรอง)</p>
                  <p className="text-2xl font-bold text-emerald-900">{filteredSummary.present.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-cyan-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">ตอบรับรวม (หลังกรอง)</p>
                  <p className="text-2xl font-bold text-cyan-900">{filteredSummary.accept.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 border-l-4 border-violet-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">จำนวนรายการที่ใช้ Fill</p>
                  <p className="text-2xl font-bold text-violet-900">{filteredMaintenanceRows.length.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm xl:col-span-2">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">รายการข้อมูลลูกค้าสำหรับ Fill</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-200 bg-gray-50">
                          <th className="p-3">เลือก</th>
                          <th className="p-3">ชุดข้อมูล</th>
                          <th className="p-3">เดือน</th>
                          <th className="p-3">แผน</th>
                          <th className="p-3">นำเสนอรวม</th>
                          <th className="p-3">ตอบรับรวม</th>
                          <th className="p-3">ไม่ตอบรับรวม</th>
                          <th className="p-3">อัตราตอบรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaintenanceRows.map((row) => {
                          const rowKey = `${row.sheetTitle}-${row.month}`;
                          const isSelected = (selectedFillRow?.sheetTitle ?? '') === row.sheetTitle && (selectedFillRow?.month ?? '') === row.month;

                          return (
                            <tr
                              key={rowKey}
                              onClick={() => setSelectedFillRowKey(rowKey)}
                              className={`border-b border-gray-100 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                              <td className="p-3">{isSelected ? 'กำลังใช้' : 'เลือก'}</td>
                              <td className="p-3 text-gray-700">{row.sheetTitle}</td>
                              <td className="p-3 font-medium text-gray-800">{row.month}</td>
                              <td className="p-3">{row.plan.toLocaleString()}</td>
                              <td className="p-3">{row.presentTotal.toLocaleString()}</td>
                              <td className="p-3 text-green-700 font-semibold">{row.acceptTotal.toLocaleString()}</td>
                              <td className="p-3 text-red-700 font-semibold">{row.notAcceptTotal.toLocaleString()}</td>
                              <td className="p-3">{row.acceptRate.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredMaintenanceRows.length === 0 && (
                      <p className="text-center py-6 text-gray-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">ข้อมูลที่เลือกสำหรับ Fill</h2>
                  {selectedFillRow ? (
                    <div className="space-y-2 text-sm">
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">ชุดข้อมูล:</span> {selectedFillRow.sheetTitle}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">เดือน:</span> {selectedFillRow.month}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">แผนรวม:</span> {selectedFillRow.plan.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">แผนเก่า:</span> {selectedFillRow.planold.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">แผนใหม่:</span> {selectedFillRow.plannew.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">นำเสนอรวม:</span> {selectedFillRow.presentTotal.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">ตอบรับรวม:</span> {selectedFillRow.acceptTotal.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">ไม่ตอบรับรวม:</span> {selectedFillRow.notAcceptTotal.toLocaleString()}</div>
                      <div className="p-2 rounded bg-gray-50"><span className="font-semibold">อัตราตอบรับ:</span> {selectedFillRow.acceptRate.toFixed(1)}%</div>
                      <div className="p-2 rounded bg-amber-50 border border-amber-200">
                        <span className="font-semibold">หมายเหตุ:</span> {selectedFillRow.remark || '-'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">กรุณาเลือกแถวข้อมูลจากตารางด้านซ้าย</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">กราฟเฉพาะข้อมูลที่กรองแล้ว</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={filteredMaintenanceRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="plan" fill="#2563eb" name="แผน" />
                    <Bar dataKey="presentTotal" fill="#14b8a6" name="นำเสนอรวม" />
                    <Bar dataKey="acceptTotal" fill="#22c55e" name="ตอบรับรวม" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">เลือกชุดข้อมูล</h2>
                <div className="flex flex-wrap gap-2">
                  {dashboards.map((item, index) => (
                    <button
                      key={item.title + index}
                      onClick={() => setSelectedSheetIndex(index)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        index === selectedSheetIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg shadow p-5">
                  <p className="text-gray-600 text-sm font-medium mb-2">แผนทั้งหมด</p>
                  <p className="text-3xl font-bold text-blue-900">{summary.totalPlan.toLocaleString()}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 rounded-lg shadow p-5">
                  <p className="text-gray-600 text-sm font-medium mb-2">นำเสนอแล้ว</p>
                  <p className="text-3xl font-bold text-emerald-900">{summary.totalPresent.toLocaleString()}</p>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-l-4 border-cyan-500 rounded-lg shadow p-5">
                  <p className="text-gray-600 text-sm font-medium mb-2">ตอบรับ</p>
                  <p className="text-3xl font-bold text-cyan-900">{summary.totalAccept.toLocaleString()}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg shadow p-5">
                  <p className="text-gray-600 text-sm font-medium mb-2">อัตราตอบรับรวม</p>
                  <p className="text-3xl font-bold text-orange-900">{summary.overallAcceptRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">แผนรายเดือน (เก่า/ใหม่)</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={activeRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="planold" fill="#1d4ed8" name="แผนเก่า" />
                      <Bar dataKey="plannew" fill="#60a5fa" name="แผนใหม่" />
                      <Bar dataKey="plan" fill="#0f172a" name="แผนรวม" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">ผลนำเสนอ/ตอบรับ รายเดือน</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={activeRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="presentTotal" fill="#14b8a6" name="นำเสนอรวม" />
                      <Bar dataKey="acceptTotal" fill="#22c55e" name="ตอบรับรวม" />
                      <Bar dataKey="notAcceptTotal" fill="#ef4444" name="ไม่ตอบรับรวม" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">แนวโน้มอัตราตอบรับ (%)</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="acceptRate" stroke="#7c3aed" strokeWidth={3} name="อัตราตอบรับ" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">สะสมแผน vs สะสมตอบรับ</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={activeRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="cumulativePlan" stroke="#2563eb" fill="#bfdbfe" name="สะสมแผน" />
                      <Area type="monotone" dataKey="cumulativeAccept" stroke="#16a34a" fill="#bbf7d0" name="สะสมตอบรับ" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm xl:col-span-2">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">เจาะลึกแผนเก่า/ใหม่และผลลัพธ์</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={activeRows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="presentsold" stackId="old" fill="#0ea5e9" name="นำเสนอเก่า" />
                      <Bar dataKey="acceptold" stackId="old" fill="#16a34a" name="ตอบรับเก่า" />
                      <Bar dataKey="notacceptold" stackId="old" fill="#dc2626" name="ไม่ตอบรับเก่า" />
                      <Bar dataKey="presentnew" stackId="new" fill="#38bdf8" name="นำเสนอใหม่" />
                      <Bar dataKey="acceptnew" stackId="new" fill="#22c55e" name="ตอบรับใหม่" />
                      <Bar dataKey="notacceptnew" stackId="new" fill="#ef4444" name="ไม่ตอบรับใหม่" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">สถานะรวมการนำเสนอ</h2>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
