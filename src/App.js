import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// قائمة إحداثيات احتياطية لأهم أحياء جدة لضمان ظهور النقاط فوراً
const JEDDAH_COORDS = {
  "الصفا": [21.5833, 39.2000], "التحلية": [21.5433, 39.1728], "المرجان": [21.6500, 39.1100],
  "أبحر": [21.7200, 39.1300], "النسيم": [21.5000, 39.2200], "البغدادية": [21.4900, 39.1800],
  "الروضة": [21.5600, 39.1500], "السلامة": [21.5900, 39.1500], "النعيم": [21.6100, 39.1500]
};

function MapController() {
  const map = useMap();
  useEffect(() => { map.setView([21.5433, 39.1728], 11); }, [map]);
  return null;
}

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(true);
  const fullScreenRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0; let tempDistricts = {};

      for (let row of data) {
        const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ"));
        let distName = String(row[distKey] || "").trim();
        let amount = parseFloat(row[saleKey]) || 0;
        let client = String(row[keys[0]] || "عميل").trim();

        if (distName) {
          sum += amount;
          if (!tempDistricts[distName]) {
            // استخدام الإحداثيات الاحتياطية إذا وجدنا الحي، أو البحث عنه
            const backup = JEDDAH_COORDS[distName] || [21.5 + (Math.random() * 0.1), 39.1 + (Math.random() * 0.1)];
            tempDistricts[distName] = { total: 0, transactions: [], lat: backup[0], lng: backup[1] };
          }
          tempDistricts[distName].total += amount;
          tempDistricts[distName].transactions.push({ name: client, amount });
        }
      }
      setDistrictsData(tempDistricts); setTotalSales(sum); setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a"); a.download = "Visionary_Report.png"; a.href = canvas.toDataURL(); a.click();
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", direction: "rtl", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 9999, color: "#00f2ff", fontSize: "22px", fontWeight: "900" }}>VISIONARY MAP</div>
      
      <div id="btns" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 9999, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", cursor: "pointer" }}>
          ارفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", cursor: "pointer" }}>📸 حفظ</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 9999, width: showReport ? "240px" : "120px" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "8px", borderRadius: "10px", marginBottom: "5px" }}>
          {showReport ? "▼ إخفاء" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "40vh", overflowY: "auto", color: "white" }}>
            <div style={{ color: "#10b981", fontSize: "20px", fontWeight: "bold" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).map(([name, data]) => (
              <div key={name} style={{ marginTop: "10px", borderTop: "1px solid #333" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold" }}>حي {name}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>{t.name}</span><span>{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#050505" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapController />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={8} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "14px", fontWeight: "900", textShadow: "2px 2px 0 #000" }}>{name}</div>
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
