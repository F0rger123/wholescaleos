import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker,
  useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  useStore, LeadStatus, calculateDealScore, getScoreColor, getLeadsInArea,
  STATUS_LABELS, type Lead, type Buyer, type CoverageArea,
} from '../store/useStore';
import { isDefaultCoordinates, geocodeAddress, isGeocodableAddress } from '../lib/geocoding';
import {
  MapPin, MapPinOff, DollarSign, User, Building, Zap, Layers,
  PenTool, X, Check, Undo2, Trash2, Users,
  Phone, Mail, Home, Target, Navigation, Loader2,
} from 'lucide-react';

// ─── Custom Icons ────────────────────────────────────────────────────────────

const LEAD_COLORS: Record<LeadStatus, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#a855f7',
  negotiating: '#f97316',
  'closed-won': '#10b981',
  'closed-lost': '#ef4444',
};

const createLeadIcon = (color: string) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const createBuyerIcon = (active: boolean) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background:${active ? '#06b6d4' : '#64748b'};width:26px;height:26px;border-radius:6px;
      transform:rotate(45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(-45deg);color:white;font-size:12px;font-weight:800;">$</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });

// ─── Drawing Tool Component ─────────────────────────────────────────────────

function DrawingTool({
  points,
  onAddPoint,
}: {
  points: [number, number][];
  onAddPoint: (p: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.getContainer().style.cursor = 'crosshair';
    map.doubleClickZoom.disable();
    return () => {
      map.getContainer().style.cursor = '';
      map.doubleClickZoom.enable();
    };
  }, [map]);

  useMapEvents({
  click: (e: { latlng: { lat: number; lng: number; }; }) => {
    onAddPoint([e.latlng.lat, e.latlng.lng]);
  },
});

  if (points.length === 0) return null;

  return (
    <>
      <Polyline positions={points} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '8,8' }} />
      {points.length >= 3 && (
        <Polygon
          positions={points}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2, dashArray: '8,8' }}
        />
      )}
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={6}
          pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
        />
      ))}
    </>
  );
}

// ─── Map Center Controller ──────────────────────────────────────────────────

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ─── Fly-To Handler ─────────────────────────────────────────────────────────

