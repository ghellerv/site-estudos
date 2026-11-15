export const Simbolo = ({ tamanho = 34 }: { tamanho?: number }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 120 120" aria-hidden="true">
    <rect x="6" y="6" width="108" height="108" rx="32" fill="#CDBEF2" />
    <rect x="30" y="26" width="60" height="70" rx="12" fill="#FBF7F2" />
    <rect x="30" y="26" width="10" height="70" rx="5" fill="#F6C9D4" />
    <line x1="48" y1="46" x2="78" y2="46" stroke="#3A3546" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    <line x1="48" y1="60" x2="72" y2="60" stroke="#3A3546" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
    <line x1="48" y1="74" x2="66" y2="74" stroke="#3A3546" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
    <path d="M70 20 h12 v28 l-6 -5 l-6 5 z" fill="#BFE6D3" stroke="#3A3546" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
)

export const NomeMarca = () => (
  <span className="logo-nome">caderninho<i>.</i></span>
)
