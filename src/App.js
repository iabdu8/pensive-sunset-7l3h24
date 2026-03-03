import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// --- قاعدة بيانات الإحداثيات (أدق إحداثيات لقلب أحياء جدة) ---
const JEDDAH_DATA = {
  "الشاطئ": [21.6150, 39.1100], "المرجان": [21.6668, 39.1086], "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444], "النعيم": [21.6212, 39.1554], "النهضة": [21.6111, 39.1289],
  "الزهراء": [21.5877, 39.1311], "السلامة": [21.5899, 39.1524], "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364], "أبحر الشمالية": [21.7516, 39.1301], "أبحر الجنوبية": [21.7115, 39.1190],
  "الحمدانية": [21.7656, 39.1977], "الصالحية": [21.7450, 39.2150], "الفلاح": [21.7850, 39.2100],
  "الصفا": [21.5833, 39.2023], "المروة": [21.6166, 39.2055], "الفيصلية": [21.5644, 39.1766],
  "الربوة": [21.5811, 39.1822], "البوادي": [21.5900, 39.1700], "النزهة": [21.6100, 39.1800],
  "الرحاب": [21.5511, 39.2155], "النسيم": [21.5055, 39.2233], "الفيحاء": [21.4922, 39.2311],
  "السامر": [21.5950, 39.2300], "المنار": [21.6100, 39.2350], "الأجواد": [21.6250, 39.2400],
  "التيسير": [21.5600, 39.2500], "البلد": [21.4847, 39.1867], "الأمير فواز": [21.4055, 39.2611],
  "السنابل": [21.3655, 39.2811], "العزيزية": [21.5400, 39.1950], "الحمراء": [21.5200, 39.1550]
};

// --- خوارزمية تنظيف الأسماء الفائقة (لحل مشكلة الشاطئ والشاطيء والشاطي) ---
const superClean = (str) => {
  if (!str) return "";
  return str.toString()
    .replace(/حي\s+/g, "")     // حذف كلمة حي
    .replace(/^ال/g, "")       // حذف الـ التعريف
    .replace(/[أإآ]/g, "ا")     // توحيد الألف
    .replace(/[ىئئي]/g, "ي")    // توحيد كل أشكال الياء والهمزة على الياء (لحل مشكلة الشاطيء)
    .replace(/ة/g, "ه")        // توحيد التاء المربوطة
    .replace(/\s+/g, "")       // حذف المسافات
    .trim();
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
        let rawName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        let amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        let client = String(row[keys[0]] || "عميل");

        if (rawName) {
          sum += amount;
          const cleanedInput = superClean(rawName);
          // البحث بمطابقة "الجذر المنظف"
          const matchedKey = Object.keys(JEDDAH_DATA).find(k => superClean(k) === cleanedInput);

          const finalName = matchedKey || rawName;
          if (!temp[finalName]) {
            const coords = JEDDAH_DATA[matchedKey] || [21.5433, 39.1728]; 
            temp[finalName] = { total: 0, transactions: [], lat: coords[0], lng: coords[1], notFound: !matchedKey };
          }
          temp[finalName].total += amount;
          temp[finalName].transactions.push({ name: client, amount });
        }
      });
      setDistrictsData(temp); setTotalSales(sum);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    document.getElementById("ui").style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a"); a.download = "Final_Report.png"; a.href = canvas.toDataURL(); a.click();
      document.getElementById("ui").style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", direction: "rtl", fontFamily: "sans-serif" }}>
      <div id="ui" style={{ position: "absolute", top: "20px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: "bold" }}>
          ارفع الإكسل <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", cursor: "pointer", fontWeight: "bold" }}>📸 حفظ</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 1000, width: "260px" }}>
        {Object.keys(districtsData).length > 0 && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid #333", color: "white", maxHeight: "50vh", overflowY: "auto" }}>
            <div style={{ color: "#10b981", fontSize: "20px", fontWeight: "bold", marginBottom: "10px" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).sort((a,b)=>b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ borderBottom: "1px solid #222", padding: "5px 0" }}>
                <div style={{ color: data.notFound ? "#ff4444" : "#00f2ff", fontSize: "13px", fontWeight: "bold" }}>
                  {name} {data.notFound && "⚠️"}
                </div>
                <div style={{ fontSize: "11px", opacity: 0.8 }}>المجموع: {data.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: "100%", width: "100%", background: "#050505" }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {Object.entries(districtsData).map(([name, data]) => (
          <React.Fragment key={name}>
            <CircleMarker center={[data.lat, data.lng]} radius={8} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "15px", fontWeight: "900", textShadow: "2px 2px 0 #000" }}>{name}</div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1500} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.25 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
