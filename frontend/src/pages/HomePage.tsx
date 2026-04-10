import { HomeHero } from "../components/home/HomeHero";
import { JourneyStats } from "../components/home/JourneyStats";
import { JourneyMapPreview } from "../components/home/JourneyMapPreview";
import { RecentMemories } from "../components/home/RecentMemories";
import { FavoritePlaces } from "../components/home/FavoritePlaces";
import { CommuteInsightsPreview } from "../components/home/CommuteInsightsPreview";

import type { Trip, Place, MapFeature } from "../types";

type HomePageProps = {
  trips: Trip[];
  places: Place[];
  features: MapFeature[];
};

export function HomePage({ trips, places, features }: HomePageProps) {
  const totalTrips = trips.length;
  const totalPlaces = places.length;
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance_km ?? 0), 0);

  const uniqueCities = new Set(
    trips
      .map((trip) => trip.city)
      .filter(Boolean)
  ).size;

  const favoritePlaces = places.slice(0, 3);
  const recentTrips = trips.slice(0, 3);
  const commuteInsights = features.slice(0, 4);

  return (
    <div className="min-h-screen bg-page-grid px-4 py-5 text-slate-100 md:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        {/* <HomeHero /> */}

        {/* <JourneyStats
          totalTrips={totalTrips}
          totalPlaces={totalPlaces}
          totalDistance={totalDistance}
          totalCities={uniqueCities}
        /> */}

        <JourneyMapPreview trips={trips} places={places} />

        {/* <div className="grid gap-6 lg:grid-cols-2">
          <RecentMemories trips={recentTrips} />
          <FavoritePlaces places={favoritePlaces} />
        </div>

        <CommuteInsightsPreview features={commuteInsights} /> */}
      </div>
    </div>
  );
}