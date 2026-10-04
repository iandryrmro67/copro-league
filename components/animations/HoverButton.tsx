'use client';
import {forwardRef,useEffect} from 'react';
import {useMotionValue,type HTMLMotionProps} from 'motion/react';
import * as m from 'motion/react-m';
import {magneticOffset} from '@/lib/animation-state';
import {useAnimations} from './AnimationProvider';
type Props=HTMLMotionProps<'button'>&{variant?:'primary'|'secondary';magnetic?:boolean};
/** Native button attributes/ref are forwarded. Disable magnetism for precision controls. */
export const HoverButton=forwardRef<HTMLButtonElement,Props>(function HoverButton({variant='primary',magnetic=true,className='',children,onPointerMove,onPointerLeave,...props},ref){
 const {reduced}=useAnimations(),x=useMotionValue(0),y=useMotionValue(0);
 useEffect(()=>{if(reduced){x.set(0);y.set(0);}},[reduced,x,y]);
 return <m.button {...props} ref={ref} className={`button hover-button ${variant==='primary'?'primary':''} ${className}`} style={{...props.style,x,y}} onPointerMove={e=>{onPointerMove?.(e);if(!magnetic||reduced||props.disabled||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return;const r=e.currentTarget.getBoundingClientRect(),offset=magneticOffset(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width,r.height);x.set(offset.x);y.set(offset.y);}} onPointerLeave={e=>{x.set(0);y.set(0);onPointerLeave?.(e);}}>{children}</m.button>;
});
