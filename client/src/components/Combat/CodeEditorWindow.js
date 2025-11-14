import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditorWindow.css';

const CodeEditorWindow = ({ code, onChange }) => {
  const editorRef = useRef(null);

  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    // Debounce resize events
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <div className="code-editor-container">
      <Editor
        height="200px"
        defaultLanguage="python"
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
        }}
      />
    </div>
  );
};

export default CodeEditorWindow;