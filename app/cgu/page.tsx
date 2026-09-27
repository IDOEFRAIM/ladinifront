import React from "react";
import Link from "next/link";
import { Shield, FileText, ArrowLeft, Phone, Mail } from "lucide-react";

export default function CGUPage() {
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
            <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Réglementation & Usage
            </span>
          </div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#064E3B", marginBottom: 12 }}>
            Conditions Générales d'Utilisation (CGU)
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.95rem" }}>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>

        {/* Contenu CGU */}
        <div style={{ background: "#FFFFFF", padding: "40px 36px", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #E2E8F0" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, borderBottom: "2px solid #ECFDF5", paddingBottom: 12 }}>
            <FileText size={22} color="#059669" />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#064E3B", margin: 0 }}>
              Plateforme LADINI
            </h2>
          </div>

          <p style={{ lineHeight: 1.7, color: "#334155", marginBottom: 20 }}>
            Les présentes Conditions Générales d'Utilisation encadrent l'accès et l'utilisation de la plateforme <strong>LADINI</strong>, éditée et exploitée par <strong>Ladini SARL</strong>. En naviguant sur le site ou en utilisant nos services (Web, WhatsApp, SMS), tout utilisateur accepte pleinement et sans réserve les règles définies ci-dessous.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            1. Rôle et Objet de la Plateforme
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            LADINI est une plateforme numérique d'intermédiation directe entre producteurs (agriculteurs, éleveurs, pisciculteurs) et acheteurs (restaurants, commerces, grossistes, particuliers). LADINI n'est ni propriétaire ni revendeur des produits présentés sur le marché, mais agit en tant que tiers facilitateur pour garantir la transparence des échanges et un prix juste.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            2. Engagements des Producteurs
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            Tout producteur s'engage à fournir des informations exactes concernant sa production (origine, fraîcheur, quantité, méthodes de culture ou d'élevage). Les offres publiées doivent refléter la disponibilité réelle des stocks et respecter les normes de qualité en vigueur.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            3. Engagements des Acheteurs
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            L'acheteur s'engage à respecter les termes de commande définis avec le producteur ou la coopérative et à effectuer les règlements selon les modalités convenues lors de la transaction.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            4. Modalités de Paiement et Sécurité
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            Les transactions réalisées sur la plateforme sont conçues pour assurer une juste rémunération directe au producteur. Tout abus, tentative de fraude ou non-respect récurrent des engagements entraînera le blocage immédiat du compte utilisateur.
          </p>

          <strong style={{ display: "block", color: "#064E3B", marginTop: 24, marginBottom: 8, fontSize: "1.1rem" }}>
            5. Modification des Conditions
          </strong>
          <p style={{ lineHeight: 1.7, color: "#334155" }}>
            LADINI se réserve le droit de modifier les présentes CGU à tout moment afin d'adapter les services aux évolutions légales et techniques. L'utilisation continue de la plateforme vaut acceptation des mises à jour.
          </p>

          {/* Contact Support */}
          <div style={{ background: "#F8FAFC", padding: 24, borderRadius: 16, border: "1px solid #E2E8F0", marginTop: 40 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#064E3B", marginBottom: 10 }}>
              Questions sur nos conditions ?
            </h3>
            <p style={{ fontSize: "0.9rem", color: "#64748B", marginBottom: 16 }}>
              Notre équipe d'assistance est joignable pour répondre à vos demandes :
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