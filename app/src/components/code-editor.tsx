'use client';

import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const handleChange = useCallback(
    (val: string) => onChange(val),
    [onChange]
  );

  return (
    <div className="flex-1 overflow-hidden">
      <CodeMirror
        value={value}
        extensions={[python()]}
        theme="dark"
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
