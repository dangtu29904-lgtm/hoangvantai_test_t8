import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ThumbsUp, MessageSquare, Send, MoreHorizontal, Globe, Users, Lock, 
  Trash2, Edit3, X, Check, Heart, Smile 
} from 'lucide-react';
import { feedApi } from '../../services/api';

const Avatar = ({ name, src, size = 'h-10 w-10' }) => (
  <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}>
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
  </div>
);

const REACTION_TYPES = [
  { id: 'LIKE', label: 'Thích', icon: '👍', color: 'text-[#2d88ff]' },
  { id: 'LOVE', label: 'Yêu thích', icon: '❤️', color: 'text-[#f3425f]' },
  { id: 'HAHA', label: 'Cười', icon: '😆', color: 'text-[#f7b928]' },
  { id: 'WOW', label: 'Bất ngờ', icon: '😮', color: 'text-[#f7b928]' },
  { id: 'SAD', label: 'Buồn', icon: '😢', color: 'text-[#f7b928]' },
  { id: 'ANGRY', label: 'Phẫn nộ', icon: '😡', color: 'text-[#e41e3f]' },
];

const PrivacyIcon = ({ privacy }) => {
  switch (privacy) {
    case 'FRIENDS':
      return <Users size={14} className="text-[#b0b3b8]" title="Bạn bè" />;
    case 'ONLY_ME':
      return <Lock size={14} className="text-[#b0b3b8]" title="Chỉ mình tôi" />;
    default:
      return <Globe size={14} className="text-[#b0b3b8]" title="Công khai" />;
  }
};

