import React, { useEffect, useState } from 'react';
import { CalendarDays, Mail, Pencil, Save, UserRound } from 'lucide-react';
import { profileApi } from '../../services/api';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

const ProfilePanel = () => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ userName: '', bio: '', dateOfBirth: '', gender: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    profileApi.getMe().then((data) => {
      setProfile(data);
      setForm({
        userName: data.userName || '',
        bio: data.bio || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || '',
      });
    }).catch(() => setMessage('Không thể tải hồ sơ.'));
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const updated = await profileApi.updateMe({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
      });
      setProfile(updated);
      setEditing(false);
      setMessage('Đã cập nhật hồ sơ.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cập nhật hồ sơ thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="p-8 text-sm text-slate-500">Đang tải hồ sơ...</div>;

  return (
    <section className="h-full overflow-y-auto bg-[#f7f9fc] px-5 py-6 md:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="h-36 bg-[linear-gradient(120deg,#0f766e,#155e75_55%,#164e63)]" />
          <div className="relative px-6 pb-7 md:px-9">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-teal-100 text-3xl font-bold text-teal-800 shadow-md">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.userName} className="h-full w-full object-cover" /> : profile.userName?.charAt(0).toUpperCase()}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{profile.userName}</h1>
                  <p className="text-sm text-slate-500">Thành viên từ {formatDate(profile.createdAt)}</p>
                </div>
              </div>
              <button onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700">
                <Pencil size={16} /> {editing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="mt-8 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Tên hiển thị<input required minLength="2" maxLength="50" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500" /></label>
                <label className="text-sm font-semibold text-slate-700">Ngày sinh<input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500" /></label>
                <label className="text-sm font-semibold text-slate-700">Giới tính<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500"><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">Giới thiệu<textarea maxLength="500" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows="4" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal-500" /></label>
                <button disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"><Save size={16} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
              </form>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><UserRound size={18} className="text-teal-700" /><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Giới thiệu</p><p className="mt-1 text-sm text-slate-700">{profile.bio || 'Chưa có phần giới thiệu.'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><Mail size={18} className="text-teal-700" /><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Email</p><p className="mt-1 break-all text-sm text-slate-700">{profile.email}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><CalendarDays size={18} className="text-teal-700" /><p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ngày sinh</p><p className="mt-1 text-sm text-slate-700">{formatDate(profile.dateOfBirth)}</p></div>
              </div>
            )}
            {message && <p className="mt-4 text-sm font-medium text-teal-700">{message}</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfilePanel;
