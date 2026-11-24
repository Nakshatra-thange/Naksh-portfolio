/* ------------------------------------------------------------------
   Voice AI page: Research + Projects accordion cards.
   Edit the text in RESEARCH and PROJECTS below; the cards are built from them
   by the shared component in accordion.js.
   ------------------------------------------------------------------ */

// Each research has exactly 4 points, in this order:
// problem (The Problem), found (What I Found), solution (The Solution), how (How I Found It).
const RESEARCH = [
  {
    title: 'Acoustic Echo Cancellation: Which AEC Actually Works?',
    subtitle: 'Benchmarking NKF, WebRTC AEC3 and DTLN for voice agents',
    github: 'GITHUB_URL_1',
    problem: [
      "In a voice agent, the assistant's voice leaves the speaker and gets picked up by the mic again. That is echo.",
      "AEC must do two things at once: remove the agent's voice, and keep the human's voice clear.",
      'There are many AEC options, and no clear answer on which one fits a voice-agent pipeline.',
    ],
    found: [
      'NKF had the lowest WER at 0.078, and preserved human speech level best (0.969).',
      'WebRTC AEC3 had the best echo removal (ERLE 15.75 dB) and was the fastest (RTF 0.0062, about 160x real time), but it suppressed more of the human voice.',
      'DTLN-512 had the best SI-SDR (8.42 dB) and best speech correlation (0.853), but ran at only about 9x real time (RTF 0.1171).',
      'Bigger DTLN models were not clearly better: no clear WER improvement from 128 to 512.',
      'DTLN broke down on one recording (pair_009) where echo was far louder than the human (SER about -29.5 dB).',
      'No single winner. Every system won on a different metric.',
    ],
    solution: [
      'Pick the AEC by what you are optimizing: NKF if the goal is clean input for speech recognition, WebRTC AEC3 if you need speed and maximum echo suppression, DTLN if waveform quality matters most.',
      'For my speech-recognition-focused pipeline, NKF is the pick.',
    ],
    how: [
      'Built a benchmark of 20 recordings (about 542 seconds, 16 kHz), covering both double-talk and echo-only cases.',
      'Human speech from LibriSpeech, agent speech from Piper TTS, echo simulated with room impulse responses.',
      'Measured WER, ERLE, SI-SDR, human speech preservation and runtime (RTF).',
      'Used pretrained DTLN models for inference only, with no training or fine-tuning.',
      'Honest limits: simulated echo only (no physical speaker or mic), English only, one ASR system, small sample.',
    ],
  },
  {
    title: 'AEC + VAD for Real-Time Barge-In',
    subtitle: 'Can echo cancellation fix false interruptions in voice agents?',
    github: 'GITHUB_URL_2',
    problem: [
      'When an AI agent is talking, its own voice leaks into the mic and VAD mistakes it for the user speaking.',
      'That causes false interruptions and makes it hard to detect a real human barge-in.',
      'Central question: does applying AEC before VAD improve detection of genuine interruptions?',
    ],
    found: [
      'Agent playback alone triggered every VAD tested (Silero, WebRTC VAD, TEN VAD, FSMN-VAD).',
      "On raw mic audio, VAD was already active at the moment the human started speaking 98.1% of the time. So it could not tell a real interruption from the agent's own echo.",
      'Changing VAD thresholds or aggressiveness alone did not fix it.',
      'After WebRTC AEC3, clean onset detection went from 1.9% to 78.5%. The clean-human oracle is 81.2%.',
      'Echo-only false activity dropped from 63.0% to 18.4%.',
      'Still unsolved: residual echo triggered VAD in 90 of 130 agent-only configuration-recording rows, and detection within 200 ms is only 33.1% (oracle: 46.7%).',
    ],
    solution: [
      'Use an AEC → VAD pipeline: cancel echo first, then run voice activity detection.',
      'It runs comfortably in real time (AEC3 RTF 0.0073, Silero VAD 0.0037).',
    ],
    how: [
      'Built a synthetic dataset of 50 recordings: 10 agent-only, 10 normal interruptions, 30 controlled interruptions with varied speech-to-echo ratios, echo strengths and onset timings.',
      'Used Piper TTS, LibriSpeech and measured SLR28 room impulse responses, at 16 kHz mono.',
      'Ran 4 stages: original VAD benchmark, FSMN-VAD benchmark, AEC3 evaluation, post-AEC VAD evaluation.',
      'Compared three conditions: raw mic, AEC3-processed, and clean-human oracle.',
      'Honest limits: synthetic audio, no physical loudspeaker test, no real-world noise or clock drift, NKF-AEC not benchmarked.',
    ],
  },
  {
    title: 'TurnSense: End-of-Turn Detection in Hindi and Hinglish',
    subtitle: 'Do existing turn detectors survive real code-switched conversation?',
    github: 'GITHUB_URL_3',
    problem: [
      'A voice agent must know when the user has actually finished speaking. Cut in too early and it interrupts, wait too long and it feels slow.',
      'Existing end-of-turn (EOT) systems are mostly tested on clean benchmarks, not natural Hindi-English code-switched speech.',
      'A silence or a finished sentence alone does not prove the speaker is done.',
    ],
    found: [
      'On Hindi benchmark data, LiveKit Turn Detector v1-mini was strongest (AUC 0.8422, AP 0.7651).',
      'On natural Hinglish conversation, performance dropped sharply: Smart Turn v3.2 got AUC 0.516 and LiveKit Mini got AUC 0.450, which is near chance.',
      'At the 0.5 threshold, false cutoffs on HOLD examples: Smart Turn 4 out of 16, LiveKit Mini 11 out of 16.',
      'The high AP values (0.863 and 0.871) are misleading because 86.2% of the data is EOT.',
      'Strong benchmark results did not transfer to real conversation.',
    ],
    solution: [
      'No fix yet. This is a pilot baseline.',
      'Delivered: an evaluation pipeline for Hindi/Hinglish EOT, and evidence that these systems need testing on natural code-switched speech.',
      'Next: a bigger corpus, better annotation, and a study of failures around pauses, hesitation and code-switching.',
    ],
    how: [
      'Stage 1: evaluated Smart Turn v3.2, LiveKit v1-mini and a Silero VAD silence baseline on the EoT-Bench Hindi validation set.',
      'Stage 2: collected 3 conversational Hinglish recordings (general chat, cricket, movies) and manually reviewed 123 pause candidates.',
      'Final binary set: 116 scored boundaries (100 EOT, 16 HOLD). A targeted audit of 31 EOT labels confirmed 30 and corrected 1 to HOLD.',
      'Labels: EOT, HOLD, AMBIGUOUS.',
      'Honest limits: exploratory pilot, 3 recordings, limited speaker diversity, only 16 HOLD examples.',
    ],
  },
];

