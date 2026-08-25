import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileText,
  Flag,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/api';

const REPORT_STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED'];
const REPORT_TARGETS = ['POST', 'COMMENT', 'USER'];
const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'SEXUAL_CONTENT', 'SCAM', 'FALSE_INFORMATION', 'OTHER'];
const METRICS = ['USERS', 'POSTS', 'COMMENTS', 'MESSAGES', 'STORIES', 'REPORTS'];
const PERIODS = ['SEVEN_DAYS', 'THIRTY_DAYS', 'NINETY_DAYS'];

const statusLabel = {
  PENDING: 'Chờ xử lý',
  REVIEWING: 'Đang xem xét',
  RESOLVED: 'Đã xử lý',
  REJECTED: 'Không chấp nhận',
};

const targetLabel = {
  POST: 'Bài viết',
  COMMENT: 'Bình luận',
  USER: 'Người dùng',
};

const reasonLabel = {
  SPAM: 'Spam',
  HARASSMENT: 'Quấy rối',
  HATE_SPEECH: 'Ngôn từ thù ghét',
  VIOLENCE: 'Bạo lực',
  SEXUAL_CONTENT: 'Nội dung tình dục',
  SCAM: 'Lừa đảo',
  FALSE_INFORMATION: 'Thông tin sai lệch',
  OTHER: 'Lý do khác',
};

const metricLabel = {
  USERS: 'Người dùng',
  POSTS: 'Bài viết',
  COMMENTS: 'Bình luận',
  MESSAGES: 'Tin nhắn',
  STORIES: 'Story',
  REPORTS: 'Báo cáo',
};

const periodLabel = {
  SEVEN_DAYS: '7 ngày',
  THIRTY_DAYS: '30 ngày',
  NINETY_DAYS: '90 ngày',
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const apiErrorMessage = (error) => {
  const status = error?.response?.status;
  if (status === 403) return 'Bạn không có quyền truy cập khu vực quản trị.';
  if (status === 404) return 'Không tìm thấy dữ liệu.';
  if (status === 409) return 'Không thể thực hiện thao tác với trạng thái hiện tại.';
  return error?.response?.data?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.';
};

const Avatar = ({ name = 'A', src }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#334155] text-sm font-bold text-white">
    {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
  </div>
);

const StatusBadge = ({ status }) => {
  const style = {
    PENDING: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    REVIEWING: 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
    RESOLVED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    REJECTED: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  }[status] || 'bg-slate-500/15 text-slate-300 ring-slate-500/30';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style}`}>{statusLabel[status] || status}</span>;
};

const LoadingBlock = ({ label = 'Đang tải dữ liệu...' }) => (
  <div className="admin-loading">
    <Loader2 className="mr-2 animate-spin" size={18} />
    {label}
  </div>
);

const EmptyBlock = ({ label = 'Chưa có dữ liệu.' }) => (
  <div className="admin-empty">{label}</div>
);

const ErrorBlock = ({ message, onRetry }) => (
  <div className="admin-error">
    <div className="flex items-center gap-2 font-bold">
      <AlertTriangle size={18} />
      {message}
    </div>
    {onRetry && (
      <button onClick={onRetry} className="mt-3 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400">
        Thử lại
      </button>
    )}
  </div>
);

const StatCard = ({ icon: Icon, title, value, detail }) => (
  <div className="admin-stat-card">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="admin-stat-title">{title}</p>
        <p className="admin-stat-value">{formatNumber(value)}</p>
      </div>
      <div className="admin-stat-icon">
        <Icon size={22} />
      </div>
    </div>
    {detail && <div className="admin-stat-detail">{detail}</div>}
  </div>
);

const Section = ({ title, subtitle, action, children }) => (
  <section className="admin-section">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[#b8c0cc]">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#8f9aaa]">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="admin-select"
    >
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  </label>
);

const AdminPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const view = location.pathname.includes('/reports')
    ? 'reports'
    : location.pathname.includes('/statistics')
      ? 'statistics'
      : 'overview';

  const title = view === 'reports' ? 'Quản lý báo cáo' : view === 'statistics' ? 'Thống kê hệ thống' : 'Tổng quan quản trị';

  return (
    <div className="admin-page">
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="admin-brand">
            <div className="admin-brand-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="admin-brand-name">Socially Admin</p>
              <p className="admin-brand-kicker">Control Center</p>
            </div>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="rounded-full p-2 text-[#b8c0cc] hover:bg-white/10 md:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          <AdminNav to="/admin" end icon={LayoutDashboard} label="Tổng quan" onClick={() => setSidebarOpen(false)} />
          <AdminNav to="/admin/reports" icon={Flag} label="Báo cáo" onClick={() => setSidebarOpen(false)} />
          <AdminNav to="/admin/statistics" icon={BarChart3} label="Thống kê" onClick={() => setSidebarOpen(false)} />
        </nav>

        <div className="absolute inset-x-4 bottom-4 space-y-3">
          <button onClick={() => navigate('/home')} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#b8c0cc] hover:bg-white/10 hover:text-white">
            <ArrowLeft size={18} />
            Về trang chủ
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-sm font-bold text-rose-200 hover:bg-rose-500/10">
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {sidebarOpen && <button className="admin-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 text-[#b8c0cc] hover:bg-white/10 md:hidden">
                <Menu size={22} />
              </button>
              <div>
                <h1 className="text-xl font-black text-white md:text-2xl">{title}</h1>
                <p className="text-xs text-[#8f9aaa]">Dữ liệu lấy trực tiếp từ backend admin API</p>
              </div>
            </div>
            <div className="admin-user-pill">
              <Avatar name={user?.userName || 'Admin'} src={user?.avatarUrl} />
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-white">{user?.userName || 'Admin'}</p>
                <p className="text-xs font-bold text-[#7bb2ff]">ADMIN</p>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-main">
          {view === 'reports' ? <ReportsView /> : view === 'statistics' ? <StatisticsView /> : <OverviewView />}
        </main>
      </div>
    </div>
  );
};

const AdminNav = ({ to, end, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
        isActive ? 'bg-[#1877f2] text-white shadow-lg shadow-[#1877f2]/20' : 'text-[#b8c0cc] hover:bg-white/10 hover:text-white'
      }`
    }
  >
    <Icon size={18} />
    {label}
  </NavLink>
);

