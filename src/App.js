import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

const JEDDAH_COORDS = {
  "الشاطئ": [21.6033, 39.1066], "السليمانية": [21.4955, 39.2455],
  "المرجان": [21.6668, 39.1086], "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444], "النعيم": [21.6212, 39.1554],
  "النهضة": [21.6111, 39.1289], "الزهراء": [21.5877, 39.1311],
  "السلامة": [21.5899, 39.1524], "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364], "أبحر الشمالية": [21.7516, 39.1301],
  "أبحر الجنوبية": [21.7115, 39.1190], "الحمدانية": [21.7656, 39.1977],
  "الصفا": [21.5833, 39.2023], "المروة": [21.6166, 39.2055]
};

const robustClean = (s) => {
  if (!s) return "";
  let str = s.toString().trim();
  if (str.includes("شاط")) return "الشاطئ";
  if (str.includes("سليماني")) return "السليمانية";
  return str.replace(/حي\s+/g, "").replace(/^ال/g, "").replace(/[أإآ]/g, "ا").replace(/[ىئئي]$/g, "ي").replace(/ة$/g, "ه").replace(/\s+/g, "");
};

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const fullScreenRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0; let temp = {};
      data.forEach(row => {
        const keys = Object.keys(row);
        let rawName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        let amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        let client = String(row[keys[0]] || "عميل");
        if (rawName) {
          sum += amount;
          const cleanedInput = robustClean(rawName);
          const matchedKey = Object.keys(JEDDAH_COORDS).find(k => robustClean(k) === cleanedInput);
          const finalName = matchedKey || rawName;
          if (!temp[finalName]) {
            const coords = JEDDAH_COORDS[matchedKey] || [21.5433, 39.1728];
            temp[finalName] = { total: 0, clients: [], lat: coords[0], lng: coords[1] };
          }
          temp[finalName].total += amount;
          temp[finalName].clients.push({ name: client, amount });
        }
      });
      setDistrictsData(temp); setTotalSales(sum);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    const ui = document.getElementById("ui-top");
    const btn = document.getElementById("report-btn");
    if (ui) ui.style.display = "none";
    if (btn) btn.style.display = "none";
    html2canvas(fullScreenRef.current).then(canvas => {
      const a = document.createElement("a");
      a.download = "Map.png"; a.href = canvas.toDataURL(); a.click();
      if (ui) ui.style.display = "flex";
      if (btn) btn.style.display = "block";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "relative", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* الواجهة العلوية */}
      <div id="ui-top" style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px", background: "rgba(0,0,0,0.8)", boxSizing: "border-box" }}>
        <div style={{ color: "#00f2ff", fontSize: "14px", fontWeight: "900" }}>VISIONARY MAP</div>
        <div style={{ display: "flex", gap: "8px", direction: "rtl" }}>
          <label style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
            رفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          {Object.keys(districtsData).length > 0 && (
            <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>حفظ</button>
          )}
        </div>
      </div>

      {/* زر التقرير العائم - تم تحسين مكانه للجوال */}
      {Object.keys(districtsData).length > 0 && !showReport && (
        <div style={{ position: "absolute", bottom: "50px", left: 0, width: "100%", display: "flex", justifyContent: "center", zIndex: 1000 }}>
          <button id="report-btn" onClick={() => setShowReport(true)} style={{ background: "#1e293b", color: "#00f2ff", border: "2px solid #00f2ff", padding: "15px 30px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 5px 20px rgba(0,0,0,0.5)", cursor: "pointer", pointerEvents: "auto" }}>
            📊 عرض الإحصائيات
          </button>
        </div>
      )}

      {/* نافذة التقرير - تغطية كاملة (Full Screen Overlay) */}
      {showReport && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          width: "100%", 
          height: "100%", 
          zIndex: 9999, 
          background: "#000000", 
          display: "flex", 
          flexDirection: "column", 
          direction: "rtl"
        }}>
          {/* رأس التقرير ثابت في الأعلى */}
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", borderBottom: "1px solid #333" }}>
            <h2 style={{ color: "#00f2ff", margin: 0, fontSize: "20px" }}>تقرير المبيعات</h2>
            <button onClick={() => setShowReport(false)} style={{ background: "#ff4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontWeight: "bold", fontSize: "16px" }}>إغلاق ✕</button>
          </div>
          
          {/* محتوى التقرير قابل للتمرير */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", WebkitOverflowScrolling: "touch" }}>
            <div style={{ background: "#10b981", padding: "20px", borderRadius: "15px", textAlign: "center", marginBottom: "25px", fontSize: "20px", fontWeight: "bold", color: "#fff" }}>
              إجمالي المبيعات: {totalSales.toLocaleString()} SAR
            </div>
            
            {Object.entries(districtsData)
              .sort((a,b) => b[1].total - a[1].total)
              .map(([name, data]) => (
                <div key={name} style={{ marginBottom: "20px", background: "#111", border: "1px solid #222", padding: "15px", borderRadius: "12px" }}>
                  <div style={{ color: "#00f2ff", fontSize: "18px", fontWeight: "bold", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>حي {name}</span>
                    <span style={{ fontSize: "14px", color: "#888" }}>{data.clients.length} عملاء</span>
                  </div>
                  {data.clients.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#eee", padding: "5px 0", borderTop: "1px solid #222" }}>
                      <span>{c.name}</span>
                      <span style={{ fontWeight: "bold" }}>{c.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: "10px", textAlign: "left", color: "#10b981", fontWeight: "bold", fontSize: "15px" }}>
                    المجموع: {data.total.toLocaleString()}
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* الخريطة - تأخذ الخلفية بالكامل */}
      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100vh", width: "100vw", zIndex: 1 }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={8} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "14px", fontWeight: "900", textShadow: "2px 2px 0 #000" }}>
                  {name}
                </div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1500} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.2 }} />
          </React.Fragment>
        ))}
      </MapContainer>

      <style>{`
        .tp { background: transparent !important; border: none !important; box-shadow: none !important; }
        .tp:before { border: none !important; }
        .leaflet-container { background: #000 !important; }
        body { margin: 0; padding: 0; background: #000; overflow: hidden; }
      `}</style>
    </div>
  );
}
