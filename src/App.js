import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// أيقونة مرقمة زرقاء احترافية
const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; color: white; border: 2px solid white; border-radius: 50%; width: 26px; height: 26px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 11px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">${number}</div>`,
    className: "custom-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

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
              await new Promise(r => setTimeout(r, 300));
            } catch (err) {
              console.error("Error fetching row:", i);
            }
          }
        }
        setDistrictSales(salesPerDistrict);
        setTotalSales(salesSum);
      } catch (error) {
        console.error("Error reading file:", error);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#020617", color: "white", direction: "rtl", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      {/* Sidebar */}
      <motion.div initial={{ x: 350 }} animate={{ x: 0 }} style={{ width: "360px", background: "#0f172a", padding: "25px", borderLeft: "2px solid #1e293b", zIndex: 1000, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
          <div style={{ fontSize: "28px" }}>🎯</div>
          <h1 style={{ color: "#3b82f6", fontSize: "22px", margin: 0, fontWeight: "900" }}>VISIONARY MAP</h1>
        </div>

        <div style={{ background: "#1e293b", padding: "18px", borderRadius: "15px", marginBottom: "20px", border: "1px solid #10b981" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}>💰 إجمالي المبيعات</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} <span style={{fontSize: "12px"}}>ر.س</span></div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <h4 style={{ fontSize: "14px", color: "#3b82f6", marginBottom: "15px", borderBottom: "1px solid #1e293b", paddingBottom: "8px", display: "flex", justifyContent: "space-between" }}>
            <span>📊 مبيعات الأحياء</span>
            <span style={{fontSize: '11px', background: '#3b82f633', padding: '2px 8px', borderRadius: '10px'}}>{Object.keys(districtSales).length} حي</span>
          </h4>
          
          {Object.entries(districtSales).sort((a,b) => b[1] - a[1]).map(([name, value], idx) => (
            <div key={idx} style={{ padding: "12px", background: "#1e293b66", borderRadius: "10px", marginBottom: "8px", border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "500" }}>{name}</span>
                <span style={{ color: "#10b981", fontWeight: "bold" }}>{value.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Map Area */}
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ position: "absolute", top: "25px", right: "25px", zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ background: "#3b82f6", color: "white", padding: "15px 30px", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
            <span style={{fontSize: '20px'}}>📂</span> ارفع الملف
            <input type="file" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: "#0f172a", border: "1px solid #fbbf24", color: "#fbbf24", padding: "10px", borderRadius: "10px", fontSize: "12px", textAlign: "center" }}>
                ⏳ جاري المعالجة: {processedCount} نقطة
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
                <div style={{ textAlign: "right", padding: "5px" }}>
                  <strong>{p.name}</strong><br/>
                  📍 {p.district}<br/>
                  💰 {p.revenue.toLocaleString()} ر.س
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
