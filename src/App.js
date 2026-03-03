import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Circle } from "react-leaflet";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [districtsData, setDistrictsData] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [showReport, setShowReport] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("");
  const fullScreenRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingStatus("جاري قراءة الملف...");
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      const data = XLSX.utils.sheet_to_json(XLSX.read(evt.target.result, { type: "binary" }).Sheets[XLSX.read(evt.target.result, { type: "binary" }).SheetNames[0]]);
      let sum = 0;
      let temp = {};
      
      // إحداثيات تقريبية لجدة لحصر البحث داخلها فقط
      const JEDDAH_BOUNDS = "39.00,21.10,39.45,21.95"; 

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const keys = Object.keys(row);
        let rawName = String(row[keys.find(k => k.includes("حي"))] || "").trim();
        const amount = parseFloat(row[keys.find(k => k.includes("مبيع") || k.includes("مبلغ"))]) || 0;
        const client = String(row[keys[0]] || "عميل");

        if (rawName) {
          sum += amount;
          // توحيد اسم الحي للبحث (إزالة كلمة "حي" إذا وجدت)
          let searchName = rawName.replace("حي ", "").trim();

          if (!temp[searchName]) {
            setLoadingStatus(`جاري تحديد موقع: ${searchName}...`);
            try {
              // طلب البحث العام من محرك الخرائط
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("حي " + searchName + " جدة")}&viewbox=${JEDDAH_BOUNDS}&bounded=1`
              );
              const result = await response.json();
              
              if (result && result[0]) {
                temp[searchName] = {
                  total: 0,
                  transactions: [],
                  lat: parseFloat(result[0].lat),
                  lng: parseFloat(result[0].lon)
                };
              } else {
                // إذا لم يجد الحي، يضعه في مكان عشوائي قريب من مركز جدة لكي لا يختفي
                temp[searchName] = {
                  total: 0,
                  transactions: [],
                  lat: 21.5433 + (Math.random() * 0.1 - 0.05),
                  lng: 39.1728 + (Math.random() * 0.1 - 0.05)
                };
              }
            } catch (error) {
              console.error("خطأ في البحث:", error);
            }
            // تأخير بسيط (نصف ثانية) لتجنب حظر السيرفر بسبب الطلبات المتكررة
            await new Promise(r => setTimeout(r, 500));
          }
          
          temp[searchName].total += amount;
          temp[searchName].transactions.push({ name: client, amount });
          setDistrictsData({ ...temp });
        }
      }
      setTotalSales(sum);
      setLoadingStatus("");
    };
    reader.readAsBinaryString(file);
  };

  const capture = () => {
    const btns = document.getElementById("btns");
    btns.style.display = "none";
    html2canvas(fullScreenRef.current, { useCORS: true, backgroundColor: "#000" }).then(canvas => {
      const a = document.createElement("a");
      a.download = "Visionary_Jeddah_Report.png";
      a.href = canvas.toDataURL();
      a.click();
      btns.style.display = "flex";
    });
  };

  return (
    <div ref={fullScreenRef} style={{ height: "100vh", width: "100vw", background: "#000", position: "fixed", top: 0, left: 0, direction: "rtl", fontFamily: "sans-serif" }}>
      
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1000, color: "#00f2ff", fontSize: "20px", fontWeight: "900", fontStyle: "italic" }}>
        VISIONARY MAP
      </div>

      <div id="btns" style={{ position: "absolute", top: "15px", width: "100%", zIndex: 1000, display: "flex", justifyContent: "center", gap: "10px" }}>
        <label style={{ background: "#2563eb", color: "#fff", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
          ارفع ملف الإكسل <input type="file" onChange={handleUpload} style={{ display: "none" }} />
        </label>
        {Object.keys(districtsData).length > 0 && (
          <button onClick={capture} style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "30px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>📸 حفظ التقرير</button>
        )}
      </div>

      {loadingStatus && (
        <div style={{ position: "absolute", top: "75px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#fbbf24", color: "#000", padding: "8px 25px", borderRadius: "20px", fontWeight: "bold", fontSize: "12px" }}>
          {loadingStatus}
        </div>
      )}

      <div style={{ position: "absolute", bottom: "30px", right: "20px", zIndex: 1000, width: showReport ? "250px" : "120px", transition: "0.3s" }}>
        <button onClick={() => setShowReport(!showReport)} style={{ width: "100%", background: "#1e293b", color: "#00f2ff", border: "1px solid #00f2ff", padding: "8px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", marginBottom: "5px" }}>
          {showReport ? "▼ إخفاء" : "▲ التقرير"}
        </button>
        {showReport && (
          <div style={{ background: "rgba(10, 15, 30, 0.95)", padding: "15px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "45vh", overflowY: "auto", color: "white", backdropFilter: "blur(10px)" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>إجمالي المبيعات</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#10b981" }}>{totalSales.toLocaleString()} SAR</div>
            {Object.entries(districtsData).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} style={{ marginTop: "12px", borderTop: "1px solid #333", paddingTop: "5px" }}>
                <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "13px" }}>حي {name}</div>
                {data.transactions.map((t, idx) => (
                  <div key={idx} style={{ fontSize: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span>{t.name}</span><span style={{color: "#10b981"}}>{t.amount.toLocaleString()}</span>
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
                <div style={{ color: "#FFFF00", fontSize: "14px", fontWeight: "900", textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000" }}>
                  {name}
                </div>
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
