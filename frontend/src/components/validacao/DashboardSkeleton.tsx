"use client";

import { Activity } from "lucide-react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500/50" />
          <div>
            <div className="h-8 w-64 bg-muted/50 rounded mb-2" />
            <div className="h-4 w-48 bg-muted/50 rounded" />
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 bg-muted/50 rounded" />
              <div className="w-16 h-6 bg-muted/50 rounded-full" />
            </div>
            <div className="h-10 w-20 bg-muted/50 rounded mb-2" />
            <div className="h-4 w-32 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Gráfico 1 */}
      <div className="glass rounded-xl p-6">
        <div className="h-6 w-64 bg-muted/50 rounded mb-4" />
        <div className="h-[300px] bg-muted/50 rounded" />
      </div>

      {/* Gráfico 2 */}
      <div className="glass rounded-xl p-6">
        <div className="h-6 w-56 bg-muted/50 rounded mb-4" />
        <div className="h-[400px] bg-muted/50 rounded" />
      </div>

      {/* Gráfico 3 */}
      <div className="glass rounded-xl p-6">
        <div className="h-6 w-48 bg-muted/50 rounded mb-4" />
        <div className="h-[350px] bg-muted/50 rounded" />
      </div>
    </div>
  );
}