const OverviewView = () => {
  const [overview, setOverview] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewData, topPostData, activeUserData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getTopPosts('SEVEN_DAYS', 5),
        adminApi.getActiveUsers('SEVEN_DAYS', 5),
      ]);
      setOverview(overviewData);
      setTopPosts(topPostData || []);
      setActiveUsers(activeUserData || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!overview) return <EmptyBlock />;

  const reportTotal = Object.values(overview.reports || {}).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="admin-stat-grid">
        <StatCard icon={Users} title="Người dùng" value={overview.users?.total} detail={`Active: ${formatNumber(overview.users?.active)} · Suspended: ${formatNumber(overview.users?.suspended)} · Mới hôm nay: ${formatNumber(overview.users?.newToday)}`} />
        <StatCard icon={FileText} title="Bài viết" value={overview.posts?.total} detail={`Active: ${formatNumber(overview.posts?.active)} · Deleted: ${formatNumber(overview.posts?.deleted)} · Mới hôm nay: ${formatNumber(overview.posts?.newToday)}`} />
        <StatCard icon={MessageSquare} title="Bình luận" value={overview.comments?.total} detail={`Mới hôm nay: ${formatNumber(overview.comments?.newToday)}`} />
        <StatCard icon={MessageSquare} title="Tin nhắn" value={overview.messages?.total} detail={`Hôm nay: ${formatNumber(overview.messages?.today)}`} />
        <StatCard icon={BarChart3} title="Story" value={overview.stories?.total} detail={`Đang hoạt động: ${formatNumber(overview.stories?.activeNow)} · Tạo hôm nay: ${formatNumber(overview.stories?.createdToday)}`} />
        <StatCard icon={Flag} title="Báo cáo" value={reportTotal} detail={`Pending: ${formatNumber(overview.reports?.pending)} · Reviewing: ${formatNumber(overview.reports?.reviewing)} · Resolved: ${formatNumber(overview.reports?.resolved)} · Rejected: ${formatNumber(overview.reports?.rejected)}`} />
      </div>

      <div className="admin-two-col">
        <Section title="Top bài viết 7 ngày" subtitle="Xếp theo engagement score từ backend">
          <TopPostsTable items={topPosts} compact />
        </Section>
        <Section title="Người dùng hoạt động 7 ngày" subtitle="Đây là activity score, không phải online presence">
          <ActiveUsersTable items={activeUsers} compact />
        </Section>
      </div>
    </div>
  );
};

