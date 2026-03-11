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
  MapPin, MapPinOff, DollarSign, User, Building, Zap, Layers, Eye, EyeOff,
  PenTool, X, Check, Undo2, Trash2, Users, ChevronDown, ChevronUp,
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

export function MapView() {
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
  const [filterOpen, setFilterOpen] = useState(true);
  const [statusesOpen, setStatusesOpen] = useState(true);

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
      mapFilters.leadStatusFilters[l.status] && !isDefaultCoordinates(l.lat, l.lng)
    );
  }, [leads, mapFilters.showLeads, mapFilters.leadStatusFilters]);

  // Count un-geocoded leads
  const ungeocodedLeads = useMemo(() =>
    leads.filter(l => isDefaultCoordinates(l.lat, l.lng) && l.propertyAddress && isGeocodableAddress(l.propertyAddress)),
    [leads]
  );

  const filteredBuyers = useMemo(() => {
    if (!mapFilters.showBuyers) return [];
    return buyers;
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
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Property Map</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filteredLeads.length} leads · {filteredBuyers.length} buyers · {filteredAreas.length} zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
          >
            <Layers size={16} /> Filters
          </button>
          {!isDrawing ? (
            <button
              onClick={() => setIsDrawing(true)}
              className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl transition-colors"
            >
              <PenTool size={16} /> Draw Area
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleUndo} disabled={drawingPoints.length === 0}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors disabled:opacity-40">
                <Undo2 size={14} /> Undo
              </button>
              <button onClick={handleFinish} disabled={drawingPoints.length < 3}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl transition-colors disabled:opacity-40">
                <Check size={14} /> Finish ({drawingPoints.length} pts)
              </button>
              <button onClick={handleCancelDraw}
                className="flex items-center gap-1 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm rounded-xl transition-colors">
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map + Panels */}
      <div className="flex-1 min-h-[400px] rounded-2xl overflow-hidden border border-slate-800 relative">

        {/* ── Drawing Mode Banner ── */}
        {isDrawing && !showSaveForm && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-brand-600/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <Target size={14} className="animate-pulse" />
            Click on map to add polygon vertices · Need at least 3 points
          </div>
        )}

        {/* ── Save Area Form ── */}
        {showSaveForm && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 w-80 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3">Save Coverage Area</h3>
            <div className="space-y-3">
              <input
                placeholder="Area name..."
                value={saveForm.name}
                onChange={(e) => setSaveForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Color:</span>
                {['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSaveForm((f) => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-md border-2 transition-transform ${saveForm.color === c ? 'border-white scale-125' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <textarea
                placeholder="Notes (optional)..."
                value={saveForm.notes}
                onChange={(e) => setSaveForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 h-16 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveArea}
                  className="flex-1 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg font-medium">
                  Save Area
                </button>
                <button onClick={handleCancelDraw}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Filter Panel ── */}
        {filterOpen && !isDrawing && (
          <div className="absolute top-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl w-60 shadow-xl overflow-hidden">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Map Layers</span>
              <button onClick={() => setFilterOpen(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="p-3 space-y-1.5">
              {/* Layer toggles */}
              {([
                { key: 'showLeads' as const, label: 'Lead Properties', icon: MapPin, count: filteredLeads.length },
                { key: 'showBuyers' as const, label: 'Buyers', icon: Users, count: filteredBuyers.length },
                { key: 'showCoverageAreas' as const, label: 'Coverage Areas', icon: Layers, count: filteredAreas.length },
                { key: 'showDrivingRoute' as const, label: 'Driving Route', icon: Navigation, count: 0 },
              ]).map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => toggleMapFilter(key)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    mapFilters[key] ? 'bg-brand-600/20 text-brand-300' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                  } ${key === 'showDrivingRoute' ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={key === 'showDrivingRoute'}
                >
                  <span className="flex items-center gap-2">
                    {mapFilters[key] ? <Eye size={13} /> : <EyeOff size={13} />}
                    <Icon size={13} />
                    {label}
                  </span>
                  <span className="text-[10px] opacity-70">{key === 'showDrivingRoute' ? 'Soon' : count}</span>
                </button>
              ))}
            </div>

            {/* Lead status sub-filters */}
            {mapFilters.showLeads && (
              <>
                <button
                  onClick={() => setStatusesOpen((v) => !v)}
                  className="w-full px-3 py-2 border-t border-slate-700 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
                >
                  Lead Statuses
                  {statusesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {statusesOpen && (
                  <div className="px-3 pb-3 space-y-1">
                    {(Object.keys(LEAD_COLORS) as LeadStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleLeadStatusFilter(status)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          mapFilters.leadStatusFilters[status]
                            ? 'text-white bg-slate-800'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LEAD_COLORS[status], opacity: mapFilters.leadStatusFilters[status] ? 1 : 0.3 }} />
                        {STATUS_LABELS[status]}
                        <span className="ml-auto text-[10px] text-slate-500">
                          {leads.filter((l) => l.status === status).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Detail Sidebar ── */}
        {(selectedLead || selectedBuyer || selectedArea) && (
          <div className="absolute top-3 right-3 z-[1000] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl w-72 max-h-[calc(100%-1.5rem)] overflow-y-auto shadow-xl">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-sm rounded-t-xl">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                {selectedLead ? 'Lead Detail' : selectedBuyer ? 'Buyer Detail' : 'Coverage Area'}
              </span>
              <button onClick={closeDetail} className="text-slate-400 hover:text-white"><X size={14} /></button>
            </div>
            <div className="p-3 space-y-3">
              {selectedLead && <LeadDetail lead={selectedLead} />}
              {selectedBuyer && <BuyerDetail buyer={selectedBuyer} />}
              {selectedArea && <AreaDetail area={selectedArea} />}
            </div>
          </div>
        )}

        {/* ── Ungeocoded Leads Banner ── */}
        {ungeocodedLeads.length > 0 && (
          <div className="absolute top-3 right-3 z-[999] bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-400 max-w-[250px]"
            style={{ display: selectedLead || selectedBuyer || selectedArea ? 'none' : 'block' }}>
            <div className="flex items-center gap-2 mb-1">
              <MapPinOff size={12} />
              <span className="font-semibold">{ungeocodedLeads.length} leads not on map</span>
            </div>
            <p className="text-[10px] text-amber-400/70">
              Go to Leads page → click "Geocode" to add map pins
            </p>
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
              className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50"
            >
              {geocodingLeadId ? (
                <><Loader2 size={10} className="animate-spin" /> Geocoding...</>
              ) : (
                <><Navigation size={10} /> Geocode All Now</>
              )}
            </button>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
          {(Object.keys(LEAD_COLORS) as LeadStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: LEAD_COLORS[s] }} />
              {STATUS_LABELS[s]}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 rotate-45 inline-block" /> Buyer
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2 rounded-sm bg-brand-500/40 border border-brand-500/60 inline-block" /> Zone
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
                  const avgLat = area.coordinates.reduce((s, c) => s + c[0], 0) / area.coordinates.length;
                  const avgLng = area.coordinates.reduce((s, c) => s + c[1], 0) / area.coordinates.length;
                  setFlyTarget({ lat: avgLat, lng: avgLng });
                },
              }}
            >
              <Popup>
                <div className="min-w-[180px] text-slate-900">
                  <h3 className="font-bold text-sm">{area.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {getLeadsInArea(leads, area).length} leads in this area
                  </p>
                  {area.notes && <p className="text-xs text-slate-600 mt-1">{area.notes}</p>}
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
                  <div className="min-w-[220px] text-slate-900">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">{lead.name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        ⚡ {score}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin size={10} /> {lead.propertyAddress}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} className="text-emerald-600" />
                        ${lead.estimatedValue.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building size={10} className="text-blue-600" />
                        {lead.propertyType}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={10} className="text-purple-600" />
                        {lead.assignedTo}
                      </span>
                      <span
                        className="px-2 py-0.5 text-[10px] rounded-full font-medium text-center"
                        style={{ background: LEAD_COLORS[lead.status] + '33', color: LEAD_COLORS[lead.status] }}
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
                <div className="min-w-[200px] text-slate-900">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{buyer.name}</h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${buyer.active ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-200 text-slate-500'}`}>
                      {buyer.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Budget: ${(buyer.budgetMin / 1000).toFixed(0)}k – ${(buyer.budgetMax / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Looking for: {buyer.criteria.propertyTypes.join(', ')}
                  </p>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    <Zap size={10} style={{ color: scoreHex(buyer.dealScore) }} />
                    <span className="text-xs font-bold">Score: {buyer.dealScore}/100</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ── Reset View Button ── */}
        <button
          onClick={() => {
            setFlyTarget({ lat: center[0], lng: center[1], zoom: mapSettings.defaultZoom });
            closeDetail();
          }}
          className="absolute bottom-14 right-3 z-[1000] bg-slate-900/90 hover:bg-slate-800 backdrop-blur-sm border border-slate-700 hover:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-lg"
          title="Reset map to default view"
        >
          <Navigation size={14} /> Reset View
        </button>

        {/* ── Stats Badge ── */}
        <div className="absolute top-3 right-3 z-[999] bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-400"
          style={{ display: selectedLead || selectedBuyer || selectedArea ? 'none' : 'block' }}
        >
          {totalVisible} markers visible
        </div>
      </div>
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
          <h3 className="text-sm font-bold text-white">{lead.name}</h3>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>⚡{score}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin size={10} />{lead.propertyAddress}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-slate-500 text-[9px] uppercase">Value</p>
          <p className="text-white font-semibold">${lead.estimatedValue.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-slate-500 text-[9px] uppercase">Offer</p>
          <p className="text-white font-semibold">${lead.offerAmount.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-slate-500 text-[9px] uppercase">Type</p>
          <p className="text-white font-medium">{lead.propertyType}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-slate-500 text-[9px] uppercase">Status</p>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full font-medium" style={{ background: LEAD_COLORS[lead.status] + '33', color: LEAD_COLORS[lead.status] }}>
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400"><Phone size={10} />{lead.phone}</div>
        <div className="flex items-center gap-2 text-slate-400"><Mail size={10} />{lead.email}</div>
        <div className="flex items-center gap-2 text-slate-400"><User size={10} />{lead.assignedTo}</div>
      </div>
      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Deal Score</span>
          <span className={`text-[10px] font-bold ${sc.text}`}>{score}/100 · {sc.label}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      {lead.notes && <p className="text-[11px] text-slate-500 border-t border-slate-700 pt-2">{lead.notes}</p>}
    </>
  );
}

function BuyerDetail({ buyer }: { buyer: Buyer }) {
  const sc = getScoreColor(buyer.dealScore);
  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">{buyer.name}</h3>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${buyer.active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
            {buyer.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400"><Phone size={10} />{buyer.phone}</div>
        <div className="flex items-center gap-2 text-slate-400"><Mail size={10} />{buyer.email}</div>
      </div>
      <div className="bg-slate-800 rounded-lg p-2.5">
        <p className="text-[9px] text-slate-500 uppercase mb-1">Budget Range</p>
        <p className="text-white font-semibold text-sm">
          ${(buyer.budgetMin / 1000).toFixed(0)}k – ${(buyer.budgetMax / 1000).toFixed(0)}k
        </p>
      </div>
      <div className="bg-slate-800 rounded-lg p-2.5 space-y-1">
        <p className="text-[9px] text-slate-500 uppercase">Criteria</p>
        <p className="text-[11px] text-white flex items-center gap-1"><Home size={10} className="text-blue-400" />{buyer.criteria.propertyTypes.join(', ')}</p>
        {(buyer.criteria.bedroomsMin > 0 || buyer.criteria.bathroomsMin > 0) && (
          <p className="text-[11px] text-slate-300">{buyer.criteria.bedroomsMin}+ bed · {buyer.criteria.bathroomsMin}+ bath</p>
        )}
        {buyer.criteria.sqftMax > 0 && (
          <p className="text-[11px] text-slate-300">{buyer.criteria.sqftMin.toLocaleString()} – {buyer.criteria.sqftMax.toLocaleString()} sqft</p>
        )}
        {buyer.criteria.locationPreferences.length > 0 && (
          <p className="text-[11px] text-slate-400">{buyer.criteria.locationPreferences.join(', ')}</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Deal Score</span>
          <span className={`text-[10px] font-bold ${sc.text}`}>{buyer.dealScore}/100</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${buyer.dealScore}%` }} />
        </div>
      </div>
      {buyer.notes && <p className="text-[11px] text-slate-500 border-t border-slate-700 pt-2">{buyer.notes}</p>}
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
        <h3 className="text-sm font-bold text-white">{area.name}</h3>
      </div>
      <div className="bg-slate-800 rounded-lg p-2.5 text-[11px]">
        <p className="text-slate-500 text-[9px] uppercase mb-1">Coverage Stats</p>
        <p className="text-white font-medium">{leadsIn.length} leads inside this area</p>
        <p className="text-slate-400 mt-0.5">{area.coordinates.length} boundary points</p>
      </div>
      {leadsIn.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-slate-500 uppercase">Leads In Area</p>
          {leadsIn.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-[11px] py-1 px-2 bg-slate-800 rounded-lg">
              <span className="text-white">{l.name}</span>
              <span className="px-1.5 py-0.5 text-[9px] rounded-full" style={{ background: LEAD_COLORS[l.status] + '33', color: LEAD_COLORS[l.status] }}>
                {STATUS_LABELS[l.status]}
              </span>
            </div>
          ))}
        </div>
      )}
      {area.notes && <p className="text-[11px] text-slate-500">{area.notes}</p>}
      <button
        onClick={() => deleteCoverageArea(area.id)}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg"
      >
        <Trash2 size={12} /> Delete Area
      </button>
    </>
  );
}
