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

interface MaintenanceRow {
  uniqueId: string;
  surveyFollowUpId: string;
  nextPresentationId: string;
  seq: number;
  district: string;
  electricityNo: string;
  name: string;
  phone: string;
  transformerSize: number;
  account92: string;
  amount: number;
  visitDate: string;
  estimateDate: string;
  quotationDate: string;
  acceptDate: string;
  serviceDate: string;
  executionDate: string;
  paymentDate: string;
  note1: string;
  note2: string;
  customerType: string;
  follower: string;
  responsible: string;
  surveyFollowUpDate: string;
  nextPresentationDate: string;
}

interface MaintenanceSheetLabels {
  account92: string;
  transformerSize: string;
  visitDate: string;
  estimateDate: string;
  quotationDate: string;
  acceptDate: string;
  serviceDate: string;
  executionDate: string;
  paymentDate: string;
  note1: string;
  note2: string;
  customerType: string;
  follower: string;
  responsible: string;
  surveyFollowUpDate: string;
  nextPresentationDate: string;
}

type DetailPageKey = 'maintenance' | 'internal-maintenance';

interface DetailSheetState {
  title: string;
  rows: MaintenanceRow[];
  labels: MaintenanceSheetLabels;
}

const MONTH_PATTERN = /^(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/;
const MAINTENANCE_SHEET_NAME = 'งานบำรุงรักษาหม้อแปลง(หาดใหญ่)';
const INTERNAL_MAINTENANCE_SHEET_NAME = 'งานบำรุงรักษาระบบภายในต่างๆ';

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

const normalizeText = (value: string | number | undefined): string =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const formatThaiDateBE = (value: string): string => {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '-';
  }

  const normalizeYearToBE = (yearValue: number): number => {
    if (yearValue < 100) {
      return yearValue + 2500;
    }

    if (yearValue < 2400) {
      return yearValue + 543;
    }

    return yearValue;
  };

  const isValidDateParts = (day: number, month: number, year: number): boolean => {
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return false;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }

    return true;
  };

  // Preferred source format from sheet: day/month/year.
  const dayMonthYear = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dayMonthYear) {
    const day = Number(dayMonthYear[1]);
    const month = Number(dayMonthYear[2]);
    const year = normalizeYearToBE(Number(dayMonthYear[3]));

    if (!isValidDateParts(day, month, year)) {
      return raw;
    }

    return `${day}/${month}/${year}`;
  }

  // Handles ISO-like values such as yyyy-mm-dd or yyyy/mm/dd.
  const yearMonthDay = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s].*)?$/);
  if (yearMonthDay) {
    const year = normalizeYearToBE(Number(yearMonthDay[1]));
    const month = Number(yearMonthDay[2]);
    const day = Number(yearMonthDay[3]);

    if (!isValidDateParts(day, month, year)) {
      return raw;
    }

    return `${day}/${month}/${year}`;
  }

  return raw;
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

const DEFAULT_SHEET_LABELS: MaintenanceSheetLabels = {
  account92: 'บัญชี 92',
  transformerSize: 'ขนาดหม้อแปลง',
  visitDate: 'วันที่เข้าพบ',
  estimateDate: 'วันที่เข้าประมาณการ',
  quotationDate: 'วันที่ส่งใบเสนอราคา',
  acceptDate: 'วันที่ลูกค้าตอบรับ',
  serviceDate: 'วันที่ดำเนินการ',
  executionDate: 'วันที่เข้าดำเนินการ',
  paymentDate: 'วันที่ชำระเงิน',
  note1: 'หมายเหตุ 1',
  note2: 'หมายเหตุ 2',
  customerType: 'ประเภท',
  follower: 'ผู้ติดตาม',
  responsible: 'ผู้รับผิดชอบ',
  surveyFollowUpDate: 'วันที่ต้องสำรวจ/ติดตาม',
  nextPresentationDate: 'วันนำเสนอครั้งถัดไป',
};

