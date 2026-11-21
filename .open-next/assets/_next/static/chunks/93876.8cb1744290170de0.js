"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[93876],{93876:(e,t,n)=>{let o;function a(e,t={}){let{qrSize:n=280,showCloseButton:i=!0,closeButtonText:d="\xd7",theme:s="light",container:c=document.body,onCancel:l}=t;o?.();let p=document.createElement("div");p.style.cssText=`
    position: fixed;
    inset: 0;
    background-color: ${"dark"===s?"rgba(0, 0, 0, 0.8)":"rgba(0, 0, 0, 0.5)"};
    backdrop-filter: blur(10px);
    z-index: 9999;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 300ms ease-out;
  `,t.overlayStyles&&Object.assign(p.style,t.overlayStyles);let f=document.createElement("div");if(f.style.cssText=`
    background: ${"dark"===s?"#1f1f1f":"#ffffff"};
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 90vw;
    max-height: 90vh;
    position: relative;
    animation: scaleIn 300ms ease-out;
  `,t.modalStyles&&Object.assign(f.style,t.modalStyles),i){let e=document.createElement("button");e.textContent=d,e.style.cssText=`
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: ${"dark"===s?"#ffffff":"#000000"};
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: background-color 0.2s;
    `,e.addEventListener("mouseenter",()=>{e.style.backgroundColor="dark"===s?"rgba(255, 255, 255, 0.1)":"rgba(0, 0, 0, 0.1)"}),e.addEventListener("mouseleave",()=>{e.style.backgroundColor="transparent"}),e.addEventListener("click",()=>{v(!0)}),f.appendChild(e)}let m=document.createElement("div");m.style.cssText=`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  `;let u=document.createElement("h3");u.textContent="Scan to Connect",u.style.cssText=`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: ${"dark"===s?"#ffffff":"#000000"};
    text-align: center;
  `;let y=document.createElement("canvas");y.width=n,y.height=n,y.style.cssText=`
    border: 1px solid ${"dark"===s?"#333333":"#e5e5e5"};
    border-radius: 12px;
  `,r(e,y,n).catch(console.error);let x=document.createElement("button");x.textContent="Copy URI",x.style.cssText=`
    background: ${"dark"===s?"#333333":"#f5f5f5"};
    border: 1px solid ${"dark"===s?"#444444":"#e5e5e5"};
    color: ${"dark"===s?"#ffffff":"#000000"};
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `,x.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(e);let t=x.textContent;x.textContent="Copied!",setTimeout(()=>{x.textContent=t},2e3)}catch(e){console.error("Failed to copy URI:",e)}}),m.appendChild(u),m.appendChild(y),m.appendChild(x),f.appendChild(m),p.appendChild(f);let h=document.createElement("style");h.textContent=`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes scaleOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.9); opacity: 0; }
    }
  `,document.head.appendChild(h);let k=e=>{"Escape"===e.key&&v(!0)},g=e=>{e.target===p&&v(!0)};function b(){document.removeEventListener("keydown",k),p.removeEventListener("click",g),p.remove(),h.remove(),o===b&&(o=void 0)}function v(e=!1){document.removeEventListener("keydown",k),p.removeEventListener("click",g),o===b&&(o=void 0),e&&l&&l(),p.style.animation="fadeOut 200ms ease-in",f.style.animation="scaleOut 200ms ease-in";let t=()=>{p.parentNode&&p.parentNode.removeChild(p),h.parentNode&&h.parentNode.removeChild(h)};p.addEventListener("animationend",t,{once:!0}),setTimeout(t,250)}return document.addEventListener("keydown",k),p.addEventListener("click",g),c.appendChild(p),o=b,{destroy:()=>v(!1),hide:function(){p.style.display="none"},show:function(){p.style.display="flex"}}}async function r(e,t,o){if(!t.getContext("2d"))return;let{toCanvas:a}=await n.e(768).then(n.t.bind(n,768,19));await a(t,e,{width:o,margin:2,color:{dark:"#000000",light:"#ffffff"}})}n.d(t,{createQROverlay:()=>a})}}]);