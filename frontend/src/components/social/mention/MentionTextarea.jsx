import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { profileApi } from '../../../services/api';
import {
  MAX_MENTION_USERS,
  detectActiveMention,
  getUserId,
  normalizeMention,
  reconcileMentionsWithText,
  uniqueMentions,
} from './mentionUtils';

const resultItems = (data) => {
  if (Array.isArray(data)) return data;
  return data?.items || data?.content || data?.data || [];
};

const MentionAvatar = ({ user }) => {
  const name = user?.userName || user?.username || user?.name || 'U';
  const src = user?.avatarUrl || user?.avatar;

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-sm font-bold text-white">
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </div>
  );
};

const MentionTextarea = ({
  value,
  onChange,
  selectedMentions = [],
  onMentionsChange,
  currentUserId,
  className = '',
  rows = 4,
  placeholder,
  autoFocus = false,
  disabled = false,
}) => {
  const textareaRef = useRef(null);
  const rootRef = useRef(null);
  const requestSeqRef = useRef(0);
  const [activeMention, setActiveMention] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [notice, setNotice] = useState('');

  const normalizedMentions = useMemo(() => uniqueMentions(selectedMentions), [selectedMentions]);
  const selectedIds = useMemo(() => new Set(normalizedMentions.map((mention) => mention.userId)), [normalizedMentions]);

  const syncActiveMention = (nextValue = value, selectionStart = textareaRef.current?.selectionStart ?? 0) => {
    setActiveMention(detectActiveMention(nextValue, selectionStart));
  };

  const updateText = (nextValue, selectionStart) => {
    onChange(nextValue);
    const reconciled = reconcileMentionsWithText(nextValue, selectedMentions);
    if (reconciled.length !== normalizedMentions.length) {
      onMentionsChange?.(reconciled);
    }
    syncActiveMention(nextValue, selectionStart);
  };

  useEffect(() => {
    const reconciled = reconcileMentionsWithText(value, selectedMentions);
    if (reconciled.length !== normalizedMentions.length) {
      onMentionsChange?.(reconciled);
    }
  }, [value, selectedMentions, normalizedMentions.length, onMentionsChange]);

  useEffect(() => {
    if (!activeMention || activeMention.query.length === 0) {
      requestSeqRef.current += 1;
      setSuggestions([]);
      setLoading(false);
      setHighlightedIndex(0);
      setNotice(activeMention ? 'Nhập tên để tìm người dùng' : '');
      return undefined;
    }

    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setLoading(true);
    setNotice('');

    const timer = window.setTimeout(async () => {
      try {
        const data = await profileApi.search(activeMention.query, 0, 20);
        if (requestSeqRef.current !== seq) return;
        const nextSuggestions = resultItems(data)
          .map(normalizeMention)
          .filter(Boolean)
          .filter((user) => String(user.userId) !== String(currentUserId))
          .reduce((items, user) => {
            if (items.some((item) => String(item.userId) === String(user.userId))) return items;
            return [...items, user];
          }, [])
          .slice(0, 20);

        setSuggestions(nextSuggestions);
        setHighlightedIndex(0);
      } catch (error) {
        if (requestSeqRef.current !== seq) return;
        console.error('Mention search error:', error);
        setSuggestions([]);
        setNotice('Không thể tìm người dùng lúc này');
      } finally {
        if (requestSeqRef.current === seq) setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeMention, currentUserId]);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setActiveMention(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const chooseUser = (user) => {
    if (!activeMention) return;

    const normalized = normalizeMention(user);
    if (!normalized) return;

    const alreadySelected = selectedIds.has(normalized.userId);
    if (!alreadySelected && normalizedMentions.length >= MAX_MENTION_USERS) {
      setNotice(`Bạn chỉ có thể nhắc đến tối đa ${MAX_MENTION_USERS} người`);
      return;
    }

    const token = `@${normalized.userName} `;
    const nextValue = `${value.slice(0, activeMention.start)}${token}${value.slice(activeMention.end)}`;
    const nextCaret = activeMention.start + token.length;
    const nextMentions = alreadySelected ? normalizedMentions : uniqueMentions([...normalizedMentions, normalized]);

    onChange(nextValue);
    onMentionsChange?.(nextMentions);
    setActiveMention(null);
    setSuggestions([]);
    setNotice('');

    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  };

  const handleKeyDown = (event) => {
    const isDropdownOpen = Boolean(activeMention);
    if (!isDropdownOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (suggestions.length ? (current + 1) % suggestions.length : 0));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (suggestions.length ? (current - 1 + suggestions.length) % suggestions.length : 0));
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (!suggestions[highlightedIndex]) return;
      event.preventDefault();
      chooseUser(suggestions[highlightedIndex]);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveMention(null);
    }
  };

  const handleChange = (event) => {
    updateText(event.target.value, event.target.selectionStart);
  };

  const showDropdown = Boolean(activeMention);

  return (
    <div ref={rootRef} className="relative">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        onClick={(event) => syncActiveMention(value, event.currentTarget.selectionStart)}
        onKeyUp={(event) => syncActiveMention(value, event.currentTarget.selectionStart)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-[#3e4042] bg-[#242526] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[#3e4042] px-3 py-2 text-xs font-semibold text-[#b0b3b8]">
            <Search size={14} />
            <span>Tìm người để nhắc đến</span>
          </div>

          {loading ? (
            <div className="px-3 py-3 text-sm text-[#b0b3b8]">Đang tìm...</div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1">
              {suggestions.map((user, index) => {
                const isSelected = selectedIds.has(getUserId(user));
                return (
                  <button
                    key={user.userId}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      chooseUser(user);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                      index === highlightedIndex ? 'bg-[#3a3b3c]' : 'hover:bg-[#303132]'
                    }`}
                  >
                    <MentionAvatar user={user} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{user.userName}</span>
                      <span className="block truncate text-xs text-[#b0b3b8]">
                        {isSelected ? 'Đã được thêm vào bài viết' : user.bio || 'Không có mô tả'}
                      </span>
                    </span>
                    <UserRound size={16} className="text-[#b0b3b8]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-3 text-sm text-[#b0b3b8]">{notice || 'Không tìm thấy người dùng phù hợp'}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
