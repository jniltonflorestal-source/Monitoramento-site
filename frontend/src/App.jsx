import { Helmet } from "react-helmet-async";
import { PhoneCall } from "lucide-react";
import { SituationDashboard } from "./components/dashboard/SituationDashboard";
import { EmergencyBanner } from "./components/layout/EmergencyBanner";

export default function App() {
  return (
    <>
      <Helmet>
        <title>Centro de Monitoramento da Defesa Civil do Tocantins</title>
        <meta
          name="description"
          content="Painel público com informações sobre chuva, rios, fogo, seca, alertas oficiais e situações de emergência no Tocantins."
        />
        <meta property="og:title" content="Centro de Monitoramento da Defesa Civil do Tocantins" />
        <meta
          property="og:description"
          content="Painel público para acompanhamento rápido de riscos, alertas e situação no Tocantins."
        />
        <meta
          property="og:image"
          content="https://jniltonflorestal-source.github.io/Monitoramento-site/assets/logo-centro.png"
        />
      </Helmet>
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Centro de Monitoramento da Defesa Civil do Tocantins">
          <img src={`${import.meta.env.BASE_URL}assets/logo-centro.png`} alt="" />
          <span>
            <strong>Centro de Monitoramento</strong>
            <small>Defesa Civil do Tocantins</small>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#situacao">Situação atual</a>
          <a href="#alertas">Alertas</a>
          <a href="#boletins">Boletins</a>
          <a href="#mapa-prioritario">Mapas e painéis</a>
        </nav>
        <div className="header-emergency" aria-label="Emergência: Defesa Civil 199 | Bombeiros 193">
          <PhoneCall aria-hidden="true" />
          <span>Emergência:</span>
          <a href="tel:199">Defesa Civil 199</a>
          <a href="tel:193">Bombeiros 193</a>
        </div>
      </header>
      <main>
        <SituationDashboard />
      </main>
      <footer>
        <strong>Centro de Monitoramento da Defesa Civil do Tocantins</strong>
        <span>Dados, mapas e alertas para apoio à proteção e defesa civil.</span>
        <nav aria-label="Links do rodapé">
          <a href="#boletins">Boletins</a>
          <a href="#mapa-prioritario">Mapas</a>
          <a href="#alertas">Alertas</a>
        </nav>
      </footer>
      <EmergencyBanner />
    </>
  );
}
