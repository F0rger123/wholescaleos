import { useState } from 'react';
import { X, Plus, ChevronLeft, ChevronRight, Trash2, Camera, Image, ArrowLeft, ArrowRight } from 'lucide-react';

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 50%, 40%)`;
}

const PHOTO_LABELS = [
  'Front View', 'Kitchen', 'Living Room', 'Master Bedroom', 'Bathroom',
  'Backyard', 'Garage', 'Aerial View', 'Street View', 'Interior',
  'Dining Room', 'Office', 'Patio', 'Pool', 'Driveway',
];

interface PhotoGalleryProps {
  photos: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (photos: string[]) => void;
  propertyAddress: string;
}

export function PhotoGallery({ photos, onAdd, onRemove, onReorder, propertyAddress }: PhotoGalleryProps) {
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  const handleAdd = () => {
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onAdd(id);
  };

  const movePhoto = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= photos.length) return;
    const arr = [...photos];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onReorder(arr);
  };

  const getLabel = (_photo: string, idx: number) => PHOTO_LABELS[idx % PHOTO_LABELS.length];

  return (
    <div>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {photos.map((photo, idx) => (
          <div
            key={photo}
            className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-transparent transition-all"
            style={{ border: '2px solid transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--t-primary-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            onClick={() => setFullscreenIdx(idx)}
          >
            <div
              className="w-full h-full flex flex-col items-center justify-center"
              style={{ background: hashColor(photo) }}
            >
              <Camera size={16} className="text-white/50 mb-0.5" />
              <span className="text-[8px] text-white/60 font-medium px-1 text-center leading-tight">
                {getLabel(photo, idx)}
              </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              {idx > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); movePhoto(idx, -1); }}
                  className="p-1 rounded bg-white/20 hover:bg-white/30 text-white"
                >
                  <ArrowLeft size={10} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(photo); }}
                className="p-1 rounded text-white transition-colors"
                style={{ backgroundColor: 'var(--t-error)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--t-error)'}
              >
                <Trash2 size={10} />
              </button>
              {idx < photos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); movePhoto(idx, 1); }}
                  className="p-1 rounded bg-white/20 hover:bg-white/30 text-white"
                >
                  <ArrowRight size={10} />
                </button>
              )}
            </div>

            {/* Index */}
            <div className="absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded font-bold">
              {idx + 1}
            </div>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors"
          style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--t-primary)';
            e.currentTarget.style.color = 'var(--t-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--t-border)';
            e.currentTarget.style.color = 'var(--t-text-muted)';
          }}
        >
          <Plus size={16} />
          <span className="text-[8px] font-medium">Add</span>
        </button>
      </div>

      {photos.length > 0 && (
        <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}>
          <Image size={9} />
          {photos.length} photo{photos.length !== 1 ? 's' : ''} · Click to view · Hover to reorder
        </p>
      )}

      {/* Fullscreen Viewer */}
      {fullscreenIdx !== null && photos[fullscreenIdx] && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenIdx(null)}
        >
          <button
            onClick={() => setFullscreenIdx(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white z-10"
          >
            <X size={24} />
          </button>

          {fullscreenIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreenIdx(fullscreenIdx - 1); }}
              className="absolute left-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white z-10"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {fullscreenIdx < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreenIdx(fullscreenIdx + 1); }}
              className="absolute right-4 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white z-10"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <div
            className="w-[80vw] h-[70vh] rounded-2xl flex flex-col items-center justify-center"
            style={{ background: hashColor(photos[fullscreenIdx]) }}
            onClick={(e) => e.stopPropagation()}
          >
            <Camera size={64} className="text-white/30 mb-3" />
            <span className="text-lg text-white/50 font-medium">
              {getLabel(photos[fullscreenIdx], fullscreenIdx)}
            </span>
            <span className="text-sm text-white/30 mt-1">{propertyAddress}</span>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-xl">
            <span className="text-sm text-white font-medium">
              {fullscreenIdx + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
