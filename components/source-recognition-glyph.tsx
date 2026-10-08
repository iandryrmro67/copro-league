import glyphs from './source-recognition-glyphs.json';
import { RecognitionIcon } from './recognition-icon';
/** SVGs copied verbatim from the user's export; no executable content. */
export function SourceRecognitionGlyph({ name, icon }: { name: string; icon: string }) {
  const html = (glyphs as Record<string, string>)[name.toUpperCase()];
  return html ? <span className="source-recognition-glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }}/> : <RecognitionIcon icon={icon}/>;
}
