import { SQUISHIES,ENVIRONMENTS,DEFAULT_SQUISHY } from './catalog.js';
import type { SquishySpec,EnvironmentSpec } from './toy.ts';
import type { GestureMode } from './gestures.ts';

const icon=(path:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
export const icons={
  reset:icon('<path d="M4 10a8 8 0 1 1 .8 7M4 4v6h6"/>'),
  sound:icon('<path d="m11 5-5 4H3v6h3l5 4V5Z"/><path class="sound-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="sound-off" d="m16 9 5 6m0-6-5 6"/>'),
  help:icon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .5-1 1.2-1 1.7m0 3v.01"/>'),
  pin:icon('<path d="m9 3 8 8-3 1-2 5-5-5 5-2-1-3Z"/><path d="m7 17-4 4"/>'),
  decor:icon('<path d="M3 19h18M5 19V9l7-6 7 6v10M9 19v-6h6v6"/>'),
  close:icon('<path d="m6 6 12 12M18 6 6 18"/>'),
};

export function mountUI() {
  document.querySelector('#app')!.innerHTML=`
    <main id="viewport" aria-label="Squishy playground"></main>
    <div id="grips" aria-hidden="true"></div>
    <header class="masthead">
      <a class="wordmark" href="#" aria-label="Squishy Playground, home"><span>s</span><span>q</span><span>u</span><span>i</span><span>s</span><span>h</span><span>y</span><i aria-hidden="true">✿</i></a>
      <p>a little world of softness</p>
    </header>
    <nav class="actions" aria-label="Game controls">
      <button id="environments-button" class="pill" aria-label="Little worlds" aria-expanded="false" aria-controls="environments">${icons.decor}<span>Little worlds</span></button>
      <button id="sound" class="icon-button" aria-label="Mute sound" aria-pressed="false" title="Sound">${icons.sound}</button>
      <button id="help-button" class="icon-button" aria-label="How to play">${icons.help}</button>
    </nav>
    <section id="environments" class="world-picker" aria-label="Choose a world" hidden>
      <div class="panel-title"><span>Somewhere new to play?</span><button id="close-environments" class="icon-button" aria-label="Close worlds">${icons.close}</button></div>
      ${ENVIRONMENTS.map(e=>`<button class="world-option" data-world="${e.id}" aria-pressed="${e.id==='cloud'}"><span class="world-preview" style="--world-top:${e.background};--world-bottom:${e.floor};--world-accent:${e.accent}"><i>${e.icon}</i></span><span><strong>${e.name}</strong><small>${e.subtitle}</small></span><span class="world-check" aria-hidden="true">✓</span></button>`).join('')}
    </section>
    <aside class="toy-caption"><span id="family-badge" class="family-badge">mochi sticky</span><h1 id="toy-name">Fluffy Cat</h1><p id="toy-description">A little cloud that sticks around.</p><a id="product-link" href="https://squishy-official.com/produit/squishy-mochi-chat-fluffy/" target="_blank" rel="noopener noreferrer">See the original toy <span aria-hidden="true">↗</span></a></aside>
    <div class="gesture-toolbar" role="group" aria-label="Choose how to play"><button data-gesture="squish" aria-pressed="false">♡ <span>Squish</span></button><button data-gesture="grab" aria-pressed="true">↗ <span>Grab &amp; throw</span></button></div>
    <div class="play-tools">
      <button id="pin" class="pill pin-button" aria-pressed="false" title="Pin a point · Shift + click">${icons.pin}<span>Pin a point</span></button>
      <button id="release" class="pill" hidden>Let go</button>
      <button id="reset" class="icon-button" aria-label="Bring your Squishy back to the center" title="Start again · R">${icons.reset}</button>
    </div>
    <div class="play-hint"><span class="hint-spark" aria-hidden="true">✧</span><span class="desktop-hint"><span class="gesture-hint">Drag onto a wall. Let go to stick.</span><small class="gesture-detail">Pull an edge to peel it away.</small></span><span class="touch-hint"><span class="gesture-hint">Drag onto a wall. Let go to stick.</span><small class="gesture-detail">Two fingers can stretch in opposite directions.</small></span></div>
    <div id="mood" role="status" aria-live="polite">Feeling soft.</div>
    <div id="switch-loading" role="status" hidden>A new little friend is on the way…</div>
    <section class="collection" aria-label="The Squishy collection">
      <div class="collection-heading"><div><span class="collection-kicker">THE LITTLE COLLECTION</span><h2>Who shall we play with?</h2></div><div class="filters" role="group" aria-label="Filter the collection"><button data-filter="all" aria-pressed="true">All <span>10</span></button><button data-filter="classic" aria-pressed="false">Classics <span>5</span></button><button data-filter="sticky" aria-pressed="false">Sticky <span>5</span></button></div></div>
      <div class="toy-list">${SQUISHIES.map(s=>`<button class="toy-card" data-toy="${s.id}" data-family="${s.family}" aria-label="Play with ${s.name}, ${s.family==='sticky'?'Mochi sticky':'Classic Squishy'}" aria-pressed="${s.id===DEFAULT_SQUISHY}" style="--toy-tint:${s.tint}"><span class="card-photo"><img src="${s.photo}" alt="" loading="${s.id===DEFAULT_SQUISHY?'eager':'lazy'}" width="100" height="100"><span class="card-check" aria-hidden="true">✓</span></span><strong>${s.name}</strong><small>${s.family==='sticky'?'mochi sticky':'soft & squishy'}</small></button>`).join('')}</div>
      <footer class="collection-footer"><span>10 little friends. So many ways to play.</span><button id="credits-button">Made with care · Credits ↗</button></footer>
    </section>
    <dialog id="help-dialog"><button class="dialog-close icon-button" aria-label="Close">${icons.close}</button><span class="dialog-mark">✧</span><h2>Time for a little squeeze.</h2><p>Choose Squish to press and hold anywhere on the toy. Choose Grab &amp; throw to move it freely. Classics start in Squish mode, in an open world without walls.</p><div class="help-grid"><article><span>☝ + ☝</span><h3>On a touch screen</h3><p>Place your fingers on different parts of your Squishy. Pull apart to stretch, or move together to squeeze from the sides or from top to bottom. Each finger keeps its own hold.</p></article><article><span>↖ + ✦</span><h3>With a mouse</h3><p>In Squish mode, click and hold to press with a broad fingertip. Slide to knead. A gentle supporting palm keeps the toy in place while you squeeze. In Grab &amp; throw mode, <kbd>Shift</kbd> + click pins a point for an opposing stretch.</p></article><article><span>♡</span><h3>A little clingy</h3><p>Sticky Mochi have a larger, colorful room. Drag away from the center onto a patterned wall, then release. The toy stays attached under its own weight. Pull an edge to peel it off; individual bonds also loosen over time.</p></article><article><span>↻</span><h3>Take a look around</h3><p>Drag the background to turn the view. Scroll or pinch the background to zoom. <kbd>Esc</kbd> releases your holds, <kbd>R</kbd> brings your Squishy back, and <kbd>Space</kbd> gives it a little hop.</p></article></div><p class="dialog-note">Multi-touch also works on computers with a touch screen. A trackpad controls the view; use pins to hold several points at once.</p><button class="dialog-done primary-button">Let’s play ♡</button></dialog>
    <dialog id="credits-dialog"><button class="dialog-close icon-button" aria-label="Close">${icons.close}</button><span class="dialog-mark">♡</span><h2>The hands behind the softness.</h2><p>This playground is adapted from <a href="https://github.com/scottstts/Jelly-Baby" target="_blank" rel="noopener noreferrer">Jelly Baby, created by Scott (scottstts)</a>. His soft-body physics, lighting work, and interactions are the foundation of this project. Visit <a href="https://jelly.scottsun.io" target="_blank" rel="noopener noreferrer">Scott’s original playground</a>.</p><p>Toy designs, reference photos, and visual inspiration: <a href="https://squishy-official.com/" target="_blank" rel="noopener noreferrer">Squishy Official</a>. The 3D models interpret the product photos. Sticky behavior is a feature of this simulation. This project is not affiliated with the store.</p><p>Adaptation: <a href="https://github.com/vibe-oss-project/squishy" target="_blank" rel="noopener noreferrer">vibe-oss-project / squishy</a>. Fredoka and Lexend fonts, licensed under the SIL Open Font License.</p><button class="dialog-done primary-button">Back to the squishes</button></dialog>
    <section id="loading" role="status" aria-live="polite"><div class="loading-card"><div class="loading-mochi" aria-hidden="true"><i></i><i></i><b>·</b></div><span class="collection-kicker">SQUISHY PLAYGROUND</span><h2>A little softness is on its way.</h2><p id="load-message">Getting your little world ready…</p><pre id="fatal" hidden></pre><button id="retry" class="primary-button" hidden>Try again</button></div></section>
  `;
}

export class PlaygroundUI {
  pinMode=false;
  gestureMode:GestureMode='grab';
  private sticky=true;
  private readonly abort=new AbortController();
  constructor(onToy:(s:SquishySpec)=>void,onWorld:(s:EnvironmentSpec)=>void,onReset:()=>void,onRelease:()=>void,onSound:()=>boolean) {
    const signal=this.abort.signal;
    const listen=(id:string,action:()=>void)=>document.getElementById(id)!.addEventListener('click',action,{signal});
    for(const s of SQUISHIES)document.querySelector(`[data-toy="${s.id}"]`)!.addEventListener('click',()=>onToy(s),{signal});
    for(const e of ENVIRONMENTS)document.querySelector(`[data-world="${e.id}"]`)!.addEventListener('click',()=>{onWorld(e);this.showWorlds(false);},{signal});
    for(const filter of document.querySelectorAll<HTMLButtonElement>('[data-filter]'))filter.addEventListener('click',()=>{
      for(const f of document.querySelectorAll('[data-filter]'))f.setAttribute('aria-pressed',String(f===filter));
      for(const card of document.querySelectorAll<HTMLElement>('[data-toy]'))card.hidden=filter.dataset.filter!=='all'&&card.dataset.family!==filter.dataset.filter;
    },{signal});
    listen('environments-button',()=>this.showWorlds(!!document.getElementById('environments')!.hidden));listen('close-environments',()=>this.showWorlds(false));
    listen('pin',()=>{this.pinMode=!this.pinMode;document.getElementById('pin')!.setAttribute('aria-pressed',String(this.pinMode));});
    listen('reset',onReset);listen('release',onRelease);
    for(const button of document.querySelectorAll<HTMLButtonElement>('.gesture-toolbar [data-gesture]'))button.addEventListener('click',()=>{onRelease();this.setGesture(button.dataset.gesture as GestureMode);},{signal});
    listen('sound',()=>{const muted=onSound(),button=document.getElementById('sound')!;button.classList.toggle('muted',muted);button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'Unmute sound':'Mute sound');});
    for(const name of ['help','credits']){
      const dialog=document.getElementById(`${name}-dialog`) as HTMLDialogElement;
      listen(`${name}-button`,()=>{onRelease();this.showWorlds(false);dialog.showModal();});
      for(const button of dialog.querySelectorAll('button'))button.addEventListener('click',()=>dialog.close(),{signal});
      dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}},{signal});
    }
    document.querySelector('.wordmark')!.addEventListener('click',e=>{e.preventDefault();onReset();},{signal});
    document.addEventListener('keydown',e=>{if(e.code==='Escape')this.showWorlds(false);},{signal});
  }
  private showWorlds(show:boolean){document.getElementById('environments')!.hidden=!show;document.getElementById('environments-button')!.setAttribute('aria-expanded',String(show));}
  private setGesture(mode:GestureMode){
    this.gestureMode=mode;this.pinMode=false;document.getElementById('pin')!.setAttribute('aria-pressed','false');document.getElementById('pin')!.hidden=mode==='squish';
    document.body.dataset.gesture=mode;
    document.querySelector('#viewport canvas')?.setAttribute('aria-label',mode==='squish'?'Squishy. Press and hold to squeeze. Slide to knead, or use several fingers to stretch and compress. Press R to reset.':'Squishy. Grab and drag to move. Drag a sticky toy onto a wall and release to stick. Pull to peel. Shift + click pins another point. Press R to reset.');
    for(const button of document.querySelectorAll<HTMLElement>('.gesture-toolbar [data-gesture]'))button.setAttribute('aria-pressed',String(button.dataset.gesture===mode));
    const hint=mode==='squish'?'Press and hold. Feel it squish.':this.sticky?'Drag onto a wall. Let go to stick.':'Grab, stretch, let go.';
    const detail=mode==='squish'?'Slide to knead. Two fingers to stretch or squeeze.':this.sticky?'Pull an edge to peel it away.':'Shift + click pins a second point.';
    for(const node of document.querySelectorAll('.gesture-hint'))node.textContent=hint;
    for(const node of document.querySelectorAll('.gesture-detail'))node.textContent=detail;
  }
  selectToy(spec:SquishySpec){
    this.sticky=spec.family==='sticky';this.setGesture(this.sticky?'grab':'squish');
    document.body.dataset.family=spec.family;
    document.getElementById('toy-name')!.textContent=spec.name;document.getElementById('toy-description')!.textContent=spec.description;
    const badge=document.getElementById('family-badge')!;badge.textContent=spec.family==='sticky'?'mochi sticky':'classic squishy';badge.dataset.family=spec.family;
    (document.getElementById('product-link') as HTMLAnchorElement).href=spec.source;
    for(const card of document.querySelectorAll<HTMLElement>('[data-toy]'))card.setAttribute('aria-pressed',String(card.dataset.toy===spec.id));
  }
  selectWorld(spec:EnvironmentSpec){
    for(const card of document.querySelectorAll<HTMLElement>('[data-world]'))card.setAttribute('aria-pressed',String(card.dataset.world===spec.id));
    document.body.dataset.world=spec.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',spec.background);
  }
  busy(busy:boolean){document.getElementById('switch-loading')!.hidden=!busy;document.querySelector('.collection')!.setAttribute('aria-busy',String(busy));}
  update(grips:number,bonds:number,squeeze:number,delight:number,wallBonds=0,wallAim=false){
    document.getElementById('release')!.hidden=grips===0;
    const text=wallBonds&&!grips?'Stuck to the wall ♡ Pull to peel.':wallAim&&grips?'Let go — I’ll stick here ♡':this.gestureMode==='squish'&&grips?'Squeeze… and slowly let go ♡':squeeze>.42?'Hehe, so squished!':delight>.3?'One more little squeeze?':grips>1?'A little stretch together.':grips?'Hello, you ♡':bonds?'Sticking around a little longer…':'Feeling soft.';
    const label=document.getElementById('mood')!;if(label.textContent!==text)label.textContent=text;
    document.body.classList.toggle('holding',grips>0);
  }
  dispose(){this.abort.abort();}
}
