import React, { useState, useEffect } from 'react';
import { Check, Copy, Code, Database, FileCode2, Terminal, Sparkles, Download } from 'lucide-react';
import { SQL_SCHEMA, NOSQL_SCHEMA, PYTHON_SCRIPT, JS_SCRIPT } from '../data/schemasData';

export const DatabaseAndCodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sql' | 'nosql' | 'python' | 'javascript'>('sql');
  const [copied, setCopied] = useState(false);
  const [schemas, setSchemas] = useState<{
    sqlSchema: string;
    nosqlSchema: any;
    pythonScript: string;
    jsScript: string;
  }>({
    sqlSchema: SQL_SCHEMA,
    nosqlSchema: NOSQL_SCHEMA,
    pythonScript: PYTHON_SCRIPT,
    jsScript: JS_SCRIPT
  });

  useEffect(() => {
    fetch('/api/schema-and-scripts')
      .then(res => res.json())
      .then(data => {
        if (data && data.sqlSchema) {
          setSchemas(data);
        }
      })
      .catch(err => {
        console.warn('Usando esquemas estáticos locales precargados:', err);
      });
  }, []);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'sql':
        return schemas.sqlSchema;
      case 'nosql':
        return JSON.stringify(schemas.nosqlSchema, null, 2);
      case 'python':
        return schemas.pythonScript;
      case 'javascript':
        return schemas.jsScript;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-lg p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Instrucción Final: Estructuras y Scripts
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
              Producción / Backend Ready
            </span>
          </div>
          <h2 className="text-xl font-semibold text-white mt-1">
            Datos y código de los cálculos
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Esquemas completos para persistir las 4 dimensiones financieras, el simulador conductual, la gamificación de Divay y la evaluación DiD.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors shadow-sm shrink-0 active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-500" />}
          {copied ? '¡Copiado al Portapapeles!' : 'Copiar Código'}
        </button>
      </div>

      {/* Language / Schema Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sql'
              ? 'bg-white/10 text-white shadow-xs'
              : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Estructura Relacional (PostgreSQL DDL)
        </button>

        <button
          onClick={() => setActiveTab('nosql')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'nosql'
              ? 'bg-white/10 text-white shadow-xs'
              : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Estructura Documental (MongoDB NoSQL)
        </button>

        <button
          onClick={() => setActiveTab('python')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'python'
              ? 'bg-white/10 text-white shadow-xs'
              : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          Algoritmo Scoring Linear & DiD (Python)
        </button>

        <button
          onClick={() => setActiveTab('javascript')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'javascript'
              ? 'bg-white/10 text-white shadow-xs'
              : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Implementación (JavaScript / TypeScript)
        </button>
      </div>

      {/* Code Viewer Box */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="ml-2 font-semibold text-slate-300">
              {activeTab === 'sql'
                ? 'schema_el_rincon_de_warren.sql'
                : activeTab === 'nosql'
                ? 'mongodb_collections_schema.json'
                : activeTab === 'python'
                ? 'warren_scoring_and_did.py'
                : 'warren_engine.ts'}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            {activeTab}
          </span>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed whitespace-pre">
          {getCurrentContent()}
        </pre>
      </div>
    </div>
  );
};
