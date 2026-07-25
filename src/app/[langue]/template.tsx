import { Transition } from "@/components/motion/Transition";

/**
 * Le template se réinstancie à chaque navigation — c'est ce qui distingue un
 * `template` d'un `layout`. On s'en sert comme point d'accroche de la couture
 * inter-routes : le layout (canvas, chrome, providers) ne se démonte jamais,
 * seul ce qu'il enveloppe change, sous le masque de `Transition`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <Transition>{children}</Transition>;
}
