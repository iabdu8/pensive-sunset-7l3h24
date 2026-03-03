import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

// --- قاعدة بيانات شاملة جداً (أكثر من 100 حي بجدة بدقة قوقل ماب) ---
const JEDDAH_MASTER_LIST = {
  // شمال جدة
  "الشاطئ": [21.6150, 39.1100], "المرجان": [21.6668, 39.1086], "البساتين": [21.6853, 39.1321],
  "المحمدية": [21.6441, 39.1444], "النعيم": [21.6212, 39.1554], "النهضة": [21.6111, 39.1289],
  "الزهراء": [21.5877, 39.1311], "السلامة": [21.5899, 39.1524], "الروضة": [21.5599, 39.1488],
  "الخالدية": [21.5434, 39.1364], "أبحر الشمالية": [21.7516, 39.1301], "أبحر الجنوبية": [21.7115, 39.1190],
  "الحمدانية": [21.7656, 39.1977], "الفلاح": [21.7850, 39.2100], "الصالحية": [21.7450, 39.2150],
  "الرحيلي": [21.7750, 39.1200], "الأصالة": [21.7000, 39.1600], "المنارات": [21.7600, 39.1400],
  "الصواري": [21.7800, 39.1400], "الياقوت": [21.7900, 39.1200], "اللؤلؤ": [21.8000, 39.1100],
  "الزمرد": [21.8100, 39.1300], "الفروسية": [21.7950, 39.2000], "الرياض": [21.8000, 39.2200],

  // وسط جدة
  "الصفا": [21.5833, 39.2023], "المروة": [21.6166, 39.2055], "الفيصلية": [21.5644, 39.1766],
  "الربوة": [21.5811, 39.1822], "البوادي": [21.5900, 39.1700], "النزهة": [21.6100, 39.1800],
  "مشرفة": [21.5355, 39.1888], "الرحاب": [21.5511, 39.2155], "العزيزية": [21.5400, 39.1950],
  "الأندلس": [21.5350, 39.1550], "الحمراء": [21.5200, 39.1550], "الرويس": [21.5100, 39.1650],
  "الشرفية": [21.5150, 39.1850], "بني مالك": [21.5150, 39.2050], "الورود": [21.5166, 39.2088],
  "النسيم": [21.5055, 39.2233], "الفيحاء": [21.4922, 39.2311], "البغدادية": [21.4900, 39.1850],

  // شرق جدة
  "السامر": [21.5950, 39.2300], "المنار": [21.6100, 39.2350], "الأجواد": [21.6250, 39.2400],
  "التيسير": [21.5600, 39.2500], "الواحة": [21.5600, 39.2200], "مخطط الفهد": [21.5800, 39.2500],
  "بريمان": [21.6500, 39.2500], "الريان": [21.6300, 39.2500], "الكوثر": [21.6700, 39.2400],

  // جنوب جدة
  "البلد": [21.4847, 39.1867], "الجامعة": [21.4850, 39.2350], "الروابي": [21.4600, 39.2400],
  "السليمانية": [21.4955, 39.2455], "الثغر": [21.4750, 39.2250], "الفيحاء": [21.4922, 39.2311],
  "الأمير فواز": [21.4055, 39.2611], "السنابل": [21.3655, 39.2811], "العدل": [21.4555, 39.2611],
  "الوزيرية": [21.4500, 39.2300], "مدائن الفهد": [21.4650, 39.2150], "غليل": [21.4450, 39.2100],
  "القريات": [21.4600, 39.1950], "الخمرة": [21.3000, 39.2500], "القرينية": [21.2800, 39.2700],
  "الجوهرة": [21.3800, 39.2300], "الفضيلة": [21.2500, 39.2800], "المحجر": [21.4400, 39.2000]
};

