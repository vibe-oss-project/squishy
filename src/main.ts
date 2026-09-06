import './squishy/fonts.css';
import './style.css';
import { mountUI } from './squishy/ui.ts';

mountUI();
let stage='Loading the playground',failed=false,game:{stop:()=>void}|undefined;
function fail(reason:unknown) {
  if(failed)return;failed=true;game?.stop();
  const error=reason instanceof Error?reason:new Error(String(reason));
  const loading=document.getElementById('loading')!;loading.classList.remove('hidden');loading.classList.add('failed');
  loading.querySelector('h2')!.textContent='A little hiccup.';
  document.getElementById('load-message')!.textContent='This playground needs a browser and device that support WebGPU. The details below can help identify what went wrong.';
  const fatal=document.getElementById('fatal') as HTMLPreElement;fatal.hidden=false;
  fatal.textContent=`${stage}\n${error.message}\n\nViewport: ${innerWidth} × ${innerHeight} · DPR ${devicePixelRatio}\n${navigator.userAgent}`;
  document.getElementById('retry')!.hidden=false;console.error(`[Squishy / ${stage}]`,error);
}
window.addEventListener('error',event=>fail(event.error||event.message));
window.addEventListener('unhandledrejection',event=>fail(event.reason));
document.getElementById('retry')!.addEventListener('click',()=>location.reload());

// Observe imports, initialization, shader compilation, warmup and first frame.
void import('./squishy/runtime.ts').then(({startGame})=>startGame(message=>{
  if(failed)throw new Error('Startup stopped after a GPU error');
  stage=message;document.getElementById('load-message')!.textContent=message;
},fail)).then(started=>{
  game=started;if(failed){game.stop();return;}
  stage='In the playground';document.getElementById('loading')!.classList.add('hidden');
}).catch(fail);
