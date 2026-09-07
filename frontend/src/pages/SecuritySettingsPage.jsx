import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Laptop,
  Loader2,
  LogOut,
  MonitorSmartphone,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
  XCircle,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { securityApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const statusStyle = {
  ACTIVE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  REVOKED: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  EXPIRED: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
};

const formatDateTime = (value) => {
  if (!value) return 'Chua co du lieu';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch (_) {
    return value;
  }
};

const deviceIcon = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('mobile')) return Smartphone;
  if (normalized.includes('desktop')) return Laptop;
  return MonitorSmartphone;
};

const SecuritySettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'ACTIVE'),
    [sessions]
  );

  const trustedDeviceCount = useMemo(() => {
    const ids = new Set();
    sessions.forEach((session) => {
      if (session.trusted && session.userDeviceId) {
        ids.add(session.userDeviceId);
      }
    });
    return ids.size;
  }, [sessions]);

  const currentSession = useMemo(
    () => sessions.find((session) => session.current),
    [sessions]
  );

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await securityApi.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load sessions error:', err);
      setError('Khong the tai danh sach phien dang nhap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revokeSession = async (session) => {
    if (!session?.id) return;

    const confirmed = window.confirm(
      session.current
        ? 'Ban dang xuat phien hien tai. Tiep tuc?'
        : 'Dang xuat thiet bi nay?'
    );
    if (!confirmed) return;

    setActionLoading(`session:${session.id}`);
    setNotice('');
    setError('');

    try {
      await securityApi.revokeSession(session.id);
      setNotice(session.current ? 'Phien hien tai da bi thu hoi.' : 'Da dang xuat thiet bi duoc chon.');

      if (session.current) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }

      await loadSessions();
    } catch (err) {
      console.error('Revoke session error:', err);
      setError('Khong the dang xuat thiet bi nay.');
    } finally {
      setActionLoading('');
    }
  };

  const revokeOtherSessions = async () => {
    const confirmed = window.confirm('Dang xuat tat ca thiet bi khac?');
    if (!confirmed) return;

    setActionLoading('others');
    setNotice('');
    setError('');

    try {
      await securityApi.revokeOtherSessions();
      setNotice('Da dang xuat tat ca thiet bi khac.');
      await loadSessions();
    } catch (err) {
      console.error('Revoke other sessions error:', err);
      setError('Khong the dang xuat cac thiet bi khac.');
    } finally {
      setActionLoading('');
    }
  };

  const updateDeviceTrust = async (session) => {
    if (!session?.userDeviceId) return;

    setActionLoading(`device:${session.userDeviceId}`);
    setNotice('');
    setError('');

    try {
      if (session.trusted) {
        await securityApi.untrustDevice(session.userDeviceId);
        setNotice('Da bo tin tuong thiet bi nay.');
      } else {
        await securityApi.trustDevice(session.userDeviceId);
        setNotice('Da danh dau thiet bi nay la dang tin cay.');
      }
      await loadSessions();
    } catch (err) {
      console.error('Update device trust error:', err);
      setError('Khong the cap nhat trang thai tin cay cua thiet bi.');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-[#e4e6eb]">
      <Header
        currentUser={user}
        onToggleChat={() => navigate('/chat')}
        onToggleNotifications={() => navigate('/notifications')}
      />

      <main className="mx-auto flex w-full max-w-[1220px] gap-6 px-4 py-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-[#2f3031] bg-[#242526] p-3">
            <button
              onClick={() => navigate('/home')}
              className="mb-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-[#b0b3b8] transition hover:bg-[#3a3b3c] hover:text-white"
            >
              <LogOut size={18} />
              <span>Ve trang chu</span>
            </button>
            <div className="rounded-2xl bg-[#1877f2] px-3 py-3 text-sm font-bold text-white">
              Bao mat dang nhap
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-5 overflow-hidden rounded-2xl border border-[#2f3031] bg-[#242526]">
            <div className="border-b border-[#2f3031] px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1877f2]/15 text-[#2d88ff]">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8ab4f8]">Security</p>
                    <h1 className="mt-1 text-2xl font-black text-white">Thiet bi va phien dang nhap</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b0b3b8]">
                      Quan ly cac noi dang dang nhap tai khoan cua ban. Khi thu hoi mot phien,
                      access token va websocket cua phien do se khong the xac thuc lai.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={loadSessions}
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3a3b3c] px-4 text-sm font-bold text-white transition hover:bg-[#4e4f50] disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCcw size={17} />}
                    Tai lai
                  </button>
                  <button
                    onClick={revokeOtherSessions}
                    disabled={actionLoading === 'others' || activeSessions.length <= 1}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {actionLoading === 'others' ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                    Dang xuat thiet bi khac
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryTile icon={Wifi} label="Dang hoat dong" value={activeSessions.length} />
              <SummaryTile icon={MonitorSmartphone} label="Tong so phien" value={sessions.length} />
              <SummaryTile icon={ShieldCheck} label="Trusted" value={trustedDeviceCount} />
              <SummaryTile icon={Clock3} label="Phien hien tai" value={currentSession?.deviceName || 'Dang xac dinh'} compact />
            </div>
          </div>

          {notice && (
            <Banner tone="success" icon={CheckCircle2}>
              {notice}
            </Banner>
          )}

          {error && (
            <Banner tone="error" icon={AlertTriangle}>
              {error}
            </Banner>
          )}

          {loading ? (
            <div className="rounded-2xl border border-[#2f3031] bg-[#242526] p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#2d88ff]" size={30} />
              <p className="mt-3 text-sm font-semibold text-[#b0b3b8]">Dang tai danh sach phien...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  loading={actionLoading === `session:${session.id}`}
                  trustLoading={actionLoading === `device:${session.userDeviceId}`}
                  onRevoke={() => revokeSession(session)}
                  onTrustToggle={() => updateDeviceTrust(session)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#3e4042] bg-[#242526] p-10 text-center text-sm text-[#b0b3b8]">
              Chua co phien dang nhap nao.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const SummaryTile = ({ icon: Icon, label, value, compact = false }) => (
  <div className="rounded-2xl bg-[#18191a] p-4">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#3a3b3c] text-[#2d88ff]">
      <Icon size={19} />
    </div>
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b0b3b8]">{label}</p>
    <p className={`mt-1 font-black text-white ${compact ? 'truncate text-base' : 'text-2xl'}`}>
      {value}
    </p>
  </div>
);

const Banner = ({ tone, icon: Icon, children }) => {
  const cls = tone === 'success'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : 'border-rose-500/30 bg-rose-500/10 text-rose-100';

  return (
    <div className={`mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${cls}`}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  );
};

const SessionCard = ({ session, loading, trustLoading, onRevoke, onTrustToggle }) => {
  const Icon = deviceIcon(session.deviceType);
  const active = session.status === 'ACTIVE';

  return (
    <article className="rounded-2xl border border-[#2f3031] bg-[#242526] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3a3b3c] text-[#e4e6eb]">
            <Icon size={24} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black text-white">
                {session.deviceName || 'Thiet bi khong xac dinh'}
              </h2>
              {session.current && (
                <span className="rounded-full border border-[#2d88ff]/40 bg-[#2d88ff]/15 px-2.5 py-1 text-xs font-bold text-[#8ab4f8]">
                  Hien tai
                </span>
              )}
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[session.status] || statusStyle.EXPIRED}`}>
                {session.status}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                session.trusted
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                  : 'border-[#3e4042] bg-[#18191a] text-[#b0b3b8]'
              }`}>
                {session.trusted ? 'Trusted' : 'Untrusted'}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-[#b0b3b8] sm:grid-cols-2 xl:grid-cols-4">
              <Meta label="Browser" value={session.browser || 'Unknown'} />
              <Meta label="OS" value={session.os || 'Unknown'} />
              <Meta label="IP" value={session.ipAddress || 'Unknown'} />
              <Meta label="Loai" value={session.deviceType || 'Unknown'} />
            </div>

            <div className="mt-3 grid gap-2 text-sm text-[#b0b3b8] md:grid-cols-3">
              <Meta label="Dang nhap luc" value={formatDateTime(session.createdAt)} />
              <Meta label="Hoat dong gan nhat" value={formatDateTime(session.lastActiveAt)} />
              <Meta label="Het han refresh" value={formatDateTime(session.expiresAt)} />
            </div>

            {session.userAgent && (
              <p className="mt-3 truncate text-xs text-[#777d86]" title={session.userAgent}>
                {session.userAgent}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            onClick={onTrustToggle}
            disabled={!session.userDeviceId || trustLoading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              session.trusted
                ? 'bg-[#3a3b3c] text-white hover:bg-[#4e4f50]'
                : 'bg-[#1877f2] text-white hover:bg-[#166fe5]'
            }`}
          >
            {trustLoading ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
            {session.trusted ? 'Bo tin tuong' : 'Tin tuong'}
          </button>

          <button
            onClick={onRevoke}
            disabled={!active || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3a3b3c] px-4 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : active ? <Trash2 size={17} /> : <XCircle size={17} />}
            {session.current ? 'Dang xuat phien nay' : 'Dang xuat'}
          </button>
        </div>
      </div>
    </article>
  );
};

const Meta = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777d86]">{label}</p>
    <p className="mt-0.5 truncate font-semibold text-[#e4e6eb]" title={String(value)}>
      {value}
    </p>
  </div>
);

export default SecuritySettingsPage;