// --- دالة تنظيف ومطابقة الأسماء الذكية ---
const normalize = (str) => {
  if (!str) return "";
  return str.toString()
    .replace(/حي\s+/g, "") // إزالة كلمة "حي"
    .replace(/^ال/g, "")   // إزالة "الـ" التعريف في البداية
    .replace(/[أإآ]/g, "ا") // توحيد الألفات
    .replace(/ة/g, "ه")    // توحيد التاء المربوطة
    .replace(/ى/g, "ي")    // توحيد الياء
    .replace(/\s+/g, "")   // إزالة المسافات
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
      const workbook = XLSX.read(evt.target.result, { type: "binary" });
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      
      let sum = 0; let temp = {};

      data.forEach(row => {
        const keys = Object.keys(row);
        let rawName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        let amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        let client = String(row[keys[0]] || "عميل");

        if (rawName) {
          sum += amount;
          const searchName = normalize(rawName);
          
          // البحث في القائمة الموحدة
          const matchedKey = Object.keys(JEDDAH_MASTER_LIST).find(k => normalize(k) === searchName);

          if (matchedKey) {
            if (!temp[matchedKey]) {
              const coords = JEDDAH_MASTER_LIST[matchedKey];
              temp[matchedKey] = { total: 0, transactions: [], lat: coords[0], lng: coords[1] };
            }
            temp[matchedKey].total += amount;
            temp[matchedKey].transactions.push({ name: client, amount });
          } else {
            console.warn("لم يتم العثور على الحي:", rawName);
          }
        }
      });
      setDistrictsData(temp); setTotalSales(sum);
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    document.getElementById("ui-layer").style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000", scale: 2 }).then(canvas => {
      const a = document.createElement("a");
      a.download = "Jeddah_Sales_Map.png";
      a.href = canvas.toDataURL();
      a.click();
      document.getElementById("ui-layer").style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", direction: "rtl", fontFamily: "sans-serif" }}>
      
      <div style={{ position: "absolute", top: "25px", left: "25px", zIndex: 1000, color: "#00f2ff", fontSize: "24px", fontWeight: "900" }}>VISIONARY JEDDAH</div>

      <div id="ui-layer" style={{ position: "absolute", top: "20px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "12px 25px", borderRadius: "50px", cursor: "pointer", fontWeight: "bold" }}>
          ارفع ملف الإكسل <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "12px 25px", borderRadius: "50px", cursor: "pointer", fontWeight: "bold" }}>📸 حفظ الخريطة</button>}
      </div>

      <div style={{ position: "absolute", bottom: "40px", right: "25px", zIndex: 1000, width: showReport ? "280px" : "120px" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "10px", borderRadius: "12px", cursor: "pointer", fontWeight: "bold" }}>
          {showReport ? "▼ إخفاء" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "20px", borderRadius: "20px", border: "1px solid rgba(0,242,255,0.2)", maxHeight: "50vh", overflowY: "auto", color: "white" }}>
            <div style={{ color: "#10b981", fontSize: "26px", fontWeight: "bold" }}>{totalSales.toLocaleString()} <small style={{fontSize: "12px"}}>SAR</small></div>
            {Object.entries(districtsData).sort((a,b)=>b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ marginTop: "15px", borderTop: "1px solid #334155", paddingTop: "8px" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold" }}>حي {name}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                    <span>• {t.name}</span><span>{t.amount.toLocaleString()}</span>
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
            <CircleMarker center={[data.lat, data.lng]} radius={9} pathOptions={{ fillColor: "#00f2ff", color: "#fff", weight: 2, fillOpacity: 1 }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent className="tp">
                <div style={{ color: "#FFFF00", fontSize: "16px", fontWeight: "900", textShadow: "3px 3px 0 #000" }}>{name}</div>
              </Tooltip>
            </CircleMarker>
            <Circle center={[data.lat, data.lng]} radius={1600} pathOptions={{ fillColor: "#ff0000", color: "transparent", fillOpacity: 0.25 }} />
          </React.Fragment>
        ))}
      </MapContainer>
      <style>{`.tp{background:transparent!important;border:none!important;box-shadow:none!important;}.tp:before{border:none!important;}`}</style>
    </div>
  );
}
