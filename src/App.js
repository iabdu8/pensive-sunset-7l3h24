import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; color: white; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; font-weight: 800; font-size: 10px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">${number}</div>`,
    className: "custom-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
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
              await new Promise(r => setTimeout(r, 350));
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

  const containerStyle = {
    height: "100vh",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    background: "#020617",
    color: "white",
    direction: "rtl",
    fontFamily: "sans-serif",
    overflow: "hidden"
  };

  const sidebarStyle = {
    width: isMobile ? "100%" : "360px",
    height: isMobile ? "40%" : "100vh",
    background: "#0f172a",
    padding: "20px",
    borderLeft: isMobile ? "none" : "2px solid #1e293b",
    borderTop: isMobile ? "2px solid #1e293b" : "none",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column"
  };

  return (
    <div style={containerStyle}>
      
      {/* Sidebar / Bottom Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={sidebarStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "20px" }}>🎯</span>
          <h1 style={{ color: "#3b82f6", fontSize: "18px", margin: 0, fontWeight: "900" }}>VISIONARY MAP</h1>
        </div>

        <div style={{ background: "#1e293b", padding: "12px", borderRadius: "12px", marginBottom: "15px", border: "1px solid #10b981" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>💰 إجمالي المبيعات</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} <span style={{fontSize: "10px"}}>ر.س</span></div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <h4 style={{ fontSize: "13px", color: "#3b82f6", marginBottom: "10px", borderBottom: "1px solid #1e293b", paddingBottom: "5px" }}>📊 مبيعات الأحياء</h4>
          {Object.entries(districtSales).sort((a,b) => b[1]-a[1]).map(([name, value], idx) => (
            <div key={idx} style={{ padding: "10px", background: "#1e293b66", borderRadius: "8px", marginBottom: "6px", border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span>{name}</span>
              <span style={{ color: "#10b981", fontWeight: "bold" }}>{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Map Area */}
      <div style={{ flex: 1
