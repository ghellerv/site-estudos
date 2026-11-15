# Site de Estudos

Site para estudar por ciclos semanais (leitura de PDF, mapeamento, cadernos de questões e revisões), com login Google e dados por pessoa.

- Front-end: React + Vite + TypeScript
- Login e banco: Firebase Authentication (Google) e Cloud Firestore
- Hospedagem: GitHub Pages, publicado automaticamente a cada push na `main`

## Rodar localmente

```bash
npm install
npm run dev
```

## Configuração

- `src/lib/firebaseConfig.ts`: configuração pública do app web do Firebase.
- `firestore.rules`: regras de segurança. Cole o conteúdo em Firestore → Regras → Publicar.
- No Firebase, em Authentication → Configurações → Domínios autorizados, inclua `<usuario>.github.io`.
