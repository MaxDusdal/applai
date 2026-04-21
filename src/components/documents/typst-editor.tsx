"use client";

import { useCallback, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { useTheme } from "next-themes";

type TypstEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: "typst" | "yaml";
};

export function TypstEditor({ value, onChange, language = "typst" }: TypstEditorProps) {
  const { resolvedTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      latestOnChange.current(val);
    }, 600);
  }, []);

  const extensions = language === "yaml" ? [yaml()] : [markdown()];

  return (
    <CodeMirror
      value={value}
      onChange={handleChange}
      extensions={extensions}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:!overflow-auto"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        bracketMatching: true,
      }}
    />
  );
}
