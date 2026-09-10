import { useEffect, useRef } from "react";

/** Decoración local: densidad limitada, sin librería 3D ni recursos remotos. */
export function Particles({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let width = 0,
      height = 0,
      frame = 0,
      last = 0;
    let visible = true;
    const pointer = { x: -1000, y: -1000 };
    const dots = Array.from({ length: 38 }, (_, i) => ({
      x: ((i * 137 + 31) % 997) / 997,
      y: ((i * 73 + 91) % 991) / 991,
      radius: i % 3 === 0 ? 2 : 1,
      speed: 0.000006 + (i % 5) * 0.000002,
    }));
    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }
    function draw(delta: number) {
      context!.clearRect(0, 0, width, height);
      for (const dot of dots) {
        if (!paused) dot.y = (dot.y - dot.speed * delta + 1) % 1;
        const x = dot.x * width,
          y = dot.y * height;
        const distance = Math.hypot(pointer.x - x, pointer.y - y);
        context!.fillStyle = "#D4AF37";
        context!.globalAlpha = 0.5;
        context!.beginPath();
        context!.arc(x, y, dot.radius, 0, Math.PI * 2);
        context!.fill();
        if (distance < 140) {
          context!.strokeStyle = "#D4AF37";
          context!.globalAlpha = (1 - distance / 140) * 0.35;
          context!.beginPath();
          context!.moveTo(x, y);
          context!.lineTo(pointer.x, pointer.y);
          context!.stroke();
        }
      }
      context!.globalAlpha = 1;
    }
    function tick(time: number) {
      if (visible && !document.hidden && time - last > 32) {
        draw(Math.min(time - last, 60));
        last = time;
      }
      frame = requestAnimationFrame(tick);
    }
    function move(event: PointerEvent) {
      const bounds = canvas!.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(canvas);
    window.addEventListener("pointermove", move, { passive: true });
    resize();
    if (!paused) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, [paused]);
  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
