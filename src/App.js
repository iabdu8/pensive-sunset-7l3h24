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
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);
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
      a.download = "VisionaryMap.png"; a.href = canvas.toDataURL(); a.click();
      if (ui) ui.style.display = "flex";
      if (btn) btn.style.display = "block";
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "sans-serif" }}>
      
      {/* إذا كان التقرير مفتوحاً، نعرض التقرير فقط ونخفي الخريطة تماماً */}
      {showReport ? (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: "#000", direction: "rtl", zIndex: 99999 }}>
          <div style={{ padding: "20px", background: "#111", borderBottom: "2px solid #00f2ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#00f2ff", fontWeight: "bold", fontSize: "18px" }}>تقرير المبيعات</span>
            <button onClick={() => setShowReport(false)} style={{ background: "#ff4444", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold" }}>إغلاق ✕</button>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "15px", WebkitOverflowScrolling: "touch" }}>
            <div style={{ background: "#10b981", padding: "20px", borderRadius: "12px", textAlign: "center", marginBottom: "20px", fontWeight: "bold", fontSize: "20px" }}>
              إجمالي المبيعات: {totalSales.toLocaleString()} SAR
            </div>

            {Object.entries(districtsData).sort((a,b)=>b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ background: "#1a1a1a", padding: "15px", borderRadius: "12px", marginBottom: "15px", borderRight: "5px solid #00f2ff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ color: "#00f2ff", fontWeight: "bold", fontSize: "17px" }}>حي {name}</span>
                  <span style={{ color: "#fff" }}>{data.total.toLocaleString()} SAR</span>
                </div>
                {data.clients.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#bbb", borderTop: "1px solid #333", padding: "6px 0" }}>
                    <span>• {c.name}</span><span>{c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* واجهة الخريطة والتحكم */
        <div ref={fullScreenRef} style={{ height: "100%", width: "100%", position: "relative" }}>
          
          <div id="ui-top" style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 1000, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(0,0,0,0.85)", boxSizing: "border-box" }}>
            <div style={{ color: "#00f2ff", fontSize: "14px", fontWeight: "900" }}>VISIONARY MAP</div>
            <div style={{ display: "flex", gap: "8px", direction: "rtl" }}>
              <label style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                رفع ملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
              </label>
              {Object.keys(districtsData).length > 0 && (
                <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>حفظ</button>
              )}
            </div>
          </div>

          <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", zIndex: 1 }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {Object.entries(districtsData).map(([name, data]) => (
              <React.Fragment key={name}>
                <CircleMarker center={[data.lat, data.lng]} radius={8} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                    <div style={{ color: "#FFFF00", fontSize: "13px", fontWeight: "900", textShadow: "1px 1px 0 #000" }}>{name}</div>
                  </Tooltip>
                </CircleMarker>
                <Circle center={[data.lat, data.lng]} radius={1500} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.15 }} />
              </React.Fragment>
            ))}
          </MapContainer>

          {/* زر التقرير - يظهر فقط إذا كان هناك بيانات */}
          {Object.keys(districtsData).length > 0 && (
            <div style={{ position: "absolute", bottom: "40px", width: "100%", display: "flex", justifyContent: "center", zIndex: 1000 }}>
              <button id="report-btn" onClick={() => setShowReport(true)} style={{ background: "#1e293b", color: "#00f2ff", border: "2px solid #00f2ff", padding: "16px 32px", borderRadius: "50px", fontWeight: "bold", fontSize: "16px", boxShadow: "0 0 20px #000" }}>
                📊 عرض الإحصائيات
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .tp{background:transparent!important;border:none!important;box-shadow:none!important;}
        .tp:before{border:none!important;}
        body, html { margin: 0; padding: 0; background: #000; overflow: hidden; height: 100%; width: 100%; }
      `}</style>
    </div>
  );
}
