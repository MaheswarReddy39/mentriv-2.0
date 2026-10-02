import { Editor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker.js?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';
import { useTheme } from '../../context/ThemeContext.jsx';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco });

monaco.editor.defineTheme('mentriv-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '7A7A92', fontStyle: 'italic' },
    { token: 'keyword', foreground: '4F46E5' },
    { token: 'keyword.control', foreground: '4F46E5' },
    { token: 'string', foreground: '0E8F80' },
    { token: 'string.escape', foreground: '0B6E63' },
    { token: 'number', foreground: 'B97D13' },
    { token: 'constant', foreground: 'B97D13' },
    { token: 'type', foreground: '8B5CF6' },
    { token: 'type.identifier', foreground: '8B5CF6' },
    { token: 'entity.name.function', foreground: '8B5CF6' },
    { token: 'function', foreground: '8B5CF6' },
    { token: 'entity.name.tag', foreground: '4F46E5' },
    { token: 'tag', foreground: '4F46E5' },
    { token: 'attribute.name', foreground: 'B97D13' },
    { token: 'attribute.value', foreground: '0E8F80' },
    { token: 'delimiter', foreground: '5E5E72' },
    { token: 'operator', foreground: '5E5E72' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#161623',
    'editorCursor.foreground': '#4F46E5',
    'editorLineNumber.foreground': '#9A9AB0',
    'editorLineNumber.activeForeground': '#161623',
    'editor.lineHighlightBackground': '#FAFAFE',
    'editor.selectionBackground': '#DDD9F9',
    'editor.inactiveSelectionBackground': '#EDEBFB',
    'editor.selectionHighlightBackground': '#EFEEFC',
    'editor.wordHighlightBackground': '#EFEEFC',
    'editor.findMatchBackground': '#FBE7C4',
    'editor.findMatchHighlightBackground': '#FDF1DB',
    'editorBracketMatch.background': '#DDD9F9',
    'editorBracketMatch.border': '#4F46E5',
    'editorWhitespace.foreground': '#D9D9E7',
    'editorIndentGuide.background1': '#ECECF4',
    'editorIndentGuide.activeBackground1': '#C9C9DE',
    'editorWidget.background': '#FFFFFF',
    'editorWidget.border': '#E2E2EE',
    'editorSuggestWidget.background': '#FFFFFF',
    'editorSuggestWidget.border': '#E2E2EE',
    'editorSuggestWidget.foreground': '#161623',
    'editorSuggestWidget.selectedBackground': '#F1F0FB',
    'editorSuggestWidget.highlightForeground': '#4F46E5',
    'list.hoverBackground': '#F5F5FC',
    'input.background': '#FFFFFF',
    'input.border': '#E2E2EE',
    'focusBorder': '#4F46E5',
    'scrollbarSlider.background': '#D9D9E7',
    'scrollbarSlider.hoverBackground': '#C6C6D8',
    'scrollbarSlider.activeBackground': '#B4B4CA',
    'editorOverviewRuler.border': '#E2E2EE',
  },
});

monaco.editor.defineTheme('mentriv-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '9494B0', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'A5B4FC' },
    { token: 'keyword.control', foreground: 'A5B4FC' },
    { token: 'string', foreground: '5EEAD4' },
    { token: 'string.escape', foreground: '99F6E6' },
    { token: 'number', foreground: 'FCD34D' },
    { token: 'constant', foreground: 'FCD34D' },
    { token: 'type', foreground: 'C4B5FD' },
    { token: 'type.identifier', foreground: 'C4B5FD' },
    { token: 'entity.name.function', foreground: 'C4B5FD' },
    { token: 'function', foreground: 'C4B5FD' },
    { token: 'entity.name.tag', foreground: 'A5B4FC' },
    { token: 'tag', foreground: 'A5B4FC' },
    { token: 'attribute.name', foreground: 'FCD34D' },
    { token: 'attribute.value', foreground: '5EEAD4' },
    { token: 'delimiter', foreground: '9494B0' },
    { token: 'operator', foreground: 'A0A0BC' },
  ],
  colors: {
    'editor.background': '#18182B',
    'editor.foreground': '#F4F4F8',
    'editorCursor.foreground': '#A5B4FC',
    'editorLineNumber.foreground': '#8585A3',
    'editorLineNumber.activeForeground': '#F4F4F8',
    'editor.lineHighlightBackground': '#1E1E36',
    'editor.selectionBackground': '#33335E',
    'editor.inactiveSelectionBackground': '#2A2A4A',
    'editor.selectionHighlightBackground': '#2E2E55',
    'editor.wordHighlightBackground': '#2A2A50',
    'editor.findMatchBackground': '#4A3F1A',
    'editor.findMatchHighlightBackground': '#37324F',
    'editorBracketMatch.background': '#33335E',
    'editorBracketMatch.border': '#A5B4FC',
    'editorWhitespace.foreground': '#3A3A55',
    'editorIndentGuide.background1': '#2A2A44',
    'editorIndentGuide.activeBackground1': '#45456A',
    'editorWidget.background': '#1E1E36',
    'editorWidget.border': '#2E2E4A',
    'editorSuggestWidget.background': '#1E1E36',
    'editorSuggestWidget.border': '#2E2E4A',
    'editorSuggestWidget.foreground': '#F4F4F8',
    'editorSuggestWidget.selectedBackground': '#2E2E4A',
    'editorSuggestWidget.highlightForeground': '#A5B4FC',
    'list.hoverBackground': '#232340',
    'input.background': '#1E1E36',
    'input.border': '#2E2E4A',
    'focusBorder': '#A5B4FC',
    'scrollbarSlider.background': '#2E2E4A',
    'scrollbarSlider.hoverBackground': '#3A3A58',
    'scrollbarSlider.activeBackground': '#45456A',
    'editorOverviewRuler.border': '#2E2E4A',
  },
});

