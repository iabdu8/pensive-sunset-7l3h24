{/* نافذة التقرير الكاملة - تم تعديلها لتعمل على الجوال بكفاءة */}
{showReport && (
  <div style={{ 
    position: "fixed", // تغيير إلى fixed لضمان التغطية الشاملة
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 9999, // رفع الطبقة لأعلى شيء
    background: "#0a0a0a", 
    display: "flex", 
    flexDirection: "column", 
    direction: "rtl",
    padding: "env(safe-area-inset-top) 15px env(safe-area-inset-bottom) 15px" // دعم حواف الجوال الحديثة
  }}>
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      padding: "20px 0",
      borderBottom: "1px solid #222" 
    }}>
      <h2 style={{ color: "#00f2ff", margin: 0, fontSize: "20px" }}>تقرير المبيعات</h2>
      <button onClick={() => setShowReport(false)} style={{ 
        background: "#ff4444", 
        color: "#fff", 
        border: "none", 
        padding: "10px 20px", 
        borderRadius: "10px", 
        fontWeight: "bold",
        cursor: "pointer"
      }}>إغلاق X</button>
    </div>
    
    <div style={{ flex: 1, overflowY: "auto", padding: "15px 0" }}>
      <div style={{ 
        background: "#10b981", 
        padding: "15px", 
        borderRadius: "12px", 
        textAlign: "center", 
        marginBottom: "20px", 
        fontSize: "18px", 
        fontWeight: "bold",
        color: "#fff"
      }}>
        إجمالي المبيعات: {totalSales.toLocaleString()} SAR
      </div>

      {Object.entries(districtsData)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => (
          <div key={name} style={{ 
            marginBottom: "15px", 
            background: "#1a1a1a", 
            padding: "12px", 
            borderRadius: "10px",
            borderRight: "4px solid #00f2ff" 
          }}>
            <div style={{ color: "#00f2ff", fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
              حي {name} ({data.clients.length})
            </div>
            {data.clients.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#ccc", marginTop: "5px" }}>
                <span>• {c.name}</span>
                <span style={{color: "#fff"}}>{c.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
      ))}
    </div>
  </div>
)}

{/* تنسيقات CSS لضمان عدم التداخل */}
<style>{`
  .tp { background: transparent !important; border: none !important; box-shadow: none !important; }
  .tp:before { border: none !important; }
  /* منع السكرول في الخلفية عند فتح التقرير */
  ${showReport ? "body { overflow: hidden; }" : ""}
  /* تحسين اللمس على الجوال */
  button, label { touch-action: manipulation; }
`}</style>
