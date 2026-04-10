import { useQuery } from "@tanstack/react-query";

import { api } from "./lib/api";
import { HomePage } from "./pages/HomePage";
import { ErrorState, LoadingState } from "./components/ui";

function App() {
  const stateQuery = useQuery({ queryKey: ["state"], queryFn: api.getState });
  const placesQuery = useQuery({ queryKey: ["places"], queryFn: api.getPlaces });
  const tripsQuery = useQuery({ queryKey: ["trips"], queryFn: api.getTrips });

  if (stateQuery.isLoading || placesQuery.isLoading || tripsQuery.isLoading) {
    return <LoadingState />;
  }

  if (stateQuery.isError || placesQuery.isError || tripsQuery.isError) {
    return <ErrorState />;
  }

  const state = stateQuery.data;
  const places = placesQuery.data ?? [];
  const trips = tripsQuery.data ?? [];

  if (!state) {
    return <ErrorState />;
  }

  return (
    <HomePage
      trips={trips}
      places={places}
      features={state.features}
    />
  );
}

export default App;