"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";

export default function MiniPressureChart({
  data,
  animateKey,
}: {
  data: { t: string; v: number }[];
  animateKey: string;
}) {
  return (
    <motion.div
      key={animateKey}
      className="gpl-chart-mini"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <ResponsiveContainer width="100%" height={72}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="gplPressureFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 43, 43, 0.35)" />
              <stop offset="100%" stopColor="rgba(255, 43, 43, 0)" />
            </linearGradient>
            <linearGradient id="gplPressureStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff2b2b" />
              <stop offset="100%" stopColor="#ff8a6b" />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              background: "rgba(12, 16, 24, 0.92)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelFormatter={() => "Pressão"}
            formatter={(v) => [`${v}`, "GPI"]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="url(#gplPressureStroke)"
            strokeWidth={2}
            fill="url(#gplPressureFill)"
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
