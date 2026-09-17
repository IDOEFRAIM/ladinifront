import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Politique de Confidentialité | Ladini",
  description: "Politique de confidentialité et de protection des données personnelles de la plateforme Ladini .",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-gray-100">
        
        {/* En-Tête */}
        <div className="border-b border-gray-100 pb-6 mb-8">
          <Link href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Politique de Confidentialité</h1>
          <p className="text-sm text-gray-500 mt-1">Dernière mise à jour : Septembre 2026</p>
        </div>

        {/* Corps du texte */}
        <div className="space-y-6 text-gray-700 leading-relaxed">
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Bienvenue sur <strong>Ladini </strong>. La protection de vos données personnelles est une priorité pour nous. 
              La présente Politique de Confidentialité explique comment nous collectons, utilisons, protégeons et partageons vos informations 
              lorsque vous utilisez notre plateforme web, ainsi que nos services de messagerie et de commande (via WhatsApp et SMS).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
            <p>Dans le cadre de nos activités de mise en relation entre producteurs, éleveurs et acheteurs, nous sommes amenés à collecter :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Informations d&apos;identification :</strong> Nom, prénom, numéro de téléphone (utilisé pour les interactions WhatsApp/SMS) et localisation géographique (région, coopérative).</li>
              <li><strong>Données professionnelles et transactionnelles :</strong> Produits proposés ou recherchés, volumes, prix, et historique des commandes ou des annonces publiées.</li>
              <li><strong>Données de communication :</strong> Échanges avec nos agents conversationnels pour assurer le suivi de vos requêtes et de votre panier.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Utilisation des données</h2>
            <p>Vos données sont exclusivement utilisées pour :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Faciliter la mise en relation directe entre producteurs et acheteurs (restaurants, particuliers, groupements).</li>
              <li>Gérer et valider les tunnels de commande et les options de tarification.</li>
              <li>Envoyer des notifications de suivi de commande par WhatsApp, SMS ou interface web.</li>
              <li>Améliorer la sécurité de la plateforme et prévenir les abus ou fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Partage et sécurité des données</h2>
            <p>
              Ladini ne vend ni ne loue vos données personnelles à des tiers. Vos informations de contact ne sont partagées qu&apos;avec 
              la partie prenante d&apos;une transaction validée (par exemple, transmettre le numéro et l&apos;adresse au producteur partenaire pour la livraison).
            </p>
            <p className="mt-2">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles robustes (chiffrement des flux, hébergement sécurisé sur AWS) 
              pour protéger vos informations contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Vos droits</h2>
            <p>
              Conformément aux réglementations en vigueur, vous disposez d&apos;un droit d&apos;accès, de rectification, de mise à jour ou de suppression 
              de vos données personnelles. Pour exercer ces droits, vous pouvez nous contacter directement via les canaux officiels de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité ou à la gestion de vos données sur Ladini, vous pouvez nous joindre à l&apos;adresse suivante :{" "}
              <a href="mailto:idoefraim06@gmail.com" className="text-emerald-600 underline hover:text-emerald-700 mr-2">
                contact@Ladini.org
              </a>
              <a href="https://wa.me/+22601479800" className="text-emerald-600 underline hover:text-emerald-700 mr-2"></a>
            </p>
          </section>

        </div>

        {/* Pied de page */}
        <div className="border-t border-gray-100 mt-10 pt-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Ladini . Tous droits réservés.</p>
        </div>

      </div>
    </main>
  );
}