const transformSheetToMaintenanceRows = (sheet: Sheet): { rows: MaintenanceRow[]; labels: MaintenanceSheetLabels } => {
  const normalizeHeader = (value: string | number | undefined): string =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const findHeaderRowIndex = sheet.data.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell).includes('ลำดับ')) &&
    row.some((cell) => normalizeHeader(cell).includes('ชื่อ'))
  );

  const headerRow = findHeaderRowIndex >= 0 ? sheet.data[findHeaderRowIndex] : [];
  const findColumnIndex = (keywords: string[], fallbackIndex: number): number => {
    const index = headerRow.findIndex((cell) => {
      const normalizedCell = normalizeHeader(cell);
      return keywords.some((keyword) => normalizedCell.includes(keyword));
    });

    return index >= 0 ? index : fallbackIndex;
  };

  const findColumnIndexExcluding = (
    keywords: string[],
    fallbackIndex: number,
    excludeKeywords: string[]
  ): number => {
    const index = headerRow.findIndex((cell) => {
      const normalizedCell = normalizeHeader(cell);
      const hasKeyword = keywords.some((keyword) => normalizedCell.includes(keyword));
      const hasExcluded = excludeKeywords.some((keyword) => normalizedCell.includes(keyword));
      return hasKeyword && !hasExcluded;
    });

    return index >= 0 ? index : fallbackIndex;
  };

  const columnIndex = {
    surveyFollowUpId: findColumnIndex(['id: pm', 'id: pmtr'], 0),
    nextPresentationId: findColumnIndex(['id: pmtr-hay วันที่ต้องนำเสนอ', 'id: pmtr-hay'], -1),
    seq: findColumnIndex(['ลำดับ'], 2),
    district: findColumnIndex(['กฟฟ.'], 3),
    electricityNo: findColumnIndex(['หมายเลขผู้ใช้ไฟ'], 4),
    name: findColumnIndex(['ชื่อ'], 5),
    phone: findColumnIndex(['เบอร์โทรศัพท์'], 6),
    transformerSize: findColumnIndex(['ขนาดหม้อแปลง', 'kva'], 7),
    account92: findColumnIndex(['บัญชี 92', 'ca 92'], -1),
    amount: findColumnIndex(['ยอดเงิน'], 9),
    visitDate: findColumnIndex(['วันที่เข้าพบ'], -1),
    estimateDate: findColumnIndex(['ผบส.เข้าประมาณการ', 'เข้าประมาณการ'], -1),
    quotationDate: findColumnIndex(['ส่งใบเสนอราคา', 'ใบเสนอราคา'], -1),
    acceptDate: findColumnIndex(['วันที่ลูกค้าตอบรับ'], 10),
    serviceDate: findColumnIndex(['วันที่ดำเนินการ'], 11),
    executionDate: findColumnIndex(['วันที่เข้าดำเนินการ'], -1),
    paymentDate: findColumnIndex(['วันที่ชำระเงิน'], -1),
    note1: findColumnIndex(['หมายเหตุ 1'], 12),
    note2: findColumnIndex(['หมายเหตุ 2'], 13),
    customerType: findColumnIndex(['หมายเหตุ 3', 'ประเภทงาน'], 14),
    follower: findColumnIndex(['ผู้ติดตาม'], -1),
    responsible: findColumnIndex(['ผู้รับผิดชอบ'], -1),
    surveyFollowUpDate: findColumnIndexExcluding(
      ['วันที่ต้อง สำรวจ/ติดตาม', 'วันที่ต้องสำรวจ/ติดตาม'],
      15,
      ['id:']
    ),
    nextPresentationDate: findColumnIndexExcluding(
      ['วันที่ต้องนำเสนอ', 'งานบริการ ครั้งถัดไป'],
      -1,
      ['id:']
    ),
  };

  const dataRows = (findHeaderRowIndex >= 0 ? sheet.data.slice(findHeaderRowIndex + 1) : sheet.data).filter(
    (row) => toNumber(row[columnIndex.seq]) > 0
  );

  const getHeaderText = (index: number): string =>
    index >= 0 && index < headerRow.length ? String(headerRow[index] ?? '').trim() : '';

  const labels: MaintenanceSheetLabels = {
    account92: getHeaderText(columnIndex.account92) || DEFAULT_SHEET_LABELS.account92,
    transformerSize: getHeaderText(columnIndex.transformerSize) || DEFAULT_SHEET_LABELS.transformerSize,
    visitDate: getHeaderText(columnIndex.visitDate) || DEFAULT_SHEET_LABELS.visitDate,
    estimateDate: getHeaderText(columnIndex.estimateDate) || DEFAULT_SHEET_LABELS.estimateDate,
    quotationDate: getHeaderText(columnIndex.quotationDate) || DEFAULT_SHEET_LABELS.quotationDate,
    acceptDate: getHeaderText(columnIndex.acceptDate) || DEFAULT_SHEET_LABELS.acceptDate,
    serviceDate: getHeaderText(columnIndex.serviceDate) || DEFAULT_SHEET_LABELS.serviceDate,
    executionDate: getHeaderText(columnIndex.executionDate) || DEFAULT_SHEET_LABELS.executionDate,
    paymentDate: getHeaderText(columnIndex.paymentDate) || DEFAULT_SHEET_LABELS.paymentDate,
    note1: getHeaderText(columnIndex.note1) || DEFAULT_SHEET_LABELS.note1,
    note2: getHeaderText(columnIndex.note2) || DEFAULT_SHEET_LABELS.note2,
    customerType: getHeaderText(columnIndex.customerType) || DEFAULT_SHEET_LABELS.customerType,
    follower: getHeaderText(columnIndex.follower) || DEFAULT_SHEET_LABELS.follower,
    responsible: getHeaderText(columnIndex.responsible) || DEFAULT_SHEET_LABELS.responsible,
    surveyFollowUpDate: getHeaderText(columnIndex.surveyFollowUpDate) || DEFAULT_SHEET_LABELS.surveyFollowUpDate,
    nextPresentationDate: getHeaderText(columnIndex.nextPresentationDate) || DEFAULT_SHEET_LABELS.nextPresentationDate,
  };

  const rows = dataRows.map((row): MaintenanceRow => {
    const safeStr = (index: number): string =>
      index >= 0 ? String(row[index] ?? '').trim() : '';
    const seq = toNumber(row[columnIndex.seq]);
    const electricityNo = safeStr(columnIndex.electricityNo);
    const name = safeStr(columnIndex.name);
    const uniqueId = electricityNo ? `${seq}-${electricityNo}` : `${seq}-${name}`;
    return {
      uniqueId,
      surveyFollowUpId: safeStr(columnIndex.surveyFollowUpId),
      nextPresentationId: safeStr(columnIndex.nextPresentationId),
      seq,
      district: safeStr(columnIndex.district),
      electricityNo,
      name,
      phone: safeStr(columnIndex.phone),
      transformerSize: toNumber(row[columnIndex.transformerSize]),
      account92: safeStr(columnIndex.account92),
      amount: toNumber(row[columnIndex.amount]),
      visitDate: safeStr(columnIndex.visitDate),
      estimateDate: safeStr(columnIndex.estimateDate),
      quotationDate: safeStr(columnIndex.quotationDate),
      acceptDate: safeStr(columnIndex.acceptDate),
      serviceDate: safeStr(columnIndex.serviceDate),
      executionDate: safeStr(columnIndex.executionDate),
      paymentDate: safeStr(columnIndex.paymentDate),
      note1: safeStr(columnIndex.note1),
      note2: safeStr(columnIndex.note2),
      customerType: safeStr(columnIndex.customerType),
      follower: safeStr(columnIndex.follower),
      responsible: safeStr(columnIndex.responsible),
      surveyFollowUpDate: safeStr(columnIndex.surveyFollowUpDate),
      nextPresentationDate: safeStr(columnIndex.nextPresentationDate),
    };
  });

  return { rows, labels };
};

