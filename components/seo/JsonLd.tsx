// Injecte un ou plusieurs blocs JSON-LD. Composant serveur (rendu dans le HTML initial).
// Le remplacement de "<" empêche une valeur utilisateur de fermer la balise <script>.
export default function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\u003c') }}
        />
      ))}
    </>
  );
}
