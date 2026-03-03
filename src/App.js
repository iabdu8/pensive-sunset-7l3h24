import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- ميزة الـ CDN: تحميل المكتبات بدون Terminal ---
const loadScript = (url) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};

export default function App() {
  const [points, setPoints] = useState([]);
  const [districtSales, setDistrictSales] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  // تحميل المكتبات برمجياً عند فتح الموقع
  useEffect(() => {
    const init = async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    };
    init();
  }, []);

  const getStyle = (revenue) => {
    const max = Math.max(...Object.values(districtSales), 1);
    const ratio = revenue / max;
    if (ratio > 0.7) return { f: "#ff4d4d", o: 0.6 }; // أحمر (مبيعات عالية)
    if (ratio > 0.3) return { f: "#fbbf24", o: 0.5 }; // ذهبي (متوسط)
    return { f: "#3b82f6", o: 0.4 }; // أزرق (عادي)
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !window.XLSX) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = window.XLSX.read(evt.target.result, { type: "binary" });
      const data = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let salesSum = 0; let salesPerDist = {}; let tempPoints = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const keys = Object.keys(row);
        const distKey = keys.find(k => k.includes("حي") || k.includes("District"));
        const saleKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ"));
        let dist = String(row[distKey] || "").trim();
        let rev = parseFloat(row[saleKey]) || 0;

        if (dist) {
          salesSum += rev;
          salesPerDist[dist] = (salesPerDist[dist] || 0) + rev;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dist + " Jeddah")}`);
            const json = await res.json();
            if (json[0]) {
              tempPoints.push({ id: i, lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon), district: dist, revenue: rev });
              setPoints([...tempPoints]);
            }
            await new Promise(r => setTimeout(r, 400));
          } catch (err) {}
        }
      }
      setDistrictSales(salesPerDist); setTotalSales(salesSum); setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    if (!window.html2canvas) return;
    window.html2canvas(mapRef.current, { useCORS: true }).then(canvas => {
      const link = document.createElement("a");
      link.download = "جدة-مبيعات.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#020617", color: "white", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* الأزرار العلوية - تصميم يناسب الجوال */}
      <div style={{ position: "absolute", top: "15px", zIndex: 1000, width: "100%", display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", padding: "12px 20px", borderRadius: "15px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }}>
          📂 ارفع إكسل
          <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {points.length > 0 && (
          <button onClick={capture} style={{ background: "#10b981", border: "none", color: "white", padding: "12px 20px", borderRadius: "15px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>📸 حفظ صورة</button>
        )}
      </div>

      {/* لوحة المعلومات السفلية */}
      <div style={{ position: "absolute", bottom: "15px", left: "15px", right: "15px", zIndex: 1000, background: "rgba(15, 23, 42, 0.9)", padding: "15px", borderRadius: "20px", maxHeight: "30vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ color: "#10b981", fontWeight: "bold", borderBottom: "1px solid #333", paddingBottom: "8px", marginBottom: "8px" }}>المجموع: {totalSales.toLocaleString()} ر.س</div>
        {Object.entries(districtSales).sort((a,b)=>b[1]-a[1]).map(([n, v]) => (
          <div key={n} style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>{n}</span><span style={{color: "#3b82f6"}}>{v.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* الخريطة - شاشة كاملة */}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {points.map((p) => (
            <React.Fragment key={p.id}>
              <Circle center={[p.lat, p.lng]} radius={900} pathOptions={{ fillColor: getStyle(p.revenue).f, color: "transparent", fillOpacity: getStyle(p.revenue).o }} />
              <Marker position={[p.lat, p.lng]} icon={new L.DivIcon({ html: `<div style="background:#00f2ff;width:10px;height:10px;border-radius:50%;box-shadow:0 0 10px #00f2ff;border:1px solid #fff;"></div>`, className: '', iconSize: [10, 10] })} />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {loading && (
        <div style={{ position: "absolute", top: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 2000, background: "#fbbf24", color: "#000", padding: "5px 15px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>جاري معالجة البيانات...</div>
      )}
    </div>
  );
}
