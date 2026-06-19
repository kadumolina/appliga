import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Players from './pages/Players';
import Rankings from './pages/Rankings';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import PlayerDetails from './pages/PlayerDetails';
import { AppProvider } from './store/AppContext';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={<PlayerDetails />} />
            <Route path="rankings" element={<Rankings />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="tournaments/:id" element={<TournamentDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
