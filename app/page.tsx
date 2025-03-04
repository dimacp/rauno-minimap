"use client";

import clsx, { ClassValue } from "clsx";
import { useLenis } from "lenis/react";
import {
  motion,
  useScroll,
  useTransform,
  useAnimate,
  useMotionValueEvent,
} from "motion/react";
import { useRef, useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

// Utility function to merge Tailwind classes with clsx
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

// Create an array of line heights where every 5th line (index % 5 === 1) is taller (24px) than others (18px)
const lineHeights = Array(26)
  .fill(null)
  .map((_, index) => ((index + 1) % 5 === 1 ? 24 : 18));

export default function RaunoMinimap() {
  // Initialize Lenis for smooth scrolling
  const lenis = useLenis();
  const containerRef = useRef(null);
  const [scope, animate] = useAnimate();
  // Track scroll progress from start to end of the container
  const { scrollYProgress, scrollY } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  // Track which bar is currently being hovered
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Store the maximum scrollable height of the container
  const [maxScroll, setMaxScroll] = useState(0);
  // Transform scroll progress (0-1) to active bar index (0-25)
  const active = useTransform(scrollYProgress, (progress) => {
    return progress * 25;
  });

  function animateBars({ active }: { active: number }) {
    lineHeights.forEach((_, index) => {
      // Calculate scale based on distance from active bar
      // Max scale is 3.2, decreases by 0.5 for each bar away from active
      // When active is less than 0.1, set scale to 1 to prevent scaling when not scrolled
      const scale =
        active < 0.1 ? 1 : Math.max(3.2 - Math.abs(index - active) * 0.5, 1);
      animate(
        `#bar-${index}`,
        { scaleY: scale },
        { type: "spring", stiffness: 350, damping: 25 }
      );
    });
  }

  // Calculate the x-position of the orange indicator bar based on active index
  // Each bar is 10px wide including gap
  const barX = useTransform(active, (a) => {
    return a * 10;
  });

  // Calculate the maximum scrollable height when component mounts
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current as HTMLElement;
      const viewportHeight = window.innerHeight;
      const totalHeight = container.scrollHeight - viewportHeight;
      setMaxScroll(totalHeight);
    }
  }, []);

  // Animate bar heights based on scroll position when not hovering
  useMotionValueEvent(active, "change", (currentActive) => {
    if (hoveredIndex === null) {
      animateBars({ active: currentActive });
    }
  });

  // Animate bar heights based on hover state
  useEffect(() => {
    if (hoveredIndex !== null) {
      // When hovering, scale bars based on distance from hovered bar
      animateBars({ active: hoveredIndex });
    } else {
      // When not hovering, return to scroll-based scaling
      animateBars({ active: active.get() });
    }
  }, [hoveredIndex]);

  return (
    // Container with fixed height to enable scrolling
    <main
      data-index
      ref={containerRef}
      className="min-h-screen h-[calc(4320px+100vh)]"
    >
      {/* Fixed position scroll indicator */}
      <div
        ref={scope}
        className="fixed top-[64px] left-[50%] translate-x-[-50%]"
      >
        <motion.div
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.02,
              },
            },
          }}
          initial="hidden"
          animate="visible"
          className="flex items-end gap-[9px]"
        >
          {lineHeights.map((height, index) => (
            <motion.div
              variants={{
                hidden: {
                  opacity: 0,
                  filter: "blur(10px)",
                },
                visible: {
                  opacity: 1,
                  filter: "blur(0px)",
                },
              }}
              transition={{
                duration: 0.6,
              }}
              key={index}
              id={`bar-${index}`}
              className={cn("w-px relative", {
                "bg-[#171717]": height === 24, // Taller bars are darker
                "bg-[#8f8f8f]": height !== 24, // Shorter bars are lighter
              })}
              style={{ height }}
            >
              {/* Invisible button for hover and click interactions */}
              <motion.button
                aria-label={`Scroll to ${Math.round(
                  (index / 25) * 100
                )}% of page`}
                onHoverStart={() => setHoveredIndex(index)}
                onHoverEnd={() => setHoveredIndex(null)}
                onClick={() => {
                  // Calculate target scroll position based on bar index
                  const targetScroll = (maxScroll / 25) * index;
                  lenis?.scrollTo(targetScroll, { duration: 1.5 });
                }}
                className={cn("absolute -inset-x-[5px] h-full cursor-pointer", {
                  "z-10": hoveredIndex === index, // Ensure hovered bar is clickable
                })}
              />
            </motion.div>
          ))}
        </motion.div>
        {/* Orange indicator bar that moves based on scroll position */}
        <motion.div
          initial={{
            opacity: 0,
            filter: "blur(10px)",
          }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 0.6,
            delay: 1,
          }}
          className="w-[1px] h-screen flex flex-col items-center bg-[#fc6605] absolute -top-8 left-0"
          style={{ x: barX }}
        >
          {/* Triangle pointer at the top */}
          <svg
            width="10"
            height="8"
            viewBox="0 0 7 6"
            fill="none"
            className="translate-y-[-12px]"
          >
            <path
              className="fill-[#fc6605]"
              d="M3.54688 6L0.515786 0.75L6.57796 0.75L3.54688 6Z"
            ></path>
          </svg>
          {/* Waitlist button at the bottom */}
          <button className="bg-[#fc6605] text-white text-xs px-2 py-1 uppercase absolute bottom-[calc(0.25rem*32)] left-0 whitespace-nowrap font-mono">
            join waitlist
          </button>
        </motion.div>
      </div>
    </main>
  );
}
