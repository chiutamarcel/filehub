import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Menu } from 'lucide-react';

import "./index.css";
import "./App.css";

import Topbar from "./components/Topbar/Topbar.jsx";
import Sidebar from "./components/SideBar/Sidebar.jsx";
import UserManagement from "./components/UserManagement/UserManagement.jsx"
import Settings from "./pages/Settings/Settings";
import Profile from "./components/Profile/Profile";
import Login from "./components/Login/Login.jsx";
import Register from "./components/Register/Register.jsx";
import GroupsDashboard from "./components/GroupsDashboard/GroupsDashboard.jsx";
import MyFiles from "./components/MyFiles/MyFiles.jsx";
import Admin from "./components/Admin/Admin.jsx";
import TrashPage from "./components/TrashPage/TrashPage.jsx"
import GroupDetails from "./components/GroupDetails/GroupDetails";
import Request from "./components/Topbar/Request.jsx";
import PrivateRoute from "./PrivateRoute.jsx";
import { TabProvider } from "./TabContext";

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false); // State to control sidebar visibility
  const [searchResults, setSearchResults] = useState(null);
  const [searchResultsForGroup, setSearchResultsForGroup] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  const resetSearchResults = () => {
    setSearchResults(null);
  };

  const resetSearchResultsForGroup = () => {
    setSearchResultsForGroup(null);
  };

  const handleSearchResults = (results, target) => {
    if (target === "myfiles") {
      setSearchResults(results);
    } else if (target === "groupdetails") {
      setSearchResultsForGroup(results);
    }
  };
  const createParticles = (event) => {
    const x = event.clientX;
    const y = event.clientY;
    const colors = ["#ffa500", "#ff4500", "#ff8c00", "#ff6347", "#ffd700"];

    for (let i = 0; i < 25; i++) {
      const particle = document.createElement("div");
      particle.className = "absolute w-2 h-2 rounded-full";
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      let px = x;
      let py = y;
      let scale = 1;

      const animate = () => {
        px += vx;
        py += vy;
        scale -= 0.02;
        particle.style.transform = `translate(${px - x}px, ${py - y}px) scale(${Math.max(scale, 0)})`;
        particle.style.opacity = Math.max(0, 1 - Math.hypot(px - x, py - y) / 200);
        if (Math.hypot(px - x, py - y) < 200 && scale > 0) {
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };

      document.body.appendChild(particle);
      requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      createParticles(e);
    };

    document.addEventListener("click", handleGlobalClick);

    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Componenta Layout
  const Layout = ({ children }) => {
    const location = useLocation();
    const noLayoutPaths = ["/login", "/register"];

    const hideLayout = noLayoutPaths.includes(location.pathname);

    // Toggle sidebar visibility
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {!hideLayout && (
          <Topbar profileImage={profileImage} onSearchResults={handleSearchResults} className="h-16" />
        )}
        <div className={`flex flex-1 ${hideLayout ? '' : 'p-4'}`}>
          {/* Hamburger Menu Button (Always Visible on mobile) */}
          {!hideLayout && !isSidebarOpen && (
            <button
              className="md:hidden absolute top-4 left-4 z-30 text-white p-2 rounded-md mt-[30px] ml-[125px]"
              onClick={toggleSidebar}
            >
              <Menu size={32} />
            </button>
          )}

          {/* Sidebar */}
          {!hideLayout && (
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)} // Close sidebar when needed
            />
          )}

          {/* Main Content */}
          <main className={`flex-1 ${!hideLayout ? 'lg:pl-4' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    );
  };

  return (
    <TabProvider>
      <div id="root" className="app-container">
        <Router>
          <Routes>
            {/* Routes without Layout */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Routes with Layout */}
            <Route
              path="*"
              element={
                <Layout>
                  <Routes>
                    <Route
                      path="/myfiles"
                      element={
                        <PrivateRoute
                          Component={() => (
                            <MyFiles
                              searchResults={searchResults}
                              onResetSearch={resetSearchResults}
                            />
                          )}
                        />
                      }
                    />
                    <Route
                      path="/profile"
                      element={<PrivateRoute Component={Profile} />}
                    />
                    <Route
                      path="/settings"
                      element={
                        <PrivateRoute
                          Component={() => (
                            <Settings profileImage={profileImage} setProfileImage={setProfileImage} />
                          )}
                        />
                      }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/trash" element={<TrashPage />} />
                    <Route
                      path="/home"
                      element={<PrivateRoute Component={MyFiles} />}
                    />
                    <Route
                      path="/admin"
                      element={<PrivateRoute Component={Admin} />}
                    />
                    <Route
                      path="/groups"
                      element={<PrivateRoute Component={GroupsDashboard} />}
                    />
                    <Route
                      path="/group_details"
                      element={
                        <PrivateRoute
                          Component={() => (
                            <GroupDetails
                              searchResults={searchResultsForGroup}
                              onResetSearchForGroup={resetSearchResultsForGroup}
                            />
                          )}
                        />
                      }
                    />
                  </Routes>
                </Layout>
              }
            />
          </Routes>
        </Router>
      </div>
    </TabProvider>
  );
}

export default App;
