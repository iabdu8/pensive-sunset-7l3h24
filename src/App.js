import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// حل مشكلة أيقونات Leaflet الافتراضية
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
      const JEDDAH_VIEWBOX = "39.09,21.15,39.35,21.90"; 

      for (let i = 0; i < data.length; i++) {
        const row = data[i]; const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ"));
        let dist = String(row[distKey] || "").trim();
        let rev = parseFloat(row[saleKey]) || 0;
        let clientName = String(row[keys[0]] || "عميل").trim();

        if (dist) {
          sum += rev;
          if (!tempDistricts[dist]) tempDistricts[dist] = { total: 0, transactions: [], lat: null, lng: null };
          tempDistricts[dist].total += rev;
          tempDistricts[dist].transactions.push({ name: clientName, amount: rev });
          if (!tempDistricts[dist].lat) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("حي " + dist + " جدة")}&viewbox=${JEDDAH_VIEWBOX}&bounded=1`);
              const json = await res.json();
              if (json && json[0]) {
                tempDistricts[dist].lat = parseFloat(json[0].lat);
                tempDistricts[dist].lng = parseFloat(json[0].lon);
              }
            } catch (err) {}
          }
          setDistrictsData({...tempDistricts});
          await new Promise(r => setTimeout(r, 500));
        }
      }
      setTotalSales(sum); setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl" }}>
      
      {/* اسم الموقع */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000, color: "#00f2ff", fontSize: "20px", fontWeight: "900", textShadow: "0 0 10px #000" }}>
        VISIONARY MAP
      </div>

      <div id="action-buttons" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer" }}>
          ارفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && (
          <button onClick={() => {
            const btns = document.getElementById("action-buttons");
            btns.style.display = "none";
            html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
              let a = document.createElement("a"); a.download = `VisionaryMap.png`; a.href = canvas.toDataURL(); a.click();
              btns.style.display = "flex";
            });
          }} style={{ background: "#10b981", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold" }}>📸 حفظ</button>
        )}
      </div>

      {/* التقرير */}
      <div style={{ position: "absolute", bottom: "25px", right: "15px", zIndex: 1000, width: showReport ? "240px" : "120px" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", width: "100%", borderRadius: "10px", padding: "8px", marginBottom: "5px", fontWeight: "bold" }}>
          {showReport ? "▼ إخفاء" : "▲ إظهار"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.9)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "45vh", overflowY: "auto", color: "white" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>TOTAL SALES</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).map(([distName, data]) => (
              <div key={distName} style={{ marginTop: "10px", borderTop: "1px solid #333" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold" }}>{distName} ({data.transactions.length})</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>{t.name}</span><span>{t.amount}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#000" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapController />
        {Object.entries(districtsData).map(([name, data], idx) => (
          data.lat && (
            <React.Fragment key={idx}>
              {/* النقطة الأساسية: دائرة فيروزية مضيئة */}
              <Circle 
                center={[data.lat, data.lng]} 
                radius={800} 
                pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 0.8 }} 
              />
              {/* التوهج الأحمر حولها */}
              <Circle 
                center={[data.lat, data.lng]} 
                radius={2000} 
                pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.2 }} 
              />
              {/* الاسم فوق النقطة مباشرة */}
              <Marker position={[data.lat, data.lng]} icon={L.divIcon({className: 'hidden'})}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="custom-label">
                  <div style={{
                    color: "#FFFF00", 
                    fontSize: "14px", 
                    fontWeight: "900", 
                    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
                    whiteSpace: "nowrap"
                  }}>
                    {name} ({data.transactions.length})
                  </div>
                </Tooltip>
              </Marker>
            </React.Fragment>
          )
        ))}
      </MapContainer>

      <style>{`
        .custom-label { background: transparent !important; border: none !important; box-shadow: none !important; }
        .custom-label:before { border: none !important; }
        .hidden { display: none; }
      `}</style>
    </div>
  );
}
