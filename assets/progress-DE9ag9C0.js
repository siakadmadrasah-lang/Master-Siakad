import{c as m,r as p,j as u,aE as x,aA as V,w as _}from"./index-CFD-iIzJ.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=m("Book",[["path",{d:"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20",key:"k3hazp"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=m("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);var $=Object.defineProperty,o=(e,r)=>$(e,"name",{value:r,configurable:!0}),P="Progress",f=100,[j,G]=V(P),[w,L]=j(P),A=p.forwardRef(o(function(r,l){const{__scopeProgress:i,value:t=null,max:a,getValueLabel:y=b,...M}=r;(a||a===0)&&!c(a)&&console.error(h(`${a}`,"Progress"));const s=c(a)?a:f;t!==null&&!v(t,s)&&console.error(N(`${t}`,"Progress"));const n=v(t,s)?t:null,E=d(n)?y(n,s):void 0;return u.jsx(w,{scope:i,value:n,max:s,children:u.jsx(x.div,{"aria-valuemax":s,"aria-valuemin":0,"aria-valuenow":d(n)?n:void 0,"aria-valuetext":E,role:"progressbar","data-state":g(n,s),"data-value":n??void 0,"data-max":s,...M,ref:l})})},"Progress")),R="ProgressIndicator",k=p.forwardRef(o(function(r,l){const{__scopeProgress:i,...t}=r,a=L(R,i);return u.jsx(x.div,{"data-state":g(a.value,a.max),"data-value":a.value??void 0,"data-max":a.max,...t,ref:l})},"ProgressIndicator"));function b(e,r){return`${Math.round(e/r*100)}%`}o(b,"defaultGetValueLabel");function g(e,r){return e==null?"indeterminate":e===r?"complete":"loading"}o(g,"getProgressState");function d(e){return typeof e=="number"}o(d,"isNumber");function c(e){return d(e)&&!isNaN(e)&&e>0}o(c,"isValidMaxNumber");function v(e,r){return d(e)&&!isNaN(e)&&e<=r&&e>=0}o(v,"isValidValueNumber");function h(e,r){return`Invalid prop \`max\` of value \`${e}\` supplied to \`${r}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${f}\`.`}o(h,"getInvalidMaxError");function N(e,r){return`Invalid prop \`value\` of value \`${e}\` supplied to \`${r}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${f} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`}o(N,"getInvalidValueError");var I=A,S=k;const C=p.forwardRef(({className:e,value:r,...l},i)=>u.jsx(I,{ref:i,className:_("relative h-4 w-full overflow-hidden rounded-full bg-secondary",e),...l,children:u.jsx(S,{className:"h-full w-full flex-1 bg-primary transition-all",style:{transform:`translateX(-${100-(r||0)}%)`}})}));C.displayName=I.displayName;export{O as B,B as L,C as P};
