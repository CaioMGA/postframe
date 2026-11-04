// Dados fictícios de exemplo. Na extensão, virão do DOM do tweet.
const avatar = (letter, c1, c2) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><text x="48" y="64" font-size="46" font-family="Liberation Sans, sans-serif" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`);

const marina = { name: "Marina Alves", handle: "@marinaalves", verified: true, avatar: avatar("M", "#f97316", "#db2777") };
const pedro  = { name: "Pedro Nunes",  handle: "@pedronunes_dev", verified: false, avatar: avatar("P", "#0ea5e9", "#6366f1") };
const lucas  = { name: "Lucas Torres", handle: "@lucastorres", verified: false, avatar: avatar("L", "#10b981", "#0f766e") };

export const samples = [
  {
    id: "tweet", label: "Tweet",
    author: marina,
    stats: [{ icon: "reply", n: "128" }, { icon: "retweet", n: "1,4 mil" }, { icon: "like", n: "9,8 mil" }], time: "2026-11-04T14:32:00-03:00",
    text: "Passei o fim de semana reescrevendo um sistema legado e descobri que 60% do código nunca era executado.\n\nDeletar linhas é o melhor tipo de produtividade. 🧹\n\n#dev #refatoração"
  },
  {
    id: "retweet", label: "Retweet", kind: "repost",
    author: lucas,
    stats: [{ icon: "reply", n: "42" }, { icon: "retweet", n: "310" }, { icon: "like", n: "2,1 mil" }], time: "2026-11-04T09:05:00-03:00",
    original: {
      author: pedro,
      text: "Dica de ouro: antes de otimizar, meça.\n\nMetade das vezes o gargalo está onde você menos espera. 📉 #performance"
    }
  }
];
