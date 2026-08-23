import { useEffect, useRef } from "react";

interface ParticlesProps {
  className?: string;
  quantity?: number;
  color?: string;
}

export const Particles = ({
  className = "",
  quantity = 50,
  color = "#D4AF37", // Default to Gold
}: ParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<any[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    initCanvas();
    animate();
    window.addEventListener("resize", initCanvas);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("resize", initCanvas);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const initCanvas = () => {
    if (canvasRef.current && context.current) {
      canvasSize.current.w = canvasRef.current.offsetWidth;
      canvasSize.current.h = canvasRef.current.offsetHeight;
      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      context.current.scale(dpr, dpr);
      
      circles.current = [];
      for (let i = 0; i < quantity; i++) {
        const circle = {
          x: Math.random() * canvasSize.current.w,
          y: Math.random() * canvasSize.current.h,
          translateX: 0,
          translateY: 0,
          size: Math.random() * 2 + 0.5,
          alpha: 0,
          targetAlpha: parseFloat((Math.random() * 0.4 + 0.1).toFixed(1)),
          dx: (Math.random() - 0.5) * 0.2,
          dy: (Math.random() - 0.5) * 0.2,
          magnetism: 0.1 + Math.random() * 4,
        };
        circles.current.push(circle);
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = e.clientX - rect.left - w / 2;
      const y = e.clientY - rect.top - h / 2;
      mouse.current = { x, y };
    }
  };

  const animate = () => {
    if (context.current) {
      context.current.clearRect(
        0,
        0,
        canvasSize.current.w,
        canvasSize.current.h
      );
      circles.current.forEach((circle: any) => {
        circle.translateX += circle.dx;
        circle.translateY += circle.dy;
        circle.alpha += (circle.targetAlpha - circle.alpha) * 0.02;

        circle.translateX += (mouse.current.x / (1000 / circle.magnetism) - circle.translateX) * 0.02;
        circle.translateY += (mouse.current.y / (1000 / circle.magnetism) - circle.translateY) * 0.02;

        if (
          circle.x + circle.translateX < 0 ||
          circle.x + circle.translateX > canvasSize.current.w ||
          circle.y + circle.translateY < 0 ||
          circle.y + circle.translateY > canvasSize.current.h
        ) {
          circle.x = Math.random() * canvasSize.current.w;
          circle.y = Math.random() * canvasSize.current.h;
          circle.translateX = 0;
          circle.translateY = 0;
        }

        context.current!.beginPath();
        context.current!.arc(
          circle.x + circle.translateX,
          circle.y + circle.translateY,
          circle.size,
          0,
          2 * Math.PI
        );
        context.current!.fillStyle = `${color}${Math.floor(circle.alpha * 255).toString(16).padStart(2, "0")}`;
        context.current!.fill();
      });
      requestAnimationFrame(animate);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
