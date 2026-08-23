import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const lines = 12;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height;

      for (let i = 0; i < lines; i++) {
        const angle = (Math.PI / lines) * i + Math.sin(time + i) * 0.1;
        const length = Math.max(width, height) * 1.5;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * length, cy - Math.sin(angle) * length);
        
        const gradient = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * length, cy - Math.sin(angle) * length);
        gradient.addColorStop(0, "rgba(201, 164, 92, 0)");
        gradient.addColorStop(0.5, "rgba(31, 111, 84, 0.15)");
        gradient.addColorStop(1, "rgba(201, 164, 92, 0)");
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2 + Math.sin(time * 2 + i) * 1;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 z-0 pointer-events-none w-full h-full",
        className
      )}
    />
  );
};
