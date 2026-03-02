import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createNumberedIcon = (number) => {
  return L.divIcon({
    html: `<div style="
      background-color: #3b82f6;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    ">${number}</div>`,
    className: "custom-icon",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 11, { animate: true, duration: 2 });
  }, [center, map]);
  return null;
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [report, setReport] = useState({
    totalSales: 0,
    topDistrict: "في انتظار البيانات...",
    hasSales: false,
  });

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setPoints([]);
    setReport({
      totalSales: 0,
      topDistrict: "جاري التحليل...",
      hasSales: false,
    });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        if (data.length === 0) {
          alert("الملف فارغ!");
          setLoading(false);
          return;
        }

        setTotalRows(data.length);
        let foundPoints = [];
        let salesSum = 0;
        let districtCounts = {};
        let foundAnySales = false;

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const keys = Object.keys(row);

          const nameKey = keys[0];
          const districtKey = keys.find(
            (k) =>
              k.includes("حي") ||
              k.includes("District") ||
              k.includes("عنوان") ||
              k.includes("المنطقة")
          );
          const salesKey = keys.find(
            (k) =>
              k.includes("مبيع") ||
              k.includes("مبلغ") ||
              k.includes("Revenue") ||
              k.includes("قيمة")
          );

          // تنظيف اسم الحي بدقة لضمان عمل "أكثر حي"
          let rawDistrict = row[districtKey] || "";
          let cleanDistrict = rawDistrict
            .toString()
            .replace(/حي|جدة|Jeddah/g, "")
            .replace(/\s+/g, " ")
            .trim();

          // قراءة المبيعات (إذا لم توجد سيتم تجاهلها)
          let revenue = parseFloat(row[salesKey]);
          if (!isNaN(revenue) && revenue > 0) {
            salesSum += revenue;
            foundAnySales = true;
          }

          if (!cleanDistrict) continue;

          try {
            await new Promise((r) => setTimeout(r, 1200));
            const query = `${cleanDistrict}, Jeddah, Saudi Arabia`;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query
              )}`
            );
            const json = await res.json();

            if (json && json.length > 0) {
              const jitter = () => (Math.random() - 0.5) * 0.008;
              const newPoint = {
                id: i + 1,
                lat: parseFloat(json[0].lat) + jitter(),
                lng: parseFloat(json[0].lon) + jitter(),
                details: row,
                district: cleanDistrict,
                name: row[nameKey],
              };

              foundPoints.push(newPoint);

              // تحديث عداد الأحياء بشكل دقيق
              districtCounts[cleanDistrict] =
                (districtCounts[cleanDistrict] || 0) + 1;

              setPoints([...foundPoints]);

              // حساب أكثر حي تكراراً بشكل لحظي
              const top = Object.keys(districtCounts).reduce((a, b) =>
                districtCounts[a] > districtCounts[b] ? a : b
              );

              setReport({
                totalSales: salesSum,
                topDistrict: top,
                count: foundPoints.length,
                hasSales: foundAnySales,
              });
            }
          } catch (err) {
            console.error("Error at row:", i);
          }
        }
      } catch (err) {
        alert("خطأ في قراءة الملف.");
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        background: "#020617",
        color: "white",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <motion.div
        initial={{ x: -350 }}
        animate={{ x: 0 }}
        style={{
          width: "340px",
          background: "#0f172a",
          padding: "25px",
          borderRight: "2px solid #1e293b",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "30px",
          }}
        >
          <div style={{ fontSize: "28px" }}>🎯</div>
          <h1
            style={{
              color: "#3b82f6",
              fontSize: "22px",
              margin: 0,
              fontWeight: "900",
            }}
          >
            VISION MAP
          </h1>
        </div>

        {/* كرت المبيعات - يظهر فقط إذا وجدت بيانات مبيعات */}
        <AnimatePresence>
          {report.hasSales && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{
                background: "#1e293b",
                padding: "15px",
                borderRadius: "15px",
                marginBottom: "15px",
                border: "1px solid #10b981",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  marginBottom: "5px",
                }}
              >
                💰 إجمالي المبيعات
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                {report.totalSales.toLocaleString()}{" "}
                <span style={{ fontSize: "12px" }}>ريال</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* كرت أكثر حي - يعمل الآن بدقة */}
        <div
          style={{
            background: "#1e293b",
            padding: "15px",
            borderRadius: "15px",
            marginBottom: "15px",
            border: "1px solid #3b82f6",
          }}
        >
          <div
            style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "5px" }}
          >
            🏆 الحي الأكثر تركيزاً
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: "bold", color: "#60a5fa" }}
          >
            🏠 {report.topDistrict}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginTop: "10px" }}>
          <h4
            style={{
              fontSize: "13px",
              color: "#475569",
              marginBottom: "15px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            العملاء المكتشفون ({points.length})
          </h4>
          {points.map((p) => (
            <div
              key={p.id}
              style={{
                padding: "10px",
                background: "#1e293b44",
                borderRadius: "8px",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                border: "1px solid #1e293b",
              }}
            >
              <span>{p.name}</span>
              <span style={{ color: "#3b82f6" }}>{p.district}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Map Area */}
      <div style={{ flex: 1, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: "25px",
            left: "25px",
            zIndex: 1000,
          }}
        >
          <label
            style={{
              background: "#3b82f6",
              padding: "14px 28px",
              borderRadius: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontWeight: "bold",
              boxShadow: "0 10px 20px rgba(0,0,0,0.4)",
            }}
          >
            <span>📂</span> ارفع الملف
            <input
              type="file"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </label>

          {loading && (
            <div
              style={{
                marginTop: "15px",
                background: "#0f172a",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #fbbf24",
                color: "#fbbf24",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              ⏳ جاري معالجة البيانات: {points.length} من {totalRows}
            </div>
          )}
        </div>

        <MapContainer
          center={[21.5433, 39.1728]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <MapController center={[21.5433, 39.1728]} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {points.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createNumberedIcon(p.id)}
            >
              <Tooltip sticky>
                <div
                  style={{
                    textAlign: "right",
                    color: "#1e293b",
                    padding: "5px",
                  }}
                >
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: "11px", marginTop: "5px" }}>
                    📍 حي {p.district}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
