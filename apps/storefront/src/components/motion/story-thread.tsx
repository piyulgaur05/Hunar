'use client';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
/**
 * A stitched thread pinned to the page edge that is "sewn" as the reader scrolls —
 * the visual spine of a storefront where every craft tells a story.
 */
export function StoryThread() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });
  return (
    <div className="story-thread" aria-hidden="true">
      <svg viewBox="0 0 2 100" preserveAspectRatio="none">
        <line x1="1" y1="0" x2="1" y2="100" className="story-thread-guide" />
        <motion.line
          x1="1"
          y1="0"
          x2="1"
          y2="100"
          className="story-thread-stitch"
          style={{ pathLength: reduce ? 1 : progress }}
        />
      </svg>
      <motion.span className="story-thread-needle" style={{ top: reduce ? '100%' : progress }} />
    </div>
  );
}
