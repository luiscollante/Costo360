import { motion, useMotionValue, useSpring } from "framer-motion";
import type { ReactNode, PointerEvent } from "react";

// Local coordinates: no global listener, React render or animation loop.
export function spotlight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    "--pointer-x",
    `${event.clientX - box.left}px`,
  );
  event.currentTarget.style.setProperty(
    "--pointer-y",
    `${event.clientY - box.top}px`,
  );
}

export function MagneticLink({
  children,
  href,
  className = "button",
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 18 });
  const springY = useSpring(y, { stiffness: 180, damping: 18 });
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.a
      href={href}
      className={`${className} magnetic-link`}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - box.left - box.width / 2) * 0.08);
        y.set((event.clientY - box.top - box.height / 2) * 0.12);
      }}
      onPointerLeave={reset}
      onBlur={reset}
      onFocus={reset}
    >
      {children}
    </motion.a>
  );
}
