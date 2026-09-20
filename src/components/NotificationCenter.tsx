import React from 'react';
import { AndroidNotification } from '../types';
import { Bell, Trash2, X, Check, MessageSquare, PlaySquare, Info } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AndroidNotification[];
  onClearAll: () => void;
  onDismiss: (id: string) => void;
  onOpenApp: (appId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
  onDismiss,
  onOpenApp,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="notification-center-pane"
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed bottom-[60px] right-3 w-92 max-w-sm pointer-events-auto bg-slate-950/90 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] z-50 select-none overflow-hidden flex flex-col max-h-[520px] text-slate-200 animate-in fade-in slide-in-from-bottom-3 duration-150 ring-1 ring-white/10"
    >
      {/* Specular top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Android Notifications</span>
          <span className="text-[10px] bg-white/10 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-medium">
            {notifications.length}
          </span>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[11px] text-slate-400 hover:text-white transition flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 win10-menu-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 text-slate-600">
              <Bell className="w-6 h-6 stroke-1 text-cyan-400/40" />
            </div>
            <p className="font-semibold text-slate-300">No new notifications</p>
            <span className="text-[10px] text-slate-500 mt-1">Live stream synced with Android NotificationListener</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onOpenApp(n.appId);
                onClose();
              }}
              className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/30 transition-all group cursor-pointer relative shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: n.avatarColor || '#06B6D4' }}
                  />
                  <span className="text-[11px] font-semibold text-cyan-300">{n.appName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-white tracking-tight">{n.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                {n.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