// Each project: problem (list), built (numbered steps), results (big figure + small label),
// notes (optional extra lines under the stats), limits (one small line), links.
const PROJECTS = [
  {
    title: 'Black Box: the flight recorder for emergency care',
    subtitle: 'Offline Hindi + English voice documentation for ambulances, with a tamper-proof record',
    tag: 'Built for a hackathon',
    problem: [
      'In emergency care, notes are written from memory hours later. When a dose is disputed, nobody can prove what was said or when.',
      'Ambulances lose signal, so cloud-only voice agents fail exactly when they are needed, and patient audio should not leave the vehicle.',
      'India needs this in Hindi and Hinglish, not just English.',
      "Speech recognition is never perfect, so the system has to catch and confirm mistakes rather than pretend they don't happen.",
    ],
    built: [
      'A paramedic says "gave adrenaline one milligram IV" (or in Hindi). It runs fully offline.',
      'Listen: offline speech-to-text (faster-whisper) with voice activity detection and medical vocabulary biasing.',
      'Understand: rules plus a small local LLM turn speech into structured events (drug, dose, unit, route, vitals). The LLM only proposes; code verifies that every number and drug actually appears in the transcript.',
      'Confirm: the device reads the event back and the crew says confirm or cancel.',
      'Guardian: 10 protocol rules (allergy, max dose, repeat too soon, wrong route and more) act as a second pair of ears.',
      'Seal: every entry is hashed (SHA-256), signed (Ed25519) and linked to the previous entry. Voice clips are AES-256-GCM encrypted and bound to the hash.',
      'Sync: when signal returns, a hospital server verifies the chain. A dashboard shows a live integrity verdict, with FHIR R4 export.',
      'The demo moment: change one dose after the fact and the dashboard turns red and names the exact entry that was altered.',
    ],
    results: [
      { value: '23/23', label: 'Guardian test scenes passed' },
      { value: '1.00 / 1.00', label: 'Guardian alert precision / recall, with 0 false alarms' },
      { value: '97.3', label: 'Headline extraction F1 on 119 gold dictations (rules only, no LLM)' },
      { value: '83.3', label: 'Event F1 on the 30 hard held-out dictations' },
      { value: '10 of 12', label: 'Wrong medications (12 of 87 recorded) caught by the confirmation step; 2 slipped through' },
      { value: '6 of 6', label: 'Tamper attacks detected: edit, delete, reorder, backdate, swap audio, truncate (truncation needs the server anchor)' },
      { value: '169', label: 'Automated tests passed, 2 skipped (189 passed on the arm64 environment)' },
    ],
    notes: [],
    limits: 'Honest limits: synthetic data only, live Hindi speech recognition with small offline Whisper models is still weak, not clinically validated.',
    links: [
      { label: 'GitHub', href: 'https://github.com/Nakshatra-thange/bolna-yc' },
      { label: 'Demo video', href: 'https://youtu.be/wKPSZ5F676g?si=T9z-bP6QPBaT0wCM' },
    ],
  },
  {
    title: 'UPSC Interview Mock: a voice AI board that scores you',
    subtitle: 'A real-time voice agent that runs a mock UPSC interview in English and Hinglish',
    tag: 'My first voice agent, built for the SuperKalam AI/ML internship application',
    problem: [
      'The UPSC Personality Test is the final stage of the Civil Services Exam, and practicing for it usually means a booked panel session with limited slots.',
      "Aspirants speak English mixed with Hindi, and most practice tools don't handle that.",
      'A repeatable practice round, available at any hour, that cross-questions you like a real board.',
    ],
    built: [
      'A real-time voice agent: LiveKit, then VAD, then Sarvam STT, then a turn detector, then the LLM "board", then Sarvam TTS.',
      "Questions are generated live by an LLM from the candidate's introduction and answers. There is no fixed question bank.",
      'It cross-questions vague or wrong claims, stays neutral mid-interview, and asks one question at a time. Three intensities: gentle, standard, tough.',
      'A separate evaluator model scores the transcript on 6 dimensions (clarity, depth, balance, awareness, authenticity, composure), then the board speaks the feedback.',
      'I split the evaluator from the interviewer because the interviewer lost count of questions and drifted from its neutral tone when it scored itself.',
      'Extras: a Streamlit dashboard for history and scores, and a web demo with an access-code gate and a 15-minute session cap.',
    ],
    results: [
      { value: '0.917', label: 'Key UPSC term recall in speech recognition (12 clips, chosen config)' },
      { value: '0.095', label: 'Word error rate with the chosen config (Sarvam saaras:v4, codemix, en-IN), vs 0.509 for the older v3 setup' },
      { value: '0.43 s', label: 'Median STT latency (batch upload, not streaming)' },
      { value: '8.75', label: 'Average board turns per session (audit of 4 real interviews)' },
      { value: '26.5', label: 'Average words per board turn' },
      { value: '0', label: 'Turns with more than one question, and 0 praise slips mid-interview' },
      { value: '6', label: 'Scoring dimensions, each 0 to 10, with the overall score as the mean' },
      { value: '1.6 s', label: 'Estimated response delay in the earlier build' },
    ],
    notes: [
      'Bug found by audit: the interview-finish step was called 0 times in live sessions. I fixed it by enforcing interview length and post-call evaluation in code.',
    ],
    limits: 'Honest limits: small evals (12 clips, one speaker), and the scoring evaluator is an unvalidated LLM judge, so read the scores as indicative.',
    links: [
      { label: 'GitHub', href: 'https://github.com/Nakshatra-thange/superkalam' },
      { label: 'Live demo', href: 'DEMO_URL_2' },
    ],
  },
];

// Cards are built by the shared component in accordion.js.
(() => {
  'use strict';
  const { el, section, bullets, linksRow, stats, note, build } = window.Accordion;

  const researchBody = (item) => [
    section(1, 'The Problem', bullets(item.problem)),
    section(2, 'What I Found', bullets(item.found)),
    section(3, 'The Solution', bullets(item.solution)),
    section(4, 'How I Found It', bullets(item.how)),
    linksRow([{ label: 'GitHub', href: item.github }]),
  ];

  const projectBody = (item) => [
    item.tag ? el('p', 'acc-tag', item.tag) : null,
    section(1, 'The Problem', bullets(item.problem)),
    section(2, 'What I Built', bullets(item.built, true)),
    section(3, 'Results', stats(item.results), ...(item.notes || []).map((n) => note(n)), note(item.limits, 'acc-limits')),
    linksRow(item.links),
  ];

  build(document.getElementById('research-list'), RESEARCH, 'research', researchBody);
  build(document.getElementById('projects-list'), PROJECTS, 'project', projectBody);
})();
