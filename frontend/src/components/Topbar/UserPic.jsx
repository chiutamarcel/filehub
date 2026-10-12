import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { User } from "lucide-react";
import { getPreferredUsername } from "../../utils/AuthUtils";
import { fetchAuthenticated } from "../../components/Auth.jsx";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Email from "./Email.jsx";
import LogOutButton from "./LogOutButton.jsx";
import AccountButton from "./AccountButton.jsx";
import "./index_header.css";

function UserPic({ profileImage: propProfileImage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const notify_error = (mess) =>
    {
      toast.error(mess, {
        position: "top-right",
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
        });
    }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (propProfileImage) {
        setProfileImage(propProfileImage);
        return;
      }

      const jwt = Cookies.get("jwt");
      const username = getPreferredUsername(jwt);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      try {
        const response = await fetchAuthenticated(
          `${backendUrl}/users/${username}/profile-picture`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
          navigate
        );

        if (response.ok) {
          const svgContent = await response.text();
          setProfileImage(svgContent);
        } else if (response.status === 404) {
         console.log("No profile picture found.");
        } else {
          notify_error(
            "Failed to fetch profile picture. Status:",
            response.status
          );
        }
      } catch (error) {
        notify_error(`Error fetching profile picture: ${error.message}`);
      }
    };

    fetchProfilePicture();
  }, [propProfileImage]);

  return (
    <div className="relative inline-block">
      <ToastContainer></ToastContainer>
      <div
        className="w-24 h-24 bg-white rounded-full text-black cursor-pointer flex items-center justify-center overflow-hidden"
        onClick={toggleDropdown}
      >
        {/* Afișăm SVG-ul sau fallback */}
        {profileImage && profileImage.startsWith("<svg") ? (
          <div
            dangerouslySetInnerHTML={{ __html: profileImage }}
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <User size={48} className="text-black" />
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 min-w-[450px] bg-[#484748] rounded-2xl shadow-lg z-10 flex flex-col items-center py-4"
        >
          <div className="text-center mb-2">
            <Email />
          </div>

          <div className="flex justify-center gap-1">
            <Link to="/">
              <LogOutButton Option="rounded-l-full" />
            </Link>
            <Link to="/settings">
              <AccountButton Option="rounded-r-full" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPic;
