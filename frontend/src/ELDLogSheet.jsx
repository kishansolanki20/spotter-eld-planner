import React, { useEffect, useRef } from "react";

const ROW_Y = { OFF_DUTY: 30, SLEEPER_BERTH: 55, DRIVING: 80, ON_DUTY: 105 };
const ROW_KEYS = ["OFF_DUTY", "SLEEPER_BERTH", "DRIVING", "ON_DUTY"];
const ROW_LABELS = ["1. Off Duty", "2. Sleeper Berth", "3. Driving", "4. On Duty"];

export default function ELDLogSheet({ date, events, tripInfo }) {
  const canvasRef = useRef(null);

  const totals = { OFF_DUTY: 0, SLEEPER_BERTH: 0, DRIVING: 0, ON_DUTY: 0 };
  events.forEach((ev) => {
    if (totals[ev.status] !== undefined) {
      totals[ev.status] += ev.duration;
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const startX = 130;
    const endX = 740;
    const gridWidth = endX - startX;
    const hourStep = gridWidth / 24;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ROW_KEYS.forEach((key) => {
      const y = ROW_Y[key];
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    });

    for (let h = 0; h <= 24; h++) {
      const x = startX + h * hourStep;

      ctx.strokeStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(x, 15);
      ctx.lineTo(x, 120);
      ctx.stroke();

      if (h < 24) {
        ctx.fillStyle = "#475569";
        ctx.font = "9px sans-serif";
        ctx.fillText(h === 0 ? "Mid" : h === 12 ? "Noon" : `${h}`, x + 2, 12);

        for (let q = 1; q <= 3; q++) {
          const qx = x + (q * hourStep) / 4;
          ctx.strokeStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.moveTo(qx, 20);
          ctx.lineTo(qx, 115);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = "#0f172a";
    ctx.font = "11px sans-serif";
    ROW_LABELS.forEach((label, idx) => {
      ctx.fillText(label, 8, ROW_Y[ROW_KEYS[idx]] + 4);
    });

    ctx.font = "bold 11px sans-serif";
    ROW_KEYS.forEach((key) => {
      ctx.fillText(`${totals[key].toFixed(1)}h`, endX + 8, ROW_Y[key] + 4);
    });

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
    let prevX = null;
    let prevY = null;

    events.forEach((ev) => {
      const x1 = startX + ev.start_hour * hourStep;
      const x2 = startX + ev.end_hour * hourStep;
      const y = ROW_Y[ev.status];

      ctx.beginPath();
      if (prevX !== null && prevY !== null) {
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x1, y);
      } else {
        ctx.moveTo(x1, y);
      }
      ctx.lineTo(x2, y);
      ctx.stroke();

      prevX = x2;
      prevY = y;
    });
  }, [events]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-4 text-xs font-medium text-slate-600">
        <div><span className="font-semibold text-slate-900">Date:</span> {date}</div>
        <div><span className="font-semibold text-slate-900">Driver:</span> Kishan Singh</div>
        <div><span className="font-semibold text-slate-900">From:</span> {tripInfo.current}</div>
        <div><span className="font-semibold text-slate-900">To:</span> {tripInfo.dropoff}</div>
      </div>

      <div className="overflow-x-auto">
        <canvas ref={canvasRef} width={800} height={135} className="min-w-[800px]" />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Remarks / Duty Events</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {events.map((ev, i) => (
            <div key={i} className="flex justify-between bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
              <span className="font-medium text-slate-700">{ev.remark}</span>
              <span className="text-slate-500">{ev.duration.toFixed(1)} hrs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}