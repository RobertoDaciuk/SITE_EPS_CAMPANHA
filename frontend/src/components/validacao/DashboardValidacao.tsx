"use client";

import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
  FileCheck,
  TrendingUp,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardValidacaoProps {
  statsDashboard: any;
  carregandoDashboard: boolean;
  erroDashboard: string | null;
  buscarStatsDashboard: () => void;
}

export default function DashboardValidacao({
  statsDashboard,
  carregandoDashboard,
  erroDashboard,
  buscarStatsDashboard,
}: DashboardValidacaoProps) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header com botão de atualizar */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold">Dashboard de Estatísticas</h2>
              <p className="text-muted-foreground text-sm">
                Análise dos últimos 30 dias
              </p>
            </div>
          </div>
          <button
            onClick={buscarStatsDashboard}
            disabled={carregandoDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {carregandoDashboard ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar
          </button>
        </div>
      </div>

      {/* Loading State */}
      {carregandoDashboard && !statsDashboard && (
        <div className="glass rounded-xl p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-muted-foreground">Carregando estatísticas...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {erroDashboard && (
        <div className="glass rounded-xl p-6 border-2 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-700 mb-1">
                Erro ao carregar estatísticas
              </h3>
              <p className="text-red-600 text-sm">{erroDashboard}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {!carregandoDashboard && !erroDashboard && statsDashboard && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Validações */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <FileCheck className="w-8 h-8 text-blue-500" />
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  30 dias
                </span>
              </div>
              <p className="text-3xl font-black text-blue-600 mb-1">
                {statsDashboard.totalValidacoes}
              </p>
              <p className="text-sm text-muted-foreground">Total de Validações</p>
            </motion.div>

            {/* Taxa de Validação */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Taxa
                </span>
              </div>
              <p className="text-3xl font-black text-green-600 mb-1">
                {statsDashboard.taxaValidacao.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Taxa de Validação</p>
            </motion.div>

            {/* Total Validado */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Sucesso
                </span>
              </div>
              <p className="text-3xl font-black text-emerald-600 mb-1">
                {statsDashboard.totais.validado.toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">Pedidos Validados</p>
            </motion.div>

            {/* Total Revalidado */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <RefreshCw className="w-8 h-8 text-slate-500" />
                <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-full">
                  Recuperados
                </span>
              </div>
              <p className="text-3xl font-black text-slate-600 mb-1">
                {statsDashboard.totais.revalidado.toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">Pedidos Revalidados</p>
            </motion.div>
          </div>

          {/* Gráfico de Linha: Validações por Dia */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Validações por Dia (Últimos 30 dias)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={Object.entries(statsDashboard.validacoesPorDia).map(
                  ([dia, dados]: [string, any]) => ({
                    dia: new Date(dia).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    }),
                    validado: dados.validado,
                    rejeitado: dados.rejeitado,
                    total: dados.total,
                  })
                )}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dia" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="validado"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Validado"
                />
                <Line
                  type="monotone"
                  dataKey="rejeitado"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Rejeitado"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gráfico de Barras: Top 10 Motivos de Rejeição */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Top 10 Motivos de Rejeição
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={statsDashboard.topMotivosRejeicao}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis
                  type="category"
                  dataKey="motivo"
                  width={250}
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" fill="#ef4444" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gráfico de Pizza: Distribuição de Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Distribuição de Status
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Validado",
                      value: statsDashboard.totais.validado,
                      color: "#10b981",
                    },
                    {
                      name: "Rejeitado",
                      value: statsDashboard.totais.rejeitado,
                      color: "#ef4444",
                    },
                    {
                      name: "Conflito Manual",
                      value: statsDashboard.totais.conflito_manual,
                      color: "#f59e0b",
                    },
                    {
                      name: "Em Análise",
                      value: statsDashboard.totais.em_analise,
                      color: "#6b7280",
                    },
                    {
                      name: "Revalidado",
                      value: statsDashboard.totais.revalidado,
                      color: "#64748b",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    {
                      name: "Validado",
                      value: statsDashboard.totais.validado,
                      color: "#10b981",
                    },
                    {
                      name: "Rejeitado",
                      value: statsDashboard.totais.rejeitado,
                      color: "#ef4444",
                    },
                    {
                      name: "Conflito Manual",
                      value: statsDashboard.totais.conflito_manual,
                      color: "#f59e0b",
                    },
                    {
                      name: "Em Análise",
                      value: statsDashboard.totais.em_analise,
                      color: "#6b7280",
                    },
                    {
                      name: "Revalidado",
                      value: statsDashboard.totais.revalidado,
                      color: "#64748b",
                    },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
