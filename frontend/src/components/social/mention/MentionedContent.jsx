import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeMention, uniqueMentions } from './mentionUtils';

const buildMentionNodes = (content, mentions, navigate) => {
  const tokens = uniqueMentions(mentions)
    .map(normalizeMention)
    .filter(Boolean)
    .map((mention) => ({ ...mention, token: `@${mention.userName}` }))
    .sort((a, b) => b.token.length - a.token.length);

  if (!content || tokens.length === 0) return [content];

  const nodes = [];
  let cursor = 0;

  while (cursor < content.length) {
    let best = null;

    tokens.forEach((mention) => {
      const index = content.indexOf(mention.token, cursor);
      if (index < 0) return;
      if (!best || index < best.index || (index === best.index && mention.token.length > best.mention.token.length)) {
        best = { index, mention };
      }
    });

    if (!best) {
      nodes.push(content.slice(cursor));
      break;
    }

    if (best.index > cursor) {
      nodes.push(content.slice(cursor, best.index));
    }

    nodes.push(
      <button
        key={`${best.mention.userId}-${best.index}`}
        type="button"
        onClick={() => navigate(`/profile/${best.mention.userId}`)}
        className="inline font-semibold text-[#2d88ff] hover:underline"
      >
        {best.mention.token}
      </button>
    );

    cursor = best.index + best.mention.token.length;
  }

  return nodes;
};

const MentionedContent = ({ content, mentions = [], className = '' }) => {
  const navigate = useNavigate();
  const nodes = useMemo(() => buildMentionNodes(content, mentions, navigate), [content, mentions, navigate]);

  if (!content) return null;

  return <p className={`whitespace-pre-wrap ${className}`}>{nodes}</p>;
};

export default MentionedContent;
