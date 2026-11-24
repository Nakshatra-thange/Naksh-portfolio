/* ------------------------------------------------------------------
   Fullstack page: project cards.
   Edit the text in FULLSTACK_PROJECTS below; the cards are built by the
   shared component in accordion.js (same layout as the AI and me page).

   Each project:
     title, subtitle
     tag           small context tag shown in the collapsed header
     badge         optional small badge in the collapsed header, or null
     github        URL
     demo          { label: 'Live demo', href: '...' } or null (null = no demo button, no gap)
     diagram       filename inside assets/diagrams/ (missing file = "coming soon" placeholder)
     problem[], built[]
     resultsIntro  optional small line above the stats
     results[]     { value, label }  big figure + small label
     tables[]      optional { caption, head: [...] or null, rows: [[...], ...] }
     notes[]       optional one-line findings shown under the results
     limits        one small italic line
   ------------------------------------------------------------------ */
const FULLSTACK_PROJECTS = [
  {
    title: 'Rediswall',
    subtitle: 'A distributed rate-limiting framework for Express',
    tag: 'Published npm package',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/Rediswall',
    demo: null,
    diagram: 'rediswall.png',
    problem: [
      'Most rate-limiting tutorials stop at a single express-rate-limit import. That breaks in production.',
      "In-memory counters don't survive restarts and don't work across multiple instances behind a load balancer.",
      'Fixed windows have the cross-boundary exploit: a user can send 2x the limit in a few seconds by straddling a window boundary.',
      'If Redis goes down, the whole API goes down with it.',
    ],
    built: [
      'Shared Redis state, so every Node.js instance enforces one global limit.',
      'Atomic Lua scripts, so there are no race conditions under concurrent load.',
      'Four strategies: sliding window (the default, immune to the boundary exploit), fixed window (fastest, O(1) memory), token bucket (burst-friendly) and leaky bucket (smoothest output).',
      'A three-state circuit breaker (closed, open, half-open). After 5 failures it opens for a 30 s cooldown, then probes Redis once and closes on success.',
      'An in-memory fallback that keeps enforcing limits during a Redis outage, with a failOpen switch (fall back vs return 503).',
      'Multi-tier quotas (free 100/min, pro 1,000/min, enterprise 10,000/min), resolved per request from a JWT or API key.',
      'Standard rate-limit headers on every response (X-RateLimit-*, Retry-After on 429s).',
    ],
    results: [
      { value: '57', label: 'Tests across 8 suites' },
      { value: '150', label: 'Simultaneous requests in the concurrency test, with exact limit enforcement' },
      { value: '3', label: 'Redis clients sharing one global limit in the distributed-correctness test' },
      { value: '6 of 6', label: 'Circuit breaker state transitions tested' },
      { value: '4', label: 'Rate-limiting strategies' },
      { value: '~4,200 req/s', label: 'Fixed window, the fastest strategy (benchmarks run with 10 connections, 5 s per run)' },
      { value: '~10%', label: 'Throughput given up by sliding window versus fixed window, in exchange for exact enforcement' },
    ],
    tables: [
      {
        caption: 'Benchmark',
        head: ['Strategy', 'req/s', 'p50', 'p95', 'p99', 'Memory'],
        rows: [
          ['fixed-window', '~4200', '2ms', '5ms', '9ms', 'O(1)'],
          ['sliding-window', '~3800', '2ms', '6ms', '11ms', 'O(n)'],
          ['token-bucket', '~3900', '2ms', '5ms', '10ms', 'O(1)'],
          ['leaky-bucket', '~3750', '3ms', '6ms', '12ms', 'O(1)'],
        ],
      },
    ],
    notes: [
      'Proof: a test demonstrates the cross-boundary exploit passing on fixed window and being blocked on sliding window.',
    ],
    limits: 'Honest limits: benchmarks are from one machine and one Redis instance. Production needs Redis Cluster or Sentinel, and gateway-level limiting too.',
  },
  {
    title: 'Pebble',
    subtitle: 'A key-value storage engine written from scratch in Rust',
    tag: 'Rust · LSM-tree',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/Pebble',
    demo: null,
    diagram: 'pebble.png',
    problem: [
      'Every database has to write fast, read reliably and survive a crash without losing either. Those three goals pull against each other.',
      "B-trees update pages in place, so at high write rates random disk writes saturate the disk's I/O before the CPU is busy.",
      'LSM-trees (LevelDB, RocksDB, Cassandra) turn writes into sequential appends. I wanted to understand that by building one, not by reading about it.',
    ],
    built: [
      'A complete LSM-tree engine in Rust with no framework, no ORM and no async runtime. It has a four-method API: put, get, delete, scan.',
      "Write-ahead log with CRC32 checksums. Every write is fsync'd before the caller is told it succeeded.",
      'In-memory sorted memtable (BTreeMap). It flushes to an immutable SSTable at 4 MB, then the WAL is truncated.',
      'SSTables with a bloom filter and sparse index (every 16th key). A 16-byte footer makes each file self-describing.',
      'Bloom filters written from scratch using double hashing (Kirsch-Mitzenmacher), with sizing from the information-theoretic bounds.',
      'Compaction merges SSTables (newest write wins), drops tombstones only when it is safe, and fires automatically at 4 SSTables.',
      'Crash recovery tested at three crash points with a kill-9 harness that truncates and corrupts files at specific byte offsets.',
      'A /metrics endpoint and a live web dashboard (polls every 2 s) showing writes/sec, SSTable count, WAL size and compactions.',
    ],
    results: [
      { value: '5.2 µs', label: 'Average absent-key read with bloom filter, vs 29 µs without' },
      { value: '~99%', label: 'Share of absent-key lookups where the bloom filter skips disk entirely' },
      { value: '3 of 3', label: 'Crash points (mid-WAL-write, mid-flush, mid-compaction) recover to the exact expected state' },
      { value: '1%', label: 'Target bloom false-positive rate; the measured rate matched theory within 0.05 percentage points' },
      { value: '~1.4x', label: 'Write amplification at the default compaction threshold' },
      { value: '2', label: 'External crates only (crc32fast and tiny_http), with everything else written from scratch' },
    ],
    tables: [
      {
        caption: 'Average read latency (1,000 ops, single thread, fsync on)',
        head: ['Configuration', 'Avg read latency'],
        rows: [
          ['WAL only (in memory)', '0.8 µs'],
          ['WAL + SSTables, no bloom', '29 µs'],
          ['WAL + SSTables + bloom (1% FPR)', '5.2 µs'],
        ],
      },
    ],
    notes: [
      'Honest note: the bloom speedup applies to absent-key lookups only. For present keys the read path is identical.',
    ],
    limits: 'Honest limits: single-threaded, flat compaction (no leveled compaction), no compression, no group commit, no SQL layer. These were left out deliberately.',
  },
  {
    title: 'Orbit',
    subtitle: 'A developer reliability platform for microservices',
    tag: 'Gateway · Circuit breaking · Observability',
    badge: null,
    github: 'https://github.com/Nakshatra-thange/Orbit',
    demo: null,
    diagram: 'orbit.png',
    problem: [
      'When a service degrades, users hit errors first. Then an engineer spends ~40 minutes piecing logs together across containers to understand what happened.',
      'A /health endpoint alone misses partial degradation, such as slow queries on specific endpoints.',
      'Postmortems are manual, so MTTD and MTTR are usually guessed instead of measured.',
    ],
    built: [
      "A gateway (Node.js, Express, TypeScript) that authenticates once with JWT and API keys, rate limits per tier using my own Rediswall package, checks the target service's circuit state, and proxies the request, or serves an instant fallback if the circuit is open.",
      'A reliability loop running every 10 s that combines active health checks with passive scoring of real traffic (error rate and latency), and feeds a three-state circuit breaker.',
      'Circuit state lives in Redis so every gateway instance shares it. Redis failure defaults to closed (fail-open).',
      'Event-sourced incident timeline: every state transition is an immutable event, with MTTD and MTTR computed from timestamps, not estimated.',
      'Safe request replay: failed requests are stored with passwords, tokens and card numbers redacted at write time and auth headers stripped, then re-executed against the live system.',
      'Per-service policies in Postgres, editable from the dashboard with no redeploy. Revenue-impact tags (high, medium, low, none) on every service.',
      'OpenTelemetry tracing to Jaeger. BullMQ for async order-to-notification events. SaaS plan gating (starter 3 services, pro 10, enterprise unlimited).',
      'A React + TypeScript dashboard with Recharts, polling every 5 s.',
    ],
    resultsIntro: 'Design targets from the demo scenario, not load-test measurements.',
    results: [
      { value: '~10 s', label: 'Degradation detection (the reliability loop interval)' },
      { value: '<1 ms', label: 'Fallback response when a circuit is open, instead of a timeout' },
      { value: '<10 min', label: 'Incident understood end to end, vs ~40 min manual' },
      { value: '4', label: 'Microservices behind the gateway (auth, user, order, notification)' },
      { value: '6', label: 'Event types in a full incident timeline (threshold exceeded, circuit opened, alert triggered, fallback served, service recovered, circuit closed)' },
      { value: '2', label: 'Health signals combined (active checks and passive traffic scoring)' },
    ],
    tables: [],
    notes: [],
    limits: 'Honest limits: these figures describe the demo scenario and design, and I have not run a formal load test. Unit tests cover the circuit state machine and integration tests need the full Docker stack.',
  },
];

// Cards are built by the shared component in accordion.js (Accordion.projectBody).
(() => {
  'use strict';
  const { build, projectBody, projectHeaderMeta } = window.Accordion;
  build(document.getElementById('fullstack-projects-list'), FULLSTACK_PROJECTS, 'fullstack', projectBody, { headerMeta: projectHeaderMeta });
})();
