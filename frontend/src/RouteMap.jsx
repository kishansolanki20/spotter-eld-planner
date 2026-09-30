import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const createPinIcon = (color) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export default function RouteMap({ geometry, stops }) {
  const polylineCoords = geometry?.coordinates
    ? geometry.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const defaultCenter = polylineCoords.length > 0 ? polylineCoords[0] : [39.8283, -98.5795];

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer center={defaultCenter} zoom={polylineCoords.length ? 6 : 4} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polylineCoords.length > 0 && (
          <Polyline positions={polylineCoords} color="#2563eb" weight={4} opacity={0.8} />
        )}
        {stops &&
          stops.map((stop, idx) => (
            <Marker
              key={idx}
              position={[stop.lat, stop.lon]}
              icon={createPinIcon(stop.color || "#0284c7")}
            >
              <Popup>
                <div className="text-sm font-sans p-1">
                  <p className="font-semibold text-slate-900">{stop.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{stop.desc}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}