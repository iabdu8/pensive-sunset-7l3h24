import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// أيقونة الخريطة المرقمة
const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; color: white; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 10px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">${number}</div>`,
    className: "custom-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// وظيفة لتحديث موقع الخريطة برمجياً
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 11, { animate: true });
  }, [center, map]);
  return null;
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [districtSales, setDistrictSales] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // مراقبة حجم الشاشة للتكيف مع الجوال
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setPoints([]);
    setDistrictSales({});
    setProcessedCount(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        let salesSum = 0;
        let salesPerDistrict = {};
        let tempPoints = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const keys = Object.keys(row);
          const districtKey = keys.find(k => k.includes("حي") || k.includes("District") || k.includes("المنطقة"));
          const salesKey = keys.find(k => k.includes("مبيع") || k.includes("مبلغ") || k.includes("قيمة"));

          let rawDistrict = String(row[districtKey] || "").trim();
          let revenue = parseFloat(row[salesKey]) || 0;

          if (rawDistrict) {
            salesSum += revenue;
            salesPerDistrict[rawDistrict] = (salesPerDistrict[rawDistrict] || 0) + revenue;

            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rawDistrict + " Jeddah")}`);
              const result = await response.json();

              if (result && result.length > 0) {
                tempPoints.push({
                  id: tempPoints.length + 1,
                  lat: parseFloat(result[0].lat) + (Math.random() - 0.5) * 0.004,
                  lng: parseFloat(result[0].lon) + (Math.random() - 0.5) * 0.004,
                  district: rawDistrict,
                  revenue: revenue,
                  name: row[keys[0]] || "عميل"
                });
                setPoints([...tempPoints]);
              }
              setProcessedCount(i + 1);
              await new Promise(r => setTimeout(r, 400)); // تأخير بسيط لتجنب حظر البحث
            } catch (err) { console.error(err); }
          }
        }
        setDistrictSales(salesPerDistrict);
        setTotalSales(salesSum);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: "#020617",
      color: "white",
      direction: "rtl",
      fontFamily: "sans-serif",
      overflow: "hidden"
    }}>
      
      {/* Sidebar - القائمة الجانبية أو السفلية */}
      <div style={{
        width: isMobile ? "100%" : "360px",
        height: isMobile ? "40%" : "100vh",
        background: "#0f172a",
        padding: "20px",
        borderLeft: isMobile ? "none" : "2px solid #1e293b",
        borderTop: isMobile ? "2px solid #1e293b" : "none",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 20px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "20px" }}>🎯</span>
          <h1 style={{ color: "#3b82f6", fontSize: "18px", margin: 0, fontWeight: "900" }}>VISIONARY MAP</h1>
        </div>

        <div style={{ background: "#1e293b", padding: "12px", borderRadius: "12px", marginBottom: "15px", border: "1px solid #10b981" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>💰 إجمالي المبيعات</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} <span style={{fontSize: "10px"}}>ر.س</span></div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingLeft: "5px" }}>
          <h4 style={{ fontSize: "13px", color: "#3b82f6", marginBottom: "10px", borderBottom: "1px solid #1e293b", paddingBottom: "5px" }}>📊 مبيعات الأحياء</h4>
          {Object.entries(districtSales).sort((a,b) => b[1]-a[1]).map(([name, value], idx) => (
            <div key={idx} style={{ padding: "10px", background: "#1e293b66", borderRadius: "8px", marginBottom: "6px", border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>{name}</span>
              <span style={{ color: "#10b981", fontWeight: "bold" }}>{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Map Area - منطقة الخريطة */}
      <div style={{ flex: 1, position: "relative", height: isMobile ? "60%" : "100%" }}>
        <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 1100, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ 
            background: "#3b82f6", 
            color: "white", 
            padding: "12px 20px", 
            borderRadius: "10px", 
            cursor: "pointer", 
            fontWeight: "bold", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            boxShadow: "0 5px 15px rgba(0,0,0,0.4)", 
            fontSize: isMobile ? "13px" : "15px",
            transition: "transform 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>📂</span> ارفع الملف 
            <input type="file" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: "#0f172a", border: "1px solid #fbbf24", color: "#fbbf24", padding: "8px", borderRadius: "8px", fontSize: "11px", textAlign: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                ⏳ معالجة العميل رقم: {processedCount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <MapController center={[21.5433, 39.1728]} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createNumberedIcon(p.id)}>
              <Tooltip sticky>
                <div style={{ textAlign: "right", fontSize: "12px", padding: "5px" }}>
                  <strong style={{ color: "#3b82f6" }}>{p.name}</strong><br/>
                  📍 حي: {p.district}<br/>
                  💰 المبيع: {p.revenue.toLocaleString()} ر.س
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
