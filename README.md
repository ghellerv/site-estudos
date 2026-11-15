# caderninho.

Site para estudar para concursos por metas semanais: cada disciplina tem um caminho de atividades (teoria, mapeamento, questões, revisão e teste) e cada meta mistura as próximas atividades de todas as disciplinas. Login com Google e dados separados por pessoa.

- Front-end: React + Vite + TypeScript (`src/`)
- Login e banco: Firebase Authentication (Google) e Cloud Firestore
- Hospedagem: GitHub Pages, publicado automaticamente a cada push na `main`

## Como funciona

- **Meus planejamentos** (`src/pages/Planos.tsx`, `PlanoEditor.tsx`, `DisciplinaEditor.tsx`): quem monta o plano cadastra as disciplinas. Aprendiz recebe uma lista de PDFs com páginas; Expert recebe blocos de tópicos. O caminho é gerado em `src/lib/caminho.ts`.
- **Meta** (`src/pages/Meta.tsx`): a meta da semana é montada em `src/lib/meta.ts` conforme o total de atividades do plano e a cota de cada disciplina. Questões e testes abaixo do limite voltam como reforço na meta seguinte.
- **Aprofundamentos, Arquivo, Desempenho e Jornada**: telas de apoio em `src/pages/`.
- Dados no Firestore: `plans/{plano}` com as subcoleções `disciplines`, `metas` e `aprofundamentos` (`src/lib/store.ts`). As regras estão em `firestore.rules`.

## Rodar localmente

```bash
npm install
npm run dev     # abra com ?demo=1 na URL para usar sem login, com dados só no navegador
npm test        # testes das regras do método
```

## Configuração

- `src/lib/firebaseConfig.ts`: configuração pública do app web do Firebase.
- `firestore.rules`: regras de segurança. Cole o conteúdo em Firestore → Regras → Publicar.
- No Firebase, em Authentication → Configurações → Domínios autorizados, inclua `<usuario>.github.io`.
