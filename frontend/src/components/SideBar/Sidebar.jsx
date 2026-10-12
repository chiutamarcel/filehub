import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import SidebarButton from "./SidebarButton.jsx";
import {
  File,
  Files,
  Users,
  Settings,
  Trash2,
  Menu,
  X,
  Crown,
} from "lucide-react";
import { getUserRoles, getPreferredUsername } from "../../utils/AuthUtils";
import { fetchAuthenticated } from "../Auth.jsx";
import { useNavigate } from "react-router-dom";

function SideBar({ isOpen, onClose }) {
  const jwt = Cookies.get("jwt");
  const roles = getUserRoles(jwt);
  const isAdmin = roles.includes("filehub_admin");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [recents, setRecents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const username = getPreferredUsername(jwt);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        const backend_url = import.meta.env.VITE_BACKEND_URL;

        const response = await fetchAuthenticated(
          `${backend_url}/files/recents/${username}`,
          {
            method: "GET",
          },
          navigate
        );

        if (response.ok) {
          const data = await response.json();
          const recentFiles = data.map((file) => {
            const parts = file.objectName.split("/");
            return {
              ...file,
              displayName: parts[parts.length - 1],
            };
          });
          setRecents(recentFiles);
        } else {
          console.error("Failed to fetch recent files:", response.status);
        }
      } catch (error) {
        console.error("Error fetching recent files:", error);
      }
    };

    fetchRecents();
  }, []);

  return (
    <div className="relative">
      {/* Backdrop for smaller screens */}
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 transition-opacity duration-300 ease-in-out"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      {(isOpen || isDesktop) && (
        <div
          className={`fixed md:static top-0 left-0 h-[95%%] md:h-[95%] w-[220px] bg-black rounded-3xl p-4 ml-2.5 z-20 transition-all duration-500 ease-in-out ${
            isOpen || isDesktop ? 'translate-y-0' : '-translate-y-[100%] md:translate-y-0'
          }`}
        >
          {!isDesktop && (
            <button
              className="fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 text-white bg-black rounded-full shadow-lg"
              onClick={isOpen ? onClose : undefined}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}

          {/* Buttons Section */}
          <ul className="list-none p-0 m-0 text-white space-y-1 mt-[10px]">
            {/* Admin Buttons */}
            {isAdmin ? (
              <>
                <SidebarButton
                  Icon={Crown}
                  text="Admin"
                  size={32}
                  to="/admin"
                />
                <SidebarButton
                  Icon={Files}
                  text="Files"
                  size={32}
                  to="/myfiles"
                />
                <SidebarButton
                  Icon={Users}
                  text="Groups"
                  size={32}
                  to="/groups"
                />
                <SidebarButton
                  Icon={Users}
                  text="Users"
                  size={32}
                  to="/users"
                />
                <SidebarButton
                  Icon={Trash2}
                  text="Trash"
                  size={32}
                  to="/trash"
                />
              </>
            ) : (
              <>
                {/* User Buttons */}
                <SidebarButton
                  Icon={Files}
                  text="My Files"
                  size={32}
                  to="/myfiles"
                />
                <SidebarButton
                  Icon={Users}
                  text="Groups"
                  size={32}
                  to="/groups"
                />
                <SidebarButton
                  Icon={Trash2}
                  text="Trash"
                  size={32}
                  to="/trash"
                />
                <SidebarButton
                  Icon={Settings}
                  text="Settings"
                  size={32}
                  to="/settings"
                />
              </>
            )}
          </ul>

          {/* Separator Line */}
          <div className="w-full h-[2px] bg-orange-500 my-4"></div>

          <div className="text-white w-full">
            <h2 className="text-lg font-semibold mb-2">Recents</h2>
            <ul className="list-none space-y-2">
              {recents.map((file) => (
                <li key={file.objectName} className="recents-item">
                  <File className="recents-icon text-orange-500" />
                  <span className="recents-text">{file.displayName}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default SideBar;
