"use client";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { useTheme } from "next-themes";

type TypstEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: "typst" | "yaml";
};

export function TypstEditor({
  value,
  onChange,
  language = "typst",
}: TypstEditorProps) {
  const { resolvedTheme } = useTheme();

  const extensions =
    language === "yaml"
      ? [yaml(), EditorView.lineWrapping]
      : [markdown(), EditorView.lineWrapping];

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
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
