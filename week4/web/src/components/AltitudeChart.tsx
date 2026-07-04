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
import { M_TO_FT } from "@/lib/altitude";

interface Props {
  observations: Observation[];
}

export default function AltitudeChart({ observations }: Props) {
  const data = observations.map((o) => ({
    t: new Date(o.observed_at).getTime(),
    alt: o.baro_altitude != null ? o.baro_altitude * M_TO_FT : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="altFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
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
          tickFormatter={(v) => `${Math.round((v as number) / 1000)}k`}
          label={{
            value: "ft",
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
          formatter={(v) => [`${Math.round(v as number).toLocaleString()} ft`, "Altitude"]}
        />
        <Area
          type="monotone"
          dataKey="alt"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#altFill)"
          dot={false}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
