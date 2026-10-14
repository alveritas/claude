/**
 * Inlined in <head> so it runs before first paint: the wordmark intro shows on the first
 * page view of a visit only. CSS keeps .intro hidden unless html[data-intro="1"].
 * (Kept outside "use client" modules so server components can import the string.)
 */
export const INTRO_SCRIPT = `try{var k='nh-intro',s=sessionStorage.getItem(k);document.documentElement.setAttribute('data-intro',s?'0':'1');sessionStorage.setItem(k,'1')}catch(e){document.documentElement.setAttribute('data-intro','0')}`;
