import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// أيقونة الماركر (النقطة) مع عداد العملاء
const createCountIcon = (count) => {
  return L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="background: #00f2ff; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 15px #00f2ff, 0 0 5px #fff; border: 2px solid #fff;"></div>
        <div style="position: absolute; top: -20px; background: #ff4d4d; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 8px; border: 1px solid white; white-space: nowrap;">${count}</div>
      </div>`,
    className: 'custom-div-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.setView([21.5433, 39.1728], 11);
  }, [map]);
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
      let sum = 0; 
      let tempDistricts = {};
      const JEDDAH_VIEWBOX = "39.09,21.15,39.35,21.90"; 

      for (let i = 0; i < data.length; i++) {
        const row = data[i]; 
        const keys = Object.keys(row);
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
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif" }}>
      
      {/* Visionary Map Header */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000, color: "#00f2ff", fontSize: "20px", fontWeight: "900", textShadow: "0 0 15px rgba(0,242,255,0.8)", fontStyle: "italic" }}>
        VISIONARY MAP
      </div>

      <div id="action-buttons" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
          ارفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && (
          <button onClick={() => {
            const btns = document.getElementById("action-buttons");
            btns.style.display = "none";
            html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000", scale: 2 }).then(canvas => {
              let a = document.createElement("a"); a.download = `Report.png`; a.href = canvas.toDataURL(); a.click();
              btns.style.display = "flex";
            });
          }} style={{ background: "#10b981", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>📸 حفظ</button>
        )}
      </div>

      {/* التقرير القابل للإخفاء */}
      <div style={{ position: "absolute", bottom: "25px", right: "15px", zIndex: 1000, width: showReport ? "240px" : "120px", transition: "all 0.3s ease" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", width: "100%", borderRadius: "10px", padding: "8px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
          {showReport ? "▼ إخفاء التقرير" : "▲ إظهار التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.9)", backdropFilter: "blur(10px)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "50vh", overflowY: "auto" }}>
            <div style={{ color: "#94a3b8", fontSize: "10px" }}>TOTAL SALES</div>
            <div style={{ color: "#10b981", fontWeight: "bold", fontSize: "20px", borderBottom: "1px solid #334155", paddingBottom: "5px" }}>{totalSales.toLocaleString()} <small style={{fontSize: "10px"}}>SAR</small></div>
            {Object.entries(districtsData).sort((a,b)=>b[1].total-a[1].total).map(([distName, data]) => (
              <div key={distName} style={{ marginTop: "10px" }}>
                <div style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "bold" }}>حي {distName}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", color: "#eee", display: "flex", justifyContent: "space-between" }}>
                    <span>• {t.name}</span><span style={{color: "#10b981"}}>{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#000" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController />
          {Object.entries(districtsData).map(([name, data], idx) => (
            data.lat && (
              <React.Fragment key={idx}>
                {/* الدائرة الحمراء */}
                <Circle center={[data.lat, data.lng]} radius={1200} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.35 }} />
                
                {/* النقطة والاسم */}
                <Marker position={[data.lat, data.lng]} icon={createCountIcon(data.transactions.length)}>
                  <Tooltip direction="bottom" offset={[0, 10]} opacity={1} permanent className="custom-tooltip">
                    <div style={{
                      color: "#FFFF00", // أصفر فاقع
                      fontSize: "13px",
                      fontWeight: "bold",
                      textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 5px #000",
                      textAlign: "center",
                      whiteSpace: "nowrap"
                    }}>
                      {name}
                    </div>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            )
          ))}
        </MapContainer>
      </div>

      <style>{`
        .leaflet-tooltip.custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .leaflet-tooltip-bottom:before { border-bottom-color: transparent !important; }
      `}</style>

      {loading && (
        <div style={{ position: "absolute", top: "75px", left: "50%", transform: "translateX(-50%)", zIndex: 2000, background: "#fbbf24", color: "#000", padding: "8px 20px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>جاري تحميل المواقع...</div>
      )}
    </div>
  );
}
