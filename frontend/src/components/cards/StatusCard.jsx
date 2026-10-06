import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import { activateMapLink } from '../../data/mapThemes.js';
import { statusTone, visibleValue } from "../../utils/status";

const cardVariants = cva("status-card", {
  variants: {
    tone: {
      normal: "tone-normal",
      attention: "tone-attention",
      alert: "tone-alert",
      emergency: "tone-emergency",
      empty: "tone-empty"
    }
  },
  defaultVariants: { tone: "empty" }
});

export function StatusCard({ icon: Icon, title, indicator, children, className }) {
  const tone = statusTone[indicator.state] || indicator.tone || "empty";
  const sourceLabel = "Fonte";
  const stamp = indicator.observedAt || indicator.updatedAt;
  const monthlyReference = typeof indicator.reference === 'string' && /^\d{4}-\d{2}/.test(indicator.reference) ? `${indicator.reference.slice(5,7)}/${indicator.reference.slice(0,4)}` : null;
  const stampLabel = monthlyReference || (indicator.observedAt ? new Date(indicator.observedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : stamp);
  const statusLabels = {
    normal: "Normalidade",
    attention: "Atenção",
    alert: "Alerta",
    emergency: "Emergência",
    empty: "Sem dados"
  };
  return (
    <motion.a
      aria-label={`${title}: ${indicator.actionLabel}`}
      className={clsx(cardVariants({ tone }), "interactive-card", className)}
      href={indicator.actionHref}
      onClick={event => activateMapLink(event, indicator.actionHref)}
      data-indicator={indicator.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.24 }}
    >
      <header>
        <span className="status-icon"><Icon aria-hidden="true" /></span>
        <span>{title}</span>
        <small className="status-chip">{indicator.statusLabel || (indicator.quality?.status === 'catalog' ? 'Cadastro' : indicator.quality?.status === 'stale' ? 'Desatualizado' : statusLabels[tone])}</small>
      </header>
      <strong>{indicator.displayValue ?? visibleValue(indicator)}</strong>
      <p className="card-description">{indicator.description}</p>
      {indicator.facts?.length > 0 && <dl className="state-card-facts">{indicator.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
      <small className="card-source">{sourceLabel}: {indicator.source}</small>
      {(indicator.stamp || stampLabel) && <small className="card-source">{indicator.reference ? 'Referência' : 'Atualização'}: {indicator.stamp || stampLabel}</small>}
      {children}
      <span className="card-link" aria-hidden="true">
        {indicator.actionLabel}
        <ArrowRight aria-hidden="true" />
      </span>
    </motion.a>
  );
}
