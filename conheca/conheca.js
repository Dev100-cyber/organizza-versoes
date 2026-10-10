/*
 * A landing (spec 0120). Três coisas se mexem, e só elas:
 *
 * 1. A abertura: os seis arquivos soltos chegam à Entrada, ganham o palpite e
 *    o nome certo, e vão para as pastas dos clientes. Na tela larga, quem
 *    conduz é a rolagem; na estreita, a cena toca sozinha quando aparece; com
 *    "reduzir movimento", a página mostra o fim, parado.
 * 2. A adoção: o item da pasta de hoje acende o seu destino na do Organizza.
 * 3. As abas do app por dentro, com a janela reduzida inteira à largura.
 */
(() => {
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)');
  const largo = matchMedia('(min-width: 1024px) and (min-height: 620px)');
  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const trecho = (p, a, b) => limita((p - a) / (b - a));
  const suave = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const saida = (t) => 1 - Math.pow(1 - t, 3);
  const mistura = (a, b, t) => a + (b - a) * t;

  // ---------- o topo ----------

  const topo = document.querySelector('[data-topo]');
  const alturaTopo = () => topo?.offsetHeight ?? 56;
  const marcaTopo = () => topo?.toggleAttribute('data-rolou', scrollY > 4);
  addEventListener('scroll', marcaTopo, { passive: true });
  marcaTopo();

  // ---------- 1. a abertura ----------

  const abertura = document.querySelector('[data-abertura]');
  if (abertura) abertura_();

  function abertura_() {
    const fixo = abertura.querySelector('.abertura__fixo');
    const palco = abertura.querySelector('[data-palco]');
    const janela = palco.querySelector('[data-janela]');
    const vagas = [...palco.querySelectorAll('[data-vaga]')];
    const fichas = [...palco.querySelectorAll('[data-ficha]')].map((el) => ({
      el,
      antes: el.querySelector('.ficha__antes'),
      depois: el.querySelector('.ficha__depois'),
      meta: el.querySelector('.ficha__meta'),
      palpite: el.querySelector('.ficha__palpite'),
      pasta: Number(el.dataset.pastaAlvo),
    }));
    const pastas = [...palco.querySelectorAll('[data-pasta]')];
    const linhas = [...palco.querySelectorAll('[data-linha]')].sort((a, b) => a.dataset.linha - b.dataset.linha);
    const contasDasPastas = pastas.map((p) => p.querySelector('.pasta__conta'));
    const conta = palco.querySelector('[data-conta]');
    const frase = palco.querySelector('[data-frase]');
    const pronto = palco.querySelector('[data-pronto]');
    const guardar = palco.querySelector('[data-guardar]');
    const passos = [...abertura.querySelectorAll('[data-passo]')];
    const deNovo = palco.querySelector('[data-de-novo]');
    const pausa = palco.querySelector('[data-pausa]');

    // Onde cada arquivo caiu na mesa: frações do espaço que sobra, e o giro.
    const SOLTOS_LARGO = [
      { x: .03, y: .05, r: -6 }, { x: .97, y: .03, r: 4 }, { x: .34, y: .29, r: 2.5 },
      { x: .9, y: .52, r: -5 }, { x: .05, y: .76, r: 5.5 }, { x: .66, y: .97, r: -3.5 },
    ];
    const SOLTOS_ESTREITO = [
      { x: .1, y: .02, r: -4 }, { x: .9, y: .2, r: 3.5 }, { x: .2, y: .39, r: -2.5 },
      { x: .8, y: .58, r: 4.5 }, { x: .05, y: .78, r: -4 }, { x: .95, y: .97, r: 3 },
    ];
    // As três fases da história, e onde cada passo começa quando clicado.
    const FASES = [[0, .33], [.33, .56], [.56, 1]];
    const INICIO_DO_PASSO = [.2, .45, .9];
    // Com "reduzir movimento", cada passo é um quadro parado: os arquivos na
    // Entrada, com o palpite, e nas pastas.
    const QUADRO_DO_PASSO = [.32, .555, 1];

    // A posição de um elemento dentro do palco, sem as transformações: é o
    // lugar de chegada, mesmo que a janela ou a pasta ainda estejam entrando.
    const posicao = (el) => {
      let x = 0, y = 0, n = el;
      while (n && n !== palco) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, l: el.offsetWidth, a: el.offsetHeight };
    };

    let medidas = null;
    function mede() {
      const L = palco.clientWidth, A = palco.clientHeight;
      const fl = fichas[0].el.offsetWidth, fa = fichas[0].el.offsetHeight;
      const soltos = largo.matches ? SOLTOS_LARGO : SOLTOS_ESTREITO;
      medidas = {
        fl, fa,
        soltos: soltos.map((s) => ({ x: s.x * (L - fl), y: s.y * (A - fa), r: s.r })),
        vagas: vagas.map(posicao),
        // O arquivo pousa no nome dele dentro da folha, já do tamanho da linha.
        linhas: linhas.map((l) => {
          const p = posicao(l);
          const escala = limita((p.a + 6) / fa, .3, 1);
          return { x: p.x + p.l * .58 - fl / 2, y: p.y + p.a / 2 - fa / 2, s: escala };
        }),
      };
    }

    let ultimoQuadro = -1;
    function quadro(p) {
      if (!medidas) mede();
      ultimoQuadro = p;
      const m = medidas;

      // A janela da Entrada aparece com os arquivos e sai quando as pastas chegam.
      // A janela e as pastas trocam de lugar juntas, e só depois os arquivos voam:
      // nenhuma pasta aparece pela metade debaixo de um arquivo parado.
      const janelaEntra = suave(trecho(p, .06, .18));
      const janelaSai = suave(trecho(p, .64, .71));
      janela.style.opacity = String(janelaEntra * (1 - janelaSai));
      janela.style.transform = `scale(${mistura(.95, 1, janelaEntra) - .04 * janelaSai})`;

      pastas.forEach((el, k) => {
        const t = suave(trecho(p, .65 + k * .012, .73 + k * .012));
        el.style.opacity = String(t);
        el.style.transform = `translateY(${(1 - t) * 22}px) scale(${mistura(.97, 1, t)})`;
      });

      let esperando = 0;
      const porPasta = pastas.map(() => 0);
      fichas.forEach((f, i) => {
        const solto = m.soltos[i], vaga = m.vagas[i], linha = m.linhas[i];
        const chega = suave(trecho(p, .08 + i * .024, .26 + i * .024));
        const entende = saida(trecho(p, .36 + i * .03, .42 + i * .03));
        const renomeia = saida(trecho(p, .58 + i * .012, .63 + i * .012));
        const voa = suave(trecho(p, .7 + i * .035, .79 + i * .035));

        let x = mistura(solto.x, vaga.x, chega);
        let y = mistura(solto.y, vaga.y, chega);
        const giro = mistura(solto.r, 0, chega);
        let escala = 1;
        if (voa > 0) {
          x = mistura(vaga.x, linha.x, voa);
          // Um arco curto: o arquivo sobe antes de cair na pasta.
          y = mistura(vaga.y, linha.y, voa) - Math.sin(voa * Math.PI) * 28;
          escala = mistura(1, linha.s, voa);
        }
        f.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${giro.toFixed(2)}deg) scale(${escala.toFixed(3)})`;
        f.el.style.opacity = String(1 - trecho(voa, .72, 1));
        f.el.style.zIndex = voa > 0 ? String(10 + i) : '';

        f.meta.style.opacity = String(1 - entende);
        f.palpite.style.opacity = String(entende);
        f.palpite.style.transform = `translateY(${(1 - entende) * 6}px)`;
        f.antes.style.opacity = String(1 - renomeia);
        f.antes.style.transform = `translateY(${-renomeia * 8}px)`;
        f.depois.style.opacity = String(renomeia);
        f.depois.style.transform = `translateY(${(1 - renomeia) * 8}px)`;

        const pousou = trecho(voa, .78, 1);
        linhas[i].style.opacity = String(pousou);
        if (voa < .5) esperando++;
        if (pousou > .5) porPasta[f.pasta]++;
      });

      conta.textContent = esperando ? `${esperando} esperando` : 'Tudo guardado';
      frase.textContent = p >= .36 ? 'Chegaram 6 arquivos. Entendi assim:' : 'Chegaram 6 arquivos.';
      pronto.textContent = p < .34 ? 'Lendo o lote…' : p < .56 ? 'Confira e corrija' : '6 prontos';
      guardar.toggleAttribute('data-apertado', p >= .55 && p < .6);
      contasDasPastas.forEach((el, k) => {
        const n = String(porPasta[k]);
        el.style.setProperty('--conta-vista', porPasta[k] ? '1' : '0');
        if (el.textContent !== n) {
          el.textContent = n;
          el.style.setProperty('--conta-escala', '1.25');
          requestAnimationFrame(() => el.style.setProperty('--conta-escala', '1'));
        }
      });

      const fase = FASES.findIndex(([, b]) => p < b);
      const atual = fase === -1 ? FASES.length - 1 : fase;
      passos.forEach((li, k) => {
        li.toggleAttribute('data-ativo', k === atual);
        li.toggleAttribute('data-feito', k < atual);
        li.style.setProperty('--andou', String(k === atual ? trecho(p, ...FASES[k]) : k < atual ? 1 : 0));
        const botao = li.querySelector('button');
        if (k === atual) botao.setAttribute('aria-current', 'step');
        else botao.removeAttribute('aria-current');
      });
    }

    // --- quem conduz a cena ---

    let modo = '';
    let pedido = 0;
    let tocando = 0;
    let observador = null;

    const progressoDaRolagem = () => {
      const total = abertura.offsetHeight - fixo.offsetHeight;
      const subiu = alturaTopo() - abertura.getBoundingClientRect().top;
      return total > 0 ? limita(subiu / total) : 0;
    };
    const rola = () => {
      if (modo !== 'rolagem' || pedido) return;
      pedido = requestAnimationFrame(() => { pedido = 0; quadro(progressoDaRolagem()); });
    };

    function paraDeTocar() {
      if (tocando) cancelAnimationFrame(tocando);
      tocando = 0;
    }
    // O botão do canto do palco: pausar enquanto toca, continuar quando
    // pausada, ver de novo no fim. O foco passa de um para o outro, para não
    // cair no vazio quando o botão que o tinha some.
    function controle(qual) {
      const tinhaFoco = document.activeElement === pausa || document.activeElement === deNovo;
      pausa.hidden = qual !== 'pausar' && qual !== 'continuar';
      deNovo.hidden = qual !== 'de-novo';
      if (!pausa.hidden) {
        pausa.querySelector('span').textContent = qual === 'pausar' ? 'Pausar' : 'Continuar';
        pausa.querySelector('use').setAttribute('href', qual === 'pausar' ? '#i-pausa' : '#i-toca');
      }
      if (tinhaFoco) (pausa.hidden ? deNovo : pausa).focus?.();
    }
    // Na tela estreita a cena toca sozinha, uma vez, e oferece ver de novo.
    // Dá para pausar no meio: são quase dez segundos de movimento.
    function toca(de = 0) {
      paraDeTocar();
      controle('pausar');
      const duracao = 9800;
      const inicio = performance.now() - de * duracao;
      const anda = (agora) => {
        const p = limita((agora - inicio) / duracao);
        quadro(p);
        if (p < 1) tocando = requestAnimationFrame(anda);
        else { tocando = 0; controle('de-novo'); }
      };
      tocando = requestAnimationFrame(anda);
    }
    pausa.addEventListener('click', () => {
      if (tocando) { paraDeTocar(); controle('continuar'); }
      else toca(Math.max(0, ultimoQuadro));
    });
    function esperaAparecer() {
      observador?.disconnect();
      observador = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting || modo !== 'toca') return;
        observador.disconnect();
        toca(0);
      }, { threshold: .4 });
      observador.observe(palco);
    }

    function defineModo() {
      const novo = reduzir.matches ? 'parado' : largo.matches ? 'rolagem' : 'toca';
      if (novo === modo) return false;
      modo = novo;
      abertura.dataset.modo = modo;
      paraDeTocar();
      observador?.disconnect();
      controle(null);
      return true;
    }

    function arruma() {
      const trocou = defineModo();
      mede();
      if (modo === 'parado') quadro(trocou || ultimoQuadro < 0 ? 1 : ultimoQuadro);
      else if (modo === 'rolagem') quadro(progressoDaRolagem());
      else if (!tocando && pausa.hidden) {
        quadro(ultimoQuadro >= 1 ? 1 : 0);
        if (ultimoQuadro < 1) esperaAparecer(); else controle('de-novo');
      } else if (!tocando) quadro(ultimoQuadro);
    }

    function vaiParaPasso(k) {
      if (modo === 'rolagem') {
        const total = abertura.offsetHeight - fixo.offsetHeight;
        const topoDaSecao = abertura.getBoundingClientRect().top + scrollY - alturaTopo();
        scrollTo({ top: topoDaSecao + INICIO_DO_PASSO[k] * total, behavior: 'smooth' });
      } else if (modo === 'toca') {
        toca(FASES[k][0]);
      } else {
        // Parado: o passo troca o quadro de uma vez, sem nada se mexer. Na
        // tela estreita o palco fica abaixo dos passos: vai até ele, sem deslizar.
        quadro(QUADRO_DO_PASSO[k]);
        palco.scrollIntoView({ block: 'nearest' });
      }
    }
    passos.forEach((li, k) => li.querySelector('button').addEventListener('click', () => vaiParaPasso(k)));
    deNovo.addEventListener('click', () => toca(0));
    // "Como funciona" no topo leva ao primeiro passo, não ao alto da página.
    for (const link of document.querySelectorAll('a[href="#como"]')) {
      link.addEventListener('click', (e) => {
        if (modo !== 'rolagem') return;
        e.preventDefault();
        vaiParaPasso(0);
      });
    }

    addEventListener('scroll', rola, { passive: true });
    let redimensiona = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(redimensiona);
      redimensiona = requestAnimationFrame(arruma);
    });
    reduzir.addEventListener('change', arruma);
    largo.addEventListener('change', arruma);
    arruma();
    // A serifa e a Inter mudam a medida das linhas: depois que chegam, mede de novo.
    document.fonts?.ready.then(() => { mede(); quadro(ultimoQuadro < 0 ? 0 : ultimoQuadro); });
  }

  // ---------- 2. a adoção: os pares ----------

  // Passar por um item da pasta de hoje acende para onde ele foi, e o contrário.
  const pares = document.querySelector('[data-pares]');
  if (pares) {
    const itens = [...pares.querySelectorAll('li[data-par]')];
    const acende = (par) => {
      pares.toggleAttribute('data-par-ativo', !!par);
      for (const li of itens) li.toggleAttribute('data-aceso', !!par && li.dataset.par === par);
    };
    for (const li of itens) {
      li.addEventListener('pointerenter', () => acende(li.dataset.par));
      li.addEventListener('pointerleave', () => acende(null));
    }
  }

  // ---------- 3. o app por dentro ----------

  const app = document.querySelector('[data-app]');
  const moldura = document.querySelector('[data-moldura]');
  const abas = [...document.querySelectorAll('[data-aba]')];
  const legendas = [...document.querySelectorAll('[data-legenda]')];
  if (app && moldura) {
    // Na tela estreita, a janela inteira reduzida ficaria ilegível: o app é
    // desenhado como ele fica numa janela estreita (a lateral recolhida, o
    // painel do lado escondido), e só então reduzido.
    const ESTREITA = 600;
    const ajusta = () => {
      const l = moldura.clientWidth;
      const largura = l >= 720 ? 1280 : ESTREITA;
      app.toggleAttribute('data-estreito', largura === ESTREITA);
      app.style.setProperty('--app-l', `${largura}px`);
      moldura.style.aspectRatio = `${largura} / 780`;
      moldura.style.setProperty('--k', String(l / largura));
    };
    new ResizeObserver(ajusta).observe(moldura);
    ajusta();

    const escolhe = (nome, foca = false) => {
      for (const aba of abas) {
        const sim = aba.dataset.aba === nome;
        aba.setAttribute('aria-selected', String(sim));
        aba.tabIndex = sim ? 0 : -1;
        if (sim && foca) aba.focus();
      }
      app.dataset.telaAtiva = nome;
      for (const l of legendas) l.hidden = l.dataset.legenda !== nome;
    };
    for (const aba of abas) {
      aba.addEventListener('click', () => escolhe(aba.dataset.aba));
      aba.addEventListener('keydown', (e) => {
        const i = abas.indexOf(aba);
        const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key];
        if (destino === undefined) return;
        e.preventDefault();
        escolhe(abas[(destino + abas.length) % abas.length].dataset.aba, true);
      });
    }
  }

  // ---------- 4. o convite em modal (spec 0147) ----------
  // O pedido vai para o Google Forms de sempre, por trás (formResponse,
  // no-cors): a pessoa não sai da página. O Google não deixa ler a resposta;
  // chegar lá é o que dá para saber, e a falha de rede mantém os campos.
  const modal = document.querySelector('[data-convite-modal]');
  if (modal && typeof modal.showModal === 'function') {
    const ENVIO = 'https://docs.google.com/forms/d/e/1FAIpQLSepyDrJO37RKZ0zxdpPHEn-aTGBo5G7R-Lo_7ZwaOTp64ZHNw/formResponse';
    const form = modal.querySelector('[data-convite-form]');
    const feito = modal.querySelector('[data-convite-feito]');
    const outro = form.querySelector('[name=outro]');
    const enviar = form.querySelector('[type=submit]');
    const erro = (id, texto) => {
      const el = id ? document.getElementById(id) : form.querySelector('[data-convite-erro]');
      el.textContent = texto;
    };
    const abre = () => {
      modal.showModal();
      (feito.hidden ? form.querySelector('[name=email]') : feito.querySelector('h2')).focus();
    };
    for (const a of document.querySelectorAll('[data-convite]')) {
      a.addEventListener('click', (e) => { e.preventDefault(); abre(); });
    }
    for (const b of modal.querySelectorAll('[data-convite-fechar]')) b.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'oque') return;
      outro.hidden = e.target.value !== 'outro';
      if (!outro.hidden) outro.focus();
      erro('convite-modal-erro-oque', '');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dados = new FormData(form);
      const email = String(dados.get('email') || '').trim().toLowerCase();
      const oque = String(dados.get('oque') || '');
      const qual = String(dados.get('outro') || '').trim();
      const nome = String(dados.get('nome') || '').trim();
      erro('convite-modal-erro-email', /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? '' : 'Escreva um e-mail válido para receber o convite.');
      erro('convite-modal-erro-oque', !oque ? 'Escolha o que você faz.' : oque === 'outro' && !qual ? 'Conte em poucas palavras o que você faz.' : '');
      erro(null, '');
      const primeiro = form.querySelector('.convite-modal__erro:not(:empty)');
      if (primeiro) { (primeiro.previousElementSibling?.matches('input') ? primeiro.previousElementSibling : form.querySelector('[name=oque]')).focus(); return; }
      const corpo = new URLSearchParams({ emailAddress: email, 'entry.285340433': nome });
      if (oque === 'outro') {
        corpo.set('entry.584284710', '__other_option__');
        corpo.set('entry.584284710.other_option_response', qual);
      } else {
        corpo.set('entry.584284710', oque);
      }
      enviar.disabled = true;
      enviar.textContent = 'Enviando…';
      try {
        await fetch(ENVIO, { method: 'POST', mode: 'no-cors', body: corpo });
        form.hidden = true;
        feito.hidden = false;
        feito.querySelector('[data-convite-confirma]').textContent = 'Vamos mandar o convite para ' + email + ' quando liberarmos o seu acesso.';
        feito.querySelector('h2').focus();
      } catch {
        erro(null, 'Não consegui enviar agora. Seus dados continuam aqui: tente de novo em instantes.');
      } finally {
        enviar.disabled = false;
        enviar.textContent = 'Pedir meu convite';
      }
    });
  }
})();
