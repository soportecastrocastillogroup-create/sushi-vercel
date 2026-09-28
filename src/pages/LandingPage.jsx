import { useOutletContext } from "react-router";
import HeroCarousel from "../components/site/HeroCarousel.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function LandingPage() {
  usePageTitle("Sushi Loncoche · Sushi en Loncoche y La Paz");
  const { site } = useOutletContext();
  return <HeroCarousel key={site.slides.map((s) => s.id).join()} slides={site.slides} />;
}
