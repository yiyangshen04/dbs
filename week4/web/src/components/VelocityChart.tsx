"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Observation } from "@/lib/types";

interface Props {
  observations: Observation[];
}

export default function VelocityChart({ observations }: Props) {
  const data = observations.map((o) => ({
    t: new Date(o.observed_at).getTime(),
    v: o.velocity,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t) =>
            new Date(t).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
          tick={{ fontSize: 10 }}
          stroke="#94a3b8"
        />
        <YAxis
          tick={{ fontSize: 10 }}
          stroke="#94a3b8"
          label={{ value: "m/s", angle: -90, position: "insideLeft", fontSize: 10 }}
        />
        <Tooltip
          labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
          formatter={(v) => [`${Math.round(v as number)} m/s`, "Speed"]}
        />
        <Line
          type="monotone"
          dataKey="v"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
