import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import L from "leaflet";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// أيقونة الخريطة (تصميم عصري متوهج)
const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="background: #3b82f6; color: white; border: 2px solid #60a5fa; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 12px; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);">${number}</div>`,
    className: "custom-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 12, { animate: true });
  }, [center, map]);
  return null;
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [districtSales, setDistrictSales] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const mapRef = useRef(null);

  // حساب لون التوهج بناءً على المبيعات
  const getHeatColor = (revenue) => {
    const max = Math.max(...Object.values(districtSales), 1);
    const ratio = revenue / max;
    if (ratio > 0.8) return "#ff4d4d"; // أحمر ناري للأقوى
    if (ratio > 0.4) return "#fbbf24"; // ذهبي للمتوسط
    return "#3b82f6"; // أزرق هادئ
  };

  const exportAsImage = async () => {
    if (!mapRef.current) return;
    const canvas = await html2canvas(mapRef.current, { useCORS: true, backgroundColor: "#020617" });
    const link = document.createElement("a");
    link.download = `تقرير_مبيعات_جدة.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let salesSum = 0;
      let salesPerDist = {};
      let tempPoints = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ") || k.includes("قيمة"));
        let dist = String(row[distKey] || "").trim();
        let rev = parseFloat(row[saleKey]) || 0;

        if (dist) {
          salesSum += rev;
          salesPerDist[dist] = (salesPerDist[dist] || 0) + rev;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dist + " Jeddah")}`);
            const json = await res.json();
            if (json[0]) {
              tempPoints.push({
                id: tempPoints.length + 1,
                lat: parseFloat(json[0].lat) + (Math.random() - 0.5) * 0.006,
                lng: parseFloat(json[0].lon) + (Math.random() - 0.5) * 0.006,
                district: dist,
                revenue: rev,
                name: row[keys[0]] || "عميل"
              });
              setPoints([...tempPoints]);
            }
            setProcessedCount(i + 1);
            await new Promise(r => setTimeout(r, 400));
          } catch (err) { console.error(err); }
        }
      }
      setDistrictSales(salesPerDist);
      setTotalSales(salesSum);
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ height: "100dvh", width: "100vw", position: "relative", background: "#020617", overflow: "hidden", direction: "rtl", fontFamily: "sans-serif" }}>
      
      {/* 🟢 Header: أزرار الرفع والتصدير (دائماً فوق) */}
      <div style={{ position: "absolute", top: "15px", left: "15px", right: "15px", zIndex: 2000, display: "flex", gap: "10px", justifyContent: "center" }}>
        <label style={{ background: "#2563eb", color: "white", padding: "12px 20px", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", boxShadow: "0 8px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📂</span> رفع Excel
          <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        
        {points.length > 0 && (
          <button onClick={exportAsImage} style={{ background: "#10b981", color: "white", padding: "12px 20px", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
            📸 حفظ الصورة
          </button>
        )}
      </div>

      {/* 📊 Floating Stats: لوحة إحصائيات شفافة فخمة */}
      <div style={{ 
        position: "absolute", 
        bottom: "20px", 
        right: "15px", 
        left: "15px", 
        zIndex: 1500, 
        background: "rgba(15, 23, 42, 0.85)", 
        backdropFilter: "blur(10px)", 
        padding: "15px", 
        borderRadius: "20px", 
        border: "1px solid rgba(255,255,255,0.1)",
        maxHeight: "30vh",
        overflowY: "auto",
        boxShadow: "0 -10px 25px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>إجمالي المبيعات:</span>
          <span style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} <small style={{fontSize: "10px"}}>ر.س</small></span>
        </div>
        
        {Object.entries(districtSales).sort((a,b) => b[1]-a[1]).map(([name, val], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0" }}>
            <span style={{ color: "#f8fafc" }}>{i+1}. {name}</span>
            <span style={{ color: "#60a5fa", fontWeight: "600" }}>{val.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* 🗺️ Map Container: شاشة كاملة */}
      <div style={{ height: "100%", width: "100%" }} ref={mapRef}>
        <MapContainer center={[21.5433, 39.1728]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={[21.5433, 39.1728]} />
          
          {points.map((p) => (
            <React.Fragment key={p.id}>
              <Circle 
                center={[p.lat, p.lng]} 
                radius={900} 
                pathOptions={{ fillColor: getHeatColor(districtSales[p.district]), color: "transparent", fillOpacity: 0.4 }} 
              />
              <Marker position={[p.lat, p.lng]} icon={createNumberedIcon(p.id)}>
                <Tooltip sticky>
                  <div style={{ textAlign: "right", color: "#1e293b", fontSize: "12px" }}>
                    <strong>{p.name}</strong><br/>
                    📍 حي {p.district}<br/>
                    💰 المبيعات: {p.revenue.toLocaleString()} ر.س
                  </div>
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 3000, background: "#fbbf24", color: "#000", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", boxShadow: "0 4px 15px rgba(251, 191, 36, 0.4)" }}>
          جاري المعالجة: {processedCount}
        </div>
      )}
    </div>
  );
}
