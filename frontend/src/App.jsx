import React, { useState } from "react";
import RouteMap from "./RouteMap";
import ELDLogSheet from "./ELDLogSheet";
import { MapPin, Truck, Flag, Clock, ArrowRight, Loader2 } from "lucide-react";

export default function App() {
  const [formData, setFormData] = useState({
    current: "Varanasi, Uttar Pradesh",
    pickup: "Varanasi, Uttar Pradesh",
    dropoff: "Agra, Uttar Pradesh",
    cycle_used: 20,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [logDays, setLogDays] = useState({});

  // FMCSA Logs must be split strictly at midnight into 24-hour calendar sheets
  const processEventsIntoDays = (events) => {
    const days = {};

    events.forEach((ev) => {
      let currentStart = new Date(ev.start_time);
      const finalEnd = new Date(ev.end_time);

      while (currentStart < finalEnd) {
        const dateString = currentStart.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric"
        });

        // Find midnight of the next day
        let nextMidnight = new Date(currentStart);
        nextMidnight.setHours(24, 0, 0, 0);

        // This chunk ends either when the event finishes, or at midnight (whichever is first)
        let chunkEnd = new Date(Math.min(finalEnd, nextMidnight));

        let startHour = currentStart.getHours() + currentStart.getMinutes() / 60;
        let endHour = chunkEnd.getHours() + chunkEnd.getMinutes() / 60;
        
        // If it perfectly hits midnight, represent it as hour 24 on the graph
        if (endHour === 0 && chunkEnd > currentStart) endHour = 24;

        const duration = (chunkEnd - currentStart) / 3600000;

        if (!days[dateString]) days[dateString] = [];

        days[dateString].push({
          status: ev.status,
          start_hour: startHour,
          end_hour: endHour,
          duration: duration,
          remark: ev.remark,
        });

        currentStart = chunkEnd; // Move pointer forward
      }
    });

    return days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Connect to your Django backend
      const response = await fetch("http://127.0.0.1:8000/api/plan-trip/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current: formData.current,
          pickup: formData.pickup,
          dropoff: formData.dropoff,
          cycle_used: parseFloat(formData.cycle_used),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to calculate route");

      setTripData(data);
      setLogDays(processEventsIntoDays(data.events));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate map pins from the polyline geometry
  let mapStops = [];
  if (tripData?.route_geometry?.coordinates) {
    const coords = tripData.route_geometry.coordinates;
    mapStops = [
      { lat: coords[0][1], lon: coords[0][0], color: "#22c55e", title: "Current Location", desc: formData.current },
      { lat: coords[coords.length - 1][1], lon: coords[coords.length - 1][0], color: "#ef4444", title: "Dropoff", desc: formData.dropoff },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Spotter HOS Planner</h1>
            <p className="text-slate-500 font-medium">Automated FMCSA ELD Log & Route Generator</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5">
                  <MapPin size={16} className="mr-2 text-sky-500" /> Current Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.current}
                  onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5">
                  <Flag size={16} className="mr-2 text-green-500" /> Pickup Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup}
                  onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5">
                  <Flag size={16} className="mr-2 text-red-500" /> Dropoff Location
                </label>
                <input
                  type="text"
                  required
                  value={formData.dropoff}
                  onChange={(e) => setFormData({ ...formData, dropoff: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-1.5">
                  <Clock size={16} className="mr-2 text-amber-500" /> Cycle Hours Used (70h/8d)
                </label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  step="0.5"
                  required
                  value={formData.cycle_used}
                  onChange={(e) => setFormData({ ...formData, cycle_used: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Calculate Route & Logs"}
                {!loading && <ArrowRight size={18} className="ml-2" />}
              </button>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Map & Results */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
              <RouteMap geometry={tripData?.route_geometry} stops={mapStops} />
            </div>

            {tripData && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Distance</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{tripData.distance_miles.toFixed(0)} mi</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Drive Time</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{tripData.duration_hours.toFixed(1)} hrs</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generated ELD Logs */}
        {Object.keys(logDays).length > 0 && (
          <div className="pt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Generated ELD Logs</h2>
            {Object.entries(logDays).map(([date, events], idx) => (
              <ELDLogSheet 
                key={idx} 
                date={date} 
                events={events} 
                tripInfo={{ current: formData.current, dropoff: formData.dropoff }} 
              />
            ))}
          </div>
        )}
      </div>
      <div className="mt-12 text-center text-sm font-medium text-slate-400">
        Engineered by Kishan Singh for the Spotter Full-Stack Assessment
      </div>
    </div>
  );
}