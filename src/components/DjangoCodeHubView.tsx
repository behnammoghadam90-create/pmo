import React, { useState } from 'react';
import { djangoSourceFiles, CodeFile } from '../data/djangoSourceCode';
import { 
  FileCode2, 
  Copy, 
  Check, 
  Download, 
  Database, 
  Terminal, 
  BookOpen, 
  ShieldCheck, 
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const DjangoCodeHubView: React.FC = () => {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const currentFile: CodeFile = djangoSourceFiles[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename.split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-amber-400" />
              <span>مرکز سورس‌کدهای بک‌اند Django و پایگاه داده MySQL</span>
            </h1>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              آماده استقرار روی هاست
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            کدهای استاندارد، اعتبارسنجی‌های ۰ تا ۱۰۰ درصد، محاسبات خودکار EVM، روابط One-to-Many و Many-to-Many و لایه‌های امنیتی RBAC به همراه کامنت‌های دقیق فارسی.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'کپی شد!' : 'کپی کل کد'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>دانلود این فایل</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights in Django Code */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sky-300">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>روابط One-to-Many و M2M</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            اتصال کاربران به پروژه‌ها از طریق جدول واسط <code>ProjectAssignment</code> و انتساب گزارش‌ها به پروژه با کلید خارجی.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>اعتبارسنجی ۰ تا ۱۰۰٪</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            پیاده‌سازی اعتبارسنجی سخت‌گیرانه با <code>MinValueValidator</code> و <code>MaxValueValidator</code> در سطح مدل و فرم.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>محاسبات خودکار EVM</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            توابع <code>@property</code> مدل برای محاسبه بلادرنگ شاخص‌های CPI ،SPI ،CV ،SV و EAC بر اساس ارزش برنامه‌ای و واقعی.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Database className="w-4 h-4 text-amber-400" />
            <span>دیتابیس MySQL 8.0</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            اسکریپت کامل DDL به همراه Collation زبان فارسی <code>utf8mb4_persian_ci</code> و ایندکس‌های بهینه.
          </p>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* File Tabs Header */}
        <div className="bg-slate-950 px-3 pt-3 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {djangoSourceFiles.map((file, idx) => {
              const isActive = idx === activeFileIndex;
              return (
                <button
                  key={file.filename}
                  id={`tab-codefile-${idx}`}
                  onClick={() => {
                    setActiveFileIndex(idx);
                    setCopied(false);
                  }}
                  className={`px-3.5 py-2 rounded-t-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-amber-300 border-t-2 border-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <span className="text-[10px] opacity-60">
                    {file.language === 'python' ? '🐍' : file.language === 'sql' ? '🗄️' : '📝'}
                  </span>
                  <span>{file.filename}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pb-2 pl-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {currentFile.language}
            </span>
          </div>
        </div>

        {/* File Description Header */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-white">{currentFile.title}</span>
            <p className="text-slate-400 text-[11px] mt-0.5">{currentFile.description}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'کپی شد' : 'کپی'}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-5 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] leading-relaxed select-text">
          <pre dir="ltr" className="text-left">
            <code>{currentFile.code}</code>
          </pre>
        </div>

      </div>

    </div>
  );
};
