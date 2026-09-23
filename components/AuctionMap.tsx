'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

// Marker custom senza asset esterni (evita icone Leaflet rotte con bundler).
function dotIcon() {
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:#2754e3;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function AuctionMiniMap({
  lat,
  lng,
  height = 160,
}: {
  lat: number | null;
  lng: number | null;
  height?: number;
}) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div
        className="grid place-items-center bg-slate-100 text-xs text-slate-500"
        style={{ height }}
      >
        Mappa non disponibile
        <br />
        (coordinate assenti nel PVP)
      </div>
    );
  }
  return (
    <div style={{ height }} className="relative z-0">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Recenter lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={dotIcon()} />
      </MapContainer>
    </div>
  );
}

export function AuctionBigMap({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="grid h-full min-h-[320px] place-items-center rounded-2xl bg-slate-100 p-8 text-center text-sm text-slate-500">
        <p>
          Coordinate non disponibili nei dati PVP per questa asta.
          <br />
          L&apos;indirizzo testuale è mostrato nella scheda.
        </p>
      </div>
    );
  }
  return (
    <div className="h-full min-h-[320px] overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom
        style={{ height: '100%', minHeight: 420, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Recenter lat={lat} lng={lng} />
        <Marker position={[lat, lng]} icon={dotIcon()} />
      </MapContainer>
    </div>
  );
}
