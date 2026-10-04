'use client';
import {forwardRef,useEffect,type ReactNode} from 'react';
import {useMotionValue,type HTMLMotionProps} from 'motion/react';
import * as m from 'motion/react-m';
import {useAnimations} from './AnimationProvider';
type Props=Omit<HTMLMotionProps<'article'>,'children'>&{children?:ReactNode}&{tilt?:boolean;image?:boolean};
/** Decorative card wrapper. Children retain their own links/buttons and accessible names. */
export const HoverTile=forwardRef<HTMLElement,Props>(function HoverTile({children,className='',tilt=true,image=false,onPointerMove,onPointerLeave,...props},ref){
 const {reduced}=useAnimations(),rx=useMotionValue(0),ry=useMotionValue(0),x=useMotionValue(0),y=useMotionValue(0);
 useEffect(()=>{if(reduced){rx.set(0);ry.set(0);x.set(0);y.set(0);}},[reduced,rx,ry,x,y]);
 return <m.article {...props} ref={ref} className={'hover-tile '+className} style={{...props.style,rotateX:rx,rotateY:ry,transformPerspective:800}} onPointerMove={e=>{onPointerMove?.(e);if(reduced||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const r=e.currentTarget.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;if(tilt){rx.set(-dy/r.height*12);ry.set(dx/r.width*12);}x.set(dx);y.set(dy);}} onPointerLeave={e=>{rx.set(0);ry.set(0);x.set(0);y.set(0);onPointerLeave?.(e);}}>{children}<m.i className="tile-glow" aria-hidden="true" style={{x,y}}/>{[0,1,2,3].map(i=><i className={'tile-corner c'+i} key={i} aria-hidden="true"/>)}{image&&<><i className="tile-image-veil" aria-hidden="true"/><i className="tile-scanline" aria-hidden="true"/></>}</m.article>;
});
