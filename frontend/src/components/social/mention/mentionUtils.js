export const MAX_MENTION_USERS = 20;

export const getUserId = (user) => user?.userId ?? user?.id ?? user?.profileId ?? null;

export const getUserName = (user) => user?.userName ?? user?.username ?? user?.fullName ?? user?.name ?? '';

export const normalizeMention = (user) => {
  const userId = getUserId(user);
  const userName = getUserName(user);

  if (!userId || !userName) return null;

  return {
    userId,
    userName,
    avatarUrl: user?.avatarUrl ?? user?.avatar ?? null,
    bio: user?.bio ?? user?.subtitle ?? '',
  };
};

export const uniqueMentions = (mentions = []) => {
  const seen = new Set();
  const result = [];

  mentions.forEach((mention) => {
    const normalized = normalizeMention(mention);
    if (!normalized || seen.has(normalized.userId)) return;
    seen.add(normalized.userId);
    result.push(normalized);
  });

  return result.slice(0, MAX_MENTION_USERS);
};

export const mentionIds = (mentions = []) => uniqueMentions(mentions).map((mention) => mention.userId);

export const detectActiveMention = (value, caretPosition) => {
  if (typeof value !== 'string' || typeof caretPosition !== 'number') return null;

  const beforeCaret = value.slice(0, caretPosition);
  const atIndex = beforeCaret.lastIndexOf('@');
  if (atIndex < 0) return null;

  const charBeforeAt = atIndex === 0 ? '' : value[atIndex - 1];
  if (charBeforeAt && !/[\s([{:;]/.test(charBeforeAt)) return null;

  const query = beforeCaret.slice(atIndex + 1);
  if (/[\s@\n\r]/.test(query)) return null;

  return {
    start: atIndex,
    end: caretPosition,
    query,
  };
};

export const reconcileMentionsWithText = (value, mentions = []) => {
  if (!value) return [];

  return uniqueMentions(mentions).filter((mention) => value.includes(`@${mention.userName}`));
};
