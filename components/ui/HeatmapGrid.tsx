"use client";

import { motion } from "framer-motion";

export interface HeatmapCell {
  hour: number;
  count: number;
  intensity: number;
}

export default function HeatmapGrid({
  cells,
  title,
}: {
  cells: HeatmapCell[];
  title?: string;
}) {
  return (
    <div>
      {title && <p className="gp-label mb-3">{title}</p>}
      <div className="grid grid-cols-12 gap-1.5">
        {cells.map((cell) => (
          <motion.div
            key={cell.hour}
            title={`${cell.hour}h · ${cell.count}`}
            className="aspect-square rounded-sm border border-white/5"
            style={{
              background: `rgba(255, 43, 43, ${Math.max(0.06, cell.intensity / 100)})`,
            }}
            whileHover={{ scale: 1.15, zIndex: 2 }}
            layout
          />
        ))}
      </div>
    </div>
  );
}
