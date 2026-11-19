// Builds the page that the playground runner shows, from the HTML / CSS / JS panes.

export const STARTER = {
  html: `<h1>Hello, playground!</h1>
<button id="btn">Click me</button>
<p id="out"></p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  padding: 16px;
}
button {
  font-size: 1rem;
  padding: 8px 16px;
}`,
  js: `const btn = document.querySelector('#btn');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  document.querySelector('#out').textContent = \`Clicked \${count} times\`;
  console.log('count is', count);
});`,
};

/** Languages from chat code blocks that can be loaded into the playground, and their pane. */
export const RUNNABLE = {
  html: 'html',
  xml: 'html',
  css: 'css',
  js: 'js',
  javascript: 'js',
  mjs: 'js',
};

// Runs inside the sandbox before your code. Sends console output and errors to the app.
// Kept on ONE line so it doesn't shift the line numbers of your HTML.
// The JS pane is tagged "your-code.js" (//# sourceURL), so its errors report your JS line numbers.
const SHIM = `(function(){var P=window.parent;
function fmt(v,d){d=d||0;if(typeof v==='string')return d?JSON.stringify(v):v;if(v===undefined)return'undefined';if(v===null)return'null';
if(typeof v==='function')return'ƒ '+(v.name||'anonymous')+'()';if(typeof v==='bigint')return v+'n';if(typeof v!=='object')return String(v);
if(v instanceof Error)return v.name+': '+v.message;if(typeof Node!=='undefined'&&v instanceof Node)return v.nodeType===1?'<'+v.tagName.toLowerCase()+(v.id?'#'+v.id:'')+'>':v.nodeName;
if(d>2)return Array.isArray(v)?'[…]':'{…}';try{if(Array.isArray(v))return'['+v.slice(0,100).map(function(x){return fmt(x,d+1)}).join(', ')+(v.length>100?', …':'')+']';
if(v instanceof Map)return'Map('+v.size+') {'+Array.from(v).slice(0,50).map(function(e){return fmt(e[0],d+1)+' => '+fmt(e[1],d+1)}).join(', ')+'}';
if(v instanceof Set)return'Set('+v.size+') {'+Array.from(v).slice(0,50).map(function(x){return fmt(x,d+1)}).join(', ')+'}';
var n=v.constructor&&v.constructor.name&&v.constructor.name!=='Object'?v.constructor.name+' ':'';
return n+'{'+Object.keys(v).slice(0,50).map(function(k){return k+': '+fmt(v[k],d+1)}).join(', ')+'}'}catch(e){return String(v)}}
function send(l,a){try{P.postMessage({type:'console',level:l,text:Array.prototype.map.call(a,function(x){return fmt(x)}).join(' ').slice(0,5000)},'*')}catch(e){}}
['log','info','warn','error','debug'].forEach(function(l){var o=console[l];console[l]=function(){send(l,arguments);try{o&&o.apply(console,arguments)}catch(e){}}});
console.table=function(t){send('log',[t])};console.clear=function(){try{P.postMessage({type:'console-clear'},'*')}catch(e){}};
function where(line,file){file=file||'';if(/your-code\\.js$/.test(file))return' (JS line '+line+')';if(file&&!/runner|^about:/.test(file))return' ('+file+':'+line+')';return' (in your HTML)'}
window.addEventListener('error',function(e){if(e.target&&e.target!==window){send('error',['Could not load '+(e.target.src||e.target.href||e.target.tagName)]);return}
send('error',[(e.message||'Error')+where(e.lineno,e.filename)])},true);
window.addEventListener('unhandledrejection',function(e){var r=e.reason;send('error',['Uncaught (in promise) '+(r&&r.message?r.name+': '+r.message:fmt(r))])});
})();`.replace(/\n/g, '');

const safeJs = (js) => js.replace(/<\/script/gi, '<\\/script');
const safeCss = (css) => css.replace(/<\/style/gi, '<\\/style');

/** True if the HTML pane holds a whole page (<!doctype>/<html>) rather than a fragment. */
export const isFullDocument = (html) => /^\s*(<!--[\s\S]*?-->\s*)*<(!doctype|html)\b/i.test(html);

// The JS pane as a script tag. Your code starts on the <script> line, so line numbers match.
const jsScript = (js) => '<script>' + safeJs(js) + '\n//# sourceURL=your-code.js\n</script>';

export function buildDocument({ html = '', css = '', js = '' }) {
  let doc;

  if (isFullDocument(html)) {
    // A complete page: keep it as written, add the spy at the top of <head> on the same line,
    // CSS (flattened to one line) before </head>, and the JS pane before </body>.
    doc = html;
    const shimTag = '<script>' + '\u0000SHIM\u0000' + '</script>';
    const flatCss = css.trim() ? '<style>' + safeCss(css).replace(/\n/g, ' ') + '</style>' : '';
    if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => m + shimTag);
    else if (/<html[^>]*>/i.test(doc)) doc = doc.replace(/<html[^>]*>/i, (m) => m + shimTag);
    else doc = shimTag + doc;
    // (function replacements so "$" in your code is never treated as a special pattern)
    if (flatCss) doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, () => flatCss + '</head>') : doc.replace(shimTag, () => shimTag + flatCss);
    const jsTag = js.trim() ? jsScript(js) + '\n' : '';
    if (jsTag) doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => jsTag + '</body>') : doc + jsTag;
  } else {
    doc = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<script>\u0000SHIM\u0000</script>',
      '<style>',
      safeCss(css),
      '</style>',
      '</head>',
      '<body>',
      html,
      jsScript(js),
      '</body>',
      '</html>',
    ].join('\n');
  }

  return doc.replace('\u0000SHIM\u0000', () => SHIM);
}

/** Text sent to the tutor by the "Ask tutor" button. */
export function askTutorMessage({ html, css, js }, logs) {
  const cap = (s) => (s.length > 6000 ? s.slice(0, 6000) + '\n… (cut)' : s);
  const parts = ['Here is my code from the playground. Please review it, point out any bugs or problems, and help me improve it.'];
  if (html.trim()) parts.push('```html\n' + cap(html.trim()) + '\n```');
  if (css.trim()) parts.push('```css\n' + cap(css.trim()) + '\n```');
  if (js.trim()) parts.push('```js\n' + cap(js.trim()) + '\n```');
  const out = logs.slice(-20).map((l) => `[${l.level}] ${l.text}`).join('\n');
  if (out) parts.push('Console output:\n```\n' + out.slice(0, 3000) + '\n```');
  return parts.join('\n\n');
}