const StatisticsView = () => {
  const [metric, setMetric] = useState('USERS');
  const [period, setPeriod] = useState('SEVEN_DAYS');
  const [growth, setGrowth] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [reportStats, setReportStats] = useState(null);
  const [storyStats, setStoryStats] = useState(null);
  const [chatStats, setChatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [growthData, topPostData, activeUserData, reportData, storyData, chatData] = await Promise.all([
        adminApi.getGrowth(metric, period),
        adminApi.getTopPosts(period, 10),
        adminApi.getActiveUsers(period, 10),
        adminApi.getReportStatistics(),
        adminApi.getStoryStatistics(),
        adminApi.getChatStatistics(),
      ]);
      setGrowth(growthData);
      setTopPosts(topPostData || []);
      setActiveUsers(activeUserData || []);
      setReportStats(reportData);
      setStoryStats(storyData);
      setChatStats(chatData);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [metric, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Section
        title="Growth statistics"
        subtitle="Không fake chart data, chart dùng items backend trả về"
        action={
          <div className="admin-filter-row">
            <Select label="Metric" value={metric} onChange={setMetric} options={METRICS.map((item) => ({ value: item, label: metricLabel[item] }))} />
            <Select label="Period" value={period} onChange={setPeriod} options={PERIODS.map((item) => ({ value: item, label: periodLabel[item] }))} />
          </div>
        }
      >
        {loading && !growth ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={load} /> : <GrowthChart data={growth} />}
      </Section>

      <div className="admin-three-col">
        <KeyValuePanel title="Report statistics" data={reportStats} />
        <KeyValuePanel title="Story statistics" data={storyStats} />
        <KeyValuePanel title="Chat statistics" data={chatStats} />
      </div>

      <Section title="Top posts" subtitle="Desktop dạng bảng, mobile dạng card">
        {loading ? <LoadingBlock /> : <TopPostsTable items={topPosts} />}
      </Section>

      <Section title="Active users" subtitle="Activity score dựa trên posts/comments/messages/stories">
        {loading ? <LoadingBlock /> : <ActiveUsersTable items={activeUsers} />}
      </Section>
    </div>
  );
};

const GrowthChart = ({ data }) => {
  const items = data?.items || [];
  const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);

  if (!data || items.length === 0) return <EmptyBlock label="Chưa có dữ liệu growth." />;

  return (
    <div className="space-y-5">
      <div className="admin-stat-grid three">
        <StatCard icon={BarChart3} title={metricLabel[data.metric] || data.metric} value={data.total} detail={`${data.from || ''} → ${data.to || ''}`} />
        <StatCard icon={CheckCircle2} title="Period" value={items.length} detail={data.period || 'Không có'} />
        <StatCard icon={FileText} title="Cao nhất/ngày" value={max} detail="Dựa trên items backend trả về" />
      </div>
      <div className="flex h-72 items-end gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#1f2228] p-4">
        {items.map((item) => {
          const height = Math.max(8, (Number(item.count || 0) / max) * 220);
          return (
            <div key={item.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
              <div className="text-xs font-bold text-white">{formatNumber(item.count)}</div>
              <div className="w-full rounded-t-xl bg-[#1877f2]" style={{ height }} />
              <div className="w-20 -rotate-45 text-[10px] text-[#b8c0cc]">{item.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const KeyValuePanel = ({ title, data }) => (
  <Section title={title}>
    {!data ? (
      <EmptyBlock />
    ) : (
      <div className="space-y-2">
        {flattenStats(data).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-[#1f2228] px-3 py-2 text-sm">
            <span className="truncate text-[#b8c0cc]">{key}</span>
            <span className="font-black text-white">{formatNumber(value)}</span>
          </div>
        ))}
      </div>
    )}
  </Section>
);

const flattenStats = (data) =>
  Object.entries(data).flatMap(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value).map(([childKey, childValue]) => [`${key}.${childKey}`, childValue]);
    }
    return [[key, value]];
  });

const TopPostsTable = ({ items = [], compact = false }) => {
  if (!items.length) return <EmptyBlock label="Chưa có top post." />;

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#8f9aaa]">
            <tr>
              <th className="py-3">Bài viết</th>
              <th className="py-3">Tác giả</th>
              <th className="py-3">Reaction</th>
              <th className="py-3">Comment</th>
              <th className="py-3">Share</th>
              <th className="py-3">Score</th>
              <th className="py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((post) => (
              <tr key={post.postId} className="text-[#e8edf5]">
                <td className="max-w-sm py-3">
                  <p className="font-bold">#{post.postId}</p>
                  <p className="line-clamp-2 text-[#b8c0cc]">{post.contentPreview || 'Không có nội dung'}</p>
                  {!compact && <p className="mt-1 text-xs text-[#8f9aaa]">{formatDateTime(post.createdAt)}</p>}
                </td>
                <td className="py-3">{post.authorName || `User #${post.authorId}`}</td>
                <td className="py-3">{formatNumber(post.reactionCount)}</td>
                <td className="py-3">{formatNumber(post.commentCount)}</td>
                <td className="py-3">{formatNumber(post.shareCount)}</td>
                <td className="py-3 font-black">{formatNumber(post.engagementScore)}</td>
                <td className="py-3">{post.deleted ? 'Đã xóa' : 'Đang hoạt động'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {items.map((post) => (
          <div key={post.postId} className="rounded-2xl border border-white/10 bg-[#1f2228] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">Post #{post.postId}</p>
                <p className="text-sm text-[#b8c0cc]">{post.authorName || `User #${post.authorId}`}</p>
              </div>
              <span className="text-xs text-[#8f9aaa]">{post.deleted ? 'Đã xóa' : 'Active'}</span>
            </div>
            <p className="mt-3 text-sm text-[#e8edf5]">{post.contentPreview || 'Không có nội dung'}</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <MiniMetric label="React" value={post.reactionCount} />
              <MiniMetric label="Comment" value={post.commentCount} />
              <MiniMetric label="Share" value={post.shareCount} />
              <MiniMetric label="Score" value={post.engagementScore} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActiveUsersTable = ({ items = [] }) => {
  if (!items.length) return <EmptyBlock label="Chưa có active user." />;

  return (
    <div className="space-y-3">
      {items.map((user) => (
        <div key={user.userId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#1f2228] p-3">
          <Avatar name={user.userName || 'User'} src={user.avatarUrl} />
          <div className="min-w-48 flex-1">
            <p className="font-black text-white">{user.userName || `User #${user.userId}`}</p>
            <p className="text-xs text-[#8f9aaa]">ID {user.userId}</p>
          </div>
          <MiniMetric label="Posts" value={user.posts} />
          <MiniMetric label="Comments" value={user.comments} />
          <MiniMetric label="Messages" value={user.messages} />
          <MiniMetric label="Stories" value={user.stories} />
          <MiniMetric label="Score" value={user.activityScore} strong />
        </div>
      ))}
    </div>
  );
};

const MiniMetric = ({ label, value, strong }) => (
  <div className="min-w-16 rounded-xl bg-[#15171c] px-3 py-2 text-center">
    <p className="text-[11px] font-bold uppercase text-[#8f9aaa]">{label}</p>
    <p className={`text-sm ${strong ? 'font-black text-[#7bb2ff]' : 'font-bold text-white'}`}>{formatNumber(value)}</p>
  </div>
);

const ReportsView = () => {
  const [filters, setFilters] = useState({ status: '', targetType: '', reason: '', page: 0, limit: 20 });
  const [reports, setReports] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 0, total: 0 });
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [resolutionModal, setResolutionModal] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getReports(filters);
      setReports(data.items || []);
      setPageInfo({ page: data.page || 0, totalPages: data.totalPages || 0, total: data.total || 0 });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, page: 0 }));
  };

  const openReport = async (report) => {
    setDetailLoading(true);
    setSelectedReport(report);
    setNotice('');
    try {
      const data = await adminApi.getReport(report.id);
      setSelectedReport(data);
    } catch (err) {
      setNotice(apiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const applyReportResponse = (nextReport) => {
    setSelectedReport(nextReport);
    setReports((current) => current.map((item) => (item.id === nextReport.id ? nextReport : item)));
  };

  const startReview = async () => {
    if (!selectedReport) return;
    setNotice('');
    try {
      const nextReport = await adminApi.startReview(selectedReport.id);
      applyReportResponse(nextReport);
    } catch (err) {
      setNotice(apiErrorMessage(err));
    }
  };

  const finishReport = async (type, resolutionNote) => {
    if (!selectedReport) return;
    setNotice('');
    try {
      const nextReport = type === 'resolve'
        ? await adminApi.resolveReport(selectedReport.id, resolutionNote)
        : await adminApi.rejectReport(selectedReport.id, resolutionNote);
      applyReportResponse(nextReport);
      setResolutionModal(null);
    } catch (err) {
      setNotice(apiErrorMessage(err));
    }
  };

  const moderateTarget = useCallback(async (action, reason = '') => {
    if (!selectedReport) return;
    setNotice('');
    try {
      if (action === 'remove-post') await adminApi.removePost(selectedReport.targetId);
      if (action === 'remove-comment') await adminApi.removeComment(selectedReport.targetId);
      if (action === 'suspend-user') await adminApi.suspendUser(selectedReport.targetId, reason);
      if (action === 'unsuspend-user') await adminApi.unsuspendUser(selectedReport.targetId);
      setSuspendModal(null);
      setNotice('Moderation action đã thực hiện xong. Trạng thái report chưa tự đổi; hãy Resolve/Reject nếu cần.');
    } catch (err) {
      setNotice(apiErrorMessage(err));
    }
  }, [selectedReport]);

  const targetAction = useMemo(() => {
    if (!selectedReport) return null;
    if (selectedReport.targetType === 'POST') {
      return <button onClick={() => moderateTarget('remove-post')} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400"><Trash2 size={16} className="mr-2 inline" />Gỡ nội dung</button>;
    }
    if (selectedReport.targetType === 'COMMENT') {
      return <button onClick={() => moderateTarget('remove-comment')} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400"><Trash2 size={16} className="mr-2 inline" />Gỡ bình luận</button>;
    }
    if (selectedReport.targetType === 'USER') {
      return (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSuspendModal({ report: selectedReport })} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400"><UserMinus size={16} className="mr-2 inline" />Suspend user</button>
          <button onClick={() => moderateTarget('unsuspend-user')} className="rounded-xl bg-[#1f2228] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-white/10">Unsuspend</button>
        </div>
      );
    }
    return null;
  }, [moderateTarget, selectedReport]);

  return (
    <div className="space-y-6">
      <Section title="Bộ lọc báo cáo" subtitle="Chỉ gửi params khi có chọn filter">
        <div className="flex flex-wrap gap-3">
          <Select label="Status" value={filters.status} onChange={(value) => updateFilter('status', value)} options={[{ value: '', label: 'Tất cả' }, ...REPORT_STATUSES.map((item) => ({ value: item, label: statusLabel[item] }))]} />
          <Select label="Target" value={filters.targetType} onChange={(value) => updateFilter('targetType', value)} options={[{ value: '', label: 'Tất cả' }, ...REPORT_TARGETS.map((item) => ({ value: item, label: targetLabel[item] }))]} />
          <Select label="Reason" value={filters.reason} onChange={(value) => updateFilter('reason', value)} options={[{ value: '', label: 'Tất cả' }, ...REPORT_REASONS.map((item) => ({ value: item, label: reasonLabel[item] }))]} />
        </div>
      </Section>

      <Section title="Danh sách báo cáo" subtitle={`${formatNumber(pageInfo.total)} báo cáo phù hợp`}>
        {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={loadReports} /> : <ReportList reports={reports} onSelect={openReport} />}
        {pageInfo.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
            <button disabled={filters.page <= 0} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))} className="rounded-xl bg-[#1f2228] px-4 py-2 font-bold text-white disabled:opacity-40">Trước</button>
            <span className="text-[#b8c0cc]">{filters.page + 1} / {pageInfo.totalPages}</span>
            <button disabled={filters.page >= pageInfo.totalPages - 1} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="rounded-xl bg-[#1f2228] px-4 py-2 font-bold text-white disabled:opacity-40">Sau</button>
          </div>
        )}
      </Section>

      {selectedReport && (
        <ReportDetailDrawer
          report={selectedReport}
          loading={detailLoading}
          notice={notice}
          onClose={() => setSelectedReport(null)}
          onStartReview={startReview}
          onResolve={() => setResolutionModal({ type: 'resolve' })}
          onReject={() => setResolutionModal({ type: 'reject' })}
          targetAction={targetAction}
        />
      )}

      {resolutionModal && (
        <ResolutionModal
          type={resolutionModal.type}
          onClose={() => setResolutionModal(null)}
          onSubmit={(note) => finishReport(resolutionModal.type, note)}
        />
      )}

      {suspendModal && (
        <SuspendModal
          onClose={() => setSuspendModal(null)}
          onSubmit={(reason) => moderateTarget('suspend-user', reason)}
        />
      )}
    </div>
  );
};

const ReportList = ({ reports, onSelect }) => {
  if (!reports.length) return <EmptyBlock label="Không có báo cáo phù hợp." />;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#8f9aaa]">
            <tr>
              <th className="py-3">ID</th>
              <th className="py-3">Người gửi</th>
              <th className="py-3">Đối tượng</th>
              <th className="py-3">Lý do</th>
              <th className="py-3">Trạng thái</th>
              <th className="py-3">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {reports.map((report) => (
              <tr key={report.id} onClick={() => onSelect(report)} className="cursor-pointer text-[#e8edf5] hover:bg-white/5">
                <td className="py-3 font-black">#{report.id}</td>
                <td className="py-3">{report.reporterName || `User #${report.reporterId}`}</td>
                <td className="py-3">{targetLabel[report.targetType] || report.targetType} #{report.targetId}</td>
                <td className="py-3">{reasonLabel[report.reason] || report.reason}</td>
                <td className="py-3"><StatusBadge status={report.status} /></td>
                <td className="py-3 text-[#b8c0cc]">{formatDateTime(report.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {reports.map((report) => (
          <button key={report.id} onClick={() => onSelect(report)} className="w-full rounded-2xl border border-white/10 bg-[#1f2228] p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">Report #{report.id}</p>
                <p className="text-sm text-[#b8c0cc]">{report.reporterName || `User #${report.reporterId}`}</p>
              </div>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-3 text-sm text-[#e8edf5]">{targetLabel[report.targetType] || report.targetType} #{report.targetId}</p>
            <p className="text-sm text-[#b8c0cc]">{reasonLabel[report.reason] || report.reason}</p>
          </button>
        ))}
      </div>
    </>
  );
};

const ReportDetailDrawer = ({ report, loading, notice, onClose, onStartReview, onResolve, onReject, targetAction }) => (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
    <div className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#15171c] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8f9aaa]">Report Detail</p>
          <h2 className="mt-1 text-2xl font-black text-white">Báo cáo #{report.id}</h2>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-[#b8c0cc] hover:bg-white/10"><X size={20} /></button>
      </div>

      {loading && <div className="mt-5"><LoadingBlock label="Đang tải chi tiết báo cáo..." /></div>}
      {notice && <div className="mt-5"><ErrorBlock message={notice} /></div>}

      <div className="mt-6 space-y-3">
        <DetailRow label="Reporter" value={`${report.reporterName || 'User'} (#${report.reporterId})`} />
        <DetailRow label="Target" value={`${targetLabel[report.targetType] || report.targetType} #${report.targetId}`} />
        <DetailRow label="Reason" value={reasonLabel[report.reason] || report.reason} />
        <DetailRow label="Status" value={<StatusBadge status={report.status} />} />
        <DetailRow label="Description" value={report.description || 'Không có mô tả'} multiline />
        <DetailRow label="Reviewed by" value={report.reviewedByName ? `${report.reviewedByName} (#${report.reviewedById})` : 'Chưa có'} />
        <DetailRow label="Reviewed at" value={formatDateTime(report.reviewedAt)} />
        <DetailRow label="Resolution note" value={report.resolutionNote || 'Chưa có'} multiline />
        <DetailRow label="Created at" value={formatDateTime(report.createdAt)} />
        <DetailRow label="Updated at" value={formatDateTime(report.updatedAt)} />
      </div>

      <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8f9aaa]">Moderation action</p>
          {targetAction || <p className="text-sm text-[#b8c0cc]">Không có action phù hợp.</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8f9aaa]">Report status flow</p>
          <div className="flex flex-wrap gap-2">
            {report.status === 'PENDING' && <button onClick={onStartReview} className="rounded-xl bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#2d88ff]">Bắt đầu xem xét</button>}
            {(report.status === 'PENDING' || report.status === 'REVIEWING') && (
              <>
                <button onClick={onResolve} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400">Hoàn tất xử lý</button>
                <button onClick={onReject} className="rounded-xl bg-[#1f2228] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-white/10">Không chấp nhận</button>
              </>
            )}
            {(report.status === 'RESOLVED' || report.status === 'REJECTED') && <p className="text-sm text-[#b8c0cc]">Báo cáo này đã kết thúc.</p>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DetailRow = ({ label, value, multiline }) => (
  <div className="rounded-2xl border border-white/10 bg-[#1f2228] p-4">
    <p className="text-xs font-bold uppercase tracking-wide text-[#8f9aaa]">{label}</p>
    <div className={`mt-2 text-sm font-semibold text-white ${multiline ? 'whitespace-pre-wrap leading-6' : ''}`}>{value}</div>
  </div>
);

const ResolutionModal = ({ type, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const title = type === 'resolve' ? 'Hoàn tất xử lý báo cáo' : 'Không chấp nhận báo cáo';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#15171c] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-[#b8c0cc] hover:bg-white/10"><X size={18} /></button>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 2000))}
          rows={5}
          placeholder="Ghi chú xử lý, tối đa 2000 ký tự"
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-[#1f2228] p-4 text-sm text-white outline-none focus:border-[#1877f2]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl bg-[#1f2228] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10">Hủy</button>
          <button onClick={() => onSubmit(note.trim())} className="rounded-xl bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#2d88ff]">Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

const SuspendModal = ({ onClose, onSubmit }) => {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#15171c] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Suspend user</h3>
          <button onClick={onClose} className="rounded-full p-2 text-[#b8c0cc] hover:bg-white/10"><X size={18} /></button>
        </div>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, 1000))}
          rows={4}
          placeholder="Lý do suspend, tối đa 1000 ký tự"
          className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-[#1f2228] p-4 text-sm text-white outline-none focus:border-[#1877f2]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl bg-[#1f2228] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10">Hủy</button>
          <button onClick={() => onSubmit(reason.trim())} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-400">Suspend</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
