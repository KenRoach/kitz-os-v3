/**
 * Barrel export for the chat-features lib. Both desktop ShellChat
 * and mobile ChatTab import from here so the 5 features stay in sync.
 */

export * from './vibes';
export * from './slash';
export * from './voice';
export * from './voices';
export { Markdown, looksLikeMarkdown } from './markdown';
export {
  ArtifactCard,
  renderArtifactReferences,
  tagArtifact,
  type ArtifactKind,
  type ArtifactRef,
} from './artifact-card';
