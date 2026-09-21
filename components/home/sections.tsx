// Sections de la page d'accueil — Server Components (HTML complet pour Google, zéro JS de rendu).
// Les animations d'apparition passent par <RevealSection>/<RevealItem> (petits wrappers clients).
import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  Sprout, Leaf, Fish, Beef, ArrowRight, Globe, Mic, ShieldCheck, Store, Handshake,
  Wallet, MapPin, Bot, Plus, Star, ShoppingBag, Users, HeartHandshake,
  MessageSquare, Zap, Smartphone,
} from 'lucide-react';
import GlassCard from './GlassCard';
import { RevealItem, RevealSection } from './Reveal';
import MarketFlowSvg from './MarketFlowSvg';
import PartnersCarousel, { type Cooperative } from './PartnersCarousel';
import { C, F } from './tokens';

type Icon = ComponentType<{ size?: number; color?: string }>;

/* ---------- Décor (CSS pur, position fixe, aucune hydratation) ---------- */

export function HomeBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-8%', right: '-5%', width: '45vw', height: '45vw', borderRadius: '60% 40% 50% 70% / 50% 60% 40% 60%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', animation: 'home-blob-a 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-8%', width: '50vw', height: '50vw', borderRadius: '40% 60% 70% 30% / 60% 30% 70% 40%', background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)', animation: 'home-blob-b 25s ease-in-out infinite' }} />
      {[10, 25, 45, 65, 82].map((left, i) => (
        <div key={left} style={{ position: 'absolute', left: `${left}%`, top: 0, animation: `home-leaf ${16 + i * 2}s linear ${i * 2.5}s infinite`, opacity: 0 }}>
          <Leaf size={16} color={C.emerald} style={{ opacity: 0.35 }} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Micro-composants ---------- */

function StatCard({ icon: Icon, label, value, accentBg, accentText }: {
  icon: Icon; label: string; value: string; accentBg: string; accentText: string;
}) {
  return (
    <RevealItem variant="scalePop">
      <GlassCard style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={accentText} />
          </div>
        </div>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, fontWeight: 500 }}>{label}</div>
          <div style={{ fontFamily: F.heading, fontSize: '1.65rem', fontWeight: 800, color: C.forest, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
        </div>
      </GlassCard>
    </RevealItem>
  );
}

function SectionHeading({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <RevealItem style={{ textAlign: 'center', marginBottom: 56 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', marginBottom: 16 }}>
        <Sprout size={14} color={C.emerald} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.body }}>{tag}</span>
      </div>
      <h2 style={{ fontFamily: F.heading, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: C.forest, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{title}</h2>
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: '1.05rem', marginTop: 12, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
    </RevealItem>
  );
}

/* ======= HERO — H1 et texte présents dans le HTML initial, animation 100 % CSS (LCP non retardé) ======= */

export function HeroSection() {
  const trust: { icon: Icon; label: string; color: string }[] = [
    { icon: Handshake, label: '8 coopératives partenaires', color: C.emerald },
    { icon: Wallet, label: 'Paiement direct au producteur', color: C.amber },
    { icon: ShieldCheck, label: 'Traçabilité de la ferme à l’assiette', color: C.statBlue },
  ];
  const rise = (d: number) => ({ '--d': `${d}s` }) as React.CSSProperties;

  return (
    <header style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', padding: '0 6%', overflow: 'hidden' }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 20%, rgba(16,185,129,0.09) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(217,119,6,0.05) 0%, transparent 50%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <div className="hero-rise" style={{ ...rise(0.05), display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, marginBottom: 28 }}>
          <div className="anim-pulse" style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald }} />
          <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.forest, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            LADINI &bull; Marché Agricole
          </span>
        </div>

        <h1 className="hero-rise" style={{ ...rise(0.15), fontFamily: F.heading, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', fontWeight: 800, lineHeight: 1.15, color: C.forest, letterSpacing: '-0.03em', textAlign: 'center' }}>
          {'Quand '}
          <span style={{ background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            producteur et acheteur
          </span>
          <br />
          <span style={{ fontStyle: 'italic', fontWeight: 600, color: C.emerald }}>se rencontrent...</span>
        </h1>

        <p className="hero-rise" style={{ ...rise(0.3), fontFamily: F.body, fontSize: '1.2rem', color: C.muted, lineHeight: 1.6, marginTop: 24, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', fontWeight: 500 }}>
          
          <strong style={{ fontWeight: 700, color: C.forest }}>LADINI</strong>
          {' connecte directement nos producteurs aux restaurants et commerces. '}
          <span style={{ display: 'block', marginTop: 6, fontStyle: 'italic', color: C.emerald, fontWeight: 600 }}>Un marché direct, juste et transparent.</span>
        </p>

        <div className="hero-rise" style={{ ...rise(0.45), display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/signup?role=seller" className="btn-pop" style={{ fontFamily: F.body, background: C.forest, color: C.white, padding: '16px 32px', borderRadius: 100, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', boxShadow: '0 10px 32px rgba(6,78,59,0.14)' }}>
            <Sprout size={16} /> Je vends ma production
          </Link>
          <Link href="/signup?role=buyer" className="btn-pop" style={{ fontFamily: F.body, background: C.glass, backdropFilter: 'blur(16px)', color: C.forest, padding: '16px 32px', borderRadius: 100, border: `1px solid ${C.border}`, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Store size={16} /> Je suis un acheteur <ArrowRight size={16} />
          </Link>
        </div>

        <div className="hero-rise" style={{ ...rise(0.6), display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {trust.map((b, i) => (
            <div key={b.label} className="anim-float" style={{ ...rise(i * 0.4), display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 100, background: C.glassBold, border: `1px solid ${C.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
              <b.icon size={14} color={b.color} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F.body }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ======= AGENT IA ======= */

export function AIAgentSection() {
  const cards: { icon: Icon; color: string; bg: string; t: string; d: string }[] = [
    { icon: MessageSquare, color: C.emerald, bg: 'rgba(16,185,129,0.1)', t: 'Commandes & Ventes par Chat', d: 'Publiez vos récoltes ou passez commande simplement en envoyant un message vocal ou texte sur WhatsApp et SMS.' },
    { icon: Zap, color: C.amber, bg: 'rgba(217,119,6,0.1)', t: 'Mise en Relation Automatique', d: "L'IA analyse les besoins des acheteurs et les stocks disponibles pour faire le matching parfait instantanément." },
    { icon: Smartphone, color: C.statBlue, bg: 'rgba(2,132,199,0.1)', t: 'Conseils & Prix du Marché', d: 'Obtenez des recommandations de prix équitables et un suivi agronomique directement dans votre canal habituel.' },
  ];
  return (
    <section style={{ padding: '80px 6%', background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(16,185,129,0.1)', border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <Bot size={16} color={C.emerald} />
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.forest, textTransform: 'uppercase', letterSpacing: '0.05em' }}>L&apos;IA au service du terrain</span>
          </div>
          <h2 style={{ fontFamily: F.heading, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>
            Un Agent IA intelligent, accessible par WhatsApp &amp; SMS
          </h2>
          <p style={{ fontFamily: F.body, fontSize: '1.1rem', color: C.muted, maxWidth: 650, margin: '16px auto 0', lineHeight: 1.6 }}>
            Pas besoin d&apos;une connexion internet complexe. Notre assistant virtuel connecte directement producteurs et acheteurs en temps réel.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {cards.map((c) => (
            <article key={c.t} className="lift" style={{ background: '#FFFFFF', padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <c.icon size={24} color={c.color} />
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 700, color: C.forest, marginBottom: 10 }}>{c.t}</h3>
              <p style={{ fontFamily: F.body, fontSize: '0.95rem', color: C.muted, lineHeight: 1.6 }}>{c.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======= KPI ======= */

export function KPIStrip() {
  return (
    <RevealSection style={{ padding: '0 6%', maxWidth: 1280, margin: '-40px auto 0', position: 'relative', zIndex: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <StatCard icon={Handshake} label="Coopératives Partenaires" value="8" accentBg="#EFF6FF" accentText={C.statBlue} />
        <StatCard icon={Sprout} label="Filières couvertes" value="3" accentBg="#F0FDF4" accentText={C.statGreen} />
        <StatCard icon={Wallet} label="Du prix de vente pour le producteur" value="100%" accentBg="#FFFBEB" accentText={C.statAmber} />
        <StatCard icon={Store} label="Intermédiaire entre vous et l'acheteur" value="0" accentBg="#FFF1F2" accentText={C.statRose} />
      </div>
    </RevealSection>
  );
}

/* ======= COMMENT ÇA MARCHE ======= */

export function HowItWorksSection() {
  const steps: { icon: Icon; t: string; d: string }[] = [
    { icon: ShoppingBag, t: 'Offre en direct', d: 'Les producteurs publient leurs récoltes et produits disponibles en toute autonomie, avec des prix et des quantités clairs.' },
    { icon: Handshake, t: 'Commande simplifiée', d: 'Restaurants, commerces et institutions choisissent leurs produits en ligne et échangent directement avec les producteurs.' },
    { icon: ShieldCheck, t: 'Paiement & livraison directs', d: "Chaque transaction est sécurisée. L'acheteur est livré en toute sérénité, et la valeur va directement à celui qui produit." },
  ];
  return (
    <RevealSection margin="-80px" style={{ padding: '100px 6% 40px', maxWidth: 1280, margin: '0 auto' }}>
      <SectionHeading tag="Comment ça marche" title="Une connexion simple en trois étapes" subtitle="Une plateforme pensée pour rapprocher les métiers de la terre et de la table en toute transparence." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginTop: 40 }}>
        {steps.map((s, i) => (
          <RevealItem key={s.t}>
            <GlassCard style={{ padding: 32, height: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <s.icon size={22} color={C.emerald} />
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.emerald, background: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: 20 }}>{`0${i + 1}`}</span>
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, marginBottom: 10 }}>{s.t}</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', lineHeight: 1.6 }}>{s.d}</p>
            </GlassCard>
          </RevealItem>
        ))}
      </div>
    </RevealSection>
  );
}

/* ======= PRODUCTEURS ======= */

export function ProducersSection() {
  const groups: { icon: Icon; t: string; d: string; color: string; bg: string }[] = [
    { icon: Sprout, t: 'Agriculteurs', d: 'Céréales, légumes et cultures vivrières vendus directement depuis le champ.', color: C.emerald, bg: '#F0FDF4' },
    { icon: Beef, t: 'Éleveurs', d: 'Bétail et produits d’élevage proposés en direct aux acheteurs professionnels.', color: C.amber, bg: '#FFFBEB' },
    { icon: Fish, t: 'Pisciculteurs', d: 'Poissons frais d’élevage local, livrés sans passer par des revendeurs multiples.', color: C.statBlue, bg: '#EFF6FF' },
  ];
  return (
    <RevealSection style={{ padding: '60px 6%', maxWidth: 1280, margin: '0 auto' }}>
      <SectionHeading tag="Nos Producteurs" title="Toute la ferme, un seul marché" subtitle="Trois familles de producteurs, une seule promesse : le juste prix, directement dans leurs mains." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
        {groups.map((g) => (
          <RevealItem key={g.t} variant="scalePop">
            <GlassCard style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <g.icon size={26} color={g.color} />
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>{g.t}</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>{g.d}</p>
            </GlassCard>
          </RevealItem>
        ))}
      </div>
    </RevealSection>
  );
}

/* ======= MARCHÉ DIRECT ======= */

export function MarketFlowSection() {
  return (
    <RevealSection style={{ padding: '60px 6%', maxWidth: 1280, margin: '0 auto' }}>
      <GlassCard style={{ padding: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(59,130,246,0.08)', marginBottom: 12 }}>
              <Globe size={14} color={C.statBlue} />
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.statBlue, textTransform: 'uppercase' }}>Marché Direct</span>
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 800, color: C.forest }}>Producteur → Acheteur, sans détour</h3>
            <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', marginTop: 8, maxWidth: 480 }}>
              Restaurants, commerces et institutions passent commande directement auprès des agriculteurs, éleveurs et pisciculteurs partenaires.
            </p>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: F.mono }}>0 intermédiaire</div>
        </div>
        <MarketFlowSvg />
      </GlassCard>
    </RevealSection>
  );
}

/* ======= VALEURS ======= */

export function ValuesSection() {
  const values: { icon: Icon; t: string; d: string }[] = [
    { icon: Wallet, t: 'Un modèle juste, d’humain à humain', d: 'Derrière chaque récolte, il y a des semaines de labeur. Nous veillons à ce que le producteur soit rémunéré à la hauteur de ses efforts, tout en offrant aux acheteurs des prix honnêtes, sans intermédiaires qui gonflent la note.' },
    { icon: Mic, t: 'Inclusif, dans la langue du cœur', d: 'La technologie ne doit laisser personne au bord du chemin. Que ce soit sur le Web, WhatsApp, par SMS ou vocalement en Mooré, Dioula et Fulfuldé(dans nos futures versions), chacun peut échanger et vendre en toute liberté.' },
    { icon: ShieldCheck, t: 'La confiance comme seule promesse', d: "Savoir d'où vient ce que l'on met dans nos assiettes, c'est essentiel. Nous tissons des liens de transparence durables pour que chaque commande soit une poignée de main sincère entre le champ et la table." },
  ];
  return (
    <RevealSection style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <RevealItem>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', marginBottom: 20 }}>
            <Leaf size={14} color={C.amber} />
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ce qui nous anime</span>
          </div>
          <h2 style={{ fontFamily: F.heading, fontSize: '2.3rem', fontWeight: 800, color: C.forest, lineHeight: 1.2, marginBottom: 28 }}>
            Redonner du sens<br />
            <span style={{ color: C.amber }}>à chaque lien qu&apos;on tisse.</span>
          </h2>
          {values.map((item) => (
            <div key={item.t} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <item.icon size={22} color={C.emerald} />
              </div>
              <div>
                <h3 style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '1.1rem', color: C.forest, marginBottom: 4 }}>{item.t}</h3>
                <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', lineHeight: 1.6 }}>{item.d}</p>
              </div>
            </div>
          ))}
        </RevealItem>

        <RevealItem variant="scalePop">
          <GlassCard style={{ padding: 48, textAlign: 'center', background: C.glassBold, borderRadius: 24, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <HeartHandshake color={C.emerald} size={36} />
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: '1.45rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Plus qu&apos;une technologie, une alliance pour notre terre
            </h3>
            <p style={{ fontFamily: F.body, fontSize: '0.98rem', fontWeight: 500, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
              Derrière Ladini, il y a des hommes et des femmes qui travaillent la terre et d&apos;autres qui nourrissent nos villes. Notre rôle est simplement d&apos;être le pont qui les rassemble, dans le respect et la fraternité.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28, justifyContent: 'center', padding: '10px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.05)' }}>
              <Users size={18} color={C.emerald} />
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.forest }}>Déjà 8 coopératives et fermiers partenaires à nos côtés</span>
            </div>
          </GlassCard>
        </RevealItem>
      </div>
    </RevealSection>
  );
}

/* ======= RÉSEAU / PARTENAIRES (carrousel = seul îlot client) ======= */

// Données normalisées (orthographe, casse, une filière par entrée) — l'affichage n'a plus à « nettoyer » du texte brut.
const COOPERATIVES: Cooperative[] = [
  { name: 'AFEN', types: ['Agroalimentaire'], location: 'Kadiogo' },
  { name: 'Coopérative Namaneb zanga', types: ['Maraîchers'], location: 'Ouagadougou' },
  { name: 'Fromagerie Gariko', types: ['Laitiers'], location: 'Kadiogo' },
  { name: 'Coopérative Soulama', types: ['Transformation'], location: 'Ouagadougou' },
  { name: 'COOP-Bendia', types: ['Maraîchers', 'Transformation'], location: 'Ouagadougou' },
  { name: 'UPPA', types: ['Céréales', 'Maraîchers', 'Fruits et légumes'], location: 'Kénédougou' },
  { name: 'Kosam', types: ['Laitiers'], location: 'Ouagadougou' },
  { name: 'CARTPL', types: ['Transformation'], location: 'Ouagadougou', note: 'En cours de négociation' },
];

export function PartnersSection() {
  return (
    <RevealSection style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}>
      <SectionHeading tag="Notre Réseau" title="8 coopératives connectées" subtitle="Des collectifs d'agriculteurs, d'éleveurs et de pisciculteurs engagés qui vendent en direct." />

      <RevealItem>
        <PartnersCarousel cooperatives={COOPERATIVES} />
      </RevealItem>

      <RevealItem style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0' }}>
        <div style={{ width: 2, height: 48, background: `linear-gradient(to bottom, transparent, ${C.emerald}40)` }} />
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.emerald, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${C.emerald}40`, zIndex: 2 }}>
          <Plus size={24} strokeWidth={3} />
        </div>
        <div style={{ width: 2, height: 48, background: `linear-gradient(to top, transparent, ${C.emerald}40)` }} />
      </RevealItem>

      <RevealItem style={{ maxWidth: 700, margin: '0 auto' }}>
        <GlassCard style={{ padding: '40px', border: `2px solid ${C.emerald}30`, position: 'relative', overflow: 'hidden', textAlign: 'center', background: `linear-gradient(180deg, ${C.white} 0%, rgba(16,185,129,0.03) 100%)` }}>
          <div style={{ position: 'absolute', top: 0, right: 0, background: C.emerald, color: C.white, padding: '8px 20px', borderBottomLeftRadius: 24, fontSize: 13, fontWeight: 700, fontFamily: F.heading, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '-4px 4px 12px rgba(16,185,129,0.2)' }}>
            <Star size={14} fill={C.white} /> Ambassadeur officielle
          </div>
          <div style={{ width: 80, height: 80, borderRadius: 28, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Handshake size={36} color={C.emerald} />
          </div>
          <h3 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>La Ferme d&apos;Hugo Boss</h3>
          <p style={{ fontFamily: F.body, fontSize: '1.05rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <MapPin size={16} color={C.emerald} /> Ouagadougou • Agriculture • Aviculture
          </p>
          <p style={{ fontFamily: F.body, fontSize: '1rem', color: C.muted, lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
            Un acteur agricole incontournable de notre région. Sa capacité de production et son exigence d&apos;excellence viennent renforcer massivement l&apos;offre disponible pour nos acheteurs en direct.
          </p>
        </GlassCard>
      </RevealItem>
    </RevealSection>
  );
}

/* ======= CTA FINALE ======= */

export function FinalCTASection() {
  return (
    <RevealSection style={{ padding: '40px 6% 100px', maxWidth: 1280, margin: '0 auto' }}>
      <RevealItem variant="scalePop">
        <GlassCard style={{ padding: '56px 40px', textAlign: 'center', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, border: 'none', borderRadius: 24 }}>
          <MapPin size={32} color="#fff" style={{ margin: '0 auto 20px', opacity: 0.9 }} />
          <h2 style={{ fontFamily: F.heading, fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            Producteur ou acheteur — rejoignez le marché.
          </h2>
          <p style={{ fontFamily: F.body, color: 'rgba(255,255,255,0.9)', fontSize: '1rem', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Que vous récoltiez la terre ou nourrissiez nos villes, nous simplifions chaque échange. Rejoignez une communauté déjà forte de 6 coopératives et éleveurs partenaires.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup?role=seller" className="btn-pop" style={{ fontFamily: F.body, background: '#fff', color: C.forest, padding: '16px 32px', borderRadius: 100, fontSize: '0.95rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              Je vends ma production <ArrowRight size={16} />
            </Link>
            <Link href="/signup?role=buyer" className="btn-pop" style={{ fontFamily: F.body, background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '16px 32px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              Je suis un acheteur
            </Link>
          </div>
        </GlassCard>
      </RevealItem>
    </RevealSection>
  );
}