const PostCard = ({ post, currentUser, onReload }) => {
  const navigate = useNavigate();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentItems, setCommentItems] = useState([]);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const [myReaction, setMyReaction] = useState(post.userReaction || null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post?.content || '');
  const [editPrivacy, setEditPrivacy] = useState(post?.privacy || 'PUBLIC');
  const [savingEdit, setSavingEdit] = useState(false);

  const isAuthor = currentUser?.id && post?.authorId && currentUser.id === post.authorId;

  // React handling
  const handleReact = async (type) => {
    setShowReactionPicker(false);
    try {
      if (myReaction === type) {
        await feedApi.removeReaction(post.id);
        setMyReaction(null);
      } else {
        await feedApi.react(post.id, type);
        setMyReaction(type);
      }
      if (onReload) onReload();
    } catch (err) {
      console.error('React error:', err);
    }
  };

  // Toggle comment section
  const handleToggleComments = async () => {
    if (!commentsOpen) {
      setCommentsOpen(true);
      try {
        const res = await feedApi.getComments(post.id, 0, 50);
        setCommentItems(res.items || res || []);
      } catch (err) {
        console.error('Fetch comments error:', err);
      }
    } else {
      setCommentsOpen(false);
    }
  };

  // Submit main comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await feedApi.createComment(post.id, commentText.trim());
      setCommentText('');
      const res = await feedApi.getComments(post.id, 0, 50);
      setCommentItems(res.items || res || []);
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  // Submit reply comment
  const handleSubmitReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      await feedApi.createReply(commentId, replyText.trim());
      setReplyText('');
      setReplyingToId(null);
      const res = await feedApi.getComments(post.id, 0, 50);
      setCommentItems(res.items || res || []);
    } catch (err) {
      console.error('Reply error:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await feedApi.deleteComment(commentId);
      const res = await feedApi.getComments(post.id, 0, 50);
      setCommentItems(res.items || res || []);
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  // Save edit post
  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      await feedApi.updatePost(post.id, {
        content: editContent.trim(),
        privacy: editPrivacy
      });
      setIsEditing(false);
      if (onReload) onReload();
    } catch (err) {
      alert('Không thể cập nhật bài viết');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      try {
        await feedApi.deletePost(post.id);
        if (onReload) onReload();
      } catch (err) {
        alert('Không thể xóa bài viết');
      }
    }
  };

  const currentReactObj = REACTION_TYPES.find(r => r.id === myReaction);

  return (
    <article className="mb-4 overflow-hidden rounded-xl bg-[#242526] shadow-sm border border-[#3e4042]/50 font-sans text-[#e4e6eb]">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => post?.authorId && navigate(`/profile/${post.authorId}`)}>
            <Avatar name={post?.authorName} src={post?.authorAvatarUrl} />
          </div>
          <div>
            <h4 
              className="font-bold text-white hover:underline cursor-pointer"
              onClick={() => post?.authorId && navigate(`/profile/${post.authorId}`)}
            >
              {post?.authorName || 'Người dùng Socially'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#b0b3b8]">
              <span>{post?.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN') : 'Vừa xong'}</span>
              <span>•</span>
              <PrivacyIcon privacy={post?.privacy} />
            </div>
          </div>
        </div>

        {/* Options menu for author */}
        <div className="relative">
          <button 
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]"
          >
            <MoreHorizontal size={20} />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl bg-[#242526] p-1.5 shadow-2xl ring-1 ring-[#3e4042]">
              {isAuthor && (
                <>
                  <button 
                    onClick={() => { setShowOptionsMenu(false); setIsEditing(true); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#e4e6eb] hover:bg-[#3a3b3c]"
                  >
                    <Edit3 size={16} /> Chỉnh sửa bài viết
                  </button>
                  <button 
                    onClick={() => { setShowOptionsMenu(false); handleDeletePost(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#fa3e3e] hover:bg-[#3a3b3c]"
                  >
                    <Trash2 size={16} /> Xóa bài viết
                  </button>
                </>
              )}
              {!isAuthor && (
                <button 
                  onClick={() => setShowOptionsMenu(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#e4e6eb] hover:bg-[#3a3b3c]"
                >
                  Ẩn bài viết
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Content */}
      {isEditing ? (
        <div className="px-4 pb-4">
          <textarea
            rows="3"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full rounded-lg bg-[#3a3b3c] p-3 text-sm text-white outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <select
              value={editPrivacy}
              onChange={e => setEditPrivacy(e.target.value)}
              className="rounded-lg bg-[#3a3b3c] px-3 py-1 text-xs text-white outline-none"
            >
              <option value="PUBLIC">Công khai</option>
              <option value="FRIENDS">Bạn bè</option>
              <option value="ONLY_ME">Chỉ mình tôi</option>
            </select>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4e4f50]"
              >
                Hủy
              </button>
              <button 
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="rounded-lg bg-[#1877f2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#166fe5]"
              >
                {savingEdit ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Post Content Body */
        <div className="px-4 pb-4">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#e4e6eb]">
            {post?.content}
          </p>
        </div>
      )}

      {/* Action Bar */}
      <div className="relative border-t border-[#3e4042] px-2 py-1 flex items-center justify-between">
        
        {/* Reaction picker popover */}
        {showReactionPicker && (
          <div 
            onMouseLeave={() => setShowReactionPicker(false)}
            className="absolute -top-12 left-4 z-40 flex items-center gap-1.5 rounded-full bg-[#242526] px-3 py-1.5 shadow-2xl border border-[#3e4042] animate-in fade-in zoom-in-95"
          >
            {REACTION_TYPES.map(r => (
              <button
                key={r.id}
                onClick={() => handleReact(r.id)}
                className="transform text-2xl transition hover:scale-125"
                title={r.label}
              >
                {r.icon}
              </button>
            ))}
          </div>
        )}

        {/* Like Button */}
        <button
          onMouseEnter={() => setShowReactionPicker(true)}
          onClick={() => handleReact('LIKE')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold hover:bg-[#3a3b3c] transition-colors ${
            currentReactObj ? currentReactObj.color : 'text-[#b0b3b8]'
          }`}
        >
          {currentReactObj ? (
            <span className="text-base">{currentReactObj.icon}</span>
          ) : (
            <ThumbsUp size={18} />
          )}
          <span>{currentReactObj ? currentReactObj.label : 'Thích'}</span>
        </button>

        {/* Comment Button */}
        <button 
          onClick={handleToggleComments}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors"
        >
          <MessageSquare size={18} />
          <span>Bình luận</span>
        </button>

        {/* Share Button */}
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors">
          <Send size={18} />
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Comment Section */}
      {commentsOpen && (
        <div className="border-t border-[#3e4042] bg-[#1c1d1e] p-4">
          {/* Threaded Comment List */}
          <div className="mb-4 max-h-80 overflow-y-auto space-y-3.5 pr-1">
            {commentItems
              .filter(item => !item.parentCommentId)
              .map(rootItem => {
                const renderCommentNode = (item, isChild = false) => {
                  const childReplies = commentItems.filter(c => c.parentCommentId === item.id);
                  
                  return (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <Avatar name={item.authorName} src={item.authorAvatarUrl} size={isChild ? "h-7 w-7" : "h-8 w-8"} />
                        <div className="flex-1 min-w-0">
                          <div className="inline-block rounded-2xl bg-[#3a3b3c] px-3.5 py-2 text-sm max-w-full break-words">
                            <span 
                              className="font-bold text-white hover:underline cursor-pointer block text-xs sm:text-sm"
                              onClick={() => item.authorId && navigate(`/profile/${item.authorId}`)}
                            >
                              {item.authorName || 'Người dùng'}
                            </span>
                            <p className="text-[#e4e6eb] mt-0.5 text-xs sm:text-sm leading-snug">{item.content}</p>
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[#b0b3b8] pl-2">
                            <button 
                              onClick={() => {
                                setReplyingToId(replyingToId === item.id ? null : item.id);
                                setReplyText('');
                              }} 
                              className="hover:underline hover:text-white"
                            >
                              Trả lời
                            </button>
                            {currentUser?.id === item.authorId && (
                              <button 
                                onClick={() => handleDeleteComment(item.id)} 
                                className="hover:underline text-rose-400 hover:text-rose-300"
                              >
                                Xóa
                              </button>
                            )}
                            <span className="text-[11px] text-[#8a8d91]">
                              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          {/* Inline reply box */}
                          {replyingToId === item.id && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <Avatar name={currentUser?.userName} src={currentUser?.avatarUrl} size="h-6 w-6" />
                              <input
                                autoFocus
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmitReply(item.id)}
                                placeholder={`Trả lời ${item.authorName}...`}
                                className="flex-1 rounded-full bg-[#3a3b3c] px-3.5 py-1.5 text-xs text-white outline-none placeholder:text-[#b0b3b8] border border-[#4e4f50] focus:border-[#1877f2]"
                              />
                              <button 
                                onClick={() => handleSubmitReply(item.id)} 
                                className="rounded-full bg-[#1877f2] p-1.5 text-white hover:bg-[#166fe5] shrink-0"
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nested Replies (Indented with connecting line) */}
                      {childReplies.length > 0 && (
                        <div className="ml-5 sm:ml-7 pl-3 border-l-2 border-[#3e4042] space-y-3 pt-1">
                          {childReplies.map(reply => renderCommentNode(reply, true))}
                        </div>
                      )}
                    </div>
                  );
                };

                return renderCommentNode(rootItem, false);
              })}

            {commentItems.length === 0 && (
              <p className="text-center text-xs text-[#b0b3b8] py-2">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
            )}
          </div>

          {/* Main Comment Input */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#3e4042]/60">
            <Avatar name={currentUser?.userName} src={currentUser?.avatarUrl} size="h-8 w-8" />
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
              placeholder="Viết bình luận..."
              className="flex-1 rounded-full bg-[#3a3b3c] px-4 py-2 text-sm text-white outline-none placeholder:text-[#b0b3b8] border border-[#4e4f50] focus:border-[#1877f2]"
            />
            <button 
              onClick={handleSubmitComment} 
              className="rounded-full bg-[#1877f2] p-2 text-white hover:bg-[#166fe5] transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
