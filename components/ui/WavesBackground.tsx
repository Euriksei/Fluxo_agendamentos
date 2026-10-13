import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';

import type ShapeWavesType from './ShapeWaves';

type ShapeWavesProps = Parameters<typeof ShapeWavesType>[0];

// Same palette as the animated waves: dark base, #3F3F52 shapes on a 12px grid, brighter in the middle and fading at the edges
const STATIC_DOTS: CSSProperties = {
    backgroundImage: 'radial-gradient(circle, rgb(63 63 82 / 0.7) 0 3.2px, transparent 3.8px)',
    backgroundSize: '12px 12px',
    backgroundPosition: 'center',
    maskImage: 'radial-gradient(130% 75% at 50% 30%, #000 0%, rgb(0 0 0 / 0.55) 45%, rgb(0 0 0 / 0.15) 85%)',
    WebkitMaskImage: 'radial-gradient(130% 75% at 50% 30%, #000 0%, rgb(0 0 0 / 0.55) 45%, rgb(0 0 0 / 0.15) 85%)'
};

// WebGPU waves only where they are cheap enough: no GPU API, reduced motion, data saver or a low core count keep the static background
const canAnimate = () =>
{
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if ((navigator as any).connection?.saveData) return false;
    if ((navigator.hardwareConcurrency ?? 8) <= 4) return false;
    return true;
};

/**
 * Login/registro background. The static CSS version paints with the page, so the form never waits for the GPU. The WebGPU
 * ShapeWaves module (vgpu + shaders) is only downloaded once the page is loaded and idle, and fades in over the static layer after
 * its first frame. Phones render at DPR 1 and 30 fps, desktops at DPR 1.5 at most.
 */
export default function WavesBackground(props: ShapeWavesProps)
{
    const [Waves, setWaves] = useState<ComponentType<ShapeWavesProps> | null>(null);
    const [shown, setShown] = useState(false);

    useEffect(() =>
    {
        if (!canAnimate()) return;

        let cancelled = false;
        let idleId = 0;
        let timer = 0;

        const start = () =>
        {
            import('./ShapeWaves')
                .then(m => { if (!cancelled) setWaves(() => m.default); })
                .catch(() => {});
        };
        // Let the form paint and settle first; GPU setup and shader compilation run in long tasks
        const schedule = () =>
        {
            timer = window.setTimeout(() =>
            {
                if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(start, { timeout: 2500 });
                else start();
            }, 800);
        };

        if (document.readyState === 'complete') schedule();
        else window.addEventListener('load', schedule, { once: true });

        return () =>
        {
            cancelled = true;
            window.removeEventListener('load', schedule);
            clearTimeout(timer);
            if (idleId) window.cancelIdleCallback(idleId);
        };
    }, []);

    const coarse = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);

    return (
        <div className="absolute inset-0 bg-[#0F0F14]" aria-hidden="true">
            <div className="absolute inset-0" style={STATIC_DOTS} />
            {Waves && (
                <div className="absolute inset-0 transition-opacity duration-700 ease-out" style={{ opacity: shown ? 1 : 0 }}>
                    <Waves {...props} maxDpr={coarse ? 1 : 1.5} maxFps={coarse ? 30 : 0} onReady={() => setShown(true)} onError={() => setWaves(null)} />
                </div>
            )}
        </div>
    );
}
