/**
 * Le parcours. Pour l'instant : le socle seulement.
 * Les chapitres — Seuil, Vestibule, Enfilade, Chambre, Matière, Atelier,
 * Archives, Sortie — sont montés par les missions suivantes.
 */
export default function Parcours() {
  return (
    <main id="contenu" className="grille min-h-screen items-end pb-16">
      <div className="col-span-12 md:col-start-2 md:col-span-8">
        <p className="technique">Atelier fondé 2011 — Paris VII</p>
        <p className="display mt-6 text-titre text-craie">
          Je ne décore pas. Je règle la lumière, la matière et le{" "}
          <em>silence</em>. Le reste appartient aux gens qui vivent là.
        </p>
        <p className="technique mt-6">Camille Rouvière</p>
      </div>
      <p className="technique col-span-12 mt-16 md:col-start-2 md:col-span-4">
        14 rue de Beaune, Paris VII
      </p>
    </main>
  );
}
