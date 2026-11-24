/* ------------------------------------------------------------------
   AI and me page: project cards.
   Edit the text in AI_PROJECTS below; the cards are built by the shared
   component in accordion.js.

   Each project:
     section   'projects' or 'research' (which heading it sits under)
     title, subtitle
     tag       small context tag shown in the collapsed header
     badge     optional small badge in the collapsed header (e.g. 'Ongoing'), or null
     github    URL
     demo      { label, href } or null (null = no demo button, no gap)
     diagram   filename inside assets/diagrams/ (missing file = "coming soon" placeholder)
     problem[], built[]
     results[] { value, label }  big figure + small label
     tables[]  optional { caption, head: [...], rows: [[...], ...] }
     notes[]   optional one-line findings shown under the results
     limits    one small italic line
     next      optional one-line "Next" plan
   ------------------------------------------------------------------ */
const AI_PROJECTS = [
  {
    section: 'projects',
    title: 'Synergy',
    subtitle: 'A personal AI-development intelligence agent',
    tag: 'Live',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/news-agent',
    demo: { label: 'Live demo', href: 'https://synnergyy.netlify.app/' },
    diagram: 'synergy.png',
    problem: [
      'AI news, papers and new tools are scattered across Hacker News, arXiv and GitHub.',
      'I wanted one place that collects them continuously, stores them and turns them into something readable, instead of me checking each source by hand.',
    ],
    built: [
      'The core project is an ingestion and intelligence pipeline in Go. The web interface is just how you interact with it.',
      'Source-specific adapters for Hacker News (AI discussions and tools), arXiv (cs.AI, cs.LG, cs.CL papers) and GitHub (new repos on LLMs, agents, generative AI).',
      'A configurable scheduler checks which sources are due. Each source has its own minimum fetch interval.',
      'The ingestion service handles timeouts, rate limiting, duplicate handling and fetch-run tracking.',
      'PostgreSQL stores sources, collected items and pipeline state. A Go HTTP API serves a Next.js + TypeScript interface.',
      'CLI pipeline stages for enrichment, LLM summarization, embeddings and story clustering (Anthropic or OpenRouter for summaries, Voyage AI for embeddings; they need provider keys).',
    ],
    results: [
      { value: '3', label: 'Live source adapters (Hacker News, arXiv, GitHub)' },
      { value: '4', label: 'Pipeline stages (enrich, summarize, embed, cluster)' },
      { value: '3', label: 'Services deployed (Go API on Render, PostgreSQL on Neon, web UI on Netlify)' },
    ],
    tables: [],
    notes: [],
    limits: 'Honest limits: no benchmark numbers yet. AI pipeline stages depend on provider configuration.',
  },
  {
    section: 'projects',
    title: 'Chat & Carry',
    subtitle: 'A WhatsApp grocery ordering and customer ledger agent',
    tag: 'Python · FastAPI · Claude',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/chat-and-carry-whatsapp-agent',
    demo: null,
    diagram: 'chat-and-carry.png',
    problem: [
      'Grocery orders arrive as casual Hinglish WhatsApp messages ("Bhaiya, 2 kilo aloo dena").',
      'The shop still has to track deliveries, verified payments and outstanding balances without mistakes, and a language model should never be trusted with the money.',
    ],
    built: [
      'Core principle: Claude interprets messages, Python controls orders, invoices, payments and balances.',
      'Claude extracts intent and items. Python validates names and quantities against a price list, and an order alone never creates a bill.',
      'The shop confirms delivery through an authenticated endpoint, and only then is an invoice created with prices snapshotted.',
      'Payments count only after the shop verifies the real UPI transaction. A promise like "kal de dunga" is not a payment.',
      'A UPI QR is generated for the outstanding amount and sent on WhatsApp via Kapso. Failed notifications can be retried without creating a second invoice.',
      'Idempotent webhooks, dispute handling, clarification requests and human-review flags.',
    ],
    results: [
      { value: '20', label: 'Labelled WhatsApp customer conversation threads in the evaluation dataset' },
      { value: '8', label: 'Deliberately hard cases (ambiguous payment, wrong stated amount, partial payment plus dispute, overpayment and credit, multiple partial payments, substitution, repeat order, vague item size)' },
      { value: '5', label: 'Authenticated admin endpoints (confirm delivery, confirm payment, resolve dispute, order lookup, customer ledger)' },
      { value: '4', label: 'Separately tracked notification states (bill text, bill QR, receipt text, receipt QR) so retries are safe' },
    ],
    tables: [
      {
        caption: 'Worked example',
        head: null,
        rows: [
          ['Invoice', '₹200'],
          ['Verified payments', '₹150'],
          ['Outstanding', '₹50'],
        ],
      },
    ],
    notes: [],
    limits: 'Honest limits: payments are verified manually, SQLite is an MVP store, and webhook authenticity must be verified before real customers. No extraction accuracy score is reported yet.',
  },
  {
    section: 'projects',
    title: 'Voice Regression Lab',
    subtitle: 'CI for voice agents: pass/fail regression tests for conversations',
    tag: 'Exploration project',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/voice-regression-tester',
    demo: null,
    diagram: 'voice-regression-lab.png',
    problem: [
      "Every prompt tweak, model swap or new tool can silently break a voice agent: it stops asking for a phone number, quotes a price it shouldn't, or forgets to transfer to a human.",
      "You can't diff conversational output like a JSON response, so teams catch regressions by manually calling the agent and listening, and the bug reaches a real caller first.",
    ],
    built: [
      'A framework that treats a phone conversation like a unit test: persona in, assertions defined, pass/fail out.',
      'Caller simulation: a fixed script, or a goal-driven LLM persona that reacts until it succeeds, fails or hangs up. The LLM only plays the caller or judges a transcript, and never generates the behavior under test.',
      'Assertion engine: keyword/regex, tool-call checks, latency and turn-count thresholds, plus an optional LLM judge for fuzzy criteria like tone.',
      'Pluggable adapter layer, so it works on my own agent or a third-party agent API.',
      'Baselines and turn-by-turn diffing: every run is stored, and new runs are diffed against the accepted baseline.',
      'Concurrent runner (Redis queue and worker pool with retries and timeouts), a dashboard, and a CI CLI that exits non-zero on failure and comments results on pull requests via a GitHub Action.',
      'Optional phone layer: a real call with TTS and STT, running the same assertion engine on a live conversation.',
    ],
    results: [
      { value: '9', label: 'Components built (data model, adapters, simulator, assertion engine, baselines/diffing, concurrent runner, dashboard, CI CLI, phone layer)' },
      { value: '5', label: 'Assertion types (keyword/regex, tool-called, latency, turn-count, LLM judge)' },
      { value: '2', label: 'Caller modes (scripted and goal-driven)' },
    ],
    tables: [
      {
        caption: 'Example test',
        head: null,
        rows: [
          ['Max turns', '6'],
          ['Max latency per turn', '4000 ms'],
          ['Must call', 'book_appointment'],
          ['Must never', 'mention price'],
        ],
      },
    ],
    notes: [],
    limits: 'Honest limits: built to explore what CI for a conversation looks like, with no accuracy benchmark reported.',
  },
  {
    section: 'projects',
    title: 'Catalyx',
    subtitle: 'A hybrid semantic search engine for a product catalog, built from first principles',
    tag: 'Retrieval · Evaluation',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/catalyx',
    demo: null,
    diagram: 'catalyx.png',
    problem: [
      'Keyword search fails when a query shares no words with the product ("rain shelter under $80" should find waterproof tents).',
      'I wanted to understand retrieval and ranking by building them myself, not by wrapping an LLM API. There is no generation step: the product is the pipeline.',
    ],
    built: [
      'Rule-based query parsing for price and category filters (deterministic, free, unit-testable). Filters are applied in SQL before ranking.',
      'Two retrievers: BM25 written from scratch (k1=1.5, b=0.75) and dense vector search over all-MiniLM-L6-v2 embeddings (384-dim) in pgvector.',
      'Reciprocal Rank Fusion written from scratch (k=60), chosen because BM25 and cosine scores live on incompatible scales.',
      'A hand-built reranker: 0.6 × relevance + 0.25 × rating + 0.15 × stock, chosen for transparency over an opaque model.',
      'FastAPI with validation, pagination, Redis caching (5 min TTL) and request-ID tracing. Graceful degradation: keyword search still works if pgvector fails.',
      'Also from scratch: Recall@K, Precision@K and MRR.',
    ],
    results: [
      { value: '16', label: 'Hand-verified benchmark queries (8 literal, 8 semantic), with ground truth from verified SQL predicates against the live catalog' },
      { value: '~8K', label: 'Products in the catalog' },
      { value: '0.964', label: 'Recall@10 on literal queries (BM25, hybrid and reranked all tie, because BM25 already finds everything relevant)' },
      { value: '0.000 → 0.111', label: 'Recall@10 on semantic queries, BM25 only vs hybrid' },
      { value: '0.317 → 0.445', label: 'MRR on semantic queries, hybrid vs hybrid + reranked' },
    ],
    tables: [
      {
        caption: 'Semantic queries (8)',
        head: ['Method', 'Recall@10', 'Precision@10', 'MRR'],
        rows: [
          ['BM25 only', '0.0000', '0.0000', '0.0000'],
          ['Hybrid (BM25 + Dense, RRF)', '0.1114', '0.1625', '0.3167'],
          ['Hybrid + Reranked', '0.1114', '0.1625', '0.4449'],
        ],
      },
    ],
    notes: [
      'Key finding: hybrid equals BM25 on easy queries, and it is the only thing between zero and non-zero recall on semantic ones.',
      "Honest finding: my first benchmark was built from one method's own top-10, which silently capped the scores. Auditing showed some queries had 73 to 905 true matches. I rebuilt it from verified SQL ground truth.",
    ],
    limits: 'Honest limits: the catalog is synthetic, and absolute semantic recall is still low.',
  },
  {
    section: 'research',
    title: 'StreamGuard',
    subtitle: 'Real-time anomaly detection over streaming graphs',
    tag: 'Team project',
    badge: 'Ongoing',
    github: 'https://github.com/Nakshatra-thange/Capstone-phase1',
    demo: null,
    diagram: 'streamguard.png',
    problem: [
      'Network traffic is a stream of (source, destination, timestamp) connection events, and suspicious patterns need to be caught as events arrive, with bounded memory.',
      'Batch detectors work in windows, so they react late, and the naive batch baseline gets expensive as history grows.',
    ],
    built: [
      'An end-to-end pipeline: DARPA labelled data, replayer, Redpanda (Kafka-compatible), Python consumer and scorer, PostgreSQL/TimescaleDB, WebSocket server, React + D3.js live dashboard.',
      'Count-Min Sketch for bounded-memory edge-frequency estimation, plus a simplified MIDAS-inspired scorer that compares current activity with history.',
      'The dashboard shows a live graph, streaming metrics, highlighted alerts and a live alert feed.',
      'A matched batch-vs-streaming evaluation so both are scored on the same events and ground truth.',
      'Honest framing: not a new algorithm. The contribution is the integrated pipeline, the visualization and the evaluation.',
    ],
    results: [
      { value: '0.968', label: 'AUC (threshold-free summary metric)' },
      { value: '100,000', label: 'Events in the matched evaluation subset (50,893 anomalous, 49,107 normal)' },
      { value: '5,650', label: 'Unique source-destination edges (1,057 attack edges)' },
      { value: '1.000', label: 'Recall at the sensitive threshold of 3, with precision 0.188' },
      { value: '0.663 / 0.940', label: 'Precision / recall at threshold 1,000, the most balanced operating point on this subset' },
    ],
    tables: [
      {
        caption: 'Threshold sweep',
        head: ['Threshold', 'Edges flagged', 'True positives', 'Precision', 'Recall'],
        rows: [
          ['3', '5,614', '1,057', '0.188', '1.000'],
          ['300', '3,274', '1,055', '0.322', '0.998'],
          ['1,000', '1,500', '994', '0.663', '0.940'],
          ['3,000', '797', '752', '0.944', '0.711'],
          ['10,000', '751', '747', '0.995', '0.707'],
        ],
      },
    ],
    notes: [
      'Detection delay: at the sensitive real-time threshold, most comparable attack edges alerted on the same event, while the batch baseline is bounded by its 10-second window.',
    ],
    limits: 'Honest limits: not production-ready. The sensitive threshold produces many false alerts, there is no full explainability yet, and the evaluation uses a 100K-row matched subset of the DARPA data.',
    next: 'Next: explainable alerts (why it fired), k-hop neighbourhood confirmation, alert aggregation.',
  },
];

// Cards are built by the shared component in accordion.js (Accordion.projectBody).
(() => {
  'use strict';
  const { build, projectBody, projectHeaderMeta } = window.Accordion;
  const options = { headerMeta: projectHeaderMeta };
  const projects = AI_PROJECTS.filter((p) => p.section === 'projects');
  const research = AI_PROJECTS.filter((p) => p.section === 'research');
  build(document.getElementById('ai-projects-list'), projects, 'ai-project', projectBody, options);
  // Numbering continues after the Projects cards (StreamGuard is 05).
  build(document.getElementById('ai-research-list'), research, 'ai-research', projectBody, { ...options, startAt: projects.length });
})();
