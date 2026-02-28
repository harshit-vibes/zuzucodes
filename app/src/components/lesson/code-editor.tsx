'use client';

import { useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { useTheme } from 'next-themes';

// ─── Dark Theme — "Midnight Canvas" ─────────────────────────────────────────
// Mirrors the app's dark palette: true-black bg, vibrant purple primary

const darkEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0a0a0a',
    color: '#e4e4e7',
    height: '100%',
  },
  '.cm-content': { caretColor: '#a855f7' },
  '.cm-cursor': { borderLeftColor: '#a855f7', borderLeftWidth: '2px' },
  '.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(168, 85, 247, 0.05)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(168, 85, 247, 0.07)' },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    outline: '1px solid rgba(168, 85, 247, 0.5)',
  },
  '.cm-gutters': {
    backgroundColor: '#0d0d0d',
    borderRight: '1px solid #27272a',
    color: '#3f3f46',
  },
  '.cm-lineNumbers .cm-gutterElement': { paddingRight: '12px', minWidth: '36px' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', lineHeight: '1.6' },
  '.cm-searchMatch': { backgroundColor: 'rgba(168, 85, 247, 0.25)' },
  '.cm-tooltip': { backgroundColor: '#18181b', border: '1px solid #3f3f46' },
  '.cm-completionLabel': { color: '#e4e4e7' },
}, { dark: true });

const darkHighlight = HighlightStyle.define([
  { tag: t.comment,                   color: '#52525b', fontStyle: 'italic' },
  { tag: t.keyword,                   color: '#c084fc', fontWeight: '600' },
  { tag: t.controlKeyword,            color: '#e879f9', fontWeight: '600' },
  { tag: t.definitionKeyword,         color: '#c084fc', fontWeight: '600' },
  { tag: t.string,                    color: '#86efac' },
  { tag: t.special(t.string),         color: '#6ee7b7' },
  { tag: [t.number, t.bool, t.null],  color: '#67e8f9' },
  { tag: t.operator,                  color: '#a78bfa' },
  { tag: t.punctuation,               color: '#71717a' },
  { tag: t.bracket,                   color: '#a1a1aa' },
  { tag: t.variableName,              color: '#e4e4e7' },
  { tag: t.definition(t.variableName),color: '#f0abfc' },
  { tag: t.function(t.variableName),  color: '#f0abfc' },
  { tag: t.className,                 color: '#fbbf24' },
  { tag: t.definition(t.name),        color: '#f0abfc' },
  { tag: t.typeName,                  color: '#38bdf8' },
  { tag: t.propertyName,              color: '#a78bfa' },
  { tag: t.attributeName,             color: '#94a3b8' },
  { tag: t.self,                      color: '#fb923c', fontStyle: 'italic' },
  { tag: t.derefOperator,             color: '#a78bfa' },
]);

// ─── Light Theme — "Pure Contrast" ──────────────────────────────────────────
// Mirrors the app's light palette: white bg, deep purple primary

const lightEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#18181b',
    height: '100%',
  },
  '.cm-content': { caretColor: '#7c3aed' },
  '.cm-cursor': { borderLeftColor: '#7c3aed', borderLeftWidth: '2px' },
  '.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(124, 58, 237, 0.04)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(124, 58, 237, 0.06)' },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    outline: '1px solid rgba(124, 58, 237, 0.4)',
  },
  '.cm-gutters': {
    backgroundColor: '#f4f4f5',
    borderRight: '1px solid #e4e4e7',
    color: '#a1a1aa',
  },
  '.cm-lineNumbers .cm-gutterElement': { paddingRight: '12px', minWidth: '36px' },
  '.cm-scroller': { fontFamily: '"JetBrains Mono", monospace', fontSize: '13px', lineHeight: '1.6' },
  '.cm-searchMatch': { backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  '.cm-tooltip': { backgroundColor: '#fafafa', border: '1px solid #e4e4e7' },
  '.cm-completionLabel': { color: '#18181b' },
}, { dark: false });

const lightHighlight = HighlightStyle.define([
  { tag: t.comment,                   color: '#71717a', fontStyle: 'italic' },
  { tag: t.keyword,                   color: '#7c3aed', fontWeight: '600' },
  { tag: t.controlKeyword,            color: '#9333ea', fontWeight: '600' },
  { tag: t.definitionKeyword,         color: '#7c3aed', fontWeight: '600' },
  { tag: t.string,                    color: '#16a34a' },
  { tag: t.special(t.string),         color: '#15803d' },
  { tag: [t.number, t.bool, t.null],  color: '#0284c7' },
  { tag: t.operator,                  color: '#6d28d9' },
  { tag: t.punctuation,               color: '#a1a1aa' },
  { tag: t.bracket,                   color: '#71717a' },
  { tag: t.variableName,              color: '#18181b' },
  { tag: t.definition(t.variableName),color: '#9333ea' },
  { tag: t.function(t.variableName),  color: '#9333ea' },
  { tag: t.className,                 color: '#b45309' },
  { tag: t.definition(t.name),        color: '#9333ea' },
  { tag: t.typeName,                  color: '#0369a1' },
  { tag: t.propertyName,              color: '#6d28d9' },
  { tag: t.attributeName,             color: '#475569' },
  { tag: t.self,                      color: '#c2410c', fontStyle: 'italic' },
  { tag: t.derefOperator,             color: '#6d28d9' },
]);

const darkExtensions  = [python(), darkEditorTheme,  syntaxHighlighting(darkHighlight),  EditorView.theme({ '&': { height: '100%' } })];
const lightExtensions = [python(), lightEditorTheme, syntaxHighlighting(lightHighlight), EditorView.theme({ '&': { height: '100%' } })];

// ─── Component ───────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleChange = useCallback((val: string) => onChange(val), [onChange]);

  const extensions = mounted && resolvedTheme === 'light' ? lightExtensions : darkExtensions;

  return (
    <div className="flex-1 overflow-hidden ph-no-capture">
      <CodeMirror
        value={value}
        theme={mounted && resolvedTheme === 'light' ? 'light' : 'dark'}
        extensions={extensions}
        onChange={handleChange}
        height="100%"
        style={{ height: '100%' }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          autocompletion: true,
          highlightActiveLine: true,
          tabSize: 4,
        }}
      />
    </div>
  );
}
