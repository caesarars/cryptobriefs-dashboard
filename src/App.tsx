import { NavLink, Route, Routes } from "react-router-dom";
import OverviewPage from "./pages/OverviewPage";
import NewsPage from "./pages/NewsPage";
import NewsletterPage from "./pages/NewsletterPage";
import AIBlogPage from "./pages/AIBlogPage";
import "./App.css";

function App() {
  return (
    <div className="dash">
      <aside className="sidebar">
        <div className="brand">CryptoBriefs Dashboard</div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Overview
          </NavLink>
          <NavLink to="/news" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            News
          </NavLink>
          <NavLink to="/newsletter" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            Newsletter
          </NavLink>
          <NavLink to="/ai-blog" className={({ isActive }) => (isActive ? "navItem active" : "navItem")}>
            AI Blog
          </NavLink>
        </nav>
        <div className="sidebarFoot">Vite + React + TS</div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/newsletter" element={<NewsletterPage />} />
          <Route path="/ai-blog" element={<AIBlogPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
