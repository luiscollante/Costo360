'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function SwitcherInner({ variants, current, names }: { variants: string[], current: string, names?: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentIndex = variants.indexOf(current) === -1 ? 0 : variants.indexOf(current);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const goToPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + variants.length) % variants.length;
    router.replace(pathname + '?' + createQueryString('variant', variants[prevIndex]));
  }, [currentIndex, variants, router, pathname, createQueryString]);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % variants.length;
    router.replace(pathname + '?' + createQueryString('variant', variants[nextIndex]));
  }, [currentIndex, variants, router, pathname, createQueryString]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
        return;
      }
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  if (process.env.NODE_ENV === 'production') return null;

  const currentLabel = names && names[current] ? `${current} — ${names[current]}` : current;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-slate-900 text-white rounded-full shadow-2xl border border-slate-700/50 z-50 backdrop-blur-md bg-opacity-90">
      <button onClick={goToPrev} className="p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Previous Variant">
        <ChevronLeft size={20} />
      </button>
      <div className="text-sm font-medium tracking-wide min-w-[200px] text-center select-none">
        {currentLabel}
      </div>
      <button onClick={goToNext} className="p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Next Variant">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default function PrototypeSwitcher(props: { variants: string[], current: string, names?: Record<string, string> }) {
  return (
    <Suspense fallback={null}>
      <SwitcherInner {...props} />
    </Suspense>
  )
}
