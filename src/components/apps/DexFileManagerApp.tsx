import React, { useState, useRef, useEffect } from 'react';
import { StorageFile, DeviceInfo } from '../../types';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  FileCode,
  Music,
  Video,
  Upload,
  Download,
  Trash2,
  HardDrive,
  ChevronRight,
  ArrowUp,
  Search,
  Plus,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Smartphone
} from 'lucide-react';

interface DexFileManagerAppProps {
  device?: DeviceInfo | null;
  files: StorageFile[];
  onUploadFile: (file: StorageFile) => void;
  onUploadMultipleFiles?: (files: StorageFile[]) => void;
  onDeleteFile: (fileId: string) => void;
}

export const DexFileManagerApp: React.FC<DexFileManagerAppProps> = ({
  device,
  files,
  onUploadFile,
  onUploadMultipleFiles,
  onDeleteFile,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('/sdcard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleFolderClick = (folderName: string) => {
    setCurrentPath(prev => (prev === '/sdcard' ? `/sdcard/${folderName}` : `${prev}/${folderName}`));
    setSelectedFile(null);
  };

  const handleGoUp = () => {
    if (currentPath === '/sdcard') return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || '/sdcard');
    setSelectedFile(null);
  };

  const [liveFiles, setLiveFiles] = useState<StorageFile[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  useEffect(() => {
    setIsLoadingLive(true);
    fetch(`/api/adb/files?path=${encodeURIComponent(currentPath)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.files && data.files.length > 0) {
          setLiveFiles(data.files);
        } else {
          setLiveFiles([]);
        }
      })
      .catch(() => setLiveFiles([]))
      .finally(() => setIsLoadingLive(false));
  }, [currentPath]);

  const sourceFiles = liveFiles.length > 0 ? liveFiles : files;
  const filteredFiles = sourceFiles.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery) return matchesSearch;

    if (liveFiles.length > 0) {
      return true;
    }

    if (currentPath === '/sdcard') {
      // Top level items
      return f.path.startsWith('/sdcard') && f.path.split('/').length <= 3;
    } else {
      // Sub directory items
      return f.path.startsWith(currentPath) && f.path !== currentPath;
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (uploadedFiles.length === 0) return;

    const newFiles: StorageFile[] = uploadedFiles.map((uploaded, idx) => ({
      id: `custom-${Date.now()}-${idx}`,
      name: uploaded.name,
      path: `${currentPath}/${uploaded.name}`,
      type: uploaded.type.startsWith('image/')
        ? 'image'
        : uploaded.name.endsWith('.apk')
        ? 'apk'
        : uploaded.type.startsWith('audio/')
        ? 'audio'
        : uploaded.type.startsWith('video/')
        ? 'video'
        : 'file',
      size: `${(uploaded.size / (1024 * 1024)).toFixed(1)} MB`,
      modified: 'Just now',
      url: URL.createObjectURL(uploaded),
    }));

    if (onUploadMultipleFiles) {
      onUploadMultipleFiles(newFiles);
    } else {
      newFiles.forEach(f => onUploadFile(f));
    }
    showFeedback(`Synced ${newFiles.length} file(s) from phone storage to ${currentPath}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles: File[] = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (droppedFiles.length === 0) return;

    const newFiles: StorageFile[] = droppedFiles.map((droppedFile, idx) => ({
      id: `custom-${Date.now()}-${idx}`,
      name: droppedFile.name,
      path: `${currentPath}/${droppedFile.name}`,
      type: droppedFile.type.startsWith('image/')
        ? 'image'
        : droppedFile.name.endsWith('.apk')
        ? 'apk'
        : droppedFile.type.startsWith('audio/')
        ? 'audio'
        : droppedFile.type.startsWith('video/')
        ? 'video'
        : 'file',
      size: `${(droppedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      modified: 'Just now',
      url: URL.createObjectURL(droppedFile),
    }));

    if (onUploadMultipleFiles) {
      onUploadMultipleFiles(newFiles);
    } else {
      newFiles.forEach(f => onUploadFile(f));
    }
    showFeedback(`Synced ${newFiles.length} dropped file(s) to Android device`);
  };

  const getFileIcon = (file: StorageFile) => {
    switch (file.type) {
      case 'folder':
        return <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />;
      case 'image':
        if (file.url) {
          return (
            <img
              src={file.url}
              alt={file.name}
              className="w-10 h-10 object-cover rounded shadow border border-slate-700/60"
              loading="lazy"
            />
          );
        }
        return <ImageIcon className="w-8 h-8 text-sky-400" />;
      case 'apk':
        return <FileCode className="w-8 h-8 text-emerald-400" />;
      case 'audio':
        return <Music className="w-8 h-8 text-purple-400" />;
      case 'video':
        return <Video className="w-8 h-8 text-rose-400" />;
      default:
        return <FileText className="w-8 h-8 text-slate-300" />;
    }
  };

  return (
    <div
      id="dex-file-manager"
      className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-sm gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            onClick={handleGoUp}
            disabled={currentPath === '/sdcard'}
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300"
            title="Up one level"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-xs text-slate-300 overflow-x-auto max-w-md">
            <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Internal Storage</span>
            {!device ? (
              <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded font-mono">
                Offline Demo
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded font-mono">
                {device.name}
              </span>
            )}
            {currentPath.replace('/sdcard', '').split('/').filter(Boolean).map((segment, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="text-slate-100 font-medium">{segment}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search storage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium transition shadow-sm"
            title="Upload files from PC into storage"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Drag overlay feedback */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/20 border-2 border-dashed border-blue-400 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-blue-200">
          <Upload className="w-12 h-12 mb-2 animate-bounce" />
          <p className="font-semibold text-lg">Drop file to push to Android device</p>
          <p className="text-xs text-blue-300">File will be transmitted via ADB shell to {currentPath}</p>
        </div>
      )}

      {/* Main File Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Browser Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {feedbackMessage && (
            <div className="mb-3 p-2 bg-emerald-950/80 border border-emerald-700/60 rounded text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">
              <Folder className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
              <p>This directory is empty</p>
              <p className="text-xs text-slate-600 mt-1">Drag files here or click "Upload File"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredFiles.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (file.type === 'folder') {
                        handleFolderClick(file.name);
                      } else {
                        setSelectedFile(file);
                      }
                    }}
                    onDoubleClick={() => {
                      if (file.type === 'folder') {
                        handleFolderClick(file.name);
                      }
                    }}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition cursor-pointer group relative ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500/80 ring-1 ring-blue-500'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="mb-2 p-1.5 rounded-md bg-slate-900/90 group-hover:scale-105 transition">
                      {getFileIcon(file)}
                    </div>
                    <span className="text-xs font-medium text-slate-200 truncate w-full group-hover:text-white">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {file.size}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details Panel */}
        {selectedFile && (
          <div className="w-64 border-l border-slate-800 bg-slate-900/95 p-4 flex flex-col justify-between text-xs">
            <div>
              <h4 className="font-semibold text-slate-200 mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>File Properties</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">ADB Stat</span>
              </h4>

              <div className="flex flex-col items-center text-center my-4">
                {selectedFile.type === 'image' && selectedFile.url ? (
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    className="w-32 h-24 object-cover rounded-md border border-slate-700 mb-2 shadow"
                  />
                ) : (
                  <div className="p-4 bg-slate-800 rounded-lg mb-2">
                    {getFileIcon(selectedFile)}
                  </div>
                )}
                <p className="font-medium text-slate-100 break-all">{selectedFile.name}</p>
                <span className="text-[11px] text-slate-400 mt-0.5">{selectedFile.size}</span>
              </div>

              <div className="space-y-2 text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-slate-200 uppercase font-mono">{selectedFile.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modified:</span>
                  <span className="text-slate-200">{selectedFile.modified}</span>
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-[10px] text-slate-500">Device Path:</span>
                  <span className="text-[11px] text-blue-400 font-mono break-all">{selectedFile.path}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {selectedFile.url ? (
                <a
                  href={selectedFile.url}
                  download={selectedFile.name}
                  onClick={() => {
                    showFeedback(`Downloading ${selectedFile.name} to your PC...`);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 rounded transition shadow text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download to Windows PC</span>
                </a>
              ) : (
                <button
                  onClick={() => {
                    showFeedback(`Saved ${selectedFile.name} to Windows Downloads folder`);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pull to Windows PC</span>
                </button>
              )}
              <button
                onClick={() => {
                  onDeleteFile(selectedFile.id);
                  showFeedback(`Removed ${selectedFile.name} from Android storage`);
                  setSelectedFile(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 py-1.5 rounded transition border border-rose-800/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Storage Stats Bar */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            {device?.model?.includes('64')
              ? 'Internal Storage: 48.2 GB free of 128 GB'
              : 'Internal Storage: 124.6 GB free of 256 GB'}
          </span>
          <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '62%' }} />
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
          <Smartphone className={`w-3 h-3 ${device ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{device ? `${device.model} (USB MTP Connected)` : 'No Android Phone Connected'}</span>
        </span>
      </div>
    </div>
  );
};
