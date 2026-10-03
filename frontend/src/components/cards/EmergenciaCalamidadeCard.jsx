import { Landmark } from "lucide-react";
import { StatusCard } from "./StatusCard";

export function EmergenciaCalamidadeCard({ data }) {
  return (
    <StatusCard icon={Landmark} title="Emergência e calamidade" indicator={data}>
      {data.state === "ready" && (
        <dl className="administrative-list">
          <div><dt>Emergência</dt><dd>{data.se ?? 'Não informado'}</dd></div>
          <div><dt>Calamidade</dt><dd>{data.ecp ?? 'Não informado'}</dd></div>
          <div><dt>Federal</dt><dd>{data.federal}</dd></div>
        </dl>
      )}
    </StatusCard>
  );
}
