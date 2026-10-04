'use client';
import {forwardRef,type AnchorHTMLAttributes} from 'react';
/** Semantic link; the global navigation provider preserves modified/native clicks. */
export const HoverLink=forwardRef<HTMLAnchorElement,AnchorHTMLAttributes<HTMLAnchorElement>>(function HoverLink({children,className='',...props},ref){return <a {...props} ref={ref} className={'hover-link '+className}>{children}</a>;});
