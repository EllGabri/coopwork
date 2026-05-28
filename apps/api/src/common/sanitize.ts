import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Strips all HTML tags from text fields, leaving only plain text.
 * Prevents XSS via stored HTML in title/description/comment fields.
 */
export function SanitizeText() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  });
}

/**
 * Sanitizes rich-text fields that allow a safe subset of HTML.
 * Allows basic formatting but strips scripts, event handlers, etc.
 */
export function SanitizeRichText() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return sanitizeHtml(value, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: {},
    });
  });
}
