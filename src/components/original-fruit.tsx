import {useId} from 'react';
const boxes={melon:[278,70,138],lemon:[261,17,56],orange:[232,66,46],kiwi:[2,47,52],grape:[149,62,30],tomato:[104,141,66]} as const;
export function OriginalFruit({kind='melon',className=''}:{kind?:keyof typeof boxes;className?:string}){
 const id=useId().replaceAll(':','');const [x,y,size]=boxes[kind];
 return <svg className={`original-fruit ${className}`} viewBox={`${x} ${y} ${size} ${size}`} aria-hidden="true"><defs><clipPath id={id}><circle cx={x+size/2} cy={y+size/2} r={size/2}/></clipPath></defs><image href="/cocos/res/share.jpg" x="0" y="0" width="418" height="208" clipPath={`url(#${id})`}/></svg>;
}
