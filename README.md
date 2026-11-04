# Postframe

Extensão do Chrome que transforma um post (X/Twitter ou qualquer site que você configurar) em uma **imagem padronizada**: foto, nome, @, texto completo, imagens em mosaico, contagens e hora, dentro de um estilo que você controla.

A imagem não é um recorte da tela: ela é **montada a partir dos dados do post**, então sai sempre com 600 px de largura e até 350 KB, com a mesma aparência.

| Claro clássico | Moldura gradiente | Pôster pastel (retweet) |
|---|---|---|
| ![](mockups/images/1-tweet.png) | ![](mockups/images/3-tweet.png) | ![](mockups/images/6-retweet.png) |

## Recursos

- **Dados do post:** foto, nome, @, texto completo, hora e contagens (respostas, RTs, curtidas…). Em retweets e citações, o tweet original aparece dentro do card.
- **Imagens do post em mosaico** (1, 2, 3 ou 4), com opção de escondê-las.
- **6 estilos prontos e estilos próprios:** fonte, cores, cartão, bordas, sombra e brilho, moldura em gradiente, formato da foto, faixa no topo e mais. Duplique qualquer estilo e edite.
- **Google Fonts:** escolha uma fonte da lista ou digite qualquer família do Google Fonts.
- **Marca d'água** de texto ou imagem, posicionável por arraste, com inclinação e opção de **repetir em padrão de tijolos** com espaçamento ajustável.
- **Crédito** opcional abaixo da imagem.
- **Estilos por plataforma:** o estilo do X pode ser diferente do de outro site, e dá para duplicar um estilo e trocar a plataforma dele. O padrão também é por plataforma.
- **Qualquer site:** uma ferramenta de seleção deixa você clicar em post, nome, @, foto, texto, imagens, hora e contagens. A configuração fica salva por site.
- **Exportar e importar** estilos e plataformas em JSON.
- Liga/desliga rápido de **Crédito**, **Marca d'água** e **Imagens** na página de resultado.

## Instalação (modo desenvolvedor)

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` e ative o **modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta do projeto.

## Como usar

**No X:** passe o mouse em um tweet e clique no ícone de câmera na barra de ações. Uma nova aba abre com as imagens nos estilos disponíveis (começando pelo padrão). Baixe ou copie a que preferir.

**Em outro site:** abra o site, clique no ícone da extensão e escolha **Configurar este site**. Clique em um post inteiro e depois nos campos que quiser (nome, texto, imagens…). Salve e use **Capturar um post**.

**Estilos e plataformas:** botão direito no ícone → *Opções* (ou **Estilos…** na página de resultado).

## Privacidade e permissões

- Os estilos, plataformas e preferências ficam em `chrome.storage.local`, no seu navegador. Não há contas, servidor próprio nem análise de uso.
- A extensão acessa a rede apenas para:
  - **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`), quando você usa uma fonte do Google, para baixar a fonte;
  - **`pbs.twimg.com`**, para baixar fotos de perfil e imagens de tweets do X que entram na imagem.
- `storage`: guardar suas configurações. `activeTab` e `scripting`: abrir o painel de captura/configuração só na aba em que você clica no ícone (a extensão não tem acesso permanente a todos os sites). Os scripts automáticos rodam apenas em `x.com` e `twitter.com`.

## Limitações

- Os seletores do X (`data-testid`) podem mudar com atualizações do site.
- Em sites configurados pelo seletor, fotos bloqueadas por CORS aparecem como um avatar com a inicial, e imagens bloqueadas ficam de fora.
- Vídeos aparecem só como a capa. O seletor não enxerga shadow DOM fechado nem iframes de outro domínio.
- Postframe não é afiliado ao X Corp. "X" e "Twitter" são marcas de seus donos.

## Desenvolvimento

O código é JavaScript puro (Manifest V3), sem etapa de build.

```
manifest.json
src/            background, scripts de conteúdo, painel de seleção e módulos compartilhados
options/        página de estilos e plataformas
viewer/         página que gera e mostra as imagens
mockups/        galeria de exemplos dos estilos nativos
```

Para regenerar a galeria (`mockups/`):

```sh
npm install
npx playwright-core install chromium
npm run mockups
```

## Licença

[MIT](LICENSE)