const STATUS_BADGE: Record<string, string> = {
  'ชำระเงินแล้ว': 'bg-green-100 text-green-800',
  'ยังไม่ชำระเงิน': 'bg-yellow-100 text-yellow-800',
  'รอดำเนินการ': 'bg-blue-100 text-blue-800',
  'ยังไม่ได้นัดหมาย': 'bg-gray-100 text-gray-700',
  'ยกเลิก': 'bg-red-100 text-red-800',
  'รอแจ้งค่าใช้จ่าย': 'bg-purple-100 text-purple-800',
};

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<'dashboard' | DetailPageKey>('dashboard');

  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [followerFilter, setFollowerFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [minSizeFilter, setMinSizeFilter] = useState('');
  const [selectedRowUniqueId, setSelectedRowUniqueId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSheets, setDetailSheets] = useState<Record<DetailPageKey, DetailSheetState>>({
    maintenance: {
      title: MAINTENANCE_SHEET_NAME,
      rows: [],
      labels: DEFAULT_SHEET_LABELS,
    },
    'internal-maintenance': {
      title: INTERNAL_MAINTENANCE_SHEET_NAME,
      rows: [],
      labels: DEFAULT_SHEET_LABELS,
    },
  });
  const [allSheetsInfo, setAllSheetsInfo] = useState<{ name: string; rows: number }[]>([]);
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

        setDashboards(transformed);
        setSelectedSheetIndex(0);

        // Log all sheets for debugging
        const sheetsInfo = validSheets.map((s) => ({ name: s.sheetName, rows: s.data.length }));
        setAllSheetsInfo(sheetsInfo);
        console.log('[DEBUG] All sheets from API:', sheetsInfo);
        console.log('[DEBUG] payload[4]:', Array.isArray(payload) ? payload[4]?.sheetName : 'N/A');

        const normalize = (v: string) => v.trim().replace(/\s+/g, '');
        const maintenanceTargetName = normalize(MAINTENANCE_SHEET_NAME);
        const maintenanceSource: Sheet | null =
          validSheets.find((s) => normalize(s.sheetName) === maintenanceTargetName) ??
          (Array.isArray(payload) && payload[4]?.data ? (payload[4] as Sheet) : null);

        const internalMaintenanceTargetName = normalize(INTERNAL_MAINTENANCE_SHEET_NAME);
        const internalMaintenanceSource: Sheet | null =
          validSheets.find((s) => normalize(s.sheetName) === internalMaintenanceTargetName) ??
          (Array.isArray(payload) && payload[15]?.data ? (payload[15] as Sheet) : null);

        const maintenanceResult = maintenanceSource ? transformSheetToMaintenanceRows(maintenanceSource) : null;
        const internalResult = internalMaintenanceSource ? transformSheetToMaintenanceRows(internalMaintenanceSource) : null;

        const nextDetailSheets: Record<DetailPageKey, DetailSheetState> = {
          maintenance: {
            title: maintenanceSource?.sheetName || MAINTENANCE_SHEET_NAME,
            rows: maintenanceResult?.rows ?? [],
            labels: maintenanceResult?.labels ?? DEFAULT_SHEET_LABELS,
          },
          'internal-maintenance': {
            title: internalMaintenanceSource?.sheetName || INTERNAL_MAINTENANCE_SHEET_NAME,
            rows: internalResult?.rows ?? [],
            labels: internalResult?.labels ?? DEFAULT_SHEET_LABELS,
          },
        };

        setDetailSheets(nextDetailSheets);

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
  const activeDetailSheet = activePage === 'dashboard' ? null : detailSheets[activePage];
  const activeSheetLabels = activeDetailSheet?.labels ?? DEFAULT_SHEET_LABELS;

  useEffect(() => {
    if (activePage === 'dashboard') {
      return;
    }

    setDistrictFilter('all');
    setStatusFilter('all');
    setCustomerTypeFilter('all');
    setFollowerFilter('all');
    setResponsibleFilter('all');
    setMinSizeFilter('');
    setSearchTerm('');
  }, [activePage]);

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

  const districtOptions = useMemo(
    () => Array.from(new Set((activeDetailSheet?.rows ?? []).map((r) => r.district).filter(Boolean))),
    [activeDetailSheet]
  );

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (activeDetailSheet?.rows ?? [])
            .map((r) => r.note1.trim())
            .filter((value) => value.length > 0)
        )
      ),
    [activeDetailSheet]
  );

  const customerTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (activeDetailSheet?.rows ?? [])
            .map((r) => r.customerType.trim())
            .filter((value) => value.length > 0)
        )
      ),
    [activeDetailSheet]
  );

  const followerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (activeDetailSheet?.rows ?? [])
            .map((r) => r.follower.trim())
            .filter((value) => value.length > 0)
        )
      ),
    [activeDetailSheet]
  );

  const responsibleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (activeDetailSheet?.rows ?? [])
            .map((r) => r.responsible.trim())
            .filter((value) => value.length > 0)
        )
      ),
    [activeDetailSheet]
  );

  const filteredMaintenanceRows = useMemo(() => {
    const minSize = minSizeFilter.trim() === '' ? null : Number(minSizeFilter);
    const statusKeyword = statusFilter === 'all' ? '' : normalizeText(statusFilter);
    const customerTypeKeyword = customerTypeFilter === 'all' ? '' : normalizeText(customerTypeFilter);
    const followerKeyword = followerFilter === 'all' ? '' : normalizeText(followerFilter);
    const responsibleKeyword = responsibleFilter === 'all' ? '' : normalizeText(responsibleFilter);
    const searchKeyword = normalizeText(searchTerm);
    const isMaintenancePage = activePage === 'maintenance';

    return (activeDetailSheet?.rows ?? []).filter((row) => {
      const rowStatus = normalizeText(row.note1);
      const rowType = normalizeText(row.customerType);
      const rowFollower = normalizeText(row.follower);
      const rowResponsible = normalizeText(row.responsible);

      const matchSearch =
        searchKeyword.length === 0 ||
        normalizeText(row.name).includes(searchKeyword) ||
        normalizeText(row.electricityNo).includes(searchKeyword) ||
        normalizeText(row.phone).includes(searchKeyword) ||
        normalizeText(row.account92).includes(searchKeyword) ||
        rowType.includes(searchKeyword) ||
        rowFollower.includes(searchKeyword) ||
        rowResponsible.includes(searchKeyword) ||
        rowStatus.includes(searchKeyword) ||
        normalizeText(row.note2).includes(searchKeyword);
      const matchDistrict = districtFilter === 'all' || row.district === districtFilter;
      const matchStatus = statusKeyword.length === 0 || rowStatus === statusKeyword;
      const matchType = customerTypeKeyword.length === 0 || rowType === customerTypeKeyword;
      const matchFollower = followerKeyword.length === 0 || rowFollower === followerKeyword;
      const matchResponsible = responsibleKeyword.length === 0 || rowResponsible === responsibleKeyword;
      const matchSize = minSize === null || isNaN(minSize) || row.transformerSize >= minSize;
      const matchRoleFilters = isMaintenancePage
        ? matchStatus && matchType
        : matchFollower && matchResponsible;
      return matchSearch && matchDistrict && matchRoleFilters && matchSize;
    });
  }, [activeDetailSheet, activePage, searchTerm, districtFilter, statusFilter, customerTypeFilter, followerFilter, responsibleFilter, minSizeFilter]);

  const selectedFillRow = useMemo(() => {
    if (selectedRowUniqueId !== null) {
      return filteredMaintenanceRows.find((r) => r.uniqueId === selectedRowUniqueId) ?? filteredMaintenanceRows[0] ?? null;
    }
    return filteredMaintenanceRows[0] ?? null;
  }, [filteredMaintenanceRows, selectedRowUniqueId]);

  const filteredSummary = useMemo(
    () => ({
      count: filteredMaintenanceRows.length,
      totalKva: filteredMaintenanceRows.reduce((s, r) => s + r.transformerSize, 0),
      totalAmount: filteredMaintenanceRows.reduce((s, r) => s + r.amount, 0),
      paidCount: filteredMaintenanceRows.filter((r) => r.note1 === 'ชำระเงินแล้ว').length,
    }),
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
            {sidebarOpen && <span className="font-medium">{detailSheets.maintenance.title}</span>}
          </div>
          <div
            onClick={() => setActivePage('internal-maintenance')}
            className={`p-3 rounded cursor-pointer flex items-center gap-3 transition ${
              activePage === 'internal-maintenance' ? 'bg-slate-700' : 'hover:bg-slate-700'
            }`}
          >
            <BarChart3 size={20} />
            {sidebarOpen && <span className="font-medium">{detailSheets['internal-maintenance'].title}</span>}
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
              : `ฐานข้อมูลสำหรับ Fill - ${activeDetailSheet?.title ?? ''}`}
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
          ) : activePage !== 'dashboard' ? (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">ค้นหาและกรองข้อมูลลูกค้า</h2>
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">{activeDetailSheet?.title}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="relative lg:col-span-2">
                    <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={activePage === 'maintenance'
                        ? 'ค้นหาอะไรก็ได้ (ชื่อ/ไฟฟ้า/เบอร์/สถานะ/ประเภท/หมายเหตุ)'
                        : 'ค้นหาอะไรก็ได้ (ชื่อ/ไฟฟ้า/เบอร์/ผู้ติดตาม/ผู้รับผิดชอบ/หมายเหตุ)'}
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">ทุก กฟฟ.</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  {activePage === 'maintenance' ? (
                    <>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">ทุก{activeSheetLabels.note1}</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>

                      <select
                        value={customerTypeFilter}
                        onChange={(e) => setCustomerTypeFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">ทุก{activeSheetLabels.customerType}</option>
                        {customerTypeOptions.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <select
                        value={followerFilter}
                        onChange={(e) => setFollowerFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">ทุก{activeSheetLabels.follower}</option>
                        {followerOptions.map((follower) => (
                          <option key={follower} value={follower}>{follower}</option>
                        ))}
                      </select>

                      <select
                        value={responsibleFilter}
                        onChange={(e) => setResponsibleFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">ทุก{activeSheetLabels.responsible}</option>
                        {responsibleOptions.map((responsible) => (
                          <option key={responsible} value={responsible}>{responsible}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <input
                    value={minSizeFilter}
                    onChange={(e) => setMinSizeFilter(e.target.value)}
                    placeholder="ขนาดขั้นต่ำ (KVA)"
                    type="number"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 border-l-4 border-violet-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">รายการทั้งหมด</p>
                  <p className="text-2xl font-bold text-violet-900">{filteredSummary.count.toLocaleString()} ราย</p>
                </div>
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 border-l-4 border-sky-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">ขนาดหม้อแปลงรวม</p>
                  <p className="text-2xl font-bold text-sky-900">{filteredSummary.totalKva.toLocaleString()} KVA</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">ยอดเงินรวม</p>
                  <p className="text-2xl font-bold text-emerald-900">{filteredSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg shadow p-4">
                  <p className="text-gray-600 text-sm">ชำระเงินแล้ว</p>
                  <p className="text-2xl font-bold text-green-900">{filteredSummary.paidCount.toLocaleString()} ราย</p>
                </div>
              </div>

              {/* Table Full Width */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  รายการลูกค้า{' '}
                  <span className="text-sm font-normal text-gray-500">({filteredMaintenanceRows.length} รายการ) — คลิกแถวเพื่อดูรายละเอียด</span>
                </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-200 bg-gray-50">
                          <th className="p-2 text-gray-600">#</th>
                          <th className="p-2 text-gray-600">กฟฟ.</th>
                          <th className="p-2 text-gray-600">ชื่อ</th>
                          <th className="p-2 text-gray-600">{activeSheetLabels.transformerSize}</th>
                          <th className="p-2 text-gray-600">ยอดเงิน</th>
                          <th className="p-2 text-gray-600">{activeSheetLabels.acceptDate}</th>
                          <th className="p-2 text-gray-600">{activeSheetLabels.note1}</th>
                          <th className="p-2 text-gray-600">{activeSheetLabels.customerType}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaintenanceRows.map((row) => {
                          return (
                            <tr
                              key={row.uniqueId}
                              onClick={() => {
                                setSelectedRowUniqueId(row.uniqueId);
                                setShowDetailModal(true);
                              }}
                              className="border-b border-gray-100 cursor-pointer transition hover:bg-blue-50"
                            >
                              <td className="p-2 text-gray-500">{row.seq}</td>
                              <td className="p-2 text-gray-600 whitespace-nowrap">{row.district}</td>
                              <td className="p-2 font-medium text-gray-800 max-w-[200px] truncate" title={row.name}>{row.name}</td>
                              <td className="p-2 text-right">{row.transformerSize.toLocaleString()}</td>
                              <td className="p-2 text-right">{row.amount > 0 ? row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              <td className="p-2 whitespace-nowrap">{formatThaiDateBE(row.acceptDate)}</td>
                              <td className="p-2">
                                {row.note1 ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.note1] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {row.note1}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${row.customerType === 'รายใหม่' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                                  {row.customerType || '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredMaintenanceRows.length === 0 && (
                      <div className="py-6 px-4">
                        <p className="text-center text-gray-500 mb-3">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                        {(activeDetailSheet?.rows.length ?? 0) === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                            <p className="font-semibold mb-1">⚠️ ไม่พบข้อมูลที่แปลงได้จากชีท {activeDetailSheet?.title ?? 'ที่เลือก'} — Sheets ที่พบจาก API ({allSheetsInfo.length} sheets):</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {allSheetsInfo.map((s, i) => (
                                <li key={i}>[{i}] <span className="font-mono">{s.name}</span> — {s.rows} แถว</li>
                              ))}
                              {allSheetsInfo.length === 0 && <li>ยังไม่ได้รับข้อมูลจาก API</li>}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              {/* Detail Modal */}
              {showDetailModal && selectedFillRow && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Modal Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold">{selectedFillRow.name}</h2>
                        <p className="text-sm text-slate-300">#{selectedFillRow.seq} | {selectedFillRow.district}</p>
                      </div>
                      <button
                        onClick={() => setShowDetailModal(false)}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-5">
                      {/* ข้อมูลพื้นฐาน */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-xs font-semibold text-blue-700 mb-1">หมายเลขผู้ใช้ไฟ</p>
                          <p className="font-mono text-sm font-bold text-blue-900">{selectedFillRow.electricityNo || '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <p className="text-xs font-semibold text-purple-700 mb-1">เบอร์โทรศัพท์</p>
                          <p className="text-sm text-purple-900">{selectedFillRow.phone || '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="text-xs font-semibold text-orange-700 mb-1">{activeSheetLabels.transformerSize}</p>
                          <p className="text-lg font-bold text-orange-900">{selectedFillRow.transformerSize > 0 ? selectedFillRow.transformerSize.toLocaleString() + ' KVA' : '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">ยอดเงิน</p>
                          <p className="text-lg font-bold text-emerald-900">{selectedFillRow.amount > 0 ? selectedFillRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' บาท' : '-'}</p>
                        </div>
                      </div>

                      {/* สถานะ บัญชี และผู้รับผิดชอบ */}
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-700 text-sm mb-3">สถานะและข้อมูลบัญชี</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-1">จาก กฟฟ.</p>
                            <p className="text-sm font-medium text-gray-800">{selectedFillRow.district || '-'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-1">{activeSheetLabels.account92}</p>
                            <p className="font-mono text-sm text-gray-800">{selectedFillRow.account92 || '-'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">{activeSheetLabels.note1}</p>
                            {selectedFillRow.note1 ? (
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_BADGE[selectedFillRow.note1] ?? 'bg-gray-100 text-gray-700'}`}>
                                {selectedFillRow.note1}
                              </span>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">{activeSheetLabels.customerType}</p>
                            {selectedFillRow.customerType ? (
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${selectedFillRow.customerType === 'รายใหม่' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                                {selectedFillRow.customerType}
                              </span>
                            ) : <span className="text-gray-400 text-sm">-</span>}
                          </div>
                          {(selectedFillRow.follower || selectedFillRow.responsible) && (<>
                            {selectedFillRow.follower && (
                              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
                                <p className="text-xs font-semibold text-sky-600 mb-1">{activeSheetLabels.follower}</p>
                                <p className="text-sm text-sky-900">{selectedFillRow.follower}</p>
                              </div>
                            )}
                            {selectedFillRow.responsible && (
                              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
                                <p className="text-xs font-semibold text-sky-600 mb-1">{activeSheetLabels.responsible}</p>
                                <p className="text-sm text-sky-900">{selectedFillRow.responsible}</p>
                              </div>
                            )}
                          </>)}
                        </div>
                      </div>

                      {/* ลำดับเวลา */}
                      {(selectedFillRow.visitDate || selectedFillRow.estimateDate || selectedFillRow.quotationDate || selectedFillRow.acceptDate || selectedFillRow.serviceDate || selectedFillRow.executionDate || selectedFillRow.paymentDate) && (
                        <div className="border-t pt-4">
                          <h3 className="font-semibold text-gray-700 text-sm mb-3">ลำดับวันที่ดำเนินการ</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {selectedFillRow.visitDate && selectedFillRow.visitDate !== '-' && (
                              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                                <p className="text-xs font-semibold text-violet-600 mb-1">{activeSheetLabels.visitDate}</p>
                                <p className="text-sm font-medium text-violet-900">{formatThaiDateBE(selectedFillRow.visitDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.estimateDate && selectedFillRow.estimateDate !== '-' && (
                              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                                <p className="text-xs font-semibold text-violet-600 mb-1">{activeSheetLabels.estimateDate}</p>
                                <p className="text-sm font-medium text-violet-900">{formatThaiDateBE(selectedFillRow.estimateDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.quotationDate && selectedFillRow.quotationDate !== '-' && (
                              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                                <p className="text-xs font-semibold text-violet-600 mb-1">{activeSheetLabels.quotationDate}</p>
                                <p className="text-sm font-medium text-violet-900">{formatThaiDateBE(selectedFillRow.quotationDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.acceptDate && (
                              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                <p className="text-xs font-semibold text-green-600 mb-1">{activeSheetLabels.acceptDate}</p>
                                <p className="text-sm font-medium text-green-900">{formatThaiDateBE(selectedFillRow.acceptDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.serviceDate && (
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-600 mb-1">{activeSheetLabels.serviceDate}</p>
                                <p className="text-sm font-medium text-blue-900">{formatThaiDateBE(selectedFillRow.serviceDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.executionDate && (
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="text-xs font-semibold text-blue-600 mb-1">{activeSheetLabels.executionDate}</p>
                                <p className="text-sm font-medium text-blue-900">{formatThaiDateBE(selectedFillRow.executionDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.paymentDate && (
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <p className="text-xs font-semibold text-emerald-600 mb-1">{activeSheetLabels.paymentDate}</p>
                                <p className="text-sm font-medium text-emerald-900">{formatThaiDateBE(selectedFillRow.paymentDate)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* หมายเหตุและการติดตาม */}
                      {(selectedFillRow.note2 || selectedFillRow.surveyFollowUpDate || selectedFillRow.nextPresentationDate) && (
                        <div className="border-t pt-4">
                          <h3 className="font-semibold text-gray-700 text-sm mb-3">หมายเหตุและการติดตาม</h3>
                          <div className="space-y-3">
                            {selectedFillRow.note2 && (
                              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <p className="text-xs font-semibold text-amber-700 mb-1">{activeSheetLabels.note2}</p>
                                <p className="text-sm text-amber-900">{selectedFillRow.note2}</p>
                              </div>
                            )}
                            {selectedFillRow.surveyFollowUpDate && (
                              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                                <p className="text-xs font-semibold text-indigo-700 mb-1">{activeSheetLabels.surveyFollowUpDate}</p>
                                <p className="text-sm font-medium text-indigo-900">{formatThaiDateBE(selectedFillRow.surveyFollowUpDate)}</p>
                              </div>
                            )}
                            {selectedFillRow.nextPresentationDate && (
                              <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                                <p className="text-xs font-semibold text-cyan-700 mb-1">{activeSheetLabels.nextPresentationDate}</p>
                                <p className="text-sm font-medium text-cyan-900">{formatThaiDateBE(selectedFillRow.nextPresentationDate)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3 flex justify-end">
                      <button
                        onClick={() => setShowDetailModal(false)}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-medium"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
