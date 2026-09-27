/*
 * A Entrada da landing: cada arquivo chega com o nome que o celular deu, é
 * lido (o palpite aparece), ganha o nome no padrão e sai para a pasta. Um
 * arquivo de cada vez, devagar o bastante para ler; quando a fila acaba, ela
 * volta. Com "reduzir movimento", mostra tudo já guardado, parado.
 */
(() => {
  const palco = document.querySelector('[data-entrada]');
  if (!palco) return;
  const fila = palco.querySelector('[data-fila]');
  const restam = palco.querySelector('[data-restam]');
  const ultimo = palco.querySelector('[data-ultimo]');
  const itens = [...fila.querySelectorAll('[data-item]')];
  const parado = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const caminhoDe = (li) => `${li.querySelector('.arq__onde').textContent}\\${li.querySelector('.arq__depois').textContent}`;

  // Onde um nome ou caminho pode quebrar: depois de cada "\" e "_", entre as
  // partes, e nunca no meio de uma palavra — o nome limpo é o que a página mostra.
  const comQuebras = (texto) => texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\_])/g, '$1<wbr>');
  for (const el of document.querySelectorAll('.arq__antes, .arq__depois, .arq__onde, .mono-lista li, .explorador__arquivos li')) {
    const b = el.querySelector('b');
    if (b) b.innerHTML = comQuebras(b.textContent);
    for (const no of [...el.childNodes]) {
      if (no.nodeType !== Node.TEXT_NODE) continue;
      const trecho = document.createElement('span');
      trecho.innerHTML = comQuebras(no.textContent);
      no.replaceWith(...trecho.childNodes);
    }
  }
  const mostraUltimo = (texto) => { ultimo.innerHTML = comQuebras(texto); };

  // Parado, a prova continua de pé: o nome que o celular deu, riscado, sobre
  // o nome novo e o caminho. O contador diz o que a tela mostra.
  if (parado) {
    for (const li of itens) li.dataset.estado = 'guardado';
    palco.querySelector('.entrada__conta').innerHTML = `<b>${itens.length}</b> guardados`;
    mostraUltimo(caminhoDe(itens[0]));
    return;
  }

  const espera = (ms) => new Promise((pronto) => setTimeout(pronto, ms));
  // Só anda com a página à vista: numa aba escondida o ciclo pararia no meio.
  const visivel = () => new Promise((pronto) => {
    if (!document.hidden) return pronto();
    document.addEventListener('visibilitychange', function volta() {
      if (!document.hidden) { document.removeEventListener('visibilitychange', volta); pronto(); }
    });
  });

  async function ciclo() {
    for (;;) {
      for (const li of itens) { li.dataset.estado = ''; fila.append(li); }
      restam.textContent = String(itens.length);
      await espera(1400);
      for (const [i, li] of itens.entries()) {
        await visivel();
        li.dataset.estado = 'lendo';
        await espera(1100);
        li.dataset.estado = 'nomeado';
        await espera(1700);
        li.dataset.estado = 'saiu';
        mostraUltimo(caminhoDe(li));
        ultimo.removeAttribute('data-novo');
        void ultimo.offsetWidth;
        ultimo.setAttribute('data-novo', '');
        restam.textContent = String(itens.length - i - 1);
        await espera(650);
      }
      await espera(2600);
    }
  }
  void ciclo();
})();

