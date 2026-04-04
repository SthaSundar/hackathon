import { Suspense } from "react";
import Hero from "@/components/hero";
import ServiceCategories from "@/components/service-categories";
import FeaturedServices from "@/components/featured-services";
import HowItWorks from "@/components/how-it-works";
import Loading from "@/components/loading";
import Navigation from "@/components/navigation"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero/>
      <Suspense fallback={<Loading />}>
        <ServiceCategories />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <FeaturedServices />
      </Suspense>
      <HowItWorks />
    </main>
  );
}
