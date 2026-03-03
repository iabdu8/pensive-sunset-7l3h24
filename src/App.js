import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import L from "leaflet";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// أيقونة الخريطة (تصميم عصري متوهج)
const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="background: #3b82f6; color: white; border: 2px solid #60a5fa; border-radius: 50%; width: 28px; height: 28px; display: flex; justify-content: center; align-items: center; font-weight: 900; font-size: 11px; box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);">${number}</div>`,
    className: "custom-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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

  // دالة لتحديد لون الدائرة بناءً على قوة المبيعات (هنا سر التلوين)
  const getCircleOptions = (revenue) => {
    const values = Object.values(districtSales);
    const max = values.length > 0 ? Math.max(...values) : 1;
    const ratio = revenue / max;

    if (ratio > 0.7) return { fillColor: "#ef4444", color: "#ef4444", fillOpacity: 0.5 }; // أحمر (قوي)
    if (ratio > 0.3) return { fillColor: "#f59e0b", color: "#f59e0b", fillOpacity: 0.4 }; // برتقالي (متوسط)
    return { fillColor: "#3b82f6", color: "#3b82f6", fillOpacity: 0.3 }; // أزرق (عادي)
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setPoints([]);
    
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

  const exportAsImage = async () => {
    if (!mapRef.current) return;
    const canvas = await html2canvas(mapRef.current, { useCORS: true, backgroundColor: "#020617" });
    const link = document.createElement("a");
    link.download = `خريطة_مبيعات_جدة.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ 
      height: "100vh", 
      width: "100vw", 
      position: "fixed", // لضمان ثبات الشاشة على الجوال
      top: 0, left: 0,
      background: "#020617", 
      overflow: "hidden", 
      direction: "rtl", 
      fontFamily: "sans-serif" 
    }}>
      
      {/* الأزرار العلوية */}
      <div style={{ position: "absolute", top: "15px", width: "100%", zIndex: 2000, display: "flex", gap: "10px", justifyContent: "center", padding: "0 10px" }}>
        <label style={{ background: "#2563eb", color: "white", padding: "10px 18px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", boxShadow: "0 4px 15px rgba(0,0,0,0.4)" }}>
          📂 رفع ملف Excel
          <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        
        {points.length > 0 && (
          <button onClick={exportAsImage} style={{ background: "#10b981", color: "white", padding: "10px 18px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
            📸 حفظ التقرير
          </button>
        )}
      </div>

      {/* لوحة الإحصائيات (تظهر فوق الخريطة في الأسفل) */}
      <div style={{ 
        position: "absolute", 
        bottom: "10px", 
        left: "10px", 
        right: "10px", 
        zIndex: 1500, 
        background: "rgba(15, 23, 42, 0.9)", 
        padding: "15px", 
        borderRadius: "15px", 
        maxHeight: "25vh", 
        overflowY: "auto",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ borderBottom: "1px solid #334155", paddingBottom: "5px", marginBottom: "5px", display: "flex", justifyContent: "space-between" }}>
          <span style={{color: "#94a3b8", fontSize: "12px"}}>إجمالي المبيعات</span>
          <span style={{color: "#10b981", fontWeight: "bold"}}>{totalSales.toLocaleString()} ر.س</span>
        </div>
        {Object.entries(districtSales).sort((a,b) => b[1]-a[1]).map(([name, val], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", margin: "4px 0" }}>
            <span style={{color: "#fff"}}>{name}</span>
            <span style={{color: "#3b82f6"}}>{val.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* الخريطة - تأخذ كامل مساحة الخلفية */}
      <div style={{ height: "100%", width: "100%" }} ref={mapRef}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          {/* تم اختيار طبقة CartoDB Dark لضمان جمال الألوان */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={[21.5433, 39.1728]} />
          
          {points.map((p) => (
            <React.Fragment key={p.id}>
              {/* الدوائر الملونة (Heatmap) */}
              <Circle 
                center={[p.lat, p.lng]} 
                radius={800} 
                pathOptions={getCircleOptions(districtSales[p.district])} 
              />
              <Marker position={[p.lat, p.lng]} icon={createNumberedIcon(p.id)}>
                <Tooltip sticky>
                  <div style={{ textAlign: "right", fontSize: "12px" }}>
                    <strong>{p.name}</strong><br/>
                    💰 {p.revenue.toLocaleString()} ر.س
                  </div>
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "75px", left: "50%", transform: "translateX(-50%)", zIndex: 3000, background: "#fbbf24", color: "#000", padding: "4px 12px", borderRadius: "15px", fontSize: "11px", fontWeight: "bold" }}>
          جاري المعالجة: {processedCount}
        </div>
      )}
    </div>
  );
}
