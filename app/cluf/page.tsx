import React from "react";
import Link from "next/link";
import { Shield, FileCode, ArrowLeft, Phone, Mail } from "lucide-react";

export default function EULAPage() {
  return (
    <div style={{ background: "#F8FAFC", minHeight: "100vh", padding: "60px 6% 100px", color: "#1E293B" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        
        {/* Bouton Retour */}
        <Link 
          href="/" 
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 8, 
            color: "#059669", 
            textDecoration: "none", 
            fontWeight: 600, 
            marginBottom: 32,
            fontSize: "0.95rem"
          }}
        >
          <ArrowLeft size={18} /> Retour à l'accueil
        </Link>

        {/* En-tête */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(16,185,129,0.1)", marginBottom: 16 }}>
            <Shield size={16} color="#059669" />
            <span style={{ fontSize: 12, fontWeight: 700, color:"#059669", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Licence Logicielle
            </span>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#064E3B", marginBottom: 12 }}>
            Contrat de Licence Utilisateur Final (CLUF)
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.95rem" }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Contenu CLUF */}
        <div style={{ background: "#FFFFFF", padding: "40px 36px", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #E2E8F0" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, borderBottom: "2px solid #ECFDF5", paddingBottom: 12 }}>
            <FileCode size={22} color="#059669" />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#064E3B", margin: 0 }}>
              Licence d'utilisation du logiciel LADINI
            </h2>
          </div>

          <p style={{ lineHeight: 1.7, color: "#334155", marginBottom: 20 }}>
            Le présent Contrat de Licence Utilisateur Final (CLUF) est un accord légal entre vous (utilisateur final, producteur ou acheteur) et <strong>LADINI</strong> pour l'utilisation de nos applications web, services mobiles et interfaces conversationnelles automatisées (SMS / WhatsApp).
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            1. Concession de Licence
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            LADINI vous accorde une licence personnelle, limitée, non exclusive, non transférable et révocable pour accéder et utiliser les logiciels et services numériques LADINI aux seules fins de mise en relation et d'échange sur le marché agricole.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            2. Propriété Intellectuelle
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            L'ensemble des technologies, algorithmes, interfaces, logos, marques, textes et architectures de la plateforme LADINI demeurent la propriété exclusive de LADINI. L'octroi de la licence ne vous transfère aucun droit de propriété intellectuelle sur la plateforme.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            3. Restrictions d'Utilisation
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            Il vous est formellement interdit de :
          </p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "#334155", margin: "10px 0" }}>
            <li>Copier, modifier, décompiler ou tenter de dériver le code source de la plateforme.</li>
            <li>Utiliser des scripts automatisés ou robots pour collecter les données du marché sans autorisation.</li>
            <li>Contourner ou perturber les mécanismes de sécurité et d'authentification.</li>
            <li>Exploiter la licence pour fournir des services d'intermédiation concurrents non autorisés.</li>
          </ul>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            4. Mises à Jour et Évolution
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            LADINI peut déployer automatiquement des mises à jour, correctifs ou nouvelles fonctionnalités pour améliorer la qualité, la sécurité et la stabilité du service.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            5. Résiliation
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            Cette licence est effective jusqu'à sa résiliation. LADINI se réserve le droit de suspendre ou mettre fin à votre licence avec effet immédiat en cas de violation des termes du présent contrat.
          </p>

          {/* Contact Support */}
          <div style={{ background: "#F8FAFC", padding: 24, borderRadius: 16, border: "1px solid #E2E8F0", marginTop: 40 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#064E3B", marginBottom: 10 }}>
              Des questions concernant la licence ?
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#64748B", marginBottom: 16 }}>
              Notre équipe d'assistance est joignable pour tout éclaircissement :
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: "0.9rem", fontWeight: 600, color: "#064E3B" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={16} color="#059669" />
                <span>+226 01 47 98 00 / +226 68 81 52 99</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={16} color="#059669" />
                <span>contact@ladini.tech</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}