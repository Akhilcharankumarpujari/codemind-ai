'use strict';

const state = {
  steps:[], currentStep:0, isPlaying:false, playInterval:null,
  speed:3, vizMode:'dsa', prevVars:{}, currentAlgo:'bubble_sort', analysisResult:null
};
const SPEED_MAP   = {1:1800,2:1200,3:700,4:350,5:150};
const SPEED_LABELS = {1:'0.5x',2:'0.75x',3:'1x',4:'1.5x',5:'2x'};
const S = id => document.getElementById(id);

function svgEl(tag, attrs={}, text='') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
  if (text) el.textContent = text;
  return el;
}

const SmartParser = {
  detectLanguage(code) {
    const tests = [
      { lang:'Python',     score: /def\s+\w+|from\s+\w+\s+import|print\(|:\s*$|elif|__init__|\.append\(|range\(/m.test(code) ? 8 : 0 },
      { lang:'JavaScript', score: /function\s+\w+|const\s+\w+\s*=|let\s+\w+|=>\s*{|console\.|require\(|\.then\(|async\s+function|module\.exports/m.test(code) ? 8 : 0 },
      { lang:'TypeScript', score: /:\s*(string|number|boolean|any|void)|interface\s+\w+|type\s+\w+\s*=|<[A-Z]\w+>/m.test(code) ? 9 : 0 },
      { lang:'React/JSX',  score: /import\s+React|useState|useEffect|useRef|JSX\.Element|<\w+\s|className=|\.jsx|\.tsx/m.test(code) ? 10 : 0 },
      { lang:'Java',       score: /public\s+(static\s+)?void|class\s+\w+.*{|System\.out\.|new\s+\w+\(|@Override/m.test(code) ? 8 : 0 },
      { lang:'C++',        score: /#include|std::|cout\s*<<|int\s+main\(|vector<|nullptr/m.test(code) ? 8 : 0 },
      { lang:'Python',     score: /import\s+numpy|import\s+pandas|import\s+flask|from\s+django/i.test(code) ? 5 : 0 },
      { lang:'SQL',        score: /SELECT\s+|INSERT\s+INTO|CREATE\s+TABLE|WHERE\s+|JOIN\s+/i.test(code) ? 10 : 0 },
      { lang:'HTML',       score: /<html|<div|<span|<!DOCTYPE/i.test(code) ? 9 : 0 },
      { lang:'CSS',        score: /\{[\s\S]*:[\s\S]*;|@media|\.[\w-]+\s*\{/.test(code) ? 9 : 0 },
    ];
    
    const map = {};
    tests.forEach(({lang, score}) => { map[lang] = (map[lang]||0) + score; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Unknown';
  },

  detectCategory(code) {
    if (/import\s+React|useState|useEffect|useContext|JSX|Component\s+extends|\.jsx|\.tsx/i.test(code)) return {cat:'React/UI Component', viz:'react'};
    if (/app\.get|app\.post|app\.put|app\.delete|router\.|@app\.route|express\(\)|fastapi|Flask|@RestController|@GetMapping/i.test(code)) return {cat:'API / Backend Route', viz:'systemflow'};
    if (/jwt|bcrypt|hash|salt|authenticate|authorize|login|logout|session|passport|OAuth/i.test(code)) return {cat:'Authentication', viz:'systemflow'};
    if (/SELECT\s+|INSERT\s+INTO|CREATE\s+TABLE|mongoose|prisma|sequelize|findOne|findAll/i.test(code)) return {cat:'Database / Query', viz:'systemflow'};
    if (/kafka|rabbitmq|grpc|proto|microservice|publish|subscribe|emit\(|on\(/i.test(code)) return {cat:'Microservice / Events', viz:'systemflow'};
    
    const dsaPatterns = [
      /bubble.?sort|selection.?sort|insertion.?sort|merge.?sort|quick.?sort/i,
      /binary.?search|linear.?search|two.?pointer|sliding.?window/i,
      /linked.?list|binary.?tree|bst|avl|heap|priority.?queue/i,
      /graph|bfs|dfs|breadth.?first|depth.?first|dijkstra|topolog/i,
      /dynamic.?programming|memoiz|knapsack|fibonacci|lcs|dp\[/i,
      /\bstack\b|\bqueue\b|\bdeque\b|\btrie\b|segment.?tree/i,
    ];
    if (dsaPatterns.some(p => p.test(code))) return {cat:'DSA Algorithm', viz:'dsa'};
    
    if (/class\s+\w+/.test(code)) return {cat:'Class / Object', viz:'general'};
    if (/async|await|Promise|fetch\(|axios|http\.get/i.test(code)) return {cat:'Async / Network Code', viz:'general'};
    if (/def\s+\w+|function\s+\w+|const\s+\w+\s*=\s*(\(|function)/m.test(code)) return {cat:'Utility Function', viz:'general'};
    return {cat:'General Code', viz:'general'};
  },

  parse(code) {
    const lines = code.split('\n');
    const blocks = [];

    const importLines = lines.filter(l => /^\s*(import|from\s+\w+\s+import|require\s*\(|#include|using\s+|const\s+\w+\s*=\s*require)/m.test(l));
    if (importLines.length) {
      const names = importLines.map(l => {
        const m = l.match(/import\s+['"]?(\S+?)['"]?\s*;?$/) || l.match(/from\s+['"]?(\S+?)['"]/) || l.match(/require\(['"](.+?)['"]\)/);
        return m ? m[1].split('/').pop().replace(/['"]/g,'') : null;
      }).filter(Boolean).slice(0,5);
      blocks.push({ type:'import', icon:'📦', label:'Dependencies', detail:names.join(', ') || 'modules', lines: importLines.length, startLine:1 });
    }

    const classMatches = [...code.matchAll(/class\s+(\w+)(?:\s+extends\s+(\w+))?/g)];
    classMatches.forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      blocks.push({ type:'class', icon:'🏛️', label:`class ${m[1]}`, detail: m[2] ? `extends ${m[2]}` : 'class definition', lines:1, startLine:ln });
    });

    const fnPatterns = [
      /(?:^|\s)(?:async\s+)?function\s+(\w+)\s*\(/gm,
      /(?:^|\s)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/gm,
      /(?:^|\s)def\s+(\w+)\s*\(/gm,
      /(?:^|\s)(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*\{/gm,
    ];
    const foundFns = new Set();
    fnPatterns.forEach(re => {
      let m;
      while ((m = re.exec(code)) !== null) {
        const name = m[1];
        if (!name || foundFns.has(name) || ['if','for','while','switch','catch','else','try'].includes(name)) continue;
        foundFns.add(name);
        const ln = code.slice(0,m.index).split('\n').length;
        const isReact = /^[A-Z]/.test(name) && /jsx|tsx|React|useState/.test(code);
        blocks.push({ type: isReact ? 'component' : 'function', icon: isReact ? '⚛️' : '⚙️', label: isReact ? `<${name}/>` : `${name}()`, detail: isReact ? 'React Component' : 'function', lines:1, startLine:ln });
      }
    });

    const stateMatches = [...code.matchAll(/(?:const|let|var)\s+\[(\w+),\s*set\w+\]\s*=\s*useState\(([^)]*)\)/g)];
    stateMatches.forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      blocks.push({ type:'state', icon:'💾', label:`state: ${m[1]}`, detail:`useState(${m[2] || '…'})`, lines:1, startLine:ln });
    });

    const routeMatches = [...code.matchAll(/app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g)];
    routeMatches.forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      blocks.push({ type:'route', icon:'🔀', label:`${m[1].toUpperCase()} ${m[2]}`, detail:'API endpoint', lines:1, startLine:ln });
    });

    const loopMatches = [...code.matchAll(/(?:^|\s)(for|while|forEach|map|filter|reduce)\s*[\s(]/gm)];
    const loopLines = new Set();
    loopMatches.slice(0,3).forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      if (!loopLines.has(ln)) { loopLines.add(ln); blocks.push({ type:'loop', icon:'🔄', label:`${m[1]} loop`, detail:'iteration', lines:1, startLine:ln }); }
    });

    const condMatches = [...code.matchAll(/(?:^|\s)(if|switch|ternary|else\s+if)\s*[\s(]/gm)];
    const condLines = new Set();
    condMatches.slice(0,2).forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      if (!condLines.has(ln)) { condLines.add(ln); blocks.push({ type:'condition', icon:'🔀', label:`${m[1]} condition`, detail:'branching logic', lines:1, startLine:ln }); }
    });

    const retMatches = [...code.matchAll(/\breturn\b/g)].slice(-1);
    retMatches.forEach(m => {
      const ln = code.slice(0,m.index).split('\n').length;
      const retLine = lines[ln-1]?.trim() || 'return';
      blocks.push({ type:'return', icon:'✅', label:'Return / Output', detail: retLine.slice(0,40), lines:1, startLine:ln });
    });

    const sqlBlocks = [
      { re:/SELECT\s+/i, icon:'🔍', label:'SELECT Query', detail:'read data' },
      { re:/INSERT\s+INTO/i, icon:'➕', label:'INSERT Query', detail:'write data' },
      { re:/UPDATE\s+\w+\s+SET/i, icon:'✏️', label:'UPDATE Query', detail:'modify data' },
      { re:/DELETE\s+FROM/i, icon:'🗑️', label:'DELETE Query', detail:'remove data' },
      { re:/CREATE\s+TABLE/i, icon:'🏗️', label:'CREATE TABLE', detail:'schema definition' },
      { re:/JOIN\s+/i, icon:'🔗', label:'JOIN Operation', detail:'table join' },
    ];
    sqlBlocks.forEach(({re,icon,label,detail}) => {
      if (re.test(code)) blocks.push({ type:'query', icon, label, detail, lines:1, startLine:1 });
    });

    blocks.sort((a,b) => a.startLine - b.startLine);

    const seen = new Set();
    return blocks.filter(b => { const k = b.type+b.label; if(seen.has(k)) return false; seen.add(k); return true; });
  },

  buildSteps(blocks, code, aiSteps) {
    if (aiSteps && aiSteps.length >= 3) {
      const blockCount = (blocks && blocks.length) ? blocks.length : 1;
      return aiSteps.map((s,i) => {
        const varsObj = s.variables || s.vars || {};
        let foundArr = [];
        for (const [k, v] of Object.entries(varsObj)) {
          if (Array.isArray(v)) {
            foundArr = v;
            break;
          }
        }
        return {
          blockIdx: s.blockIdx ?? (i % blockCount),
          action: s.action || s.stepNumber || `Step ${i+1}`,
          description: s.description || s.action || '',
          vars: varsObj,
          callStack: s.callStack || ['main'],
          line: s.line || 1,
          explanation: s.description || s.action || '',
          dryAction: s.action || `Step ${i+1}`,
          arr: foundArr
        };
      });
    }

    const steps = [];
    const blockTypeVerbs = {
      import:'Load dependencies', class:'Define class', function:'Define function',
      component:'Mount component', state:'Initialize state', route:'Register route',
      loop:'Execute loop', condition:'Evaluate condition', return:'Return result',
      query:'Execute query'
    };

    blocks.forEach((block, i) => {
      steps.push({
        blockIdx: i,
        action: blockTypeVerbs[block.type] || 'Execute',
        description: `${block.icon} ${block.label}${block.detail ? ` — ${block.detail}` : ''}`,
        vars: {}, callStack: ['main'], line: block.startLine || 1,
        explanation: `<strong>${block.icon} ${block.label}</strong>: ${block.detail || 'executing'}`,
        dryAction: block.label, arr: []
      });

      if (block.type === 'function' || block.type === 'component') {
        const fnStart = block.startLine - 1;
        const fnLines = code.split('\n').slice(fnStart, fnStart + 8);
        fnLines.forEach((line, li) => {
          const t = line.trim();
          if (!t || t.startsWith('//') || t.startsWith('#') || t === '{' || t === '}') return;
          let act = 'Execute', icon = '›';
          if (/if|else|switch/.test(t)) { act='Condition'; icon='🔀'; }
          else if (/for|while|forEach|map/.test(t)) { act='Loop'; icon='🔄'; }
          else if (/return/.test(t)) { act='Return'; icon='✅'; }
          else if (/=/.test(t) && !/>|</.test(t)) { act='Assign'; icon='💾'; }
          else if (/\w+\s*\(/.test(t)) { act='Call'; icon='⚡'; }
          steps.push({
            blockIdx: i,
            action: `${icon} ${act}: ${t.slice(0,35)}`,
            description: `Line ${fnStart+li+1}: ${t.slice(0,60)}`,
            vars: {}, callStack: [block.label.replace('()','')||'fn', 'main'],
            line: fnStart + li + 1,
            explanation: `${icon} <strong>${act}</strong>: <span class="hw">${t.slice(0,50)}</span>`,
            dryAction: act, arr: []
          });
        });
      }
    });

    return steps.length ? steps : [{ blockIdx:0, action:'Analyzing', description:code.split('\n')[0]||'', vars:{}, callStack:['main'], line:1, explanation:'Code structure analyzed.', dryAction:'Analyze', arr:[] }];
  }
};

const Classifier = {
  detectDSAKey(code) {
    const pats = [
      {re:/bubble.?sort/i,k:'bubble_sort'},{re:/selection.?sort/i,k:'selection_sort'},
      {re:/insertion.?sort/i,k:'insertion_sort'},{re:/merge.?sort/i,k:'merge_sort'},
      {re:/quick.?sort|partition/i,k:'quick_sort'},{re:/binary.?search/i,k:'binary_search'},
      {re:/linear.?search/i,k:'linear_search'},{re:/two.?pointer/i,k:'two_pointers'},
      {re:/sliding.?window/i,k:'sliding_window'},{re:/fibonacci/i,k:'fibonacci_dp'},
      {re:/linked.?list.*reverse/i,k:'linked_list_reverse'},{re:/linked.?list|\.next\s*=/i,k:'linked_list_traversal'},
      {re:/\bbfs\b|breadth.?first/i,k:'bfs_tree'},{re:/\bdfs\b|depth.?first/i,k:'dfs_tree'},
      {re:/bst|binary.?search.?tree/i,k:'bst_insert'},{re:/\bstack\b.*(?:push|pop)/i,k:'stack_ops'},
      {re:/\bqueue\b|popleft|deque/i,k:'queue_ops'},
    ];
    for (const {re,k} of pats) if (re.test(code)) return k;
    if (/for.*for.*if.*swap|arr\[j\].*arr\[j\+1\]/i.test(code)) return 'bubble_sort';
    if (/mid\s*=.*left.*right|left.*right.*while/i.test(code)) return 'binary_search';
    return null;
  },

  classify(code, manualMode) {
    const lang = SmartParser.detectLanguage(code);
    const {cat, viz} = SmartParser.detectCategory(code);
    const dsaKey = this.detectDSAKey(code);
    const vizMode = manualMode && manualMode !== 'auto' ? manualMode : (dsaKey ? 'dsa' : viz);
    const confidence = dsaKey ? 97 : cat !== 'General Code' ? 88 : 70;
    return { language: lang, category: cat, pattern: dsaKey ? (dsaKey.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())) : cat, vizMode, dsaKey, confidence };
  }
};

const BLOCK_COLORS = {
  import:   { fill:'rgba(124,58,237,.15)', stroke:'#7c3aed', text:'#a78bfa' },
  class:    { fill:'rgba(16,185,129,.12)', stroke:'#10b981', text:'#34d399' },
  function: { fill:'rgba(0,229,255,.12)', stroke:'#00e5ff', text:'#00e5ff' },
  component:{ fill:'rgba(97,218,251,.12)', stroke:'#61dafb', text:'#61dafb' },
  state:    { fill:'rgba(245,158,11,.1)', stroke:'#f59e0b', text:'#fbbf24' },
  route:    { fill:'rgba(239,68,68,.1)', stroke:'#ef4444', text:'#f87171' },
  loop:     { fill:'rgba(249,115,22,.1)', stroke:'#f97316', text:'#fb923c' },
  condition:{ fill:'rgba(168,85,247,.12)', stroke:'#a855f7', text:'#c084fc' },
  return:   { fill:'rgba(16,185,129,.18)', stroke:'#10b981', text:'#34d399' },
  query:    { fill:'rgba(245,158,11,.12)', stroke:'#f59e0b', text:'#fbbf24' },
  default:  { fill:'rgba(30,41,59,.5)', stroke:'#2a3347', text:'#94a3b8' },
};

function renderCodeBlockSvg(blocks, activeBlockIdx, svg) {
  const W = svg.clientWidth || 700;
  const H = svg.clientHeight || 380;
  svg.innerHTML = '';

  if (!blocks.length) {
    svg.appendChild(svgEl('text',{x:W/2,y:H/2,'text-anchor':'middle',fill:'#64748b','font-family':'Inter','font-size':14},'Code structure detected — stepping through execution…'));
    return;
  }

  const bW = Math.min(300, W * 0.6);
  const bH = 56;
  const gap = 38;
  const totalH = blocks.length * (bH + gap) - gap;
  const startX = (W - bW) / 2;
  const startY = Math.max(20, (H - totalH) / 2);

  for (let i = 0; i < 5; i++) {
    svg.appendChild(svgEl('line',{x1:0,y1:startY+i*(bH+gap)+bH/2,x2:W,y2:startY+i*(bH+gap)+bH/2,stroke:'rgba(33,40,58,.3)','stroke-width':1,'stroke-dasharray':'4,8'}));
  }

  blocks.forEach((block, i) => {
    const y = startY + i * (bH + gap);
    const isActive = i === activeBlockIdx;
    const c = BLOCK_COLORS[block.type] || BLOCK_COLORS.default;

    if (i > 0) {
      const ay = y - gap;
      const arrowG = svgEl('g');
      arrowG.appendChild(svgEl('line',{x1:startX+bW/2,y1:ay,x2:startX+bW/2,y2:y-4,'stroke': i-1 < activeBlockIdx ? c.stroke : '#2a3347','stroke-width': i-1 < activeBlockIdx ? 2 : 1.5}));
      
      const ax = startX+bW/2, ay2 = y-2;
      arrowG.appendChild(svgEl('polygon',{points:`${ax},${ay2} ${ax-5},${ay2-8} ${ax+5},${ay2-8}`,fill: i-1 < activeBlockIdx ? c.stroke : '#2a3347'}));
      svg.appendChild(arrowG);
    }

    if (isActive) {
      svg.appendChild(svgEl('rect',{x:startX-4,y:y-4,width:bW+8,height:bH+8,rx:12,fill:'transparent',stroke:c.stroke,'stroke-width':1.5,opacity:.4,'filter':'blur(4px)'}));
    }

    const rect = svgEl('rect',{x:startX,y,width:bW,height:bH,rx:9,fill:c.fill,stroke:c.stroke,'stroke-width': isActive ? 2 : 1.5});
    if (isActive) rect.style.filter = `drop-shadow(0 0 12px ${c.stroke})`;
    rect.style.transition = 'filter .3s, stroke-width .3s';
    svg.appendChild(rect);

    if (isActive) {
      svg.appendChild(svgEl('rect',{x:startX,y:y+8,width:4,height:bH-16,rx:2,fill:c.stroke}));
    }

    const iconText = svgEl('text',{x:startX+20,y:y+bH/2+5,'text-anchor':'middle',fill:c.text,'font-size':18,'font-family':'Segoe UI Emoji'});
    iconText.textContent = block.icon;
    svg.appendChild(iconText);

    const lbl = svgEl('text',{x:startX+38,y:y+20,'text-anchor':'start',fill: isActive ? '#ffffff' : c.text,'font-family':'JetBrains Mono','font-size':13,'font-weight':'700'});
    lbl.textContent = block.label;
    svg.appendChild(lbl);

    const det = svgEl('text',{x:startX+38,y:y+36,'text-anchor':'start',fill:'#64748b','font-family':'Inter','font-size':11});
    det.textContent = block.detail?.slice(0,38) || '';
    svg.appendChild(det);

    if (block.startLine) {
      const ltag = svgEl('text',{x:startX+bW-10,y:y+bH-8,'text-anchor':'end',fill:'#475569','font-family':'JetBrains Mono','font-size':10});
      ltag.textContent = `L${block.startLine}`;
      svg.appendChild(ltag);
    }

    if (isActive) {
      for (let r = 0; r < 2; r++) {
        const pulse = svgEl('rect',{x:startX-r*4,y:y-r*4,width:bW+r*8,height:bH+r*8,rx:12,fill:'transparent',stroke:c.stroke,'stroke-width':.8,opacity: .3 - r*.1});
        svg.appendChild(pulse);
      }
    }
  });

  svg.appendChild(svgEl('text',{x:W/2,y:Math.max(16,startY-10),'text-anchor':'middle',fill:'#475569','font-family':'Inter','font-size':11},`${blocks.length} code blocks · step through with ▶`));
}

const SYS_NODE_COLORS = {
  user:     '#a78bfa', api:    '#00e5ff', backend:'#10b981',
  db:       '#f59e0b', auth:   '#ef4444', cache:  '#f97316',
  response: '#10b981', default:'#94a3b8'
};

function renderSystemFlowSvg(nodes, activeIdx, svg) {
  const W = svg.clientWidth || 700;
  const H = svg.clientHeight || 380;
  svg.innerHTML = '';

  const nW = Math.min(260, W * 0.55), nH = 52;
  const gap = 36;
  const totalH = nodes.length * (nH + gap) - gap;
  const startX = (W - nW) / 2;
  const startY = Math.max(16, (H - totalH) / 2);

  nodes.forEach((node, i) => {
    const y = startY + i * (nH + gap);
    const isActive = i === activeIdx;
    const color = SYS_NODE_COLORS[node.color] || SYS_NODE_COLORS.default;

    if (i > 0) {
      const ay = y - gap;
      svg.appendChild(svgEl('line',{x1:startX+nW/2,y1:ay,x2:startX+nW/2,y2:y-3,stroke: i <= activeIdx ? color : '#21283a','stroke-width': i<=activeIdx ? 2 : 1.5}));
      svg.appendChild(svgEl('polygon',{points:`${startX+nW/2},${y-1} ${startX+nW/2-5},${y-9} ${startX+nW/2+5},${y-9}`,fill: i<=activeIdx ? color : '#21283a'}));
    }

    const bgFill = isActive ? `rgba(${hexToRgb(color)},.18)` : `rgba(${hexToRgb(color)},.07)`;
    const rect = svgEl('rect',{x:startX,y,width:nW,height:nH,rx:9,fill:bgFill,stroke:color,'stroke-width': isActive ? 2 : 1.5});
    if (isActive) rect.style.filter = `drop-shadow(0 0 14px ${color})`;
    svg.appendChild(rect);

    const ic = svgEl('text',{x:startX+20,y:y+nH/2+6,'text-anchor':'middle',fill:color,'font-size':17,'font-family':'Segoe UI Emoji'});
    ic.textContent = node.icon || '📦';
    svg.appendChild(ic);

    svg.appendChild(svgEl('text',{x:startX+38,y:y+18,'text-anchor':'start',fill: isActive ? '#fff' : color,'font-family':'JetBrains Mono','font-size':12,'font-weight':'700'},node.label));
    svg.appendChild(svgEl('text',{x:startX+38,y:y+34,'text-anchor':'start',fill:'#64748b','font-family':'Inter','font-size':10.5},node.action?.slice(0,36)||''));
  });
}

function hexToRgb(hex) {
  const r = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '148,163,184';
}

function renderDebugSvg(errors, warnings, optimizations, blocks, activeIdx, svg) {
  const W = svg.clientWidth || 700;
  const H = svg.clientHeight || 380;
  svg.innerHTML = '';

  const stats = [
    { count: errors.length, label:'Errors', color:'#ef4444', icon:'🔴' },
    { count: warnings.length, label:'Warnings', color:'#f59e0b', icon:'⚠️' },
    { count: optimizations.length, label:'Optimizations', color:'#10b981', icon:'💡' },
  ];
  const sbW = 140, sbH = 60, sbGap = 16;
  const totalSbW = stats.length * sbW + (stats.length-1) * sbGap;
  const sbStartX = (W - totalSbW) / 2;

  stats.forEach(({count, label, color, icon}, i) => {
    const sx = sbStartX + i * (sbW + sbGap);
    svg.appendChild(svgEl('rect',{x:sx,y:14,width:sbW,height:sbH,rx:8,fill:`rgba(${hexToRgb(color)},.1)`,stroke:color,'stroke-width':1.5}));
    const iconT = svgEl('text',{x:sx+14,y:14+sbH/2+6,'font-size':20,'font-family':'Segoe UI Emoji',fill:color});
    iconT.textContent = icon; svg.appendChild(iconT);
    svg.appendChild(svgEl('text',{x:sx+40,y:14+22,'font-family':'JetBrains Mono','font-size':22,'font-weight':'800',fill:color},count));
    svg.appendChild(svgEl('text',{x:sx+40,y:14+44,'font-family':'Inter','font-size':11,fill:'#64748b'},label));
  });

  const allIssues = [
    ...errors.map(e => ({...e, kind:'error', color:'#ef4444', icon:'🔴'})),
    ...warnings.map(w => ({...w, kind:'warn', color:'#f59e0b', icon:'⚠️'})),
    ...optimizations.map((o,i) => ({message: typeof o==='string'?o:(o.message||''), kind:'opt', color:'#10b981', icon:'💡', type:'Optimization'}))
  ];

  const issueH = 52, issueY0 = 94, issueW = Math.min(W * 0.85, 500), issueX = (W-issueW)/2;

  allIssues.slice(0, 5).forEach((issue, i) => {
    const iy = issueY0 + i * (issueH + 8);
    const isActive = i === activeIdx;
    const c = issue.color;

    svg.appendChild(svgEl('rect',{x:issueX,y:iy,width:issueW,height:issueH,rx:7,fill:`rgba(${hexToRgb(c)},.08)`,stroke: isActive ? c : `rgba(${hexToRgb(c)},.35)`,'stroke-width': isActive ? 2 : 1}));
    if (isActive) svg.appendChild(svgEl('rect',{x:issueX,y:iy+6,width:4,height:issueH-12,rx:2,fill:c}));

    const iconT = svgEl('text',{x:issueX+18,y:iy+issueH/2+6,'font-size':16,'font-family':'Segoe UI Emoji'});
    iconT.textContent = issue.icon; svg.appendChild(iconT);

    const typeLabel = issue.type || issue.kind?.toUpperCase() || 'Issue';
    svg.appendChild(svgEl('text',{x:issueX+38,y:iy+18,'font-family':'JetBrains Mono','font-size':11,'font-weight':'700',fill: isActive ? '#fff' : c},typeLabel + (issue.line ? ` (L${issue.line})` : '')));
    const msgTrunc = (issue.message||'').slice(0,60);
    svg.appendChild(svgEl('text',{x:issueX+38,y:iy+34,'font-family':'Inter','font-size':10.5,fill:'#94a3b8'},msgTrunc));
  });

  if (!allIssues.length) {
    svg.appendChild(svgEl('text',{x:W/2,y:H/2+10,'text-anchor':'middle','font-family':'Inter','font-size':15,fill:'#10b981'},'✅ No issues detected — code looks clean!'));
  }

  svg.appendChild(svgEl('text',{x:W/2,y:H-14,'text-anchor':'middle',fill:'#475569','font-family':'Inter','font-size':11},`${allIssues.length} issue${allIssues.length!==1?'s':''} found · step through with ▶`));
}

const ALGORITHMS = {
  bubble_sort:{name:'Bubble Sort',complexity:{time:'O(n²)',space:'O(1)',best:'O(n)',worst:'O(n²)'},defaultInput:'[64, 25, 12, 22, 11]',langs:{python:`def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\narr = [64, 25, 12, 22, 11]\nresult = bubble_sort(arr)`,javascript:`function bubbleSort(arr) {\n  let n = arr.length;\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        [arr[j], arr[j+1]] = [arr[j+1], arr[j]];\n      }\n    }\n  }\n  return arr;\n}\nconsole.log(bubbleSort([64,25,12,22,11]));`,java:`void bubbleSort(int[] arr) {\n    int n = arr.length;\n    for (int i = 0; i < n-1; i++)\n        for (int j = 0; j < n-i-1; j++)\n            if (arr[j] > arr[j+1]) {\n                int t=arr[j]; arr[j]=arr[j+1]; arr[j+1]=t;\n            }\n}`,cpp:`void bubbleSort(vector<int>& arr) {\n    int n=arr.size();\n    for(int i=0;i<n;i++)\n        for(int j=0;j<n-i-1;j++)\n            if(arr[j]>arr[j+1]) swap(arr[j],arr[j+1]);\n}`},traceGenerator(arr){const a=[...arr],n=a.length,steps=[],sorted=new Set();steps.push({arr:[...a],highlights:{},action:'Start',vars:{i:'-',j:'-',n},line:0,explanation:`Bubble Sort on [${a}]. Makes ${n-1} passes.`,dryAction:'Initialize'});for(let i=0;i<n;i++){for(let j=0;j<n-i-1;j++){steps.push({arr:[...a],highlights:{[j]:'comparing',[j+1]:'comparing'},action:`Compare [${j}]=${a[j]} vs [${j+1}]=${a[j+1]}`,vars:{i,j,n,'arr[j]':a[j],'arr[j+1]':a[j+1]},line:3,explanation:`Pass ${i+1}: <span class="hw">arr[${j}]=${a[j]}</span> vs <span class="hw">arr[${j+1}]=${a[j+1]}</span>. ${a[j]>a[j+1]?'Swap!':'No swap.'}`,dryAction:`Compare[${j}]↔[${j+1}]`});if(a[j]>a[j+1]){const t=a[j];a[j]=a[j+1];a[j+1]=t;steps.push({arr:[...a],highlights:{[j]:'swapped',[j+1]:'swapped'},action:`Swapped!`,vars:{i,j,'arr[j]':a[j],'arr[j+1]':a[j+1]},line:4,explanation:`🔄 Swapped <span class="hw">${a[j+1]}</span> ↔ <span class="hw">${a[j]}</span>`,dryAction:'Swap ↕'});}}sorted.add(n-1-i);steps.push({arr:[...a],highlights:{},sorted:new Set(sorted),action:`Pass ${i+1} done`,vars:{i,n},line:2,explanation:`✅ Pass ${i+1}: arr[${n-1-i}]=${a[n-1-i]} in place.`,dryAction:`Pass ${i+1} ✓`});}steps.push({arr:[...a],sorted:new Set([...Array(n).keys()]),highlights:{},action:'Sorted!',vars:{},line:5,explanation:`🎉 [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  selection_sort:{name:'Selection Sort',complexity:{time:'O(n²)',space:'O(1)',best:'O(n²)',worst:'O(n²)'},defaultInput:'[29, 10, 14, 37, 13]',langs:{python:`def selection_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        min_idx = i\n        for j in range(i+1, n):\n            if arr[j] < arr[min_idx]:\n                min_idx = j\n        arr[i], arr[min_idx] = arr[min_idx], arr[i]\n    return arr`,javascript:`function selectionSort(arr) {\n  for (let i=0;i<arr.length;i++) {\n    let min=i;\n    for(let j=i+1;j<arr.length;j++) if(arr[j]<arr[min]) min=j;\n    [arr[i],arr[min]]=[arr[min],arr[i]];\n  }\n  return arr;\n}`},traceGenerator(arr){const a=[...arr],n=a.length,steps=[],sorted=new Set();steps.push({arr:[...a],highlights:{},action:'Start',vars:{n},line:0,explanation:`Selection Sort: find min each pass.`,dryAction:'Initialize'});for(let i=0;i<n;i++){let minIdx=i;steps.push({arr:[...a],highlights:{[i]:'active'},action:`Pass ${i+1}: assume min@[${i}]`,vars:{i,minIdx,'arr[i]':a[i]},line:2,explanation:`Assume min at index <span class="hw">${i}</span> (val=${a[i]})`,dryAction:`minIdx=${i}`});for(let j=i+1;j<n;j++){const hl={[minIdx]:'active',[j]:'comparing'};steps.push({arr:[...a],highlights:hl,action:`arr[${j}]=${a[j]} < min=${a[minIdx]}?`,vars:{i,j,minIdx,'arr[j]':a[j],'arr[minIdx]':a[minIdx]},line:4,explanation:`Check <span class="hw">arr[${j}]=${a[j]}</span> vs min <span class="hw">${a[minIdx]}</span>`,dryAction:`Check[${j}]`});if(a[j]<a[minIdx]){minIdx=j;steps.push({arr:[...a],highlights:{[minIdx]:'active'},action:`New min: arr[${minIdx}]=${a[minIdx]}`,vars:{i,minIdx,'arr[minIdx]':a[minIdx]},line:5,explanation:`🔍 New min: <span class="hw">${a[minIdx]}</span> at [${minIdx}]`,dryAction:`minIdx=${minIdx}`});}}if(minIdx!==i){const t=a[i];a[i]=a[minIdx];a[minIdx]=t;}sorted.add(i);steps.push({arr:[...a],highlights:{[i]:'swapped'},sorted:new Set(sorted),action:`Place ${a[i]} at [${i}]`,vars:{i,minIdx},line:6,explanation:`✅ <span class="hw">${a[i]}</span> placed at [${i}]`,dryAction:`Swap→[${i}]`});}steps.push({arr:[...a],sorted:new Set([...Array(n).keys()]),highlights:{},action:'Sorted!',vars:{},line:7,explanation:`🎉 [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  insertion_sort:{name:'Insertion Sort',complexity:{time:'O(n²)',space:'O(1)',best:'O(n)',worst:'O(n²)'},defaultInput:'[12, 11, 13, 5, 6]',langs:{python:`def insertion_sort(arr):\n    for i in range(1, len(arr)):\n        key = arr[i]\n        j = i - 1\n        while j >= 0 and arr[j] > key:\n            arr[j + 1] = arr[j]\n            j -= 1\n        arr[j + 1] = key\n    return arr`,javascript:`function insertionSort(arr) {\n  for(let i=1;i<arr.length;i++) {\n    let key=arr[i], j=i-1;\n    while(j>=0 && arr[j]>key) { arr[j+1]=arr[j]; j--; }\n    arr[j+1]=key;\n  }\n  return arr;\n}`},traceGenerator(arr){const a=[...arr],n=a.length,steps=[];steps.push({arr:[...a],highlights:{},action:'Start',vars:{},line:0,explanation:`Insertion Sort: build sorted left side.`,dryAction:'Initialize'});for(let i=1;i<n;i++){const key=a[i];steps.push({arr:[...a],highlights:{[i]:'active'},action:`Key=arr[${i}]=${key}`,vars:{i,key,j:i-1},line:2,explanation:`Pick key=<span class="hw">${key}</span> at [${i}]`,dryAction:`key=${key}`});let j=i-1;while(j>=0&&a[j]>key){steps.push({arr:[...a],highlights:{[j]:'comparing',[j+1]:'active'},action:`Shift arr[${j}]=${a[j]} right`,vars:{i,key,j,'arr[j]':a[j]},line:4,explanation:`<span class="hw">${a[j]}</span>>key(${key}), shift right`,dryAction:`Shift[${j}]→[${j+1}]`});a[j+1]=a[j];j--;}a[j+1]=key;steps.push({arr:[...a],highlights:{[j+1]:'swapped'},action:`Insert ${key}@[${j+1}]`,vars:{i,key,j},line:6,explanation:`✅ Inserted <span class="hw">${key}</span> at [${j+1}]`,dryAction:`Insert@[${j+1}]`});}steps.push({arr:[...a],sorted:new Set([...Array(n).keys()]),highlights:{},action:'Sorted!',vars:{},line:7,explanation:`🎉 [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  binary_search:{name:'Binary Search',complexity:{time:'O(log n)',space:'O(1)',best:'O(1)',worst:'O(log n)'},defaultInput:'[2, 5, 8, 12, 16, 23, 38, 56, 72, 91] target=23',langs:{python:`def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,javascript:`function binarySearch(arr,target){\n  let l=0,r=arr.length-1;\n  while(l<=r){\n    const m=Math.floor((l+r)/2);\n    if(arr[m]===target)return m;\n    arr[m]<target?l=m+1:r=m-1;\n  }\n  return -1;\n}`},traceGenerator(arr,input){let target=23;const m=(input||'').match(/target\s*=\s*(\d+)/);if(m)target=+m[1];const a=[...arr],steps=[];let l=0,r=a.length-1;steps.push({arr:a,highlights:{},action:'Init',vars:{left:l,right:r,target},line:0,explanation:`Binary Search for <span class="hw">${target}</span> in [${a}]`,dryAction:'Initialize'});while(l<=r){const mid=Math.floor((l+r)/2);const hl={};hl[mid]='active';for(let k=0;k<l;k++)hl[k]='visited';for(let k=r+1;k<a.length;k++)hl[k]='visited';steps.push({arr:a,highlights:hl,action:`mid=${mid},arr[mid]=${a[mid]}`,vars:{left:l,right:r,mid,'arr[mid]':a[mid],target},line:3,explanation:`mid=${mid}: <span class="hw">arr[${mid}]=${a[mid]}</span> vs ${target}`,dryAction:`mid=${mid}`});if(a[mid]===target){steps.push({arr:a,highlights:{[mid]:'swapped'},action:`Found @${mid}!`,vars:{result:mid},line:4,explanation:`🎉 Found <span class="hw">${target}</span> at [${mid}]!`,dryAction:'Found ✓'});return steps;}a[mid]<target?l=mid+1:r=mid-1;}steps.push({arr:a,highlights:{},action:'Not found',vars:{result:-1},line:9,explanation:`<span class="hw">${target}</span> not in array → -1`,dryAction:'Not found ✗'});return steps;}},
  linear_search:{name:'Linear Search',complexity:{time:'O(n)',space:'O(1)',best:'O(1)',worst:'O(n)'},defaultInput:'[4, 2, 7, 1, 9, 3] target=9',langs:{python:`def linear_search(arr, target):\n    for i in range(len(arr)):\n        if arr[i] == target:\n            return i\n    return -1`,javascript:`function linearSearch(arr,target){\n  for(let i=0;i<arr.length;i++)\n    if(arr[i]===target) return i;\n  return -1;\n}`},traceGenerator(arr,input){let target=9;const m=(input||'').match(/target\s*=\s*(\d+)/);if(m)target=+m[1];const a=[...arr],steps=[];steps.push({arr:a,highlights:{},action:'Start',vars:{target},line:0,explanation:`Linear Search for <span class="hw">${target}</span>`,dryAction:'Initialize'});for(let i=0;i<a.length;i++){const found=a[i]===target;steps.push({arr:a,highlights:{[i]:found?'swapped':'comparing'},action:`arr[${i}]=${a[i]} ${found?'== FOUND!':'≠ skip'}`,vars:{i,'arr[i]':a[i],target},line:2,explanation:`Check <span class="hw">arr[${i}]=${a[i]}</span> ${found?'== Found!':'≠ continue'}`,dryAction:`arr[${i}]=${a[i]}`});if(found){steps.push({arr:a,highlights:{[i]:'swapped'},action:`Found @${i}!`,vars:{result:i},line:3,explanation:`🎉 Found <span class="hw">${target}</span> at index ${i}!`,dryAction:'Found ✓'});return steps;}}steps.push({arr:a,highlights:{},action:'Not found → -1',vars:{result:-1},line:4,explanation:`<span class="hw">${target}</span> not found.`,dryAction:'Not found ✗'});return steps;}},
  two_pointers:{name:'Two Pointers',complexity:{time:'O(n)',space:'O(1)',best:'O(1)',worst:'O(n)'},defaultInput:'[1, 2, 3, 4, 6] target=6',langs:{python:`def two_sum(arr, target):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        s = arr[left] + arr[right]\n        if s == target: return [left, right]\n        elif s < target: left += 1\n        else: right -= 1\n    return []`,javascript:`function twoSum(arr,target){\n  let l=0,r=arr.length-1;\n  while(l<r){\n    const s=arr[l]+arr[r];\n    if(s===target)return[l,r];\n    s<target?l++:r--;\n  }\n  return[];\n}`},traceGenerator(arr,input){let target=6;const m=(input||'').match(/target\s*=\s*(\d+)/);if(m)target=+m[1];const a=[...arr],steps=[];let l=0,r=a.length-1;steps.push({arr:a,highlights:{[l]:'active',[r]:'comparing'},action:'Init pointers',vars:{left:l,right:r,target},line:0,explanation:`Two Pointers: l=${l}, r=${r}, target=${target}`,dryAction:'Init'});while(l<r){const sum=a[l]+a[r];steps.push({arr:a,highlights:{[l]:'active',[r]:'comparing'},action:`sum=${a[l]}+${a[r]}=${sum}`,vars:{left:l,right:r,sum,target,'arr[l]':a[l],'arr[r]':a[r]},line:3,explanation:`sum=${a[l]}+${a[r]}=<span class="hw">${sum}</span> vs target=${target}`,dryAction:`sum=${sum}`});if(sum===target){steps.push({arr:a,highlights:{[l]:'swapped',[r]:'swapped'},action:`Found! [${l},${r}]`,vars:{result:`[${l},${r}]`},line:4,explanation:`🎉 Found pair [${l},${r}]!`,dryAction:'Match ✓'});return steps;}sum<target?l++:r--;}steps.push({arr:a,highlights:{},action:'No pair found',vars:{result:'[]'},line:9,explanation:`No pair sums to ${target}.`,dryAction:'No pair ✗'});return steps;}},
  sliding_window:{name:'Sliding Window',complexity:{time:'O(n)',space:'O(1)',best:'O(n)',worst:'O(n)'},defaultInput:'[2, 1, 5, 1, 3, 2] k=3',langs:{python:`def max_subarray_sum(arr, k):\n    window_sum = sum(arr[:k])\n    max_sum = window_sum\n    for i in range(k, len(arr)):\n        window_sum += arr[i] - arr[i-k]\n        max_sum = max(max_sum, window_sum)\n    return max_sum`,javascript:`function maxSubarraySum(arr,k){\n  let ws=arr.slice(0,k).reduce((a,b)=>a+b,0),ms=ws;\n  for(let i=k;i<arr.length;i++){\n    ws+=arr[i]-arr[i-k];\n    ms=Math.max(ms,ws);\n  }\n  return ms;\n}`},traceGenerator(arr,input){let k=3;const m=(input||'').match(/k\s*=\s*(\d+)/);if(m)k=+m[1];const a=[...arr];let ws=a.slice(0,k).reduce((x,y)=>x+y,0),ms=ws;const steps=[];const hl0={};for(let i=0;i<k;i++)hl0[i]='comparing';steps.push({arr:a,highlights:hl0,action:`Init window sum=${ws}`,vars:{windowSum:ws,maxSum:ms,k},line:2,explanation:`First window [0..${k-1}], sum=<span class="hw">${ws}</span>`,dryAction:`init sum=${ws}`});for(let i=k;i<a.length;i++){const old=a[i-k],nw=a[i];ws=ws+nw-old;const changed=ws>ms;if(changed)ms=ws;const hl={};for(let x=i-k+1;x<=i;x++)hl[x]='comparing';hl[i]='active';hl[i-k]='visited';steps.push({arr:a,highlights:hl,action:`Slide +${nw}-${old}=ws:${ws}${changed?' NEW MAX!':''}`,vars:{i,windowSum:ws,maxSum:ms,added:nw,removed:old},line:5,explanation:`Slide window: +${nw} -${old}=<span class="hw">${ws}</span>. ${changed?`New max=<span class="hw">${ms}</span>!`:`max stays ${ms}`}`,dryAction:`ws=${ws}`});}steps.push({arr:a,highlights:{},action:`Max sum=${ms}`,vars:{maxSum:ms},line:7,explanation:`🎉 Max subarray sum(k=${k})=<span class="hw">${ms}</span>`,dryAction:`Max=${ms} ✓`});return steps;}},
  fibonacci_dp:{name:'Fibonacci DP',complexity:{time:'O(n)',space:'O(n)',best:'O(n)',worst:'O(n)'},defaultInput:'n=8',langs:{python:`def fibonacci(n):\n    dp = [0] * (n + 1)\n    dp[0], dp[1] = 0, 1\n    for i in range(2, n + 1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]\n\nprint(fibonacci(8))  # 21`,javascript:`function fibonacci(n){\n  const dp=new Array(n+1).fill(0);\n  dp[0]=0; dp[1]=1;\n  for(let i=2;i<=n;i++) dp[i]=dp[i-1]+dp[i-2];\n  return dp[n];\n}\nconsole.log(fibonacci(8));`},traceGenerator(arr,input){let n=8;const m=(input||'').match(/n\s*=\s*(\d+)/);if(m)n=+m[1];const dp=new Array(n+1).fill(0),steps=[];dp[0]=0;steps.push({arr:[...dp],highlights:{0:'active'},action:'dp[0]=0',vars:{n,i:'-',dp:`[${dp}]`},line:2,explanation:'Base case: dp[0]=0',dryAction:'dp[0]=0'});if(n>=1){dp[1]=1;steps.push({arr:[...dp],highlights:{1:'active'},action:'dp[1]=1',vars:{n,i:'-',dp:`[${dp}]`},line:2,explanation:'Base case: dp[1]=1',dryAction:'dp[1]=1'});}for(let i=2;i<=n;i++){dp[i]=dp[i-1]+dp[i-2];steps.push({arr:[...dp],highlights:{[i]:'swapped',[i-1]:'comparing',[i-2]:'comparing'},action:`dp[${i}]=dp[${i-1}]+dp[${i-2}]`,vars:{n,i,dp:`[${dp}]`},line:4,explanation:`dp[${i}] = dp[${i-1}](${dp[i-1]}) + dp[${i-2}](${dp[i-2]}) = <span class="hw">${dp[i]}</span>`,dryAction:`dp[${i}]=${dp[i]}`});}steps.push({arr:[...dp],sorted:new Set([...Array(n+1).keys()]),highlights:{},action:`Fib(${n})=${dp[n]}`,vars:{result:dp[n]},line:5,explanation:`🎉 Fibonacci(${n}) = <span class="hw">${dp[n]}</span>`,dryAction:`Done ✓`});return steps;}},
  merge_sort:{name:'Merge Sort',complexity:{time:'O(n log n)',space:'O(n)',best:'O(n log n)',worst:'O(n log n)'},defaultInput:'[38, 27, 43, 3, 9, 82, 10]',langs:{python:`def merge_sort(arr):\n    if len(arr) <= 1: return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\ndef merge(L, R):\n    result, i, j = [], 0, 0\n    while i<len(L) and j<len(R):\n        if L[i]<=R[j]: result.append(L[i]); i+=1\n        else: result.append(R[j]); j+=1\n    return result+L[i:]+R[j:]`,javascript:`function mergeSort(arr){\n  if(arr.length<=1)return arr;\n  const m=Math.floor(arr.length/2);\n  return merge(mergeSort(arr.slice(0,m)),mergeSort(arr.slice(m)));\n}\nfunction merge(l,r){\n  const res=[];let i=0,j=0;\n  while(i<l.length&&j<r.length)res.push(l[i]<=r[j]?l[i++]:r[j++]);\n  return [...res,...l.slice(i),...r.slice(j)];\n}`},traceGenerator(arr){const a=[...arr],steps=[];steps.push({arr:[...a],highlights:{},action:'Start Merge Sort',vars:{n:a.length},line:0,explanation:`Merge Sort: divide array, sort halves, merge.`,dryAction:'Initialize'});function ms(x,off){if(x.length<=1)return x;const mid=Math.floor(x.length/2);const hl={};for(let k=0;k<mid;k++)hl[off+k]='comparing';for(let k=mid;k<x.length;k++)hl[off+k]='active';steps.push({arr:[...a],highlights:hl,action:`Split [${x}]`,vars:{left:`[${x.slice(0,mid)}]`,right:`[${x.slice(mid)}]`},line:3,explanation:`Split: [${x.slice(0,mid)}] + [${x.slice(mid)}]`,dryAction:'Split'});const sl=ms(x.slice(0,mid),off),sr=ms(x.slice(mid),off+mid);const merged=[];let i=0,j=0;while(i<sl.length&&j<sr.length)merged.push(sl[i]<=sr[j]?sl[i++]:sr[j++]);while(i<sl.length)merged.push(sl[i++]);while(j<sr.length)merged.push(sr[j++]);for(let k=0;k<merged.length;k++)a[off+k]=merged[k];const mhl={};for(let k=0;k<merged.length;k++)mhl[off+k]='swapped';steps.push({arr:[...a],highlights:mhl,action:`Merged→[${merged}]`,vars:{merged:`[${merged}]`},line:10,explanation:`✅ Merged→[${merged.join(',')}]`,dryAction:'Merge ✓'});return merged;}ms([...a],0);steps.push({arr:[...a],sorted:new Set([...Array(a.length).keys()]),highlights:{},action:'Sorted!',vars:{},line:6,explanation:`🎉 [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  quick_sort:{name:'Quick Sort',complexity:{time:'O(n log n)',space:'O(log n)',best:'O(n log n)',worst:'O(n²)'},defaultInput:'[10, 7, 8, 9, 1, 5]',langs:{python:`def quick_sort(arr, lo=0, hi=None):\n    if hi is None: hi = len(arr)-1\n    if lo < hi:\n        pi = partition(arr, lo, hi)\n        quick_sort(arr, lo, pi-1)\n        quick_sort(arr, pi+1, hi)\n\ndef partition(arr, lo, hi):\n    pivot = arr[hi]\n    i = lo - 1\n    for j in range(lo, hi):\n        if arr[j] <= pivot:\n            i += 1\n            arr[i], arr[j] = arr[j], arr[i]\n    arr[i+1], arr[hi] = arr[hi], arr[i+1]\n    return i+1`,javascript:`function quickSort(arr,lo=0,hi=arr.length-1){\n  if(lo<hi){const p=partition(arr,lo,hi);quickSort(arr,lo,p-1);quickSort(arr,p+1,hi);}\n}\nfunction partition(arr,lo,hi){\n  const pivot=arr[hi];let i=lo-1;\n  for(let j=lo;j<hi;j++) if(arr[j]<=pivot){i++;[arr[i],arr[j]]=[arr[j],arr[i]];}\n  [arr[i+1],arr[hi]]=[arr[hi],arr[i+1]];\n  return i+1;\n}`},traceGenerator(arr){const a=[...arr],steps=[],sorted=new Set();steps.push({arr:[...a],highlights:{},action:'Start Quick Sort',vars:{lo:0,hi:a.length-1},line:0,explanation:`Quick Sort: pick pivot, partition, recurse.`,dryAction:'Initialize'});function part(lo,hi){const pivot=a[hi];let i=lo-1;const ph={[hi]:'pivot'};steps.push({arr:[...a],highlights:ph,action:`pivot=arr[${hi}]=${pivot}`,vars:{lo,hi,pivot,i},line:7,explanation:`Pivot=<span class="hw">arr[${hi}]=${pivot}</span>`,dryAction:`pivot=${pivot}`});for(let j=lo;j<hi;j++){const hl={[hi]:'pivot',[j]:'comparing'};steps.push({arr:[...a],highlights:hl,action:`arr[${j}]=${a[j]}≤${pivot}?`,vars:{lo,hi,i,j,pivot,'arr[j]':a[j]},line:10,explanation:`Compare <span class="hw">arr[${j}]=${a[j]}</span> ≤ pivot ${pivot}`,dryAction:`Check[${j}]`});if(a[j]<=pivot){i++;if(i!==j){const t=a[i];a[i]=a[j];a[j]=t;}}}const t=a[i+1];a[i+1]=a[hi];a[hi]=t;sorted.add(i+1);const fl={[i+1]:'swapped'};steps.push({arr:[...a],highlights:fl,sorted:new Set(sorted),action:`Pivot ${pivot}→[${i+1}]`,vars:{pivotIdx:i+1,pivot},line:13,explanation:`✅ Pivot <span class="hw">${pivot}</span> at index ${i+1}`,dryAction:`Pivot@[${i+1}]`});return i+1;}function qs(lo,hi){if(lo<hi){const p=part(lo,hi);qs(lo,p-1);qs(p+1,hi);}else if(lo===hi)sorted.add(lo);}qs(0,a.length-1);steps.push({arr:[...a],sorted:new Set([...Array(a.length).keys()]),highlights:{},action:'Sorted!',vars:{},line:5,explanation:`🎉 [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  linked_list_traversal:{name:'Linked List Traversal',complexity:{time:'O(n)',space:'O(1)',best:'O(n)',worst:'O(n)'},defaultInput:'[1, 2, 3, 4, 5]',langs:{python:`class Node:\n    def __init__(self, val):\n        self.val = val\n        self.next = None\n\ndef traverse(head):\n    current = head\n    while current:\n        print(current.val)\n        current = current.next\n# List: 1→2→3→4→5→None`,javascript:`function traverse(head){\n  let cur=head;\n  while(cur){\n    console.log(cur.val);\n    cur=cur.next;\n  }\n}`},traceGenerator(arr){const n=arr.length,steps=[];steps.push({arr:[...arr],highlights:{},action:'Start at head',vars:{current:`Node(${arr[0]})`},line:5,explanation:`Traverse ${arr.join('→')}→null`,dryAction:'HEAD'});for(let i=0;i<n;i++){steps.push({arr:[...arr],highlights:{[i]:'active'},action:`Visit Node(${arr[i]})`,vars:{current:`Node(${arr[i]})`,val:arr[i],next:i<n-1?`Node(${arr[i+1]})`:'null'},line:7,explanation:`Visit <span class="hw">${arr[i]}</span>. next=${i<n-1?`Node(${arr[i+1]})`:'null'}`,dryAction:`Print ${arr[i]}`});if(i<n-1)steps.push({arr:[...arr],highlights:{[i]:'visited',[i+1]:'comparing'},action:`→ ${arr[i+1]}`,vars:{current:`Node(${arr[i+1]})`},line:8,explanation:`Move to <span class="hw">Node(${arr[i+1]})</span>`,dryAction:`→${arr[i+1]}`});}steps.push({arr:[...arr],highlights:{},action:'null — done!',vars:{current:'null'},line:8,explanation:`✅ All ${n} nodes visited.`,dryAction:'Done ✓'});return steps;}},
  linked_list_reverse:{name:'Linked List Reverse',complexity:{time:'O(n)',space:'O(1)',best:'O(n)',worst:'O(n)'},defaultInput:'[1, 2, 3, 4, 5]',langs:{python:`def reverse(head):\n    prev = None\n    cur = head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev = cur\n        cur = nxt\n    return prev`,javascript:`function reverse(head){\n  let prev=null,cur=head;\n  while(cur){\n    let nxt=cur.next;\n    cur.next=prev;\n    prev=cur; cur=nxt;\n  }\n  return prev;\n}`},traceGenerator(arr){const a=[...arr],steps=[];steps.push({arr:[...a],highlights:{},action:'prev=null, cur=head',vars:{prev:'null',current:`Node(${a[0]})`},line:0,explanation:`Reverse LL in-place with 3 pointers.`,dryAction:'Init'});for(let i=0;i<a.length;i++)steps.push({arr:[...a],highlights:{[i]:'active',...(i>0?{[i-1]:'sorted'}:{})},action:`Reverse Node(${a[i]}).next→prev`,vars:{prev:i>0?`Node(${a[i-1]})`:'null',cur:`Node(${a[i]})`,nxt:i<a.length-1?`Node(${a[i+1]})`:'null'},line:3,explanation:`Point <span class="hw">Node(${a[i]}).next</span> → prev`,dryAction:`Reverse[${i}]`});const rev=[...a].reverse();steps.push({arr:rev,sorted:new Set([...Array(a.length).keys()]),highlights:{},action:`Reversed!`,vars:{head:`Node(${rev[0]})`},line:9,explanation:`🎉 Reversed: ${rev.join('→')}→null`,dryAction:'Done ✓'});return steps;}},
  stack_ops:{name:'Stack Operations',complexity:{time:'O(1)',space:'O(n)',best:'O(1)',worst:'O(1)'},defaultInput:'push 3, push 7, push 1, pop, push 5',langs:{python:`stack = []\nstack.append(3)   # push\nstack.append(7)   # push\nstack.append(1)   # push\ntop = stack.pop() # pop → 1\nstack.append(5)   # push\npeek = stack[-1]  # peek → 7`,javascript:`const s=[];\ns.push(3); s.push(7); s.push(1);\nconst top=s.pop();  // 1\ns.push(5);\nconst peek=s[s.length-1]; // 7`},traceGenerator(){const ops=[['push',3],['push',7],['push',1],['pop'],['push',5],['peek']],steps=[],stk=[];steps.push({arr:[...stk],highlights:{},action:'Empty stack []',vars:{stack:'[]',size:0},line:0,explanation:`Stack (LIFO): push adds top, pop removes top.`,dryAction:'Init'});for(const[op,val]of ops){if(op==='push'){stk.push(val);const hl={[stk.length-1]:'swapped'};steps.push({arr:[...stk],highlights:hl,action:`push(${val})`,vars:{op:'push',val,stack:`[${stk}]`,size:stk.length},line:stk.length,explanation:`PUSH <span class="hw">${val}</span> → top. size=${stk.length}`,dryAction:`push(${val})`});}else if(op==='pop'){const p=stk.pop();steps.push({arr:[...stk],highlights:{},action:`pop()=${p}`,vars:{op:'pop',popped:p,stack:`[${stk}]`,size:stk.length},line:stk.length+1,explanation:`POP: removed <span class="hw">${p}</span>. size=${stk.length}`,dryAction:`pop()=${p}`});}else{const t=stk[stk.length-1];const hl={[stk.length-1]:'comparing'};steps.push({arr:[...stk],highlights:hl,action:`peek()=${t}`,vars:{op:'peek',top:t,stack:`[${stk}]`},line:stk.length+2,explanation:`PEEK: top=<span class="hw">${t}</span> (not removed)`,dryAction:`peek=${t}`});}}steps.push({arr:[...stk],highlights:{},action:`Final: [${stk}]`,vars:{final:`[${stk}]`},line:8,explanation:`🎉 Stack: [${stk.join(', ')}]. All ops O(1).`,dryAction:'Done ✓'});return steps;}},
  queue_ops:{name:'Queue Operations',complexity:{time:'O(1)',space:'O(n)',best:'O(1)',worst:'O(1)'},defaultInput:'enqueue 1,2,3 then dequeue',langs:{python:`from collections import deque\nq = deque()\nq.append(1)       # enqueue\nq.append(2)       # enqueue\nq.append(3)       # enqueue\nfront=q.popleft() # dequeue → 1\nq.append(4)       # enqueue`,javascript:`const q=[];\nq.push(1); q.push(2); q.push(3);\nconst f=q.shift(); // dequeue → 1\nq.push(4);`},traceGenerator(){const ops=[['enqueue',1],['enqueue',2],['enqueue',3],['dequeue'],['enqueue',4]],steps=[],q=[];steps.push({arr:[...q],highlights:{},action:'Empty queue []',vars:{queue:'[]'},line:0,explanation:`Queue (FIFO): enqueue rear, dequeue front.`,dryAction:'Init'});for(const[op,val]of ops){if(op==='enqueue'){q.push(val);const hl={[q.length-1]:'swapped'};steps.push({arr:[...q],highlights:hl,action:`enqueue(${val})`,vars:{op:'enqueue',val,queue:`[${q}]`,rear:val,size:q.length},line:q.length,explanation:`ENQUEUE <span class="hw">${val}</span> at rear. [${q.join('→')}]`,dryAction:`enqueue(${val})`});}else{const d=q.shift();steps.push({arr:[...q],highlights:{},action:`dequeue()=${d}`,vars:{op:'dequeue',dequeued:d,queue:`[${q}]`,front:q[0]??'-'},line:q.length+2,explanation:`DEQUEUE from front: <span class="hw">${d}</span>. FIFO.`,dryAction:`dequeue()=${d}`});}}steps.push({arr:[...q],sorted:new Set([...Array(q.length).keys()]),highlights:{},action:`Final: [${q}]`,vars:{final:`[${q.join('→')}]`},line:7,explanation:`🎉 Queue: [${q.join('→')}]`,dryAction:'Done ✓'});return steps;}},
  bst_insert:{name:'BST Insertion',complexity:{time:'O(log n)',space:'O(h)',best:'O(log n)',worst:'O(n)'},defaultInput:'insert 5,3,7,1,4',langs:{python:`class BST:\n    def insert(self, root, val):\n        if not root: return Node(val)\n        if val < root.val:\n            root.left = self.insert(root.left, val)\n        else:\n            root.right = self.insert(root.right, val)\n        return root`,javascript:`function insert(root,val){\n  if(!root) return new Node(val);\n  if(val<root.val) root.left=insert(root.left,val);\n  else root.right=insert(root.right,val);\n  return root;\n}`},traceGenerator(){const vals=[5,3,7,1,4],steps=[],arr=[];steps.push({arr:[],highlights:{},action:'Empty BST',vars:{root:'null'},line:0,explanation:`BST: left<root<right for every node.`,dryAction:'Init'});for(let k=0;k<vals.length;k++){arr.push(vals[k]);const hl={[k]:'swapped'};steps.push({arr:[...arr],highlights:hl,action:`Insert ${vals[k]}`,vars:{val:vals[k],nodes:k+1},line:6,explanation:`Insert <span class="hw">${vals[k]}</span>. ${k===0?'Root node.':'Compare along path.'}`,dryAction:`insert(${vals[k]})`});}steps.push({arr:[...arr],sorted:new Set([...Array(arr.length).keys()]),highlights:{},action:'BST built!',vars:{nodes:arr.length},line:11,explanation:`🎉 BST built: ${arr.join(', ')}`,dryAction:'Done ✓'});return steps;}},
  bfs_tree:{name:'BFS Tree',complexity:{time:'O(n)',space:'O(n)',best:'O(n)',worst:'O(n)'},defaultInput:'[1, 2, 3, 4, 5, 6, 7]',langs:{python:`from collections import deque\ndef bfs(root):\n    q = deque([root])\n    result = []\n    while q:\n        node = q.popleft()\n        result.append(node.val)\n        if node.left: q.append(node.left)\n        if node.right: q.append(node.right)\n    return result`,javascript:`function bfs(root){\n  const q=[root],res=[];\n  while(q.length){\n    const n=q.shift();\n    res.push(n.val);\n    if(n.left)q.push(n.left);\n    if(n.right)q.push(n.right);\n  }\n  return res;\n}`},traceGenerator(arr){const a=arr.slice(0,7),steps=[];steps.push({arr:[...a],highlights:{},action:'BFS: start at root',vars:{queue:`[${a[0]}]`,result:'[]'},line:0,explanation:`BFS visits level by level using queue.`,dryAction:'Init'});const vis=[],q=[0];while(q.length){const idx=q.shift();if(idx>=a.length)continue;vis.push(idx);const hl={};vis.forEach(v=>hl[v]='visited');hl[idx]='active';const l=2*idx+1,r=2*idx+2;steps.push({arr:[...a],highlights:hl,action:`Visit ${a[idx]}, enqueue children`,vars:{node:a[idx],queue:`[${q.filter(x=>x<a.length).map(x=>a[x])}]`,result:`[${vis.map(v=>a[v])}]`},line:7,explanation:`Dequeue <span class="hw">${a[idx]}</span>. Enqueue: ${l<a.length?a[l]:'-'}, ${r<a.length?a[r]:'-'}`,dryAction:`Visit ${a[idx]}`});if(l<a.length)q.push(l);if(r<a.length)q.push(r);}steps.push({arr:[...a],sorted:new Set([...Array(a.length).keys()]),highlights:{},action:'BFS done',vars:{result:`[${a.join(',')}]`},line:11,explanation:`🎉 BFS: [${a.join(', ')}]`,dryAction:'Done ✓'});return steps;}},
  dfs_tree:{name:'DFS In-Order',complexity:{time:'O(n)',space:'O(h)',best:'O(log n)',worst:'O(n)'},defaultInput:'[4, 2, 6, 1, 3, 5, 7]',langs:{python:`def inorder(root):\n    if not root: return []\n    return inorder(root.left)+[root.val]+inorder(root.right)\n# Left → Root → Right\n# BST in-order = sorted!`,javascript:`function inOrder(root){\n  if(!root)return[];\n  return[...inOrder(root.left),root.val,...inOrder(root.right)];\n}\n// BST inOrder = sorted!`},traceGenerator(arr){const a=arr.slice(0,7),steps=[],vis=[];steps.push({arr:[...a],highlights:{},action:'DFS In-Order',vars:{root:a[0]},line:0,explanation:`In-Order: Left→Root→Right. BST→sorted.`,dryAction:'Start'});function dfs(idx){if(idx>=a.length)return;dfs(2*idx+1);vis.push(idx);const hl={};vis.forEach(v=>hl[v]='visited');hl[idx]='active';steps.push({arr:[...a],highlights:hl,action:`Visit ${a[idx]}`,vars:{node:a[idx],result:`[${vis.map(v=>a[v])}]`},line:4,explanation:`Visit <span class="hw">${a[idx]}</span>. Result: [${vis.map(v=>a[v]).join(', ')}]`,dryAction:`Visit ${a[idx]}`});dfs(2*idx+2);}dfs(0);steps.push({arr:[...a],sorted:new Set([...Array(a.length).keys()]),highlights:{},action:'DFS done',vars:{result:`[${vis.map(v=>a[v])}]`},line:7,explanation:`🎉 In-Order: [${vis.map(v=>a[v]).join(', ')}]`,dryAction:'Done ✓'});return steps;}},
};

window.addEventListener('DOMContentLoaded', () => {
  loadAlgorithm();
  updateSpeedLabel();
  onModeChange();
});

function onModeChange() {
  const mode = S('modeSelect').value;
  const sel = S('modeSelect');
  sel.className = `mode-select mode-${mode}`;
  S('algoWrap').style.display = (mode === 'dsa' || mode === 'auto') ? 'flex' : 'none';
}
window.onModeChange = onModeChange;

function setBadge(mode, text) {
  const b = S('vizModeBadge');
  const modeMap = {dsa:'DSA',general:'GENERAL',debug:'DEBUG',systemflow:'SYS FLOW',auto:'AUTO',analyzing:'ANALYZING…',react:'REACT'};
  b.className = `viz-mode-badge ${mode}`;
  b.textContent = text || modeMap[mode] || mode.toUpperCase();
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const fr = new FileReader();
  fr.onload = ev => {
    S('codeEditor').value = ev.target.result;
    S('editorFilename').textContent = file.name;
    const ext = file.name.split('.').pop().toLowerCase();
    const bMap = {py:'PY',js:'JS',ts:'TS',jsx:'JSX',tsx:'TSX',java:'JAVA',cpp:'C++',c:'C',go:'GO',rs:'RS',sql:'SQL',html:'HTML',css:'CSS'};
    S('langBadge').textContent = bMap[ext] || ext.toUpperCase();
    updateLineNumbers();
    showToast(`📎 ${file.name} loaded`);
    setTimeout(runAnalysis, 400);
  };
  fr.readAsText(file);
  e.target.value = '';
}
window.handleFileUpload = handleFileUpload;

async function runAnalysis() {
  const code = S('codeEditor').value.trim();
  const manualMode = S('modeSelect').value;
  if (!code || code.length < 3) { showToast('Paste some code first!', 'warn'); return; }

  stopPlay();
  clearView();
  showAnalyzingOverlay();
  setBadge('analyzing');

  const fast = Classifier.classify(code, manualMode);
  updateDetectionPanel(fast);

  const isDSA = (fast.vizMode === 'dsa' || manualMode === 'dsa') && fast.dsaKey &&
    fast.confidence >= 80 && manualMode !== 'general' && manualMode !== 'debug' && manualMode !== 'systemflow';

  if (isDSA) {
    await animSteps(600);
    hideAnalyzingOverlay();
    launchDSA(fast.dsaKey, fast, S('testInput').value);
    return;
  }

  await animStep(1,'running');
  await animStep(2,'running'); await animStep(1,'done');

  let aiAnalysis = null;
  try {
    const d = await window.VisualizerApi.analyzeCode(code, manualMode);
    await animStep(3,'running'); await animStep(2,'done');
    aiAnalysis = d.analysis;
  } catch(e) {
    await animStep(3,'running'); await animStep(2,'done');
    console.warn('AI offline, using smart local analysis', e);
  }

  await animStep(4,'running'); await animStep(3,'done');
  await sleep(200); await animStep(4,'done'); await sleep(150);
  hideAnalyzingOverlay();

  const analysis = aiAnalysis || {};
  
  const merged = {
    language: aiAnalysis?.language || fast.language,
    category: aiAnalysis?.category || fast.category,
    pattern:  aiAnalysis?.pattern  || fast.pattern,
    vizMode:  aiAnalysis?.vizMode  || fast.vizMode,
    confidence: aiAnalysis?.confidence || fast.confidence,
    timeComplexity: aiAnalysis?.timeComplexity || '—',
    spaceComplexity: aiAnalysis?.spaceComplexity || '—',
    bestCase: aiAnalysis?.bestCase || '—',
    worstCase: aiAnalysis?.worstCase || '—',
    executionSteps: aiAnalysis?.executionSteps || [],
    functionFlow: aiAnalysis?.functionFlow || [],
    errors: aiAnalysis?.errors || [],
    warnings: aiAnalysis?.warnings || [],
    optimizations: aiAnalysis?.optimizations || [],
    aiSummary: aiAnalysis?.aiSummary || '',
    systemFlow: aiAnalysis?.systemFlow || null,
    dsaVisualizationHint: aiAnalysis?.dsaVisualizationHint || fast.dsaKey,
  };

  updateDetectionPanel(merged);
  S('cxTime').textContent  = merged.timeComplexity;
  S('cxSpace').textContent = merged.spaceComplexity;
  S('cxBest').textContent  = merged.bestCase;
  S('cxWorst').textContent = merged.worstCase;

  const finalMode = manualMode !== 'auto' ? manualMode : merged.vizMode;
  if (finalMode === 'dsa') {
    if (merged.dsaVisualizationHint && ALGORITHMS[merged.dsaVisualizationHint]) {
      launchDSA(merged.dsaVisualizationHint, merged, S('testInput').value);
    } else {
      launchCustomDSA(merged, code);
    }
  } else if (finalMode === 'systemflow') {
    launchSystemFlow(merged, code);
  } else if (finalMode === 'debug') {
    launchDebug(merged, code);
  } else {
    launchGeneral(merged, code);
  }
}
window.runAnalysis = runAnalysis;

function launchDSA(key, analysis, inputStr) {
  const algo = ALGORITHMS[key];
  if (!algo) { launchGeneral(analysis, S('codeEditor').value); return; }
  S('algoSelect').value = key;
  state.currentAlgo = key;

  let arr = [];
  try {
    const m = (inputStr || algo.defaultInput || '').match(/\[([^\]]+)\]/);
    if (m) arr = m[1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    else { const ns=(inputStr||algo.defaultInput||'').match(/[\d.]+/g); if(ns) arr=ns.map(Number); }
    if (!arr.length) arr = [64,25,12,22,11];
  } catch { arr = [64,25,12,22,11]; }

  state.steps = algo.traceGenerator(arr, inputStr || algo.defaultInput);
  state.currentStep = 0; state.vizMode = 'dsa'; state.prevVars = {};
  state.codeBlocks = null;

  showSvg();
  setBadge('dsa');
  S('vizTitle').textContent = algo.name + ' Visualization';
  S('vizSubtitle').textContent = `${state.steps.length} steps`;
  S('dryRunLabel').textContent = 'Dry Run Trace';
  if (algo.complexity) { S('cxTime').textContent=algo.complexity.time; S('cxSpace').textContent=algo.complexity.space; S('cxBest').textContent=algo.complexity.best; S('cxWorst').textContent=algo.complexity.worst; }
  buildDryRun(); enableControls(); renderStep(0);
  showToast(`▶ ${algo.name} — ${state.steps.length} steps`);
}

function extractDSAState(step) {
  const varsObj = step.vars || {};
  let arr = step.arr || [];
  if (!arr.length) {
    for (const [k, v] of Object.entries(varsObj)) {
      if (Array.isArray(v)) {
        arr = v;
        break;
      }
    }
  }
  step.arr = arr;

  const highlights = {};
  const pointers = {};
  const sorted = new Set();

  for (const [name, val] of Object.entries(varsObj)) {
    const num = parseInt(val);
    if (isNaN(num) || num < 0 || num >= arr.length) continue;

    const nameLower = name.toLowerCase();
    if (nameLower === 'pivot' || nameLower === 'p') {
      highlights[num] = 'pivot';
      pointers[num] = name;
    } else if (nameLower === 'mid' || nameLower === 'm') {
      highlights[num] = 'active';
      pointers[num] = name;
    } else if (['i', 'left', 'low', 'l', 'start'].includes(nameLower)) {
      highlights[num] = 'active';
      pointers[num] = name;
    } else if (['j', 'right', 'high', 'r', 'end'].includes(nameLower)) {
      highlights[num] = 'comparing';
      pointers[num] = name;
    } else if (['swap', 'temp', 'swapped'].includes(nameLower)) {
      highlights[num] = 'swapped';
    }
  }

  step.highlights = highlights;
  step.pointers = pointers;
  step.sorted = sorted;
}

function launchCustomDSA(analysis, code) {
  state.vizMode = 'dsa';
  const hint = analysis.dsaVisualizationHint || 'custom_array';
  state.currentAlgo = hint;

  const blocks = SmartParser.parse(code);
  state.codeBlocks = blocks;
  const steps = SmartParser.buildSteps(blocks, code, analysis.executionSteps);

  state.steps = steps.map(s => {
    const step = {
      ...s,
      highlights: {},
      vars: s.vars || s.variables || {},
      line: s.line || 1,
      explanation: s.explanation || s.description || s.action || '',
      dryAction: s.dryAction || s.action || 'Execute'
    };
    extractDSAState(step);
    return step;
  });

  state.currentStep = 0; state.prevVars = {};

  showSvg();
  setBadge('dsa', 'CUSTOM DSA');
  S('vizIcon').textContent = '⚡';

  const cleanName = analysis.pattern || 'Custom Algorithm';
  S('vizTitle').textContent = cleanName + ' Visualization';
  S('vizSubtitle').textContent = `${analysis.language || ''} · ${state.steps.length} steps`;
  S('dryRunLabel').textContent = 'Execution Trace';

  if (analysis.timeComplexity) {
    S('cxTime').textContent = analysis.timeComplexity;
    S('cxSpace').textContent = analysis.spaceComplexity;
    S('cxBest').textContent = analysis.bestCase;
    S('cxWorst').textContent = analysis.worstCase;
  }

  S('aiPanel').innerHTML = `<div class="ai-explain">
    <span class="step-label">⚡ ${cleanName} —</span>
    ${analysis.aiSummary || 'Custom algorithm trace generated dynamically.'}
  </div>`;

  buildDryRun(); enableControls(); renderStep(0);
  showToast(`⚡ ${cleanName} — ${state.steps.length} steps`);
}

function launchGeneral(analysis, code) {
  state.vizMode = 'general';
  const blocks = SmartParser.parse(code);
  state.codeBlocks = blocks;
  const steps = SmartParser.buildSteps(blocks, code, analysis.executionSteps);

  state.steps = steps.map(s => ({
    ...s, arr: s.arr || [],
    highlights: {}, vars: s.vars || s.variables || {},
    line: (s.line || 1), explanation: s.explanation || s.description || s.action,
    dryAction: s.dryAction || s.action
  }));
  state.currentStep = 0; state.prevVars = {};

  const isReact = /React|useState|useEffect|jsx|tsx/i.test(code);
  const modeKey = isReact ? 'react' : 'general';
  const icon = isReact ? '⚛️' : '⚙️';

  showSvg();
  setBadge(modeKey, isReact ? 'REACT' : 'GENERAL');
  S('vizIcon').textContent = icon;
  S('vizTitle').textContent = `${analysis.pattern || analysis.category || 'Code'} — Execution Flow`;
  S('vizSubtitle').textContent = `${analysis.language || ''} · ${blocks.length} blocks · ${steps.length} steps`;
  S('dryRunLabel').textContent = 'Execution Trace';

  S('aiPanel').innerHTML = `<div class="ai-explain">
    <span class="step-label">${icon} ${analysis.pattern || analysis.category} —</span>
    ${analysis.aiSummary || `${blocks.length} code blocks detected. Step through to see execution flow.`}
    ${analysis.optimizations?.length ? `<br><span style="color:var(--green);font-weight:700">💡 Tips:</span> ${analysis.optimizations.slice(0,2).join(' · ')}` : ''}
  </div>`;

  buildDryRun(); enableControls(); renderStep(0);
  showToast(`${icon} ${analysis.category || 'Code'} — ${blocks.length} blocks, ${steps.length} steps`);
}

function launchSystemFlow(analysis, code) {
  state.vizMode = 'systemflow';
  const nodes = buildSysFlowNodes(analysis, code);
  state.sysFlowNodes = nodes;
  state.codeBlocks = null;

  state.steps = nodes.map((n,i) => ({
    arr:[], highlights:{}, vars:{layer:n.label, action:n.action},
    line: n.line || 1, explanation:`<strong>${n.icon} ${n.label}</strong>: ${n.action || n.description || ''}`,
    dryAction: n.label
  }));
  state.currentStep = 0; state.prevVars = {};

  showSvg();
  setBadge('systemflow');
  S('vizIcon').textContent = '🏗️';
  S('vizTitle').textContent = 'System Architecture Flow';
  S('vizSubtitle').textContent = `${analysis.language || ''} · ${nodes.length} layers`;
  S('dryRunLabel').textContent = 'Flow Trace';

  S('aiPanel').innerHTML = `<div class="ai-explain">
    <span class="step-label">🏗️ ${analysis.pattern || analysis.category} —</span>
    ${analysis.aiSummary || 'System flow diagram generated from your code structure.'}
  </div>`;

  buildDryRun(); enableControls(); renderStep(0);
  showToast(`🏗️ System Flow — ${nodes.length} layers`);
}

function launchDebug(analysis, code) {
  state.vizMode = 'debug';
  const errors = analysis.errors || [];
  const warnings = analysis.warnings || [];
  const opts = analysis.optimizations || [];
  const blocks = SmartParser.parse(code);
  state.codeBlocks = blocks;
  state.debugData = { errors, warnings, opts };

  const allIssues = [
    ...errors.map(e=>({...e,kind:'error'})),
    ...warnings.map(w=>({...w,kind:'warn'})),
    ...opts.map((o,i)=>({message:typeof o==='string'?o:o.message||'',kind:'opt',type:'Optimization'}))
  ];
  state.steps = allIssues.length
    ? allIssues.map((iss,i) => ({
        arr:[], highlights:{}, vars:{type:iss.type||iss.kind, line:iss.line||'-'},
        line:iss.line||1, explanation:`${iss.kind==='error'?'🔴':iss.kind==='warn'?'⚠️':'💡'} <strong>${iss.type||iss.kind}</strong>: ${iss.message}${iss.fix?`<br><span class="hw">Fix:</span> ${iss.fix}`:''}`,
        dryAction: iss.type || iss.kind
      }))
    : [{ arr:[], highlights:{}, vars:{}, line:1, explanation:'✅ No issues detected.', dryAction:'Clean ✓' }];
  state.currentStep = 0; state.prevVars = {};

  showSvg();
  setBadge('debug');
  S('vizIcon').textContent = '🐛';
  S('vizTitle').textContent = 'Debug Review';
  S('vizSubtitle').textContent = `${errors.length} errors · ${warnings.length} warnings · ${opts.length} optimizations`;
  S('dryRunLabel').textContent = 'Issue List';

  S('aiPanel').innerHTML = `<div class="ai-explain">
    <span class="step-label">🐛 Debug —</span> ${analysis.aiSummary || 'Code reviewed for errors, warnings, and optimization opportunities.'}
  </div>`;

  buildDryRun(); enableControls(); renderStep(0);
  showToast(`🐛 ${errors.length} errors, ${warnings.length} warnings, ${opts.length} tips`);
}

function buildSysFlowNodes(analysis, code) {
  if (analysis.systemFlow?.length) return analysis.systemFlow;
  const cat = analysis.category || '';

  if (/api|route|endpoint/i.test(cat)) return [
    {icon:'💻',label:'Client Request',action:'HTTP request sent',color:'user'},
    {icon:'🔀',label:'Router / Gateway',action:'Match route & method',color:'api'},
    {icon:'🔧',label:'Middleware',action:'Auth, validation, logging',color:'backend'},
    {icon:'⚙️',label:'Controller',action:'Handle business logic',color:'backend'},
    {icon:'📦',label:'Service Layer',action:'Data processing rules',color:'backend'},
    {icon:'🗄️',label:'Database',action:'Query & fetch data',color:'db'},
    {icon:'✅',label:'HTTP Response',action:'200 OK with JSON payload',color:'response'},
  ];
  if (/auth/i.test(cat)) return [
    {icon:'👤',label:'User Login',action:'Submit credentials',color:'user'},
    {icon:'🔀',label:'Auth Endpoint',action:'POST /auth/login',color:'api'},
    {icon:'🔐',label:'Auth Service',action:'Validate credentials',color:'auth'},
    {icon:'🗄️',label:'User Database',action:'Fetch hashed password',color:'db'},
    {icon:'🔑',label:'Password Verify',action:'bcrypt.compare()',color:'backend'},
    {icon:'🎫',label:'Token Generate',action:'jwt.sign(payload)',color:'cache'},
    {icon:'✅',label:'Auth Response',action:'200 OK + JWT token',color:'response'},
  ];
  if (/database|query/i.test(cat)) return [
    {icon:'💻',label:'Application',action:'Trigger DB operation',color:'user'},
    {icon:'🔧',label:'ORM / Builder',action:'Mongoose / Prisma query',color:'backend'},
    {icon:'🔀',label:'Connection Pool',action:'Acquire DB connection',color:'api'},
    {icon:'🗄️',label:'Database',action:'Execute SQL / NoSQL query',color:'db'},
    {icon:'⚡',label:'Cache Layer',action:'Redis cache check',color:'cache'},
    {icon:'✅',label:'Result',action:'Parsed data returned',color:'response'},
  ];
  if (/microservice|event/i.test(cat)) return [
    {icon:'💻',label:'Client',action:'Initiate request',color:'user'},
    {icon:'🔀',label:'API Gateway',action:'Route & load balance',color:'api'},
    {icon:'📦',label:'Service A',action:'Primary handler',color:'backend'},
    {icon:'📬',label:'Message Queue',action:'Publish async event',color:'cache'},
    {icon:'📦',label:'Service B',action:'Consume & process event',color:'backend'},
    {icon:'🗄️',label:'Database',action:'Persist data',color:'db'},
    {icon:'✅',label:'Response',action:'Aggregated reply',color:'response'},
  ];
  if (/react|ui|component/i.test(cat)) return [
    {icon:'🌐',label:'Browser',action:'Page load / user action',color:'user'},
    {icon:'⚛️',label:'React App',action:'Render component tree',color:'api'},
    {icon:'💾',label:'useState / Redux',action:'Initialize & manage state',color:'cache'},
    {icon:'🔄',label:'useEffect',action:'Side effects & lifecycle',color:'backend'},
    {icon:'🌐',label:'API Call',action:'fetch() / axios request',color:'api'},
    {icon:'🗄️',label:'Backend / DB',action:'Process & return data',color:'db'},
    {icon:'🎨',label:'Re-render',action:'Update virtual DOM → DOM',color:'response'},
  ];
  return [
    {icon:'🚀',label:'Entry Point',action:'Program starts',color:'user'},
    {icon:'📦',label:'Load Dependencies',action:'Import modules & setup',color:'api'},
    {icon:'⚙️',label:'Core Logic',action:'Main execution',color:'backend'},
    {icon:'🔄',label:'Processing',action:'Data transformation',color:'backend'},
    {icon:'✅',label:'Output / Return',action:'Result produced',color:'response'},
  ];
}

function renderStep(idx) {
  if (!state.steps.length) return;
  const step = state.steps[idx];
  const svg = S('vizSvg');

  const prevStep = idx > 0 ? state.steps[idx - 1] : null;
  state.prevVars = prevStep ? { ...(prevStep.vars || {}) } : {};

  if (state.vizMode === 'dsa' || state.vizMode === 'general') {
    renderSmartExecutionSvg(step, svg);
  } else if (state.vizMode === 'systemflow') {
    renderSystemFlowSvg(state.sysFlowNodes || [], idx, svg);
  } else if (state.vizMode === 'debug') {
    renderDebugSvg(state.debugData?.errors||[], state.debugData?.warnings||[], state.debugData?.opts||[], state.codeBlocks||[], idx, svg);
  } else {
    renderCodeBlockSvg(state.codeBlocks || [], step.blockIdx ?? idx % Math.max(1,(state.codeBlocks||[]).length), svg);
  }

  if (step.line) highlightActiveLine(step.line);
  updateVarTracker(step.vars || {}, idx);
  highlightDryRow(idx);
  updateProgress(idx);

  S('aiPanel').innerHTML = `<div class="ai-explain"><span class="step-label">Step ${idx+1}/${state.steps.length} —</span> ${step.explanation || step.action || ''}</div>`;
}

function parseOperation(action, vars) {
  const varNames = Object.keys(vars);
  if (varNames.length === 0) return null;

  const actionLower = (action || '').toLowerCase();
  
  if (actionLower.includes('swap') || actionLower.includes('exchange')) {
    const found = varNames.filter(name => actionLower.includes(name.toLowerCase()));
    if (found.length >= 2) {
      return { type: 'swap', v1: found[0], v2: found[1] };
    }
  }

  for (const name1 of varNames) {
    for (const name2 of varNames) {
      if (name1 === name2) continue;
      const re = new RegExp(`\\b${name1}\\b\\s*=\\s*\\b${name2}\\b|assign\\b.*\\b${name2}\\b.*\\b${name1}\\b`, 'i');
      if (re.test(actionLower)) {
        return { type: 'assign', from: name2, to: name1 };
      }
    }
  }

  const compMatch = (action || '').match(/(\w+)\s*(<=|>=|==|!=|<|>)\s*(\w+|\d+)/);
  if (compMatch) {
    const v1 = compMatch[1];
    const op = compMatch[2];
    const v2 = compMatch[3];
    return { type: 'compare', v1, op, v2 };
  }

  return null;
}

function renderRecursionStackSvg(svg, callStack, vars, W, H, step) {
  svg.innerHTML = '';

  svg.appendChild(svgEl('text', {
    x: W / 2, y: 22, 'text-anchor': 'middle', fill: '#94a3b8',
    'font-family': 'Syne', 'font-size': 13, 'font-weight': '700'
  }, 'Recursive Execution Context'));

  const midX = Math.floor(W * 0.44);

  svg.appendChild(svgEl('rect', {
    x: 16, y: 44, width: midX - 32, height: H - 85, rx: 8,
    fill: 'rgba(15, 23, 42, 0.3)', stroke: '#21283a', 'stroke-width': 1.5,
    'stroke-dasharray': '5,5'
  }));
  svg.appendChild(svgEl('text', {
    x: 28, y: 62, fill: '#64748b', 'font-family': 'Inter',
    'font-size': 10, 'font-weight': '800', 'letter-spacing': '1px'
  }, 'CALL STACK'));

  const frameH = 34;
  const frameGap = 12;
  const maxFrames = Math.min(callStack.length, 6);
  const startY = H - 65;
  const stackStartX = 28;
  const stackW = midX - 56;

  for (let i = 0; i < maxFrames; i++) {
    const frameName = callStack[i];
    const y = startY - i * (frameH + frameGap);
    const isTop = i === callStack.length - 1;
    
    let fill = 'rgba(124, 58, 237, 0.08)';
    let stroke = '#7c3aed';
    if (isTop) {
      fill = 'rgba(0, 229, 255, 0.15)';
      stroke = '#00e5ff';
    }

    const rect = svgEl('rect', {
      x: stackStartX, y: y - frameH, width: stackW, height: frameH, rx: 6,
      fill, stroke, 'stroke-width': isTop ? 2 : 1.2
    });
    if (isTop) rect.style.filter = 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.4))';
    svg.appendChild(rect);

    svg.appendChild(svgEl('text', {
      x: stackStartX + 12, y: y - frameH/2 + 4, fill: isTop ? '#fff' : '#cbd5e1',
      'font-family': 'JetBrains Mono', 'font-size': 11, 'font-weight': '700'
    }, frameName));

    if (i > 0) {
      const prevY = startY - (i - 1) * (frameH + frameGap) - frameH;
      const arrowY1 = prevY - 2;
      const arrowY2 = y;
      svg.appendChild(svgEl('line', {
        x1: stackStartX + stackW/2, y1: arrowY1,
        x2: stackStartX + stackW/2, y2: arrowY2 + 2,
        stroke: '#7c3aed', 'stroke-width': 1.5, 'stroke-dasharray': '3,3'
      }));
      svg.appendChild(svgEl('polygon', {
        points: `${stackStartX + stackW/2},${arrowY2} ${stackStartX + stackW/2 - 4},${arrowY2 + 6} ${stackStartX + stackW/2 + 4},${arrowY2 + 6}`,
        fill: '#7c3aed'
      }));
    }
  }

  if (callStack.length > maxFrames) {
    svg.appendChild(svgEl('text', {
      x: stackStartX + stackW/2, y: startY - maxFrames * (frameH + frameGap) - 5,
      'text-anchor': 'middle', fill: '#7c3aed', 'font-family': 'JetBrains Mono', 'font-size': 11, 'font-weight': '700'
    }, `+ ${callStack.length - maxFrames} more frames`));
  }

  const scopeX = midX + 16;
  const scopeW = W - scopeX - 16;

  svg.appendChild(svgEl('rect', {
    x: scopeX, y: 44, width: scopeW, height: H - 85, rx: 8,
    fill: 'rgba(33, 40, 58, 0.15)', stroke: '#21283a', 'stroke-width': 1.5
  }));
  
  const activeFrame = callStack[callStack.length - 1] || 'global';
  svg.appendChild(svgEl('text', {
    x: scopeX + 16, y: 64, fill: '#00e5ff', 'font-family': 'Syne',
    'font-size': 11, 'font-weight': '800', 'letter-spacing': '0.5px'
  }, `ACTIVE FRAME: ${activeFrame.toUpperCase()}`));

  const localVars = { ...vars };
  delete localVars.callStack;
  delete localVars.arr;

  const varEntries = Object.entries(localVars);
  if (varEntries.length === 0) {
    svg.appendChild(svgEl('text', {
      x: scopeX + scopeW/2, y: H/2, 'text-anchor': 'middle', fill: '#475569',
      'font-family': 'Inter', 'font-size': 12
    }, 'No local variables in scope.'));
  } else {
    const cardH = 46;
    const cardGap = 8;
    const cardStartX = scopeX + 16;
    const cardW = scopeW - 32;
    const cardStartY = 80;

    varEntries.slice(0, 4).forEach(([name, val], idx) => {
      const y = cardStartY + idx * (cardH + cardGap);
      const isChanged = state.prevVars && (state.prevVars[name] === undefined || JSON.stringify(state.prevVars[name]) !== JSON.stringify(val));
      
      let strokeColor = '#21283a';
      let bgColor = 'rgba(15, 23, 42, 0.2)';
      if (isChanged) {
        strokeColor = '#00e5ff';
        bgColor = 'rgba(0, 229, 255, 0.05)';
      }

      svg.appendChild(svgEl('rect', {
        x: cardStartX, y, width: cardW, height: cardH, rx: 6,
        fill: bgColor, stroke: strokeColor, 'stroke-width': isChanged ? 1.5 : 1
      }));

      svg.appendChild(svgEl('text', {
        x: cardStartX + 12, y: y + 26, fill: '#64748b',
        'font-family': 'JetBrains Mono', 'font-size': 12, 'font-weight': '600'
      }, name));

      svg.appendChild(svgEl('text', {
        x: cardStartX + 80, y: y + 27, fill: '#fff',
        'font-family': 'JetBrains Mono', 'font-size': 13, 'font-weight': '700'
      }, String(val)));

      if (isChanged) {
        const tagX = cardStartX + cardW - 55;
        svg.appendChild(svgEl('rect', {
          x: tagX, y: y + 15, width: 45, height: 16, rx: 3,
          fill: 'rgba(0, 229, 255, 0.15)', stroke: '#00e5ff', 'stroke-width': 0.5
        }));
        svg.appendChild(svgEl('text', {
          x: tagX + 22.5, y: y + 26.5, 'text-anchor': 'middle', fill: '#00e5ff',
          'font-family': 'Inter', 'font-size': 8.5, 'font-weight': '800'
        }, 'UPDATED'));
      }
    });
  }

  const actionY = H - 75;
  svg.appendChild(svgEl('line', {
    x1: scopeX + 16, y1: actionY - 14, x2: scopeX + scopeW - 16, y2: actionY - 14,
    stroke: '#21283a', 'stroke-width': 1
  }));
  svg.appendChild(svgEl('text', {
    x: scopeX + 16, y: actionY, fill: '#94a3b8', 'font-family': 'Inter',
    'font-size': 11, 'font-style': 'italic'
  }, `Action: ${step.action?.slice(0, 48) || 'Executing recursion step'}`));
}

function renderVariableGridSvg(svg, vars, action, line, W, H, step) {
  svg.innerHTML = '';

  const cleanVars = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k !== 'callStack' && k !== 'arr' && typeof v !== 'object') {
      cleanVars[k] = v;
    }
  }

  const keys = Object.keys(cleanVars);
  const N = keys.length;

  svg.appendChild(svgEl('text', {
    x: W / 2, y: 22, 'text-anchor': 'middle', fill: '#94a3b8',
    'font-family': 'Syne', 'font-size': 13, 'font-weight': '700'
  }, 'Variable States & Transitions'));

  if (N === 0) {
    svg.appendChild(svgEl('text', {
      x: W / 2, y: H / 2 - 20, 'text-anchor': 'middle', fill: '#ef4444',
      'font-family': 'JetBrains Mono', 'font-size': 13, 'font-weight': '700'
    }, 'Visualization currently unavailable for this code pattern.'));
    svg.appendChild(svgEl('text', {
      x: W / 2, y: H / 2 + 10, 'text-anchor': 'middle', fill: '#64748b',
      'font-family': 'Inter', 'font-size': 11
    }, 'No state variables tracked in this execution step.'));
    return;
  }

  const pos = {};
  if (N === 1) {
    pos[keys[0]] = { x: W/2, y: H/2 };
  } else if (N === 2) {
    pos[keys[0]] = { x: W/2 - 120, y: H/2 };
    pos[keys[1]] = { x: W/2 + 120, y: H/2 };
  } else if (N === 3) {
    pos[keys[0]] = { x: W/2 - 160, y: H/2 };
    pos[keys[1]] = { x: W/2, y: H/2 };
    pos[keys[2]] = { x: W/2 + 160, y: H/2 };
  } else {
    keys.forEach((k, idx) => {
      const angle = (idx * 2 * Math.PI) / N;
      pos[k] = {
        x: W/2 + 150 * Math.cos(angle),
        y: H/2 + 45 * Math.sin(angle)
      };
    });
  }

  const op = parseOperation(action, cleanVars);

  if (op) {
    if (op.type === 'swap') {
      const p1 = pos[op.v1];
      const p2 = pos[op.v2];
      if (p1 && p2) {
        const d1 = `M ${p1.x} ${p1.y} C ${ (p1.x+p2.x)/2 } ${ (p1.y+p2.y)/2 - 50 }, ${ (p1.x+p2.x)/2 } ${ (p1.y+p2.y)/2 - 50 }, ${p2.x} ${p2.y}`;
        const d2 = `M ${p2.x} ${p2.y} C ${ (p1.x+p2.x)/2 } ${ (p1.y+p2.y)/2 + 50 }, ${ (p1.x+p2.x)/2 } ${ (p1.y+p2.y)/2 + 50 }, ${p1.x} ${p1.y}`;
        
        svg.appendChild(svgEl('path', {
          d: d1, stroke: '#f59e0b', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '5,5',
          opacity: 0.8
        }));
        svg.appendChild(svgEl('path', {
          d: d2, stroke: '#00e5ff', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '5,5',
          opacity: 0.8
        }));
      }
    } else if (op.type === 'assign') {
      const pFrom = pos[op.from];
      const pTo = pos[op.to];
      if (pFrom && pTo) {
        const d = `M ${pFrom.x} ${pFrom.y} C ${ (pFrom.x+pTo.x)/2 } ${ (pFrom.y+pTo.y)/2 - 40 }, ${ (pFrom.x+pTo.x)/2 } ${ (pFrom.y+pTo.y)/2 - 40 }, ${pTo.x} ${pTo.y}`;
        const path = svgEl('path', {
          d, stroke: '#10b981', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '6,4',
          opacity: 0.9
        });
        svg.appendChild(path);
        
        const anim = svgEl('circle', { r: 5, fill: '#10b981' });
        svg.appendChild(anim);
        const motion = svgEl('animateMotion', {
          path: d, dur: '0.8s', repeatCount: 'indefinite'
        });
        anim.appendChild(motion);
      }
    } else if (op.type === 'compare') {
      const p1 = pos[op.v1];
      let p2 = pos[op.v2];
      if (!p2 && cleanVars[op.v2] !== undefined) {
        p2 = pos[op.v2];
      }
      
      const compX = p1 && p2 ? (p1.x + p2.x)/2 : (p1 ? p1.x + 80 : W/2);
      const compY = p1 && p2 ? (p1.y + p2.y)/2 - 40 : (p1 ? p1.y - 45 : H/2 - 40);

      if (p1) {
        svg.appendChild(svgEl('line', {
          x1: p1.x, y1: p1.y, x2: compX, y2: compY,
          stroke: '#f59e0b', 'stroke-width': 1.5, 'stroke-dasharray': '3,3'
        }));
      }
      if (p2) {
        svg.appendChild(svgEl('line', {
          x1: p2.x, y1: p2.y, x2: compX, y2: compY,
          stroke: '#f59e0b', 'stroke-width': 1.5, 'stroke-dasharray': '3,3'
        }));
      }

      const dim = 24;
      svg.appendChild(svgEl('polygon', {
        points: `${compX},${compY-dim} ${compX+dim},${compY} ${compX},${compY+dim} ${compX-dim},${compY}`,
        fill: 'rgba(245, 158, 11, 0.12)', stroke: '#f59e0b', 'stroke-width': 1.8
      }));

      svg.appendChild(svgEl('text', {
        x: compX, y: compY + 4, 'text-anchor': 'middle', fill: '#f59e0b',
        'font-family': 'JetBrains Mono', 'font-size': 13, 'font-weight': '800'
      }, op.op));

      let res = null;
      try {
        const val1 = cleanVars[op.v1];
        const val2 = cleanVars[op.v2] !== undefined ? cleanVars[op.v2] : parseFloat(op.v2);
        if (val1 !== undefined) {
          if (op.op === '>') res = val1 > val2;
          else if (op.op === '<') res = val1 < val2;
          else if (op.op === '==') res = val1 == val2;
          else if (op.op === '!=') res = val1 != val2;
          else if (op.op === '<=') res = val1 <= val2;
          else if (op.op === '>=') res = val1 >= val2;
        }
      } catch(e) {}

      if (res !== null) {
        const resText = res ? 'TRUE' : 'FALSE';
        const resColor = res ? '#10b981' : '#ef4444';
        const resBg = res ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)';
        
        svg.appendChild(svgEl('rect', {
          x: compX - 25, y: compY - dim - 22, width: 50, height: 16, rx: 4,
          fill: resBg, stroke: resColor, 'stroke-width': 1
        }));
        svg.appendChild(svgEl('text', {
          x: compX, y: compY - dim - 10, 'text-anchor': 'middle', fill: resColor,
          'font-family': 'Inter', 'font-size': 9, 'font-weight': '800'
        }, resText));
      }
    }
  }

  const isLoop = /loop|iterate|for|while/i.test(action);
  if (isLoop) {
    const loopX = W - 50, loopY = 32;
    svg.appendChild(svgEl('path', {
      d: `M ${loopX-10} ${loopY} A 10 10 0 1 1 ${loopX+10} ${loopY}`,
      stroke: '#00e5ff', 'stroke-width': 1.5, fill: 'none', 'stroke-dasharray': '3,3'
    }));
    svg.appendChild(svgEl('polygon', {
      points: `${loopX+10},${loopY} ${loopX+6},${loopY-4} ${loopX+14},${loopY-4}`,
      fill: '#00e5ff'
    }));
    svg.appendChild(svgEl('text', {
      x: loopX, y: loopY + 22, 'text-anchor': 'middle', fill: '#00e5ff',
      'font-family': 'Inter', 'font-size': 8, 'font-weight': '800'
    }, 'LOOP'));
  }

  keys.forEach(k => {
    const { x, y } = pos[k];
    const val = cleanVars[k];
    const isChanged = state.prevVars && (state.prevVars[k] === undefined || JSON.stringify(state.prevVars[k]) !== JSON.stringify(val));
    
    let stroke = '#21283a';
    let fill = 'rgba(33, 40, 58, 0.6)';
    if (isChanged) {
      stroke = '#00e5ff';
      fill = 'rgba(0, 229, 255, 0.08)';
    }

    const cardW = 100, cardH = 50;

    const rect = svgEl('rect', {
      x: x - cardW/2, y: y - cardH/2, width: cardW, height: cardH, rx: 8,
      fill, stroke, 'stroke-width': isChanged ? 2 : 1.5
    });
    if (isChanged) rect.style.filter = 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.35))';
    svg.appendChild(rect);

    svg.appendChild(svgEl('text', {
      x: x, y: y - 8, 'text-anchor': 'middle', fill: isChanged ? '#00e5ff' : '#94a3b8',
      'font-family': 'JetBrains Mono', 'font-size': 11, 'font-weight': '600'
    }, k));

    svg.appendChild(svgEl('text', {
      x: x, y: y + 14, 'text-anchor': 'middle', fill: '#fff',
      'font-family': 'JetBrains Mono', 'font-size': 13, 'font-weight': '700'
    }, String(val)));

    if (isChanged) {
      svg.appendChild(svgEl('circle', {
        cx: x + cardW/2 - 6, cy: y - cardH/2 + 6, r: 3, fill: '#00e5ff'
      }));
    }
  });

  svg.appendChild(svgEl('text', {
    x: W / 2, y: H - 20, 'text-anchor': 'middle', fill: '#64748b',
    'font-family': 'JetBrains Mono', 'font-size': 11
  }, `Action: ${action.slice(0, 75)}`));
}

function renderSmartExecutionSvg(step, svg) {
  const W = svg.clientWidth || 700;
  const H = svg.clientHeight || 380;
  
  const varsObj = step.vars || step.variables || {};
  
  let arr = step.arr || [];
  if (!arr.length) {
    for (const [k, v] of Object.entries(varsObj)) {
      if (Array.isArray(v)) {
        arr = v;
        break;
      }
    }
  }

  const callStack = varsObj.callStack || step.callStack || [];
  const isRecursive = callStack.length > 1 || (callStack.length === 1 && /^(fib|fact|recur|solve|gcd|search|sort)/i.test(callStack[0]));

  if (arr && arr.length > 0) {
    step.arr = arr;
    renderDSASvg(step, svg);
  } else if (isRecursive && callStack.length > 0) {
    renderRecursionStackSvg(svg, callStack, varsObj, W, H, step);
  } else {
    renderVariableGridSvg(svg, varsObj, step.action || step.description || '', step.line || 1, W, H, step);
  }
}

function renderDSASvg(step, svg) {
  const arr = step.arr || [];
  const highlights = step.highlights || {};
  const sorted = step.sorted || new Set();
  const W = svg.clientWidth || 620, H = svg.clientHeight || 300;
  const n = arr.length;
  if (!n) return;

  const key = state.currentAlgo;
  if (key === 'linked_list_traversal' || key === 'linked_list_reverse' || key === 'custom_list') { renderLLSvg(svg,arr,highlights,W,H); return; }
  if (key === 'stack_ops' || key === 'custom_stack') { renderStackSvg(svg,arr,highlights,W,H); return; }
  if (key === 'queue_ops' || key === 'custom_queue') { renderQueueSvg(svg,arr,highlights,W,H); return; }

  const cW = Math.min(80, Math.floor((W-50)/n));
  const cH = Math.min(58, Math.max(38, H*0.3));
  const sx = Math.floor((W - n*cW)/2), sy = Math.floor(H/2 - cH/2);
  const maxV = Math.max(...arr.map(Math.abs), 1);

  svg.innerHTML = '';
  svg.appendChild(svgEl('text',{x:W/2,y:22,'text-anchor':'middle',fill:'#475569','font-family':'JetBrains Mono','font-size':11},step.action||''));

  for (let i=0;i<n;i++) {
    const x=sx+i*cW, y=sy, v=arr[i];
    let fill='#1c2333',stroke='#2a3347',glow=null;
    if(sorted.has(i)){fill='rgba(16,185,129,.18)';stroke='#10b981';glow='#10b981';}
    else if(highlights[i]==='active'){fill='rgba(0,229,255,.18)';stroke='#00e5ff';glow='#00e5ff';}
    else if(highlights[i]==='comparing'){fill='rgba(245,158,11,.18)';stroke='#f59e0b';glow='#f59e0b';}
    else if(highlights[i]==='swapped'){fill='rgba(239,68,68,.18)';stroke='#ef4444';glow='#ef4444';}
    else if(highlights[i]==='visited'){fill='rgba(71,85,105,.2)';stroke='#475569';}
    else if(highlights[i]==='pivot'){fill='rgba(124,58,237,.22)';stroke='#7c3aed';glow='#7c3aed';}

    const barH = Math.max(6, Math.floor((Math.abs(v)/maxV)*(H*.22)));
    const rect = svgEl('rect',{x:x+2,y,width:cW-4,height:cH,rx:6,fill,stroke,'stroke-width': highlights[i]||sorted.has(i)?2:1.5});
    if(glow) rect.style.filter=`drop-shadow(0 0 7px ${glow})`;
    svg.appendChild(rect);
    svg.appendChild(svgEl('rect',{x:x+4,y:sy+cH+6,width:cW-8,height:barH,rx:3,fill:stroke,opacity:.45}));
    svg.appendChild(svgEl('text',{x:x+cW/2,y:y+cH/2+5,'text-anchor':'middle',fill:'#e2e8f0','font-family':'JetBrains Mono','font-size':Math.max(10,Math.min(15,cW/3)),'font-weight':'700'},v));
    svg.appendChild(svgEl('text',{x:x+cW/2,y:sy+cH+barH+18,'text-anchor':'middle',fill:'#475569','font-family':'JetBrains Mono','font-size':10},i));
    if (step.pointers && step.pointers[i] !== undefined) {
      addPointer(svg, x+cW/2, y-12, stroke, step.pointers[i]);
    } else {
      if(highlights[i]==='active') addPointer(svg,x+cW/2,y-12,stroke,'i');
      if(highlights[i]==='comparing') addPointer(svg,x+cW/2,y-12,stroke,'j');
      if(highlights[i]==='pivot') addPointer(svg,x+cW/2,y-12,stroke,'P');
    }
    if(sorted.has(i)){const c=svgEl('text',{x:x+cW-8,y:y+13,'text-anchor':'middle',fill:'#10b981','font-size':10,'font-weight':'700'});c.textContent='✓';svg.appendChild(c);}
  }

  const legs=[{c:'#00e5ff',l:'Active'},{c:'#f59e0b',l:'Compare'},{c:'#ef4444',l:'Swap'},{c:'#10b981',l:'Sorted'},{c:'#7c3aed',l:'Pivot'}];
  let lx=14;
  legs.forEach(({c,l})=>{svg.appendChild(svgEl('circle',{cx:lx+5,cy:H-13,r:4,fill:c}));svg.appendChild(svgEl('text',{x:lx+13,y:H-9,fill:'#475569','font-size':10,'font-family':'Inter'},l));lx+=68;});
}

function addPointer(svg,x,y,color,label){
  svg.appendChild(svgEl('polygon',{points:`${x},${y+7} ${x-4},${y} ${x+4},${y}`,fill:color}));
  svg.appendChild(svgEl('text',{x,y:y-3,'text-anchor':'middle',fill:color,'font-family':'JetBrains Mono','font-size':10,'font-weight':'700'},label));
}

function renderLLSvg(svg,arr,highlights,W,H){
  svg.innerHTML='';const n=arr.length,r=22,sp=Math.min(96,Math.floor((W-50)/(n+.5))),sx=Math.floor((W-n*sp)/2)+r,cy=Math.floor(H/2);
  for(let i=0;i<n;i++){const cx=sx+i*sp,hl=highlights[i];let fill='#1c2333',stroke='#2a3347';
    if(hl==='active'){fill='rgba(0,229,255,.2)';stroke='#00e5ff';}else if(hl==='visited'||hl==='sorted'){fill='rgba(16,185,129,.15)';stroke='#10b981';}
    if(i<n-1){svg.appendChild(svgEl('line',{x1:cx+r,y1:cy,x2:cx+sp-r,y2:cy,stroke:'#2a3347','stroke-width':2}));svg.appendChild(svgEl('polygon',{points:`${cx+sp-r},${cy} ${cx+sp-r-7},${cy-4} ${cx+sp-r-7},${cy+4}`,fill:'#2a3347'}));}
    const c=svgEl('circle',{cx,cy,r,fill,stroke,'stroke-width':hl?2:1.5});if(hl==='active')c.style.filter='drop-shadow(0 0 10px #00e5ff)';svg.appendChild(c);
    svg.appendChild(svgEl('text',{x:cx,y:cy+5,'text-anchor':'middle',fill:'#e2e8f0','font-family':'JetBrains Mono','font-size':14,'font-weight':'700'},arr[i]));
  }
  svg.appendChild(svgEl('text',{x:sx+n*sp,y:cy+4,'text-anchor':'start',fill:'#475569','font-family':'JetBrains Mono','font-size':11},'→ null'));
  svg.appendChild(svgEl('text',{x:sx,y:cy-r-6,'text-anchor':'middle',fill:'#00e5ff','font-family':'JetBrains Mono','font-size':10,'font-weight':'700'},'HEAD'));
}

function renderStackSvg(svg,arr,highlights,W,H){
  svg.innerHTML='';const cH=34,cW=110,sx=W/2-cW/2,base=H-38;
  svg.appendChild(svgEl('line',{x1:sx-18,y1:base+cH,x2:sx+cW+18,y2:base+cH,stroke:'#2a3347','stroke-width':2}));
  for(let i=arr.length-1;i>=0;i--){const sp=arr.length-1-i,y=base-sp*(cH+2),top=i===arr.length-1,hl=highlights[i];
    let fill='#1c2333',stroke='#2a3347';if(hl==='swapped'){fill='rgba(0,229,255,.2)';stroke='#00e5ff';}
    const rect=svgEl('rect',{x:sx,y,width:cW,height:cH,rx:5,fill,stroke,'stroke-width':top?2:1.5});if(top)rect.style.filter='drop-shadow(0 0 8px #00e5ff)';svg.appendChild(rect);
    svg.appendChild(svgEl('text',{x:sx+cW/2,y:y+cH/2+5,'text-anchor':'middle',fill:'#e2e8f0','font-family':'JetBrains Mono','font-size':13,'font-weight':'700'},arr[i]));
    if(top){svg.appendChild(svgEl('text',{x:sx+cW+8,y:y+cH/2+5,fill:'#00e5ff','font-family':'JetBrains Mono','font-size':10,'font-weight':'700'},'← TOP'));}
  }
}

function renderQueueSvg(svg,arr,highlights,W,H){
  svg.innerHTML='';const cW=56,cH=42,n=arr.length,sx=Math.floor((W-n*(cW+4))/2),sy=Math.floor(H/2-cH/2);
  for(let i=0;i<n;i++){const x=sx+i*(cW+4),hl=highlights[i];let fill='#1c2333',stroke='#2a3347';
    if(hl==='swapped'){fill='rgba(0,229,255,.2)';stroke='#00e5ff';}
    svg.appendChild(svgEl('rect',{x,y:sy,width:cW,height:cH,rx:5,fill,stroke,'stroke-width':1.5}));
    svg.appendChild(svgEl('text',{x:x+cW/2,y:sy+cH/2+5,'text-anchor':'middle',fill:'#e2e8f0','font-family':'JetBrains Mono','font-size':13,'font-weight':'700'},arr[i]));
    if(i<n-1)svg.appendChild(svgEl('text',{x:x+cW+1,y:sy+cH/2+4,fill:'#2a3347','font-size':13},'→'));
  }
  if(n>0){svg.appendChild(svgEl('text',{x:sx,y:sy-8,'text-anchor':'middle',fill:'#10b981','font-family':'JetBrains Mono','font-size':10,'font-weight':'700'},'FRONT'));
    svg.appendChild(svgEl('text',{x:sx+(n-1)*(cW+4)+cW,y:sy-8,'text-anchor':'middle',fill:'#f97316','font-family':'JetBrains Mono','font-size':10,'font-weight':'700'},'REAR'));}
}

function showSvg() {
  S('vizPlaceholder').style.display = 'none';
  S('vizSvg').style.display = 'block';
}

function clearView() {
  stopPlay();
  state.steps=[]; state.currentStep=0; state.prevVars={};
  S('vizPlaceholder').style.display = 'flex';
  S('vizSvg').style.display = 'none';
  S('vizSvg').innerHTML = '';
  ['btnFirst','btnPrev','btnPlay','btnNext','btnLast'].forEach(id => S(id).disabled=true);
  S('stepCurrent').textContent='0'; S('stepTotal').textContent='0';
  S('progressFill').style.width='0%';
  S('btnPlay').textContent='▶'; S('btnPlay').classList.remove('paused');
  S('varTableBody').innerHTML='<tr><td colspan="3" style="color:var(--text3);font-size:11px;text-align:center;padding:10px">No trace yet</td></tr>';
  S('dryTableBody').innerHTML='<tr><td colspan="3" style="color:var(--text3);font-size:11px;text-align:center;padding:10px">No trace yet</td></tr>';
}

function updateVarTracker(vars, idx) {
  const tbody = S('varTableBody');
  tbody.innerHTML = '';

  const cleanVars = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k !== 'callStack' && k !== 'arr' && typeof v !== 'object') {
      cleanVars[k] = v;
    }
  }

  const keys = Object.keys(cleanVars);
  if (!keys.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text3);font-size:11px;text-align:center;padding:8px">—</td></tr>';
    state.prevVars = {}; return;
  }

  const prevStepVars = (idx > 0 && state.steps[idx - 1]) ? (state.steps[idx - 1].vars || {}) : {};

  for (const [name, val] of Object.entries(cleanVars)) {
    const sv = Array.isArray(val) ? `[${val}]` : String(val);
    const pv = prevStepVars.hasOwnProperty(name) ? String(prevStepVars[name]) : null;
    const changed = pv !== null && pv !== sv;
    const tr = document.createElement('tr');
    tr.className = `var-row ${changed?'hl-row':''}`;
    tr.innerHTML = `<td class="var-name">${name}</td><td class="var-val">${sv.length>18?sv.slice(0,18)+'…':sv}</td><td><span class="var-change ${changed?'changed':'same'}">${changed?'↑':'—'}</span></td>`;
    tbody.appendChild(tr);
    if (changed) tr.animate([{background:'rgba(0,229,255,.18)'},{background:'transparent'}],{duration:500,easing:'ease-out'});
  }
  state.prevVars = { ...vars };
}

function buildDryRun() {
  const tbody = S('dryTableBody');
  tbody.innerHTML = '';
  state.steps.forEach((step,i) => {
    const tr = document.createElement('tr');
    tr.className = 'dry-row';
    tr.id = `dr${i}`;
    const arr = step.arr?.length ? `[${step.arr.join(',')}]` : (step.vars && Object.values(step.vars)[0] ? String(Object.values(step.vars)[0]) : '—');
    const action = step.dryAction || step.action || '';
    const isSwap = action.toLowerCase().includes('swap');
    const isErr = action.toLowerCase().includes('error');
    const cls = isErr ? 'dry-err' : isSwap ? 'dry-swap' : action.includes('✓') ? 'dry-action' : '';
    tr.innerHTML = `<td style="color:var(--text3)">${i+1}</td><td class="${cls}">${action.length>22?action.slice(0,22)+'…':action}</td><td style="color:var(--text2);font-size:10px">${arr.length>18?arr.slice(0,18)+'…':arr}</td>`;
    tbody.appendChild(tr);
  });
  S('stepTotal').textContent = state.steps.length;
}

function highlightDryRow(idx) {
  document.querySelectorAll('.dry-row').forEach(r => r.classList.remove('active-row'));
  const row = S(`dr${idx}`);
  if (row) { row.classList.add('active-row'); row.scrollIntoView({block:'nearest',behavior:'smooth'}); }
}

function updateDetectionPanel(d) {
  S('dLang').textContent = d.language || '—';
  S('dCat').textContent  = d.category || '—';
  S('dPat').textContent  = d.pattern  || '—';
  const c = d.confidence || 0;
  const fill = S('confFill'), num = S('confNum');
  fill.style.width = c + '%';
  const cls = c>=80?'hi':c>=50?'mid':'lo';
  fill.className = `conf-fill ${cls}`;
  num.className  = `conf-num ${cls}`;
  num.textContent = c + '%';
}

function enableControls() {
  ['btnFirst','btnPrev','btnPlay','btnNext','btnLast'].forEach(id => S(id).disabled=false);
  S('stepTotal').textContent = state.steps.length;
}
window.enableControls = enableControls;

function goToStep(idx) {
  if (!state.steps.length) return;
  if (idx===-1) idx=state.steps.length-1;
  idx = Math.max(0,Math.min(state.steps.length-1,idx));
  state.currentStep = idx;
  renderStep(idx);
}
window.goToStep = goToStep;

function nextStep(){ if(state.currentStep<state.steps.length-1) goToStep(state.currentStep+1); else stopPlay(); }
window.nextStep = nextStep;

function prevStep(){ if(state.currentStep>0) goToStep(state.currentStep-1); }
window.prevStep = prevStep;

function togglePlay(){ state.isPlaying ? stopPlay() : startPlay(); }
window.togglePlay = togglePlay;

function startPlay(){
  if(state.currentStep>=state.steps.length-1) goToStep(0);
  state.isPlaying=true;
  const b=S('btnPlay'); b.textContent='⏸'; b.classList.add('paused');
  state.playInterval = setInterval(()=>{ if(state.currentStep>=state.steps.length-1) stopPlay(); else nextStep(); }, SPEED_MAP[state.speed]||700);
}
window.startPlay = startPlay;

function stopPlay(){
  state.isPlaying=false; clearInterval(state.playInterval);
  const b=S('btnPlay'); b.textContent='▶'; b.classList.remove('paused');
}
window.stopPlay = stopPlay;

function updateProgress(idx){
  S('stepCurrent').textContent = idx+1;
  const pct = state.steps.length>1 ? (idx/(state.steps.length-1))*100 : 0;
  S('progressFill').style.width = pct+'%';
}

function updateSpeed(v){ state.speed=parseInt(v); updateSpeedLabel(); if(state.isPlaying){stopPlay();startPlay();} }
window.updateSpeed = updateSpeed;

function updateSpeedLabel(){ S('speedLabel').textContent = SPEED_LABELS[state.speed]||'1x'; }

function resetAll(){ stopPlay(); clearView(); setBadge('dsa','AUTO'); S('aiPanel').innerHTML='<div class="ai-explain"><span class="step-label">Ready —</span> Paste any code and click <span class="hw">Analyze &amp; Visualize</span>.</div>'; loadAlgorithm(); }
window.resetAll = resetAll;

function updateLineNumbers(){
  const lines=(S('codeEditor').value||'').split('\n');
  S('lineNumbers').innerHTML = lines.map((_,i)=>`<span class="ln" id="ln${i+1}">${i+1}</span>`).join('');
}
window.updateLineNumbers = updateLineNumbers;

function onEditorInput(){ updateLineNumbers(); }
window.onEditorInput = onEditorInput;

function handleEditorKey(e){
  if(e.key==='Tab'){e.preventDefault();const ta=e.target,s=ta.selectionStart;ta.value=ta.value.substring(0,s)+'  '+ta.value.substring(ta.selectionEnd);ta.selectionStart=ta.selectionEnd=s+2;updateLineNumbers();}
}
window.handleEditorKey = handleEditorKey;

function syncScroll(){const ed=S('codeEditor'),ln=S('lineNumbers'),hl=S('highlightLayer');ln.scrollTop=ed.scrollTop;if(hl)hl.scrollTop=ed.scrollTop;}
window.syncScroll = syncScroll;

function highlightActiveLine(lineNum){
  S('lineNumbers').querySelectorAll('.ln').forEach((el,i)=>el.classList.toggle('active',i+1===lineNum));
  const lines=S('codeEditor').value.split('\n');
  S('highlightLayer').innerHTML=lines.map((_,i)=>`<span class="line-hl ${i+1===lineNum?'active':''}">​</span>`).join('\n');
}

function loadAlgorithm(){
  const key=S('algoSelect').value; state.currentAlgo=key;
  const algo=ALGORITHMS[key]; if(!algo)return;
  const lang=S('langSelect').value;
  const code=(algo.langs&&algo.langs[lang])||algo.langs.python||'';
  S('codeEditor').value=code;
  S('testInput').value=algo.defaultInput||'';
  const exts={python:'.py',javascript:'.js',java:'.java',cpp:'.cpp'};
  const badges={python:'PY',javascript:'JS',java:'JAVA',cpp:'C++'};
  S('editorFilename').textContent=key+(exts[lang]||'.py');
  S('langBadge').textContent=badges[lang]||'PY';
  updateLineNumbers();
  if(algo.complexity){S('cxTime').textContent=algo.complexity.time;S('cxSpace').textContent=algo.complexity.space;S('cxBest').textContent=algo.complexity.best;S('cxWorst').textContent=algo.complexity.worst;}
  updateDetectionPanel({language:{python:'Python',javascript:'JavaScript',java:'Java',cpp:'C++'}[lang]||'Python',category:'DSA Algorithm',pattern:algo.name,confidence:99});
}
window.loadAlgorithm = loadAlgorithm;

function showAnalyzingOverlay(){
  S('analyzingOverlay').classList.remove('hidden');
  S('vizPlaceholder').style.display='none';
  S('vizSvg').style.display='none';
  S('runVizBtn').classList.add('analyzing');
  S('runVizBtn').disabled=true;
  [1,2,3,4].forEach(i=>animStep(i,'pending'));
}

function hideAnalyzingOverlay(){
  S('analyzingOverlay').classList.add('hidden');
  S('runVizBtn').classList.remove('analyzing');
  S('runVizBtn').disabled=false;
}

function animStep(n,s){
  const el=S(`as${n}`); if(!el)return Promise.resolve();
  const dot=el.querySelector('.ast');
  el.className=`analyze-step ${s}`;
  dot.textContent=s==='done'?'✓':s==='running'?'▸':'○';
  return sleep(120);
}

async function animSteps(ms){
  const step=ms/4;
  for(let i=1;i<=4;i++){animStep(i,'running');await sleep(step);animStep(i,'done');}
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function showToast(msg,type=''){
  document.querySelector('.toast')?.remove();
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400);},2800);
}
window.showToast = showToast;

document.addEventListener('keydown',e=>{
  if(e.target===S('codeEditor')||e.target===S('testInput'))return;
  if(e.key==='ArrowRight'||e.key==='l')nextStep();
  if(e.key==='ArrowLeft'||e.key==='h')prevStep();
  if(e.key===' '||e.key==='k'){e.preventDefault();togglePlay();}
  if(e.key==='Home')goToStep(0);
  if(e.key==='End')goToStep(-1);
});
let rT;
window.addEventListener('resize',()=>{clearTimeout(rT);rT=setTimeout(()=>{if(state.steps.length)renderStep(state.currentStep);},150);});
S('langSelect').addEventListener('change',loadAlgorithm);
