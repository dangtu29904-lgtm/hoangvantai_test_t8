import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(null);
  const [otp, setOtp] = useState('');
  const [otpInfo, setOtpInfo] = useState(null);
  const [trustDevice, setTrustDevice] = useState(true);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const { login, checkLoginApproval, sendLoginOtp, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingApproval?.approvalToken) return undefined;
    if (pendingApproval.loginStatus === 'PENDING_OTP') return undefined;

    let stopped = false;
    const timerId = setInterval(async () => {
      const result = await checkLoginApproval(pendingApproval.approvalToken);
      if (stopped) return;

      if (result.success) {
        clearInterval(timerId);
        navigate('/');
        return;
      }

      if (['REJECTED', 'EXPIRED', 'CONSUMED'].includes(result.status)) {
        clearInterval(timerId);
        setPendingApproval(null);
        setError(
          result.status === 'REJECTED'
            ? 'Yeu cau dang nhap da bi tu choi.'
            : 'Yeu cau dang nhap da het han, vui long thu lai.'
        );
      }
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(timerId);
    };
  }, [checkLoginApproval, navigate, pendingApproval]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else if (result.pendingApproval) {
      setPendingApproval(result);
      setOtp('');
      setOtpInfo(null);
      setTrustDevice(true);
    } else {
      setError(result.error);
    }
  };

  const handleSendOtp = async () => {
    if (!pendingApproval?.approvalToken || otpLoading) return;
    setError('');
    setOtpLoading(true);
    const result = await sendLoginOtp(pendingApproval.approvalToken);
    setOtpLoading(false);

    if (result.success) {
      setOtpInfo(result);
      if (result.expiresAt) {
        setPendingApproval((current) => current ? { ...current, expiresAt: result.expiresAt } : current);
      }
      return;
    }

    setError(result.error);
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!pendingApproval?.approvalToken || otpVerifying) return;
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP phai gom 6 chu so.');
      return;
    }

    setError('');
    setOtpVerifying(true);
    const result = await verifyLoginOtp(pendingApproval.approvalToken, otp.trim(), trustDevice);
    setOtpVerifying(false);

    if (result.success) {
      navigate('/');
      return;
    }

    setError(result.error);
  };

  if (pendingApproval) {
    const canUseTrustedApproval = pendingApproval.loginStatus !== 'PENDING_OTP';
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md rounded-xl bg-white p-10 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <ShieldCheck size={34} />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900">Xac minh thiet bi moi</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Day la thiet bi moi hoac co diem rui ro cao.
            {canUseTrustedApproval
              ? ' Ban co the cho phep tren thiet bi tin cay hoac xac minh bang OTP.'
              : ' Khong co thiet bi tin cay dang san sang, hay xac minh bang OTP.'}
          </p>
          {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
          <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-left text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Risk score</span>
              <strong>{pendingApproval.riskScore ?? 'N/A'}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>Het han</span>
              <strong>
                {pendingApproval.expiresAt ? new Date(pendingApproval.expiresAt).toLocaleTimeString('vi-VN') : 'N/A'}
              </strong>
            </div>
          </div>

          {canUseTrustedApproval && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600">
              <Loader2 size={18} className="animate-spin" />
              Dang cho thiet bi tin cay xac nhan...
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-200 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Xac minh bang OTP</p>
                <p className="text-xs text-gray-500">Dung khi khong cam thiet bi tin cay ben canh.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpLoading}
              className="mt-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {otpLoading ? <Loader2 size={18} className="animate-spin" /> : 'Gui ma OTP'}
            </button>
            {otpInfo?.debugOtp && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Dev OTP: {otpInfo.debugOtp}
              </div>
            )}
            {otpInfo && (
              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Nhap ma OTP 6 so"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(event) => setTrustDevice(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="font-bold text-gray-900">Tin cay thiet bi nay</span>
                    <span className="block text-xs text-gray-500">
                      Lan dang nhap sau tren trinh duyet nay se khong can OTP neu rui ro thap.
                    </span>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={otpVerifying || otp.length !== 6}
                  className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {otpVerifying ? <Loader2 size={18} className="animate-spin" /> : 'Xac minh va dang nhap'}
                </button>
              </form>
            )}
          </div>

          <button
            onClick={() => {
              setPendingApproval(null);
              setOtp('');
              setOtpInfo(null);
              setTrustDevice(true);
            }}
            className="mt-6 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Thu lai bang tai khoan khac
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="bg-messenger/10 p-3 rounded-full">
            <MessageCircle className="w-12 h-12 text-messenger" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Chat
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-messenger focus:border-messenger focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-messenger focus:border-messenger focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-messenger hover:bg-messenger/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-messenger transition-colors"
            >
              Sign in
            </button>
          </div>
          <div className="text-center text-sm text-gray-600">
            Don't have an account? <Link to="/register" className="text-messenger hover:underline">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
