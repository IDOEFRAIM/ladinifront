import React from 'react';
export default function Loading() {
    return (
        <div style={{ height:'100vh', width:'100%', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'rgba(249,251,248,0.8)' }}>
            <div style={{ width:48, height:48, border:'4px solid rgba(6,78,59,0.07)', borderTop:'4px solid #10B981', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <p style={{ marginTop:20, color:'#064E3B', fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>Chargement FrontAg...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
