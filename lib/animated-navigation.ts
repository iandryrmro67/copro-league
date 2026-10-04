import type { Match } from "./model";
import { writeDraft, type DraftStorage } from "./match-draft";
export type NavigationClick = {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};
export function shouldAnimateNavigation(
  click: NavigationClick,
  href: string,
  origin: string,
  target = "",
  download = false,
) {
  if (
    click.button !== 0 ||
    click.ctrlKey ||
    click.metaKey ||
    click.shiftKey ||
    click.altKey ||
    download ||
    (target && target !== "_self") ||
    href.startsWith("#")
  )
    return false;
  try {
    const url = new URL(href, origin);
    return (
      url.origin === origin &&
      !/^\/(?:connexion|auth|api)(?:\/|$)/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
/** Navigation must persist the latest editor state, not the debounced snapshot. */
export function saveDraftForNavigation(
  storage: DraftStorage,
  owner: string,
  match: Match,
  saved: string,
  conflict: boolean,
) {
  if (conflict) return false;
  if (JSON.stringify(match) === saved) return true;
  return writeDraft(storage, owner, match).ok;
}

/** Editor entries and exits must be document history, so Back/Forward use its beforeunload protection too. */
export function navigationKind(
  from: string,
  to: string,
): "document" | "client" {
  return from === to || from === "/admin" || to === "/admin"
    ? "document"
    : "client";
}
