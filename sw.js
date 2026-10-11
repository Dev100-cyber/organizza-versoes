/*
 * O service worker do site (spec 0154, C4). Escrito à mão, sem dependência.
 *
 * Faz duas coisas:
 *
 * 1. Recebe o que chega pelo "Compartilhar" do Android (Web Share Target):
 *    o WhatsApp, a galeria ou qualquer app manda os arquivos num POST para
 *    /compartilhar. Eles ficam no banco do navegador (IndexedDB) e a página
 *    abre; o app os pega de lá e pergunta para onde vão. No iPhone, o Safari
 *    não oferece isso a um site, e o caminho é o botão do meio.
 *
 * 2. Deixa o app abrir sem internet: o que já foi baixado uma vez (os
 *    arquivos com hash no nome não mudam nunca) vem da cópia guardada. A
 *    página em si vem sempre da rede, quando há rede, para a versão nova
 *    chegar no mesmo dia.
 *
 * O nome da cópia leva a versão: o 0.2.59 é trocado na montagem do site,
 * e a versão nova apaga as cópias da anterior.
 */
const COPIA = 'organizza-0.2.59';
const BANCO = 'organizza-compartilhados';
const LOJA = 'lote';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const nome of await caches.keys()) if (nome.startsWith('organizza-') && nome !== COPIA) await caches.delete(nome);
    await self.clients.claim();
  })());
});

function guardaCompartilhados(arquivos) {
  return new Promise((ok, erro) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { autoIncrement: true });
    pedido.onerror = () => erro(pedido.error);
    pedido.onsuccess = () => {
      const banco = pedido.result;
      const tx = banco.transaction(LOJA, 'readwrite');
      // Um File vai inteiro: o nome e o tipo junto com o conteúdo.
      for (const arquivo of arquivos) tx.objectStore(LOJA).add(arquivo);
      tx.oncomplete = () => { banco.close(); ok(); };
      tx.onerror = () => { banco.close(); erro(tx.error); };
    };
  });
}

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (url.origin !== self.location.origin) return;

  if (ev.request.method === 'POST' && url.pathname === '/compartilhar') {
    ev.respondWith((async () => {
      try {
        const dados = await ev.request.formData();
        const arquivos = dados.getAll('arquivos').filter((a) => a instanceof File && a.size > 0);
        if (arquivos.length) await guardaCompartilhados(arquivos);
      } catch {
        // Sem banco, nada se guarda; a página abre do mesmo jeito.
      }
      return Response.redirect('/?compartilhado=1', 303);
    })());
    return;
  }

  if (ev.request.method !== 'GET') return;

  // Os arquivos com hash no nome: da cópia, e da rede só na primeira vez.
  if (url.pathname.startsWith('/assets/')) {
    ev.respondWith((async () => {
      const copia = await caches.open(COPIA);
      const guardado = await copia.match(ev.request);
      if (guardado) return guardado;
      const resposta = await fetch(ev.request);
      if (resposta.ok) await copia.put(ev.request, resposta.clone());
      return resposta;
    })());
    return;
  }

  // A página: da rede, guardando a última; sem rede, a última que abriu.
  if (ev.request.mode === 'navigate') {
    ev.respondWith((async () => {
      const copia = await caches.open(COPIA);
      try {
        const resposta = await fetch(ev.request);
        if (resposta.ok) await copia.put('/', resposta.clone());
        return resposta;
      } catch {
        return (await copia.match('/')) ?? Response.error();
      }
    })());
  }
});
