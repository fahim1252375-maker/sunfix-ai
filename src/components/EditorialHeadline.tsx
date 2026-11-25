import React from 'react';
import { TOKENS } from '../theme/tokens';

/**
 * Renders a Fraunces headline string where a single *accent* word is italicized in brass or inherit color.
 */
export const EditorialHeadline: React.FC<{
  text: string;
  className?: string;
  accentColor?: string;
}> = ({ text, className = '', accentColor = TOKENS.brass }) => {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span className={`font-display ${className}`} style={{ textWrap: 'balance' }}>
      {parts.map((part, idx) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={idx} className="italic font-normal" style={{ color: accentColor }}>
              {part.slice(1, -1)}
            </em>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
