import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// --- قاعدة بيانات الإحداثيات الدقيقة (تعديل يدوي لضمان عدم اللخبطة) ---
const JEDDAH_COORDS = {
  "الشاطئ": [21.6033, 39.1066], 
  "السليمانية": [21.4955, 39.2455],
  "المرجان": [21.6668, 39.1086], 
  "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444], 
  "النعيم": [21.6212, 39.1554],
  "النهضة": [21.6111, 39.1289], 
  "الزهراء": [21.5877, 39.1311],
  "السلامة": [21.5899, 39.1524], 
  "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364], 
  "أبحر الشمالية": [21.7516, 39.1301],
  "أبحر الجنوبية": [21.7115, 39.1190], 
  "الحمدانية": [21.7656, 39.1977],
  "الصفا": [21.5833, 39.2023], 
  "المروة": [21.6166, 39.2055],
  "الفيصلية": [21.5644, 39.1766], 
  "السامر": [21.5950, 39.2300],
  "التيسير": [21.5600, 39.2500], 
  "البلد": [21.4847, 39.1867]
};

const robustClean = (str) => {
  if (!str) return "";
  let s = str.toString().trim();
  if (s.includes("شاط") || s.includes("اطي")) return "الشاطئ";
  if (s.includes("سليماني")) return "السليمانية";
  return s.replace(/حي\s+/g, "").replace(/^ال/g, "").replace(/[أإآ]/g, "ا").replace(/[ىئئي]$/g, "ي").replace(/ة$/g, "ه").replace(/\s+/g, "");
};

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [showReport, setShowReport] = useState(true);
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
    document.getElementById("ui-controls").style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a"); a.download = "Visionary_Report.png"; a.href = canvas.toDataURL(); a.click();
      document.getElementById("ui-controls").style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", direction: "rtl", fontFamily: "sans-serif" }}>
      
      {/* اسم الموقع ثابت */}
      <div style={{ position: "absolute", top: "25px", left: "25px", zIndex: 1000, color: "#00f2ff", fontSize: "22px", fontWeight: "900" }}>
        VISIONARY MAP
      </div>

      <div id="ui-controls" style={{ position: "absolute", top: "20px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 25px", borderRadius: "30px", cursor: "pointer", fontWeight: "bold" }}>
          ارفع الإكسل <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: "bold" }}>📸 حفظ</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 1000, width: "280px" }}>
        {Object.keys(districtsData).length > 0 && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "20px", border: "1px solid #333", color: "white", maxHeight: "60vh", overflowY: "auto" }}>
            <div style={{ color: "#10b981", fontSize: "22px", fontWeight: "bold", marginBottom: "12px", borderBottom: "1px solid #10b981" }}>
               إجمالي جدة: {totalSales.toLocaleString()} SAR
            </div>
            {Object.entries(districtsData).sort((a,b)=>b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ marginBottom: "15px", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "10px" }}>
                <div style={{ color: "#00f2ff", fontSize: "14px", fontWeight: "bold" }}>حي {name} ({data.clients.length})</div>
                {data.clients.map((c, i) => (
                  <div key={i} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", color: "#ccc" }}>
                    <span>- {c.name}</span><span>{c.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ fontSize: "11px", color: "#10b981", textAlign: "left", fontWeight: "bold", marginTop: "4px" }}>
                  المجموع: {data.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#050505" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={10} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "16px", fontWeight: "900", textShadow: "3px 3px 0 #000" }}>
                  {name} {data.clients.length > 1 ? `- ${data.clients.length}` : ""}
                </div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1600} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.25 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