function FlyToHandler({ target, zoom, onDone }: { target: { lat: number; lng: number } | null; zoom?: number; onDone: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], zoom ?? 16, { duration: 1.5 });
      const timer = setTimeout(onDone, 1600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

// ─── Score helpers ──────────────────────────────────────────────────────────

function scoreHex(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// ─── Main MapView ───────────────────────────────────────────────────────────

export default function MapView() {
  const {
    leads, buyers, coverageAreas, mapFilters, mapSettings,
    toggleMapFilter, toggleLeadStatusFilter,
    addCoverageArea, setPendingDrawMode, pendingDrawMode,
  } = useStore();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', color: '#3b82f6', notes: '' });

  // Panel state
  const [filterOpen, setFilterOpen] = useState(false);

  // Detail sidebar
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const [selectedArea, setSelectedArea] = useState<CoverageArea | null>(null);

  // Handle pending draw mode from Settings navigation
  useEffect(() => {
    if (pendingDrawMode) {
      setIsDrawing(true);
      setPendingDrawMode(false);
    }
  }, [pendingDrawMode, setPendingDrawMode]);

  // Geocoding state
  const [geocodingLeadId, setGeocodingLeadId] = useState<string | null>(null);

  // Fly-to state for zoom animation
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Filtered data — only show leads with real coordinates
  const filteredLeads = useMemo(() => {
    if (!mapFilters.showLeads) return [];
    return leads.filter((l) =>
      l && l.status && mapFilters.leadStatusFilters[l.status] && !isDefaultCoordinates(l.lat, l.lng)
    );
  }, [leads, mapFilters.showLeads, mapFilters.leadStatusFilters]);

  // Count un-geocoded leads
  const ungeocodedLeads = useMemo(() =>
    leads.filter(l => !l || isDefaultCoordinates(l.lat, l.lng) && l.propertyAddress && isGeocodableAddress(l.propertyAddress)),
    [leads]
  );

  const filteredBuyers = useMemo(() => {
    if (!mapFilters.showBuyers) return [];
    return buyers.filter(b => b && b.lat !== null && b.lng !== null && !isDefaultCoordinates(b.lat, b.lng));
  }, [buyers, mapFilters.showBuyers]);

  const filteredAreas = useMemo(() => {
    if (!mapFilters.showCoverageAreas) return [];
    return coverageAreas;
  }, [coverageAreas, mapFilters.showCoverageAreas]);

  const center: [number, number] = [mapSettings.defaultLat, mapSettings.defaultLng];

  // Drawing handlers
  const handleAddPoint = useCallback((p: [number, number]) => {
    if (!showSaveForm) setDrawingPoints((prev) => [...prev, p]);
  }, [showSaveForm]);

  const handleUndo = () => setDrawingPoints((prev) => prev.slice(0, -1));

  const handleFinish = () => {
    if (drawingPoints.length >= 3) setShowSaveForm(true);
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setShowSaveForm(false);
    setSaveForm({ name: '', color: '#3b82f6', notes: '' });
  };

  const handleSaveArea = () => {
    if (!saveForm.name.trim()) return;
    const count = leads.filter((l) => {
      let inside = false;
      const [x, y] = [l.lat, l.lng];
      const poly = drawingPoints;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }).length;
    addCoverageArea({
      name: saveForm.name.trim(),
      coordinates: drawingPoints,
      color: saveForm.color,
      opacity: 0.2,
      leadCount: count,
      notes: saveForm.notes,
    });
    handleCancelDraw();
  };

  const closeDetail = () => { setSelectedLead(null); setSelectedBuyer(null); setSelectedArea(null); };

  // Stats
  const totalVisible = filteredLeads.length + filteredBuyers.length;

  return (
    <div className="space-y-4 h-full flex flex-col" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t-text)' }}>Property Map</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            {filteredLeads.length} leads · {filteredBuyers.length} buyers · {filteredAreas.length} zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors"
            style={{
              backgroundColor: 'var(--t-surface)',
              color: 'var(--t-text-secondary)',
              border: '1px solid var(--t-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--t-surface)';
            }}
          >
            <Layers size={16} /> Filters
          </button>
          {!isDrawing ? (
            <button
              onClick={() => setIsDrawing(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors"
              style={{
                backgroundColor: 'var(--t-primary)',
                color: 'var(--t-on-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                e.currentTarget.style.color = 'var(--t-primary-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                e.currentTarget.style.color = 'var(--t-on-primary)';
              }}
            >
              <PenTool size={16} /> Draw Area
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleUndo} disabled={drawingPoints.length === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--t-surface)',
                  color: 'var(--t-text-secondary)',
                  border: '1px solid var(--t-border)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-surface)';
                }}
              >
                <Undo2 size={14} /> Undo
              </button>
              <button onClick={handleFinish} disabled={drawingPoints.length < 3}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--t-success)',
                  color: 'var(--t-on-primary)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--t-success-dim)';
                    e.currentTarget.style.color = 'var(--t-success)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-success)';
                  e.currentTarget.style.color = 'var(--t-on-primary)';
                }}
              >
                <Check size={14} /> Finish ({drawingPoints.length} pts)
              </button>
              <button onClick={handleCancelDraw}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-colors"
                style={{
                  backgroundColor: 'var(--t-error-dim)',
                  color: 'var(--t-error)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-error)';
                  e.currentTarget.style.color = 'var(--t-on-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--t-error-dim)';
                  e.currentTarget.style.color = 'var(--t-error)';
                }}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map + Panels */}
      <div className="flex-1 min-h-[400px] rounded-2xl overflow-hidden border relative" style={{ borderColor: 'var(--t-border)' }}>

        {/* ── Drawing Mode Banner ── */}
        {isDrawing && !showSaveForm && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"
            style={{
              backgroundColor: 'var(--t-primary)',
              color: 'var(--t-on-primary)',
              opacity: 0.9,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Target size={14} className="animate-pulse" />
            Click on map to add polygon vertices · Need at least 3 points
          </div>
        )}

        {/* ── Save Area Form ── */}
        {showSaveForm && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] border rounded-xl p-4 w-80 shadow-xl"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Save Coverage Area</h3>
            <div className="space-y-3">
              <input
                placeholder="Area name..."
                value={saveForm.name}
                onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  border: '1px solid var(--t-input-border)',
                  color: 'var(--t-text)',
                  '--tw-ring-color': 'var(--t-primary)',
                } as React.CSSProperties}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--t-text-muted)' }}>Color:</span>
                {['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSaveForm((f) => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-md border-2 transition-transform ${saveForm.color === c ? 'scale-125' : ''}`}
                    style={{ background: c, borderColor: saveForm.color === c ? 'var(--t-on-primary)' : 'transparent' }}
                  />
                ))}
              </div>
              <textarea
                placeholder="Notes (optional)..."
                value={saveForm.notes}
                onChange={(e) => setSaveForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 h-16 resize-none"
                style={{
                  backgroundColor: 'var(--t-input-bg)',
                  border: '1px solid var(--t-input-border)',
                  color: 'var(--t-text)',
                }}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveArea}
                  className="flex-1 px-3 py-2 text-sm rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--t-primary)',
                    color: 'var(--t-on-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary-dim)';
                    e.currentTarget.style.color = 'var(--t-primary-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-primary)';
                    e.currentTarget.style.color = 'var(--t-on-primary)';
                  }}
                >
                  Save Area
                </button>
                <button onClick={handleCancelDraw}
                  className="px-3 py-2 text-sm rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--t-surface-hover)',
                    color: 'var(--t-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-surface-active)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── Detail Sidebar ── */}
        {(selectedLead || selectedBuyer || selectedArea) && (
          <div className="absolute top-3 right-3 z-[1000] border rounded-xl w-72 max-h-[calc(100%-1.5rem)] overflow-y-auto shadow-xl"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="p-3 border-b flex items-center justify-between sticky top-0 rounded-t-xl"
              style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text)' }}>
                {selectedLead ? 'Lead Detail' : selectedBuyer ? 'Buyer Detail' : 'Coverage Area'}
              </span>
              <button onClick={closeDetail} className="transition-colors" style={{ color: 'var(--t-text-muted)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {selectedLead && <LeadDetail lead={selectedLead} />}
              {selectedBuyer && <BuyerDetail buyer={selectedBuyer} />}
              {selectedArea && <AreaDetail area={selectedArea} />}
            </div>
          </div>
        )}


        {/* ── Legend ── */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] rounded-xl px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]"
          style={{
            backgroundColor: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
            color: 'var(--t-text-muted)',
            opacity: 0.9,
            backdropFilter: 'blur(4px)',
          }}
        >
          {(Object.keys(LEAD_COLORS) as LeadStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: LEAD_COLORS[s] }} />
              {STATUS_LABELS[s]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm rotate-45 inline-block" style={{ backgroundColor: 'var(--t-info)' }} /> Buyer
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--t-primary-dim)', border: '1px solid var(--t-primary)' }} /> Zone
          </span>
        </div>

        {/* ── Leaflet Map ── */}
        <MapContainer
          center={center}
          zoom={mapSettings.defaultZoom}
          className="h-full w-full"
          scrollWheelZoom={true}
          doubleClickZoom={!isDrawing}
        >
          <MapController center={center} zoom={mapSettings.defaultZoom} />
          <FlyToHandler target={flyTarget} zoom={flyTarget?.zoom} onDone={() => setFlyTarget(null)} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Drawing tool */}
          {isDrawing && <DrawingTool points={drawingPoints} onAddPoint={handleAddPoint} />}

          {/* Coverage area polygons */}
          {filteredAreas.map((area) => (
            <Polygon
              key={area.id}
              positions={area.coordinates}
              pathOptions={{
                color: area.color,
                fillColor: area.color,
                fillOpacity: area.opacity,
                weight: 2,
              }}
              eventHandlers={{
                click: () => {
                  closeDetail();
                  setSelectedArea(area);
                  // Fly to polygon center
                  const coords = area.coordinates || [];
                  if (coords.length === 0) return;
                  const avgLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                  const avgLng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                  setFlyTarget({ lat: avgLat, lng: avgLng });
                },
              }}
            >
              <Popup>
                <div className="min-w-[180px]" style={{ color: 'var(--t-text)' }}>
                  <h3 className="font-bold text-sm">{area.name}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                    {getLeadsInArea(leads, area).length} leads in this area
                  </p>
                  {area.notes && <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>{area.notes}</p>}
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Lead markers */}
          {filteredLeads.map((lead) => {
            const score = calculateDealScore(lead);
            const sc = getScoreColor(score);
            return (
              <Marker
                key={lead.id}
                position={[lead.lat, lead.lng]}
                icon={createLeadIcon(LEAD_COLORS[lead.status])}
                eventHandlers={{
                  click: () => { closeDetail(); setSelectedLead(lead); setFlyTarget({ lat: lead.lat, lng: lead.lng }); },
                }}
              >
                <Popup>
                  <div className="min-w-[220px]" style={{ color: 'var(--t-text)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{lead.name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        ⚡ {score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                      <MapPin size={10} /> {lead.propertyAddress}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} style={{ color: 'var(--t-success)' }} />
                        ${(lead.estimatedValue || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building size={10} style={{ color: 'var(--t-primary)' }} />
                        {lead.propertyType}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={10} style={{ color: 'var(--t-accent)' }} />
                        {lead.assignedTo}
                      </span>
                      <span
                        className="px-2 py-0.5 text-[10px] rounded-full font-medium text-center"
                        style={{ backgroundColor: LEAD_COLORS[lead.status] + '33', color: LEAD_COLORS[lead.status] }}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Buyer markers */}
          {filteredBuyers.map((buyer) => (
            <Marker
              key={buyer.id}
              position={[buyer.lat, buyer.lng]}
              icon={createBuyerIcon(buyer.active)}
              eventHandlers={{
                click: () => { closeDetail(); setSelectedBuyer(buyer); setFlyTarget({ lat: buyer.lat, lng: buyer.lng }); },
              }}
            >
              <Popup>
                <div className="min-w-[200px]" style={{ color: 'var(--t-text)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{buyer.name}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
                      style={{ backgroundColor: buyer.active ? 'var(--t-info-dim)' : 'var(--t-surface)', color: buyer.active ? 'var(--t-info)' : 'var(--t-text-muted)' }}>
                      {buyer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--t-text-muted)' }}>
                    Budget: ${(buyer.budgetMin / 1000).toFixed(0)}k – ${(buyer.budgetMax / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                    Looking for: {buyer.criteria.propertyTypes.join(', ')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 pt-2" style={{ borderTop: '1px solid var(--t-border)' }}>
                    <Zap size={10} style={{ color: scoreHex(buyer.dealScore) }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--t-text)' }}>Score: {buyer.dealScore}/100</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ── Map Controls (Bottom Right) ── */}
        <div className="absolute bottom-12 right-3 z-[1000] flex items-center gap-2">
          {/* Reset View */}
          <button
            onClick={() => {
              setFlyTarget({ lat: center[0], lng: center[1], zoom: mapSettings.defaultZoom });
              closeDetail();
            }}
            className="rounded-xl px-3 py-2 text-xs flex items-center gap-2 transition-all shadow-lg"
            style={{
              backgroundColor: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text-muted)',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--t-border-light)';
              e.currentTarget.style.color = 'var(--t-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--t-border)';
              e.currentTarget.style.color = 'var(--t-text-muted)';
            }}
            title="Reset map to default view"
          >
            <Navigation size={14} /> Reset View
          </button>

          {/* Ungeocoded Leads Button */}
          {ungeocodedLeads.length > 0 && (
            <button
              onClick={async () => {
                if (geocodingLeadId) return;
                for (const lead of ungeocodedLeads) {
                  setGeocodingLeadId(lead.id);
                  try {
                    const result = await geocodeAddress(lead.propertyAddress);
                    if (result) {
                      useStore.getState().updateLead(lead.id, { lat: result.lat, lng: result.lng });
                    }
                  } catch { /* skip */ }
                }
                setGeocodingLeadId(null);
              }}
              disabled={!!geocodingLeadId}
              className="rounded-xl px-3 py-2 text-xs flex items-center gap-2 transition-all shadow-lg font-medium whitespace-nowrap"
              style={{
                backgroundColor: 'var(--t-warning-dim)',
                border: '1px solid var(--t-warning)',
                color: 'var(--t-warning)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {geocodingLeadId ? (
                <><Loader2 size={12} className="animate-spin" /> Geocoding...</>
              ) : (
                <><MapPinOff size={14} /> {ungeocodedLeads.length} leads not on map</>
              )}
            </button>
          )}

          {/* Stats Badge */}
          <div className="rounded-xl px-3 py-2 text-xs font-medium shadow-lg whitespace-nowrap"
            style={{
              backgroundColor: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text-muted)',
              display: selectedLead || selectedBuyer || selectedArea ? 'none' : 'block',
              opacity: 0.9,
              backdropFilter: 'blur(4px)',
            }}
          >
            {totalVisible} markers visible
          </div>
        </div>
      </div>

      {/* ── Fixed Filter Modal Overlay ── */}
      {filterOpen && !isDrawing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div 
            className="fixed inset-0" 
            onClick={() => setFilterOpen(false)} 
          />
          <div className="relative border rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="p-6 border-b flex items-center justify-between bg-[var(--t-surface-dim)]" style={{ borderColor: 'var(--t-border)' }}>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--t-text)]">Map Filters</h3>
                <p className="text-[10px] text-[var(--t-text-muted)] mt-0.5 font-bold">Customize your map view</p>
              </div>
              <button 
                onClick={() => setFilterOpen(false)} 
                className="p-2.5 hover:bg-white/5 rounded-2xl transition-all group active:scale-90 border border-transparent hover:border-white/10" 
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Layer toggles */}
              {([
                { key: 'showLeads' as const, label: 'Properties', icon: MapPin, count: filteredLeads.length },
                { key: 'showBuyers' as const, label: 'Buyers', icon: Users, count: filteredBuyers.length },
                { key: 'showCoverageAreas' as const, label: 'Zones', icon: Layers, count: filteredAreas.length },
                { key: 'showDrivingRoute' as const, label: 'Routes', icon: Navigation, count: 0 },
              ]).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => toggleMapFilter(key)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-xs font-black transition-all border ${
                    key === 'showDrivingRoute' ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
                  }`}
                  style={
                    mapFilters[key]
                      ? { backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary-text)', borderColor: 'var(--t-primary)' }
                      : { backgroundColor: 'var(--t-bg)', color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }
                  }
                  disabled={key === 'showDrivingRoute'}
                >
                  <span className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${mapFilters[key] ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary)]/20' : 'bg-[var(--t-surface)]'}`}>
                      <Icon size={16} />
                    </div>
                    {label}
                  </span>
                  <span className="text-[10px] font-black opacity-60 px-3 py-1 rounded-full bg-black/20">
                    {key === 'showDrivingRoute' ? 'Soon' : count}
                  </span>
                </button>
              ))}

              {/* Lead status sub-filters */}
              {mapFilters.showLeads && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--t-border)' }}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 ml-1">Status Filter</div>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(LEAD_COLORS) as LeadStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleLeadStatusFilter(status)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black transition-all border group"
                        style={
                          mapFilters.leadStatusFilters[status]
                            ? { backgroundColor: 'var(--t-bg)', color: 'var(--t-text)', borderColor: LEAD_COLORS[status] }
                            : { backgroundColor: 'transparent', color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }
                        }
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform`} 
                              style={{ background: LEAD_COLORS[status], opacity: mapFilters.leadStatusFilters[status] ? 1 : 0.3, boxShadow: mapFilters.leadStatusFilters[status] ? `0 0 8px ${LEAD_COLORS[status]}88` : 'none' }} />
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-[var(--t-surface-dim)] border-t flex flex-col gap-3" style={{ borderColor: 'var(--t-border)' }}>
               <button 
                onClick={() => setFilterOpen(false)}
                className="w-full py-4 rounded-[1.25rem] bg-blue-600 text-white font-black text-xs uppercase tracking-[0.1em] hover:bg-blue-500 shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 transition-all active:scale-95"
               >
                 Close & Preview
               </button>
               <p className="text-[9px] text-center text-gray-500 font-black uppercase tracking-widest">Settings persist automatically</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Detail Components ───────────────────────────────────────────────

function LeadDetail({ lead }: { lead: Lead }) {
  const score = calculateDealScore(lead);
  const sc = getScoreColor(score);
  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{lead.name}</h3>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>⚡{score}</span>
        </div>
        <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}><MapPin size={10} />{lead.propertyAddress}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--t-surface)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Value</p>
          <p className="font-semibold" style={{ color: 'var(--t-text)' }}>${(lead.estimatedValue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--t-surface)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Offer</p>
          <p className="font-semibold" style={{ color: 'var(--t-text)' }}>${(lead.offerAmount || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--t-surface)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Type</p>
          <p className="font-medium" style={{ color: 'var(--t-text)' }}>{lead.propertyType}</p>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--t-surface)' }}>
          <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Status</p>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full font-medium" style={{ background: LEAD_COLORS[lead.status] + '33', color: LEAD_COLORS[lead.status] }}>
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}><Phone size={10} />{lead.phone}</div>
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}><Mail size={10} />{lead.email}</div>
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}><User size={10} />{lead.assignedTo}</div>
      </div>
      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Deal Score</span>
          <span className={`text-[10px] font-bold ${sc.text}`}>{score}/100 · {sc.label}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-surface)' }}>
          <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      {lead.notes && <p className="text-[11px] pt-2 border-t" style={{ color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }}>{lead.notes}</p>}
    </>
  );
}

function BuyerDetail({ buyer }: { buyer: Buyer }) {
  const sc = getScoreColor(buyer.dealScore);
  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{buyer.name}</h3>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
            style={{ backgroundColor: buyer.active ? 'var(--t-info-dim)' : 'var(--t-surface)', color: buyer.active ? 'var(--t-info)' : 'var(--t-text-muted)' }}>
            {buyer.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}><Phone size={10} />{buyer.phone}</div>
        <div className="flex items-center gap-2" style={{ color: 'var(--t-text-muted)' }}><Mail size={10} />{buyer.email}</div>
      </div>
      <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--t-surface)' }}>
        <p className="text-[9px] uppercase mb-1" style={{ color: 'var(--t-text-muted)' }}>Budget Range</p>
        <p className="font-semibold text-sm" style={{ color: 'var(--t-text)' }}>
          ${((buyer.budgetMin || 0) / 1000).toFixed(0)}k – ${((buyer.budgetMax || 0) / 1000).toFixed(0)}k
        </p>
      </div>
      <div className="rounded-lg p-2.5 space-y-1" style={{ backgroundColor: 'var(--t-surface)' }}>
        <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Criteria</p>
        <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--t-text)' }}><Home size={10} style={{ color: 'var(--t-primary)' }} />{buyer.criteria.propertyTypes.join(', ')}</p>
        {(buyer.criteria.bedroomsMin > 0 || buyer.criteria.bathroomsMin > 0) && (
          <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>{buyer.criteria.bedroomsMin}+ bed · {buyer.criteria.bathroomsMin}+ bath</p>
        )}
        {buyer.criteria.sqftMax > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>{(buyer.criteria.sqftMin || 0).toLocaleString()} – {(buyer.criteria.sqftMax || 0).toLocaleString()} sqft</p>
        )}
        {buyer.criteria.locationPreferences.length > 0 && (
          <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>{buyer.criteria.locationPreferences.join(', ')}</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>Deal Score</span>
          <span className={`text-[10px] font-bold ${sc.text}`}>{buyer.dealScore}/100</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--t-surface)' }}>
          <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${buyer.dealScore || 0}%` }} />
        </div>
      </div>
      {buyer.notes && <p className="text-[11px] pt-2 border-t" style={{ color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }}>{buyer.notes}</p>}
    </>
  );
}

function AreaDetail({ area }: { area: CoverageArea }) {
  const { leads, deleteCoverageArea } = useStore();
  const leadsIn = getLeadsInArea(leads, area);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-md" style={{ background: area.color }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>{area.name}</h3>
      </div>
      <div className="rounded-lg p-2.5 text-[11px]" style={{ backgroundColor: 'var(--t-surface)' }}>
        <p className="text-[9px] uppercase mb-1" style={{ color: 'var(--t-text-muted)' }}>Coverage Stats</p>
        <p className="font-medium" style={{ color: 'var(--t-text)' }}>{leadsIn.length} leads inside this area</p>
        <p className="mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{area.coordinates.length} boundary points</p>
      </div>
      {leadsIn.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase" style={{ color: 'var(--t-text-muted)' }}>Leads In Area</p>
          {leadsIn.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg"
              style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}>
              <span>{l.name}</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded-full" style={{ background: LEAD_COLORS[l.status] + '33', color: LEAD_COLORS[l.status] }}>
                {STATUS_LABELS[l.status]}
              </span>
            </div>
          ))}
        </div>
      )}
      {area.notes && <p className="text-[11px]" style={{ color: 'var(--t-text-muted)' }}>{area.notes}</p>}
      <button
        onClick={() => deleteCoverageArea(area.id)}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--t-error-dim)', color: 'var(--t-error)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--t-error)';
          e.currentTarget.style.color = 'var(--t-on-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--t-error-dim)';
          e.currentTarget.style.color = 'var(--t-error)';
        }}
      >
        <Trash2 size={12} /> Delete Area
      </button>
    </>
  );
}