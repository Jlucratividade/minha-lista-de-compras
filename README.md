# Minha Lista de Compras

PWA de lista de compras em português do Brasil, feito para o celular Android: adicione produtos digitando ou por voz, marque o que já comprou e use o app instalado na tela inicial. Tudo funciona **sem backend, sem login e sem conta**: a lista fica salva apenas no aparelho.

**Tecnologias:** React 19 + TypeScript, Vite, `vite-plugin-pwa` (Web App Manifest + Service Worker), IndexedDB (via `idb`), Web Speech API (`pt-BR`), Vitest + Testing Library, GitHub Actions.

## Arquitetura resumida

```
src/
  components/        Componentes reutilizáveis (formulário, item, filtros, diálogos, avisos)
  pages/             HomePage: tela principal que junta os componentes
  hooks/             useShoppingList (estado + persistência), useSpeechRecognition (fases da voz)
  services/
    parser/          Texto falado → itens estruturados (sem dependência de interface)
    storage/         IndexedDB: abertura do banco e repositório de itens
    speech/          Web Speech API: criação do reconhecedor, tradução de erros
  utils/ types/ styles/ test/
public/              favicon e ícones PNG (192, 512, maskable)
scripts/             gerador dos ícones (npm run icons)
.github/workflows/   deploy.yml (testes, build e publicação no GitHub Pages)
```

A interface só conversa com os hooks; os hooks usam os três serviços independentes. Uma alteração só aparece na tela depois que o IndexedDB confirmou a gravação; se falhar, o app mostra o erro e **não** diz que salvou.

## Como executar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install          # instala as dependências
npm run dev          # servidor de desenvolvimento (http://localhost:5173/minha-lista-de-compras/)
npm test             # testes automatizados (Vitest)
npm run typecheck    # checagem de tipos
npm run build        # build de produção na pasta dist/
npm run preview      # serve o build de produção localmente
```

O Service Worker só é gerado no build; para testar o modo PWA/offline use `npm run build && npm run preview`.

## Publicar no GitHub Pages (passo a passo)

1. Crie um repositório no GitHub (por exemplo, `minha-lista-de-compras`) e envie o código:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
   git push -u origin main
   ```
2. No GitHub, abra **Settings → Pages** e, em **Build and deployment → Source**, escolha **GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` roda a cada push na branch `main`: instala dependências (`npm ci`), executa os testes, gera o build e publica a pasta `dist`. Acompanhe na aba **Actions**.
4. O site ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

### Nome do repositório (caminho base)

O GitHub Pages publica em um subdiretório com o nome do repositório. O workflow já passa `VITE_BASE=/<nome-do-repositório>/` automaticamente, então **não é preciso editar nada** se você renomear o repositório. Para rodar/gerar localmente com outro nome:

```bash
VITE_BASE=/outro-nome/ npm run build
```

Para domínio próprio ou repositório `usuario.github.io`, use `VITE_BASE=/`. O valor padrão (usado em `npm run dev`) está em `DEFAULT_BASE`, no `vite.config.ts`.

## Instalar no Android

Abra o endereço do site no **Chrome** do Android, toque no menu (⋮) e escolha **Instalar app** (ou **Adicionar à tela inicial**). O app abre em tela cheia, como um aplicativo nativo.

## Como usar

- **Digitando:** preencha o produto e, se quiser, a quantidade (`2`, `1,5 kg`, `3 pacotes`, `meia dúzia`) e toque em **Adicionar**.
- **Por voz:** toque em **Adicionar por voz**, fale, revise (ou edite) o texto reconhecido e confirme. Nada entra na lista antes da confirmação.
  - “Adicionar dois litros de leite.”
  - “Comprar um quilo de arroz.”
  - “Uma dúzia de ovos e dois pacotes de café.”
  - “Cinco bananas, um pão e três caixas de leite.”
- Toque no item para marcar como comprado; use os ícones para editar ou excluir. Há filtros (Todos, Pendentes, Comprados), **Remover comprados** e **Limpar lista** (ambos pedem confirmação).
- Itens duplicados (mesmo nome, ignorando maiúsculas e acentos) não são criados duas vezes; se o item igual já estava comprado, ele volta para pendente.

### Interpretador de comandos

Fica em `src/services/parser/` e não depende da interface. Reconhece algarismos e números por extenso (até 999), “dúzia”, “meia dúzia”, “um quilo e meio”, unidades (kg, g, ml, litros, unidades, pacotes, caixas, garrafas, latas) e separadores (vírgula, ponto, “e”). É conservador: se não achar o nome do produto, ou se a quantidade parecer absurda, mostra um aviso para você revisar em vez de inventar dados.

## Privacidade

- Nenhum dado sai do aparelho; não há servidor, conta, analytics ou rastreamento.
- O app **não grava nem guarda áudio**; só o texto reconhecido é usado.
- Atenção: em vários navegadores (incluindo o Chrome do Android), o reconhecimento de voz envia o áudio ao serviço de voz do próprio navegador/sistema. Isso é feito pelo navegador, não pelo app.

## Limitações conhecidas

- **Reconhecimento de voz depende do navegador.** Funciona no Chrome/Edge do Android e desktop; Firefox não oferece a Web Speech API e o suporte no Safari é parcial. Sem suporte, o app mostra uma explicação e todas as funções de digitação continuam disponíveis.
- **A voz pode exigir internet.** A interface e a lista funcionam offline, mas o reconhecimento de voz normalmente usa serviços de rede do navegador/sistema, então pode falhar sem conexão. Não prometemos voz offline.
- **A permissão do microfone** é pedida pelo navegador. Se for negada, é preciso liberar nas configurações do site. Em PWAs instalados no Android, a permissão segue a do Chrome.
- **Funcionamento offline** vale depois da primeira abertura com internet (o Service Worker precisa guardar os arquivos). Atualizações do app só são aplicadas quando você toca em **Atualizar**.
- **Sem sincronização** entre aparelhos; limpar os dados do site no navegador apaga a lista. O modo de navegação privada pode não permitir o armazenamento (o app mostra um erro claro).
- O interpretador cobre os padrões comuns do português; frases muito complexas ou nomes de produtos que comecem com números/unidades podem precisar de ajuste manual na revisão.
- Números por extenso acima de 999 não são interpretados.
- O ícone do app foi gerado por script (`npm run icons`); troque os PNGs em `public/icons/` para usar sua própria arte.

## Checklist final de validação

- [ ] `npm test` passa (parser, lista, voz, build em subdiretório).
- [ ] `npm run build` termina sem erros.
- [ ] `npm run preview`: app abre sem erros no console, lista recarrega após atualizar a página.
- [ ] Chrome → DevTools → Application: manifest sem avisos, ícones 192/512/maskable, Service Worker ativo.
- [ ] Sem internet (DevTools → Network → Offline), o app abre e a lista é consultável e editável.
- [ ] No Android: instalar, abrir em tela cheia, testar o microfone e a permissão.
- [ ] Settings → Pages → Source = **GitHub Actions**; workflow concluído com sucesso; site abre em `https://USUARIO.github.io/REPOSITORIO/`.
