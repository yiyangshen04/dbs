"use client";

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Observation } from "@/lib/types";
import { MPS_TO_KT } from "@/lib/altitude";

interface Props {
  observations: Observation[];
}

export default function VelocityChart({ observations }: Props) {
  const data = observations.map((o) => ({
    t: new Date(o.observed_at).getTime(),
    v: o.velocity != null ? o.velocity * MPS_TO_KT : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="velFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c2a41" />
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
          tick={{ fontSize: 10, fill: "#7d90ab" }}
          stroke="#1c2a41"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#7d90ab" }}
          stroke="#1c2a41"
          width={44}
          label={{
            value: "kt",
            angle: -90,
            position: "insideLeft",
            fontSize: 10,
            fill: "#7d90ab",
          }}
        />
        <Tooltip
          contentStyle={{
            background: "#0b1424",
            border: "1px solid #1c2a41",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#7d90ab" }}
          labelFormatter={(t) => new Date(t as number).toLocaleTimeString()}
          formatter={(v) => [`${Math.round(v as number)} kt`, "Ground speed"]}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke="#fbbf24"
          strokeWidth={2}
          fill="url(#velFill)"
          dot={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
