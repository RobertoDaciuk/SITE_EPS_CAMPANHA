"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Sparkles, X } from "lucide-react";
import { formatarDataBR } from "@/lib/timezone";
import { useAuth } from "@/contexts/ContextoAutenticacao";

interface EventoEspecial {
  id: string;
  nome: string;
  descricao?: string;
  multiplicador: number;
  corDestaque: string;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
}

interface CampanhaComEvento {
  id: string;
  titulo: string;
  eventosEspeciais?: EventoEspecial[];
}

function todayKeyBR(date = new Date()) {
  // Chave diária simples para exibir uma vez ao dia por usuário
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function EventoEspecialPopup() {
  const { usuario, estaAutenticado } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [campanha, setCampanha] = useState<CampanhaComEvento | null>(null);
  const [evento, setEvento] = useState<EventoEspecial | null>(null);

  const storageKey = useMemo(() => {
    const day = todayKeyBR();
    return `eventoEspecialShown:${usuario?.id || "anon"}:${day}`;
  }, [usuario?.id]);

  useEffect(() => {
    if (!estaAutenticado) return;
    if (usuario?.papel !== "VENDEDOR") return;

    const alreadyShown = sessionStorage.getItem(storageKey);
    if (alreadyShown) return;

    (async () => {
      try {
        // Buscar campanhas visíveis (já vem com eventos ativos no backend em /campanhas)
        const resp = await api.get<CampanhaComEvento[]>("/campanhas");
        const comEvento = resp.data
          .filter((c) => (c.eventosEspeciais || []).length > 0)
          .map((c) => ({
            ...c,
            eventosEspeciais: (c.eventosEspeciais || []).sort((a, b) => (b.multiplicador || 1) - (a.multiplicador || 1)),
          }));

        if (comEvento.length > 0) {
          // Escolhe a campanha de maior multiplicador (primeira após sort)
          const escolhida = comEvento[0];
          setCampanha(escolhida);
          setEvento(escolhida.eventosEspeciais![0]);
          setIsOpen(true);
          sessionStorage.setItem(storageKey, "1");
        }
      } catch (e) {
        // Silencioso: não deve atrapalhar o fluxo do usuário
        console.warn("EventoEspecialPopup: falhou ao carregar campanhas", e);
      }
    })();
  }, [estaAutenticado, usuario?.papel, storageKey]);

  if (!isOpen || !campanha || !evento) return null;

  const fechar = () => setIsOpen(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div
          className="h-2 w-full"
          style={{ backgroundColor: evento.corDestaque || "#7c3aed" }}
        />
        <button
          className="absolute right-3 top-3 rounded-md p-1 hover:bg-accent"
          onClick={fechar}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="rounded-lg p-2"
              style={{ backgroundColor: (evento.corDestaque || "#7c3aed") + "20" }}
            >
              <Sparkles className="h-6 w-6" color={evento.corDestaque || "#7c3aed"} />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Evento Especial</p>
              <h3 className="text-xl font-bold">{evento.nome} • x{evento.multiplicador}</h3>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {evento.descricao || "Ganhe mais ao enviar pedidos durante o período do evento!"}
          </p>
          <div className="mb-6 text-xs text-muted-foreground">
            Vigência: {formatarDataBR(evento.dataInicio)} até {formatarDataBR(evento.dataFim)}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a
              href="/campanhas"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ver Campanhas
            </a>
            <button
              onClick={fechar}
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
