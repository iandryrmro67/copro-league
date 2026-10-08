import { createElement, type CSSProperties, type ReactNode } from 'react';
import templates from './hud-source-templates.json';

export type SourceNode = { tag: string; attrs: Record<string, string>; children: (SourceNode | string)[] };
export const hudTemplates = templates as unknown as Record<keyof typeof templates, SourceNode>;
const camel = (key: string) => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
export function sourceStyle(value = ''): CSSProperties {
  return Object.fromEntries(value.split(';').flatMap(pair => {
    const at = pair.indexOf(':');
    if (at < 0) return [];
    const key = pair.slice(0, at).trim(), val = pair.slice(at + 1).trim();
    return [[key.startsWith('--') ? key : camel(key), val]];
  }));
}
export function sourceProps(node: SourceNode): Record<string, unknown> {
  return Object.fromEntries(Object.entries(node.attrs).map(([name, value]) => {
    const key = name === 'class' ? 'className' : name === 'for' ? 'htmlFor' : name === 'checked' ? 'defaultChecked' : name === 'tabindex' ? 'tabIndex' : name.startsWith('aria-') || name.startsWith('data-') ? name : camel(name);
    return [key, name === 'style' ? sourceStyle(value) : name === 'checked' ? true : value];
  }));
}

/** Render the original exported nodes; only explicit data slots are replaced. */
export function SourceTemplate({ name, node, slots = {}, props = {} }: {
  name?: keyof typeof templates; node?: SourceNode; slots?: Record<string, ReactNode>;
  props?: Record<string, Record<string, unknown>>;
}) {
  const root = node ?? (name ? hudTemplates[name] : undefined);
  if (!root) return null;
  function render(n: SourceNode, path: string): ReactNode {
    const original = sourceProps(n), changes = props[path] ?? {};
    const attributes = { ...original, ...changes, style: { ...(original.style as CSSProperties), ...(changes.style as CSSProperties) }, key: path };
    if (path === '' && name) Object.assign(attributes, { 'data-source-template': name });
    let index = 0;
    const children = path in slots ? slots[path] : n.children.map(child => typeof child === 'string' ? child : render(child, path ? `${path}.${index++}` : String(index++)));
    return createElement(n.tag, attributes, ['input', 'br', 'hr', 'img'].includes(n.tag) ? undefined : children);
  }
  return render(root, '');
}

export const childNodes = (node: SourceNode) => node.children.filter((child): child is SourceNode => typeof child !== 'string');
export function sourceAt(node: SourceNode, path: string): SourceNode {
  return path ? path.split('.').reduce((current, part) => childNodes(current)[Number(part)], node) : node;
}
