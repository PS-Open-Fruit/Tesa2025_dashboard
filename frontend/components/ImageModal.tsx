"use client";

import { Icon } from "@iconify/react";
import { useEffect } from "react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  timestamp?: string;
  detectionInfo?: {
    cameraName?: string;
    objectType?: string;
    coordinates?: { lat: string | number; lng: string | number };
  };
}

export default function ImageModal({ isOpen, onClose, imageUrl, timestamp, detectionInfo }: ImageModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-white">Detection Image</h3>
            {timestamp && (
              <p className="text-xs text-slate-400 mt-1">
                <Icon icon="mdi:clock-outline" className="inline mr-1" />
                {new Date(timestamp).toLocaleString('th-TH')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon icon="mdi:close" width="24" height="24" className="text-slate-400" />
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-black">
          <img
            src={imageUrl}
            alt="Detection"
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23334155"/><text x="50%" y="50%" text-anchor="middle" fill="%23cbd5e1" font-family="Arial" font-size="16">Image not available</text></svg>';
            }}
          />
        </div>

        {/* Info Footer */}
        {detectionInfo && (
          <div className="px-6 py-4 bg-slate-900 border-t border-slate-700">
            <div className="grid grid-cols-3 gap-4 text-sm">
              {detectionInfo.cameraName && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Camera</p>
                  <p className="text-white font-medium">{detectionInfo.cameraName}</p>
                </div>
              )}
              {detectionInfo.objectType && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Object Type</p>
                  <p className="text-white font-medium">{detectionInfo.objectType}</p>
                </div>
              )}
              {detectionInfo.coordinates && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Coordinates</p>
                  <p className="text-white font-medium font-mono text-xs">
                    {detectionInfo.coordinates.lat}, {detectionInfo.coordinates.lng}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
