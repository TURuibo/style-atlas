import { useEffect } from 'react'
import { HashRouter, Outlet, Route, Routes, useLocation } from 'react-router'
import { TabBar } from './components/TabBar'
import { BlindPage } from './features/blind/BlindPage'
import { DataPage } from './features/data/DataPage'
import { ExplorePage } from './features/explore/ExplorePage'
import { EraPage, RegionPage } from './features/explore/FilteredList'
import { AboutPage } from './features/me/AboutPage'
import { InstallGuide } from './features/me/InstallGuide'
import { MePage } from './features/me/MePage'
import { NotFound } from './features/NotFound'
import { StylePage } from './features/style/StylePage'
import { ChapterPage } from './features/tour/ChapterPage'
import { TourHome } from './features/tour/TourHome'
import { useUserStore } from './store/userStore'

function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <>
      <main>
        <Outlet />
      </main>
      <TabBar />
    </>
  )
}

export default function App() {
  const init = useUserStore((s) => s.init)
  useEffect(() => {
    void init()
  }, [init])

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TourHome />} />
          <Route path="tour/:familyId" element={<ChapterPage />} />
          <Route path="style/:styleId" element={<StylePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="explore/region/:regionId" element={<RegionPage />} />
          <Route path="explore/era/:eraId" element={<EraPage />} />
          <Route path="blind" element={<BlindPage />} />
          <Route path="me" element={<MePage />} />
          <Route path="me/data" element={<DataPage />} />
          <Route path="me/install" element={<InstallGuide />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
