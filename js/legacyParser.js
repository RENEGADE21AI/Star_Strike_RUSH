export function extractInlineGameScript(html) {
  const startTag = '<script>';
  const endTag = '</script>';
  const start = html.indexOf(startTag);
  const end = html.lastIndexOf(endTag);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not find the game script in the legacy build.');
  }

  return html.slice(start + startTag.length, end).trim();
}
