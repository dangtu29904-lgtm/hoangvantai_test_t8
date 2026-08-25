import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import PostCard from '../components/social/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { feedApi, profileApi } from '../services/api';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await feedApi.getPost(postId);
      setPost(data);
    } catch (err) {
      console.error('Load post detail error:', err);
      setError(err?.response?.data?.message || 'Không thể tải bài viết này');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    profileApi.getMe().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  return (
    <div className="min-h-screen bg-[#18191a] text-[#e4e6eb]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#242526] text-[#e4e6eb] hover:bg-[#3a3b3c]"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xl font-bold text-white">Bài viết</p>
            <p className="text-sm text-[#b0b3b8]">Chi tiết nội dung và bình luận</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-[#3e4042] bg-[#242526] p-10 text-[#b0b3b8]">
            <Loader2 className="mr-2 animate-spin" size={18} />
            Đang tải bài viết...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#3e4042] bg-[#242526] p-8 text-center">
            <p className="font-semibold text-white">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="mt-4 rounded-xl bg-[#1877f2] px-4 py-2 text-sm font-bold text-white"
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          <PostCard post={post} currentUser={profile || user} onReload={loadPost} />
        )}
      </main>
    </div>
  );
};

export default PostDetailPage;
