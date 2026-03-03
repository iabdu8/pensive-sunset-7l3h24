import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// أيقونة النقطة (تصميم نيون متوهج)
const customIcon = new L.DivIcon({
  html: `<div style="background: #00f2ff; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #00f2ff, 0 0 2px #fff; border: 2px solid #fff;"></div>`,
  className: 'custom-glow-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 11, { animate: true }); }, [center, map]);
  return null;
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [districtSales, setDistrictSales] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const fullScreenRef = useRef(null); // مرجع لتصوير الشاشة كاملة

  const getCircleStyle = (revenue) => {
    const vals = Object.values(districtSales);
    const max = vals.length > 0 ? Math.max(...vals) : 1;
    const ratio = revenue / max;
    if (ratio > 0.7) return { fill: "#ff0000", op: 0.5 }; 
    if (ratio > 0.3) return { fill: "#ffaa00", op: 0.4 }; 
    return { fill: "#00d4ff", op: 0.3 }; 
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0; let distMap = {}; let pnts = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ"));
        let dist = String(row[distKey] || "").trim();
        let rev = parseFloat(row[saleKey]) || 0;

        if (dist) {
          sum += rev;
          distMap[dist] = (distMap[dist] || 0) + rev;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dist + " Jeddah")}`);
            const json = await res.json();
            if (json[0]) {
              pnts.push({ id: i, lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon), district: dist, revenue: rev, client: row[keys[0]] || "عميل" });
              setPoints([...pnts]);
            }
            await new Promise(r => setTimeout(r, 450));
          } catch (err) {}
        }
      }
      setDistrictSales(distMap); setTotalSales(sum); setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // وظيفة التصوير المحسنة (تصور كل شيء يظهر للمستخدم)
  const captureFullReport = () => {
    if (!fullScreenRef.current) return;
    
    // إخفاء زر الرفع مؤقتاً لكي لا يظهر في الصورة النهائية
    const buttons = document.getElementById("action-buttons");
    if(buttons) buttons.style.display = "none";

    html2canvas(fullScreenRef.current, {
      useCORS: true,
      backgroundColor: "#000",
      scale: 2, // لزيادة جودة الصورة
      logging: false,
    }).then(canvas => {
      let a = document.createElement("a");
      a.download = `تقرير_مبيعات_جدة_${new Date().getTime()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      
      // إظهار الأزرار مرة أخرى بعد التصوير
      if(buttons) buttons.style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif" }}>
      
      {/* الأزرار العلوية */}
      <div id="action-buttons" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 9999, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 15px rgba(0,110,255,0.4)" }}>
          ارفع الملف
          <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {points.length > 0 && (
          <button onClick={captureFullReport} style={{ background: "#10b981", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer" }}>📸 حفظ التقرير</button>
        )}
      </div>

      {/* التقرير الجانبي (شفاف وأنيق) */}
      <div id="sales-report-overlay" style={{ 
        position: "absolute", bottom: "20px", right: "15px", zIndex: 9999, 
        background: "rgba(10, 15, 30, 0.85)", backdropFilter: "blur(8px)", 
        padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)",
        width: "210px", maxHeight: "45vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
      }}>
        <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "2px" }}>إجمالي المبيعات</div>
        <div style={{ color: "#10b981", fontWeight: "bold", fontSize: "20px", marginBottom: "8px", borderBottom: "1px solid #333" }}>{totalSales.toLocaleString()} <small style={{fontSize: "10px"}}>ر.س</small></div>
        
        {Object.entries(districtSales).sort((a,b)=>b[1]-a[1]).map(([n, v]) => (
          <div key={n} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#eee" }}>
            <span>{n}</span><span style={{color: "#3b82f6", fontWeight: "600"}}>{v.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* منطقة الخريطة */}
      <div style={{ height: "100%", width: "100%" }}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={[21.5433, 39.1728]} />
          {points.map((p) => (
            <React.Fragment key={p.id}>
              <Circle center={[p.lat, p.lng]} radius={1000} pathOptions={{ fillColor: getCircleStyle(p.revenue).fill, color: "transparent", fillOpacity: getCircleStyle(p.revenue).op }} />
              <Marker position={[p.lat, p.lng]} icon={customIcon}>
                <Popup>
                  <div style={{textAlign: "right", direction: "rtl", color: "#333"}}>
                    <strong>{p.client}</strong><br/>
                    حي {p.district}<br/>
                    المبلغ: {p.revenue.toLocaleString()} ر.س
                  </div>
                </Popup>
                {/* Tooltip يظهر دائماً فوق النقطة في الصورة المحفوظة */}
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                  <span style={{fontSize: "10px", fontWeight: "bold"}}>{p.district}</span>
                </Tooltip>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "75px", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#fbbf24", color: "#000", padding: "6px 18px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>جاري تحليل البيانات... {points.length}</div>
      )}
    </div>
  );
}
