import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY, companyRegistrationLines } from '@/lib/company';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: `Mentions légales du site Ladini : éditeur ${COMPANY.legalName}, coordonnées et informations d'identification de la société.`,
  alternates: { canonical: '/mentions-legales' },
  openGraph: { url: '/mentions-legales', title: 'Mentions légales | Ladini', type: 'website', siteName: 'Ladini', locale: 'fr_BF' },
};

export default function LegalNoticePage() {
  const registration = companyRegistrationLines();
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-2xl border border-gray-100">
        <div className="border-b border-gray-100 pb-6 mb-8">
          <Link href="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Mentions légales</h1>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Éditeur du site</h2>
            <p>
              Le site <strong>{SITE_URL.replace(/^https?:\/\//, '')}</strong> (plateforme <strong>{COMPANY.brand}</strong>) est édité et
              exploité par <strong>{COMPANY.legalName}</strong>.
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Raison sociale : <strong>{COMPANY.legalName}</strong></li>
              <li>Forme juridique : {COMPANY.legalForm}</li>
              <li>Pays : {COMPANY.country}</li>
              {COMPANY.address && <li>Siège social : {COMPANY.address}</li>}
              {registration.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <address className="not-italic space-y-1">
              <p>Téléphone : {COMPANY.phones.join(' / ')}</p>
              <p>E-mail : <a className="text-emerald-700 underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
            </address>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Activité</h2>
            <p>
              {COMPANY.brand} est une plateforme numérique de mise en relation directe entre producteurs agricoles, coopératives et
              acheteurs au Burkina Faso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Documents associés</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><Link className="text-emerald-700 underline" href="/cgu">Conditions Générales d&apos;Utilisation</Link></li>
              <li><Link className="text-emerald-700 underline" href="/cluf">Contrat de Licence Utilisateur</Link></li>
              <li><Link className="text-emerald-700 underline" href="/privacy">Politique de Confidentialité</Link></li>
            </ul>
          </section>
        </div>

        <div className="border-t border-gray-100 mt-10 pt-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} {COMPANY.legalName}. Tous droits réservés.</p>
        </div>
      </div>
    </main>
  );
}
