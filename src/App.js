import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// الإحداثيات الدقيقة لجدة
const JEDDAH_COORDS = {
  "الشاطئ": [21.6033, 39.1066], 
  "السليمانية": [21.4955, 39.2455],
  "المرجان": [21.6668, 39.1086], "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444], "النعيم": [21.6212, 39.1554],
  "النهضة": [21.6111, 39.1289], "الزهراء": [21.5877, 39.1311],
  "السلامة": [21.5899, 39.1524], "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364], "أبحر الشمالية": [21.7516, 39.1301],
  "أبحر الجنوبية": [21.7115, 39.1190], "الحمدانية": [21.7656, 39.1977],
  "الصفا": [21.5833, 39.2023], "المروة": [21.6166, 39.2055],
  "الفيصلية": [21.5644, 39.1766], "السامر": [21.5950, 39.2300],
  "التيسير": [21.5600, 39.2500], "البلد": [21.4847, 39.1867]
};

const robustClean = (str) => {
  if (!str) return "";
  let s = str.toString().trim();
  // معالجة "الشاطئ" و "السليمانية" لضمان عدم اللخبطة
  if (s.includes("شاط") || s.includes("اطي")) return "الشاطئ";
  if (s.includes("سليماني")) return "السليمانية";
  return s.replace(/حي\s+/g, "").replace(/^ال/g, "").replace(/[أإآ]/g, "ا").replace(/[ىئئي]$/g, "ي").replace(/ة$/g, "ه").replace(/\s+/g, "");
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
    const ui = document.getElementById("main-ui-layer");
    ui.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true }).then(canvas => {
      const a = document.createElement("a");
      a.download = "Visionary_Map.png"; a.href = canvas.toDataURL(); a.click();
      ui.style.display = "block";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* طبقة التحكم - اسم الموقع يمين والأزرار يسار */}
      <div id="main-ui-layer" style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 100000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px", background: "rgba(0,0,0,0.7)" }}>
          {/* اليمين: اسم الموقع */}
          <div style={{ color: "#00f2ff", fontSize: "18px", fontWeight: "900" }}>VISIONARY MAP</div>
          
          {/* اليسار: الرفع والحفظ */}
          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
               رفع <input type="file" onChange={handleUpload} style={{ display: "none" }} />
            </label>
            {Object.keys(districtsData).length > 0 && (
              <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>حفظ</button>
            )}
          </div>
        </div>
      </div>

      {/* التقرير أسفل الشاشة - z-index عالي جداً للجوال */}
      {Object.keys(districtsData).length > 0 && (
        <div style={{ position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 100001, width: "90%", maxWidth: "340px" }}>
          <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "2px solid #00f2ff", padding: "12px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold", boxShadow: "0 0 20px #000" }}>
            {showReport ? "▼ إغلاق التقرير" : "▲ عرض تفاصيل الأحياء والعملاء"}
          </button>
          
          {showReport && (
            <div style={{ background: "rgba(10, 15, 30, 0.98)", padding: "15px", borderRadius: "12px", marginTop: "10px", maxHeight: "50vh", overflowY: "auto", border: "1px solid #333", color: "white" }}>
              <div style={{ color: "#10b981", fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #444", paddingBottom: "8px", marginBottom: "10px" }}>الإجمالي: {totalSales.toLocaleString()} SAR</div>
              {Object.entries(districtsData).sort((a,b)=>b[1].total - a[1].total).map(([name, data]) => (
                <div key={name} style={{ marginBottom: "12px", borderBottom: "1px solid #222", paddingBottom: "5px" }}>
                  <div style={{ color: "#00f2ff", fontSize: "14px", fontWeight: "bold" }}>حي {name} ({data.clients.length})</div>
                  {data.clients.map((c, i) => (
                    <div key={i} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", opacity: 0.8 }}>
                      <span>- {c.name}</span><span>{c.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={8} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "14px", fontWeight: "900", textShadow: "2px 2px 0 #000" }}>
                  {name} {data.clients.length > 1 ? `- ${data.clients.length}` : ""}
                </div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1500} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.2 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