const COMPLETION_WORDS = {
  python: {
    keywords: [
      'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
      'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
      'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
      'return', 'try', 'while', 'with', 'yield',
    ],
    builtins: [
      'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod',
      'compile', 'complex', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float',
      'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input',
      'int', 'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview',
      'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
      'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum',
      'super', 'tuple', 'type', 'vars', 'zip', '__import__',
    ],
  },
  java: {
    keywords: [
      'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
      'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
      'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
      'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super',
      'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while',
      'var', 'record', 'sealed', 'yield',
    ],
    builtins: [
      'String', 'System', 'Math', 'Object', 'Integer', 'Double', 'Boolean', 'Character', 'Long', 'Float',
      'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap', 'List', 'Map', 'Set', 'Queue', 'Deque',
      'Comparator', 'Optional', 'Stream', 'Scanner', 'StringBuilder', 'StringBuffer', 'Arrays', 'Collections',
      'Exception', 'RuntimeException', 'Override', 'Deprecated', 'main', 'println', 'printf', 'print',
      'length', 'equals', 'hashCode', 'toString', 'compareTo', 'valueOf', 'parseInt', 'parseDouble',
      'contains', 'add', 'remove', 'get', 'put', 'size', 'isEmpty', 'sort', 'keys', 'values',
    ],
  },
  cpp: {
    keywords: [
      'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool', 'break',
      'case', 'catch', 'char', 'class', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue',
      'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export',
      'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long',
      'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq',
      'private', 'protected', 'public', 'register', 'reinterpret_cast', 'return', 'short', 'signed', 'sizeof', 'static',
      'static_assert', 'static_cast', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef',
      'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while',
      'xor', 'xor_eq',
    ],
    builtins: [
      'include', 'iostream', 'vector', 'string', 'map', 'set', 'queue', 'stack', 'pair', 'array',
      'std', 'cout', 'cin', 'cerr', 'endl', 'printf', 'scanf', 'size_t', 'main', 'push_back',
      'pop_back', 'size', 'empty', 'sort', 'find', 'max', 'min', 'begin', 'end', 'swap',
    ],
  },
  go: {
    keywords: [
      'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for',
      'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return',
      'select', 'struct', 'switch', 'type', 'var',
    ],
    builtins: [
      'append', 'cap', 'clear', 'close', 'complex', 'copy', 'delete', 'imag', 'len', 'make',
      'max', 'min', 'new', 'panic', 'print', 'println', 'real', 'recover', 'bool', 'byte',
      'complex64', 'complex128', 'error', 'float32', 'float64', 'int', 'int8', 'int16', 'int32', 'int64',
      'rune', 'string', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr', 'true', 'false',
      'iota', 'nil',
    ],
  },
};

Object.entries(COMPLETION_WORDS).forEach(([languageId, groups]) => {
  const entries = [
    ...groups.keywords.map((word) => ({ word, kind: monaco.languages.CompletionItemKind.Keyword })),
    ...groups.builtins.map((word) => ({ word, kind: monaco.languages.CompletionItemKind.Function })),
  ];
  monaco.languages.registerCompletionItemProvider(languageId, {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );
      return {
        suggestions: entries.map((entry) => ({
          label: entry.word,
          kind: entry.kind,
          insertText: entry.word,
          range,
        })),
      };
    },
  });
});

const wrapperStyle = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
  background: 'var(--color-surface-muted)',
};

const editorOptions = {
  automaticLayout: true,
  fontSize: 13,
  lineHeight: 21,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  wordBasedSuggestions: 'currentDocument',
  tabCompletion: 'on',
  quickSuggestions: { other: true, comments: false, strings: false },
  suggestOnTriggerCharacters: true,
  renderLineHighlight: 'line',
  fixedOverflowWidgets: true,
  bracketPairColorization: { enabled: true },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
};

export default function CodeEditor({
  language = 'plaintext',
  value,
  onChange,
  label,
  onMount,
  height = '320px',
}) {
  const { theme } = useTheme();

  return (
    <div style={wrapperStyle}>
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme === 'dark' ? 'mentriv-dark' : 'mentriv-light'}
        onChange={(next) => onChange(next ?? '')}
        onMount={(instance) => onMount?.(instance)}
        options={{ ...editorOptions, ariaLabel: label }}
        loading={
          <div
            className="skeleton"
            style={{ width: '100%', height, borderRadius: 0 }}
            aria-hidden="true"
          />
        }
      />
    </div>
  );
}
