(function(){
  // Baked-in demo Q&A payload, substituted at build time. Empty array
  // when no qa-cache.json was found at compile.
  var DEMO_QA = [];

  var root = document.querySelector('[data-ask-widget]');
  if (!root) return;
  var nodeId = root.getAttribute('data-node-id') || '';
  var nodeKind = root.getAttribute('data-node-kind') || '';
  var nodeName = root.getAttribute('data-node-name') || '';

  // Health-check the backend endpoint at /api/ask/health. If unreachable,
  // fall back to the static demo panel (or the one-liner if no demo data).
  try {
    fetch('/api/ask/health', { method: 'GET' })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
      .then(function(){ renderWidget(); })
      .catch(function(){ renderStaticFallback(); });
  } catch (err) {
    renderStaticFallback();
  }

  function renderStaticFallback(){
    if (Array.isArray(DEMO_QA) && DEMO_QA.length > 0) {
      renderDemoPanel();
    } else {
      renderDegraded();
    }
  }

  function clear(node){
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, attrs, text){
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k){
        if (k === 'class') node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.appendChild(document.createTextNode(String(text)));
    return node;
  }

  function renderDegraded(){
    clear(root);
    var p = el('p', { 'class': 'ask-degraded' });
    p.appendChild(document.createTextNode('Host this wiki with '));
    p.appendChild(el('code', null, 'tesserae serve'));
    p.appendChild(document.createTextNode(' to ask questions about this page.'));
    root.appendChild(p);
  }

  function renderDemoPanel(){
    clear(root);
    var hdr = el('div', { 'class': 'ask-demo-header' });
    hdr.appendChild(el('span', { 'class': 'ask-demo-eyebrow' }, 'Live RAG demo'));
    hdr.appendChild(el('span', { 'class': 'ask-demo-hint' },
      'Pre-rendered answers against the seeded LightRAG store. ' +
      'Run tesserae serve locally for free-form questions.'));
    root.appendChild(hdr);

    var list = el('ul', { 'class': 'ask-demo-list' });
    DEMO_QA.forEach(function(qa){
      if (!qa || !qa.question || !qa.answer) return;
      var li = el('li', { 'class': 'ask-demo-item' });
      var btn = el('button', {
        type: 'button', 'class': 'ask-demo-question', 'aria-expanded': 'false'
      });
      btn.appendChild(el('span', { 'class': 'ask-demo-chevron', 'aria-hidden': 'true' }, '▸'));
      btn.appendChild(document.createTextNode(' ' + String(qa.question)));
      var ans = el('div', { 'class': 'ask-demo-answer', hidden: '' });
      appendLinkified(ans, String(qa.answer));
      btn.addEventListener('click', function(){
        var open = !ans.hidden;
        if (open) {
          ans.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          btn.firstChild.textContent = '▸';
        } else {
          ans.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
          btn.firstChild.textContent = '▾';
        }
      });
      li.appendChild(btn);
      li.appendChild(ans);
      list.appendChild(li);
    });
    root.appendChild(list);
  }

  function renderWidget(){
    clear(root);
    var form = el('form', { 'class': 'ask-form', 'data-ask-form': '' });
    form.appendChild(el('label', { 'class': 'ask-label', 'for': 'ask-input' }, 'Ask about this page'));
    var row = el('div', { 'class': 'ask-row' });
    var input = el('input', {
      id: 'ask-input', type: 'text', 'class': 'ask-input',
      placeholder: 'Ask about ' + nodeName + '...', autocomplete: 'off'
    });
    var submit = el('button', { type: 'submit', 'class': 'ask-submit' }, 'Ask');
    row.appendChild(input);
    row.appendChild(submit);
    form.appendChild(row);
    var meta = el('div', { 'class': 'ask-meta' });
    var backendSpan = el('span', { 'class': 'ask-backend' });
    backendSpan.appendChild(document.createTextNode('backend: '));
    backendSpan.appendChild(el('span', { 'data-ask-backend': '' }, 'auto'));
    meta.appendChild(backendSpan);
    meta.appendChild(el('span', { 'class': 'ask-status', 'data-ask-status': '' }));
    form.appendChild(meta);
    root.appendChild(form);
    var answer = el('div', { 'class': 'ask-answer', 'data-ask-answer': '', hidden: '' });
    root.appendChild(answer);

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var question = input.value.trim();
      if (!question) return;
      submitQuestion(question);
    });
  }

  function submitQuestion(question){
    var status = root.querySelector('[data-ask-status]');
    var answer = root.querySelector('[data-ask-answer]');
    status.textContent = 'asking...';
    answer.hidden = true;

    // Prepend the node name to the question as a context hint. This is the
    // 90% solution: ``ask_project`` doesn't take a scoping argument yet, so
    // we attach scope via natural-language prefix on the JS side. A future
    // PR can wire real subgraph scoping into ``ask_project`` itself.
    var contextualized = question;
    if (nodeName) {
      contextualized = 'About `' + nodeName + '`: ' + question;
    }

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, node_kind: nodeKind, question: contextualized })
    })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(envelope){
        status.textContent = '';
        var backendCell = root.querySelector('[data-ask-backend]');
        if (backendCell) backendCell.textContent = envelope.backend || 'auto';
        renderAnswerInto(answer, envelope);
        answer.hidden = false;
      })
      .catch(function(err){
        status.textContent = 'error: ' + (err && err.message ? err.message : 'request failed');
      });
  }

  function renderAnswerInto(answer, envelope){
    clear(answer);
    // envelope shapes (from tesserae.query.ask_project):
    //   { backend: "raganything", question, answer }
    //   { backend: "cognee", question, results: [...] }
    //   { backend: "wiki", question, results: [...] }
    //   { backend: "none", question, results: [], note: "..." }
    if (envelope.answer) {
      var div = el('div', { 'class': 'ask-answer-text' });
      appendLinkified(div, String(envelope.answer));
      answer.appendChild(div);
      return;
    }
    if (Array.isArray(envelope.results) && envelope.results.length) {
      var ol = el('ol', { 'class': 'ask-answer-list' });
      envelope.results.slice(0, 8).forEach(function(r){
        var li = el('li');
        var name = typeof r === 'string' ? r : (r.name || r.title || r.text || JSON.stringify(r));
        var href = (typeof r === 'object' && r && r.href) ? r.href : null;
        if (href) {
          var a = el('a', { href: href }, String(name));
          li.appendChild(a);
        } else {
          li.appendChild(document.createTextNode(String(name)));
        }
        ol.appendChild(li);
      });
      answer.appendChild(ol);
      return;
    }
    if (envelope.note) {
      answer.appendChild(el('p', { 'class': 'ask-answer-empty' }, String(envelope.note)));
      return;
    }
    answer.appendChild(el('p', { 'class': 'ask-answer-empty' }, 'No answer.'));
  }

  function appendLinkified(container, text){
    // Conservative linkifier: replace exact ``<kind>/<slug>.html`` matches
    // inside the answer text with anchor elements pointing at ``../<match>``.
    // Everything that doesn't match the strict pattern is appended as a
    // plain text node, so no untrusted markup ever reaches the DOM.
    var pattern = /((?:concepts|papers|repos|entities|topics|syntheses|questions)\/[\w\-]+\.html)/g;
    var last = 0;
    var m = pattern.exec(text);
    while (m !== null) {
      if (m.index > last) {
        container.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      container.appendChild(el('a', { href: '../' + m[1] }, m[1]));
      last = m.index + m[1].length;
      m = pattern.exec(text);
    }
    if (last < text.length) {
      container.appendChild(document.createTextNode(text.slice(last)));
    }
  }
})();
