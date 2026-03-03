import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// إحداثيات دقيقة جداً لأحياء جدة (Latitude, Longitude)
const JEDDAH_DISTRICTS = {
  // أحياء شمال جدة
  "أبحر الشمالية": [21.7516, 39.1301],
  "أبحر الجنوبية": [21.7115, 39.1190],
  "المرجان": [21.6668, 39.1086],
  "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444],
  "النعيم": [21.6212, 39.1554],
  "النهضة": [21.6111, 39.1289],
  "الزهراء": [21.5877, 39.1311],
  "الشاطئ": [21.6033, 39.1066],
  "السلامة": [21.5899, 39.1524],
  "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364],
  "الحمدانية": [21.7656, 39.1977],
  "الفلاح": [21.7850, 39.2100],

  // أحياء وسط جدة
  "الصفا": [21.5866, 39.2023],
  "المروة": [21.6166, 39.2055],
  "الفيصلية": [21.5644, 39.1766],
  "الربوة": [21.5811, 39.1822],
  "مشرفة": [21.5355, 39.1888],
  "الرحاب": [21.5511, 39.2155],
  "النسيم": [21.5055, 39.2233],
  "الفيحاء": [21.4922, 39.2311],
  "الورود": [21.5166, 39.2088],

  // أحياء جنوب جدة
  "البلد": [21.4847, 39.1867],
  "الأمير فواز": [21.4055, 39.2611],
  "السنابل": [21.3655, 39.2811],
  "العدل": [21.4555, 39.2611],
  "السليمانية": [21.4955, 39.2455]
};

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [showReport, setShowReport] = useState(true);
  const fullScreenRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0; let temp = {};

      data.forEach(row => {
        const keys = Object.keys(row);
        let distName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        // إزالة كلمة "حي" إذا كانت موجودة في الخلية للبحث بشكل صحيح في القائمة
        distName = distName.replace("حي ", "");
        
        const amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        const client = String(row[keys[0]] || "عميل");

        if (distName) {
          sum += amount;
          if (!temp[distName]) {
            // استخدام الإحداثيات الدقيقة من القائمة أعلاه
            // إذا لم يجد الحي، يضع نقطة في وسط جدة مع إزاحة عشوائية بسيطة
            const coords = JEDDAH_DISTRICTS[distName] || [21.5433 + (Math.random() * 0.05), 39.1728 + (Math.random() * 0.05)];
            temp[distName] = { total: 0, transactions: [], lat: coords[0], lng: coords[1] };
          }
          temp[distName].total += amount;
          temp[distName].transactions.push({ name: client, amount });
        }
      });
      setDistrictsData(temp); setTotalSales(sum);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    const actionBtns = document.getElementById("btns");
    actionBtns.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a"); a.download = "Visionary_Report.png"; a.href = canvas.toDataURL(); a.click();
      actionBtns.style.display = "flex";
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

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 999, width: showReport ? "240px" : "110px" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "8px", borderRadius: "10px", marginBottom: "5px", cursor: "pointer", fontWeight: "bold" }}>
          {showReport ? "▼ إخفاء التقرير" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "45vh", overflowY: "auto", color: "white", backdropFilter: "blur(10px)" }}>
            <div style={{ color: "#94a3b8", fontSize: "10px" }}>TOTAL SALES</div>
            <div style={{ color: "#10b981", fontSize: "22px", fontWeight: "bold" }}>{totalSales.toLocaleString()} <small style={{fontSize: "10px"}}>SAR</small></div>
            {Object.entries(districtsData).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ marginTop: "12px", borderTop: "1px solid #333", paddingTop: "5px" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "13px" }}>حي {name}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
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
            {/* النقطة الفيروزية */}
            <CircleMarker center={[data.lat, data.lng]} radius={7} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "13px", fontWeight: "900", textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000" }}>{name}</div>
              </Tooltip>
            </CircleMarker>
            
            {/* دائرة التوهج الأحمر */}
            <Circle center={[data.lat, data.lng]} radius={1300} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.25 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
