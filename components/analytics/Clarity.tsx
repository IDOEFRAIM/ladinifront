import Script from 'next/script';

// ID de projet Clarity : public par conception (visible dans le HTML), surchargeable par env.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || 'ynu6hpqnat';

/**
 * Microsoft Clarity (replays de session, heatmaps, signaux de friction).
 * - Production uniquement : les sessions de dev ne polluent pas les données.
 * - `lazyOnload` : le script ne se charge qu'une fois la page inactive, il ne concurrence jamais
 *   le rendu initial (critique sur mobile / réseau lent).
 * - Domaines autorisés dans la CSP : middleware.ts (script-src).
 */
export default function Clarity() {
  if (process.env.NODE_ENV !== 'production' || !CLARITY_ID) return null;
  return (
    <Script id="ms-clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");`}
    </Script>
  );
}
