'use client';
export default function Loading() {
    return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#F9FBF8' }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(6,78,59,0.07)', borderTop:'3px solid #064E3B', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <p style={{ marginTop:15, color:'#064E3B', fontWeight:700, fontSize:'0.9rem', fontFamily:"'Inter',sans-serif" }}>Chargement en cours...</p>
            <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
