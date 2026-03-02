import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import * as XLSX from 'xlsx';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// إعداد الأيقونة الافتراضية لضمان ظهورها
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// إحداثيات أحياء جدة
const districtCoords = {
  "أبحر الشمالية": [21.7456, 39.1234], "أبحر الجنوبية": [21.7100, 39.1350],
  "المرجان": [21.6660, 39.1080], "البساتين": [21.6780, 39.1250],
  "المحمدية": [21.6350, 39.1550], "الشاطئ": [21.6110, 39.1120],
  "النعيم": [21.6050, 39.1480], "النهضة": [21.6230, 39.1280],
  "الروضة": [21.5750, 39.1520], "الخالدية": [21.5580, 39.1350],
  "الزهراء": [21.5950, 39.1350], "السلامة": [21.5850, 39.1550],
  "الحمدانية": [21.7580, 39.1950], "الفلاح": [21.7750, 39.2150],
  "الرحيلي": [21.7900, 39.1750], "الصالحية": [21.7400, 39.2300],
  "الحمراء": [21.5250, 39.1620], "الأندلس": [21.5420, 39.1550],
  "مشرفة": [21.5350, 39.1850], "الفيصلية": [21.5650, 39.1780],
  "الربوة": [21.5780, 39.1980], "الصفا": [21.5880, 39.2080],
  "المروة": [21.6150, 39.2150], "العزيزية": [21.5480, 39.1950],
  "الرحاب": [21.5550, 39.2120], "النسيم": [21.5050, 39.2180],
  "الورود": [21.5150, 39.2050], "الفيحاء": [21.4950, 39.2250],
  "الثغر": [21.4850, 39.2150], "الجامعة": [21.4780, 39.2450],
  "البلد": [21.4840, 39.1860], "السنابل": [21.3650, 39.2650],
  "الأجاويد": [21.3850, 39.2750]
};

export default function App() {
  const [data, setData] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      const cleaned = jsonData.map(item => {
        const name = String(item["الحي"] || item["حي"] || "").trim();
        return { ...item, cleanName: name };
      });
      setData(cleaned);
    };
    reader.readAsBinaryString(file);
  };

  const totalSales = useMemo(() => {
    return data.reduce((sum, row) => sum + (Number(row["إجمالي المبيعات"] || row["المبيعات"] || 0)), 0);
  }, [data]);

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      <header style={{ backgroundColor: '#1a73e8', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>Visionary Map 🎯</h1>
        <div style={{ marginTop: '15px' }}>
          <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" style={{ padding: '8px', borderRadius: '5px' }} />
        </div>
      </header>

      <div style={{ height: '500px', margin: '20px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <MapContainer center={[21.5433, 39.1728]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {data.map((row, idx) => {
            const pos = districtCoords[row.cleanName];
            if (!pos) return null;
            return (
              <Marker key={idx} position={pos} icon={defaultIcon}>
                <Popup>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: '#1a73e8' }}>حي {row.cleanName}</strong><br/>
                    💰 المبيعات: {row["إجمالي المبيعات"] || 0} ر.س<br/>
                    📅 التاريخ: {row["تاريخ آخر فاتورة"] || '-'}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {data.length > 0 && (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#27ae60' }}>إجمالي المبيعات: {totalSales.toLocaleString()} ريال</h3>
          </div>

          <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', textAlign: 'right' }}>
            <thead style={{ backgroundColor: '#f1f3f4' }}>
              <tr>
                <th style={{ padding: '15px' }}>الحي</th>
                <th style={{ padding: '15px' }}>المبيعات</th>
                <th style={{ padding: '15px' }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{item.cleanName}</td>
                  <td style={{ padding: '15px', color: '#27ae60' }}>{item["إجمالي المبيعات"] || 0}</td>
                  <td style={{ padding: '15px' }}>{item["تاريخ آخر فاتورة"] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
