import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// قائمة مرجعية سريعة (يمكنك تعديل أي حي هنا يدوياً إذا أردت دقة مخصصة)
const MANUAL_COORDS = {
  "الصفا": [21.5866, 39.2023],
  "الروضة": [21.5599, 39.1488],
  "النسيم": [21.5055, 39.2233],
  "أبحر الشمالية": [21.7516, 39.1301],
  "الحمدانية": [21.7656, 39.1977]
};

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [showReport, setShowReport] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const fullScreenRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSearching(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0;
      let temp = {};
      const JEDDAH_VIEWBOX = "39.09,21.15,39.35,21.90"; // حصر البحث داخل جدة فقط

      for (let row of data) {
        const keys = Object.keys(row);
        let rawName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        let distName = rawName.replace("حي ", "").trim();
        const amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        const client = String(row[keys[0]] || "عميل");

        if (distName) {
          sum += amount;
          if (!temp[distName]) {
            let lat, lng;
            // 1. التحقق من القائمة اليدوية أولاً
            if (MANUAL_COORDS[distName]) {
              [lat, lng] = MANUAL_COORDS[distName];
            } else {
              // 2. إذا لم يوجد، نبحث عنه بدقة في الخرائط العالمية (بشرط يكون في جدة)
              try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("حي " + distName + " جدة")}&viewbox=${JEDDAH_VIEWBOX}&bounded=1`);
                const result = await response.json();
                if (result && result[0]) {
                  lat = parseFloat(result[0].lat);
                  lng = parseFloat(result[0].lon);
                } else {
                  // إحداثيات افتراضية في حال فشل كل شيء
                  lat = 21.5433 + (Math.random() * 0.05);
                  lng = 39.1728 + (Math.random() * 0.05);
                }
              } catch (e) {
                lat = 21.5433; lng = 39.1728;
              }
              // تأخير بسيط لتجنب حظر السيرفر عند كثرة الأحياء
              await new Promise(r => setTimeout(r, 400));
            }
            temp[distName] = { total: 0, transactions: [], lat, lng };
          }
          temp[distName].total += amount;
          temp[distName].transactions.push({ name: client, amount });
          setDistrictsData({ ...temp }); // تحديث الخريطة أولاً بأول
        }
      }
      setTotalSales(sum);
      setIsSearching(false);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    const btns = document.getElementById("btns");
    btns.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a"); a.download = "Visionary_Report.png"; a.href = canvas.toDataURL(); a.click();
      btns.style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", direction: "rtl", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 999, color: "#00f2ff", fontSize: "20px", fontWeight: "900", fontStyle: "italic" }}>VISIONARY MAP</div>
      
      <div id="btns" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 999, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
          ارفع الملف <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>📸 حفظ</button>
      </div>

      {isSearching && (
        <div style={{ position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#fbbf24", padding: "5px 20px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>
          جاري تحديد الإحداثيات بدقة...
        </div>
      )}

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 999, width: showReport ? "240px" : "110px" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "8px", borderRadius: "10px", marginBottom: "5px", cursor: "pointer", fontWeight: "bold" }}>
          {showReport ? "▼ إخفاء" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "45vh", overflowY: "auto", color: "white", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#10b981", fontSize: "22px", fontWeight: "bold" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ marginTop: "12px", borderTop: "1px solid #333", paddingTop: "5px" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "13px" }}>حي {name}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>• {t.name}</span><span style={{color: "#10b981"}}>{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#050505" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={7} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "13px", fontWeight: "900", textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000" }}>{name}</div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1300} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.25 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
