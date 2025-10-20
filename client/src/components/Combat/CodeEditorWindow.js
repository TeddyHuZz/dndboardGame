import React from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditorWindow.css';

const CodeEditorWindow = ({ code, onChange }) => {
  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="code-editor-container">
      <Editor
        height="500px"
        defaultLanguage="python"
        value={code}  // Changed from defaultValue to value
        onChange={handleEditorChange}
        theme="vs-dark"
      />
    </div>
  );
};

export default CodeEditorWindow;