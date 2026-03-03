import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

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
        
        let distName = String(row[distKey] || "").trim();
        let amount = parseFloat(row[saleKey]) || 0;
        let client = String(row[keys[0]] || "عميل").trim();

        if (distName) {
          sum += amount;
          if (!tempDistricts[distName]) {
            tempDistricts[distName] = { total: 0, transactions: [], lat: null, lng: null };
          }
          tempDistricts[distName].total += amount;
          tempDistricts[distName].transactions.push({ name: client, amount });

          if (!tempDistricts[distName].lat) {
            try {
              await new Promise(r => setTimeout(r, 600)); 
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("حي " + distName + " جدة")}&viewbox=${JEDDAH_VIEWBOX}&bounded=1`);
              const json = await res.json();
              if (json && json[0]) {
                tempDistricts[distName].lat = parseFloat(json[0].lat);
                tempDistricts[distName].lng = parseFloat(json[0].lon);
              }
            } catch (err) {}
          }
          setDistrictsData({ ...tempDistricts });
        }
      }
      setTotalSales(sum);
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const captureReport = () => {
    const actionButtons = document.getElementById("action-buttons");
    actionButtons.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000", scale: 2 }).then(canvas => {
      const link = document.createElement("a");
      link.download = "Visionary_Map_Report.png";
      link.href = canvas.toDataURL();
      link.click();
      actionButtons.style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif" }}>
      
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 9999, color: "#00f2ff", fontSize: "20px", fontWeight: "900", fontStyle: "italic", textShadow: "0 0 10px #000" }}>
        VISIONARY MAP
      </div>

      <div id="action-buttons" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 9999, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
          ارفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && (
          <button onClick={captureReport} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>📸 حفظ التقرير</button>
        )}
      </div>

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 9999, width: showReport ? "250px" : "120px", transition: "0.3s" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "8px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", marginBottom: "5px" }}>
          {showReport ? "▼ إخفاء" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "50vh", overflowY: "auto", color: "white" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>إجمالي المبيعات</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).map(([name, data]) => (
              <div key={name} style={{ marginTop: "10px", borderTop: "1px solid #333", paddingTop: "5px" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "13px" }}>حي {name}</div>
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
          data.lat && (
            <React.Fragment key={name}>
              {/* النقطة الفيروزية المضيئة كعنصر مرسوم برمجياً */}
              <CircleMarker 
                center={[data.lat, data.lng]} 
                radius={8} 
                pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }} 
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="custom-tooltip">
                  <div style={{ color: "#FFFF00", fontSize: "14px", fontWeight: "900", textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000" }}>
                    {name} ({data.transactions.length})
                  </div>
                </Tooltip>
              </CircleMarker>

              {/* دائرة التأثير الحمراء */}
              <Circle 
                center={[data.lat, data.lng]} 
                radius={1300} 
                pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.3 }} 
              />
            </React.Fragment>
          )
        ))}
      </MapContainer>

      <style>{`
        .custom-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
        .custom-tooltip:before { border: none !important; }
      `}</style>

      {loading && (
        <div style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#fbbf24", color: "#000", padding: "10px 30px", borderRadius: "30px", fontWeight: "bold" }}>
          جاري رسم البيانات...
        </div>
      )}
    </div>
  );
}
