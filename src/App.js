import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// أيقونة تظهر عدد العمليات في الحي
const createCountIcon = (count) => {
  return L.divIcon({
    html: `
      <div style="position: relative;">
        <div style="background: #00f2ff; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 15px #00f2ff; border: 2px solid #fff;"></div>
        <div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); background: #ff4d4d; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; border: 1px solid white; white-space: nowrap;">
          ${count} عملاء
        </div>
      </div>`,
    className: 'custom-count-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

// متحكم لضبط حدود الخريطة على جدة دائماً
function MapController() {
  const map = useMap();
  const JEDDAH_BOUNDS = [[21.2, 39.0], [21.9, 39.4]]; // حدود تقريبية لجدة
  useEffect(() => {
    map.fitBounds(JEDDAH_BOUNDS);
  }, [map]);
  return null;
}

export default function App() {
  const [districtsData, setDistrictsData] = useState({}); 
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
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

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ"));
        const nameKey = keys[0];
        
        let dist = String(row[distKey] || "").trim();
        let rev = parseFloat(row[saleKey]) || 0;
        let clientName = String(row[nameKey] || "عميل").trim();

        if (dist) {
          sum += rev;
          if (!tempDistricts[dist]) {
            tempDistricts[dist] = { total: 0, transactions: [], lat: null, lng: null };
          }
          tempDistricts[dist].total += rev;
          // إضافة كل عملية بشكل مستقل تماماً كما طلبت
          tempDistricts[dist].transactions.push({ name: clientName, amount: rev });

          if (!tempDistricts[dist].lat) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dist + " Jeddah")}`);
              const json = await res.json();
              if (json[0]) {
                tempDistricts[dist].lat = parseFloat(json[0].lat);
                tempDistricts[dist].lng = parseFloat(json[0].lon);
              }
            } catch (err) {}
          }
          setDistrictsData({...tempDistricts});
          await new Promise(r => setTimeout(r, 350));
        }
      }
      setTotalSales(sum); setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const captureFullReport = () => {
    const buttons = document.getElementById("action-buttons");
    if(buttons) buttons.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000", scale: 2 }).then(canvas => {
      let a = document.createElement("a");
      a.download = `تقرير_مبيعات_جدة.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      if(buttons) buttons.style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif" }}>
      
      <div id="action-buttons" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 9999, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
          ارفع الملف
          <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && (
          <button onClick={captureFullReport} style={{ background: "#10b981", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer" }}>📸 حفظ التقرير</button>
        )}
      </div>

      <div id="sales-report-overlay" style={{ 
        position: "absolute", bottom: "20px", right: "15px", zIndex: 9999, 
        background: "rgba(10, 15, 30, 0.9)", backdropFilter: "blur(10px)", 
        padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)",
        width: "250px", maxHeight: "55vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.8)"
      }}>
        <div style={{ color: "#94a3b8", fontSize: "11px" }}>إجمالي مبيعات جدة</div>
        <div style={{ color: "#10b981", fontWeight: "bold", fontSize: "22px", marginBottom: "10px", borderBottom: "1px solid #333" }}>{totalSales.toLocaleString()} <small style={{fontSize: "10px"}}>ر.س</small></div>
        
        {Object.entries(districtsData).sort((a,b)=>b[1].total-a[1].total).map(([distName, data]) => (
          <div key={distName} style={{ marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: "14px", color: "#3b82f6", fontWeight: "bold" }}>حي {distName}</div>
            {data.transactions.map((t, idx) => (
              <div key={idx} style={{ fontSize: "11px", color: "#eee", display: "flex", justifyContent: "space-between", padding: "2px 5px" }}>
                <span>{t.name}</span>
                <span style={{color: "#10b981"}}>{t.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          {/* طبقة الخريطة مع إظهار أسماء الأحياء بوضوح */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" opacity={0.6} />
          
          <MapController />
          
          {Object.entries(districtsData).map(([name, data], idx) => (
            data.lat && (
              <React.Fragment key={idx}>
                <Circle 
                   center={[data.lat, data.lng]} 
                   radius={1300} 
                   pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.35 }} 
                />
                <Marker position={[data.lat, data.lng]} icon={createCountIcon(data.transactions.length)}>
                  <Popup>
                    <div style={{textAlign: "right", direction: "rtl"}}>
                      <strong>حي {name}</strong><br/>
                      عدد العمليات: {data.transactions.length}
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                    <span style={{fontSize: "10px", fontWeight: "bold", color: "#fff", textShadow: "0 0 3px #000"}}>{name}</span>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            )
          ))}
        </MapContainer>
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "75px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#fbbf24", color: "#000", padding: "8px 20px", borderRadius: "20px", fontWeight: "bold" }}>جاري تحديد الأحياء...</div>
      )}
    </div>
  );
}
