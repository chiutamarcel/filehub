import React, { useState, useEffect } from "react";
import "./Settings.css";
import Profile from "../../components/Profile/Profile";
import Statistics from "../../components/Statistics/Statistics";
import Cookies from "js-cookie";
import { getPreferredUsername } from "../../utils/AuthUtils";
import { fetchAuthenticated } from "../../components/Auth.jsx";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ConfirmModal = ({ isVisible, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">Confirm Deletion</h2>
        <p className="text-white mb-6">
          Are you sure you want to delete your profile picture?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ profileImage, setProfileImage }) => {
  const [showStatistics, setShowStatistics] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
  });
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const navigate = useNavigate();

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
    const fetchUserData = async () => {
      const jwt = Cookies.get("jwt");
      const username = getPreferredUsername(jwt);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      try {
        const response = await fetchAuthenticated(
          `${backendUrl}/users/${username}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
          navigate
        );

        if (response.ok) {
          const userData = await response.json();

          setUserInfo({
            username: username,
            email: userData.email,
          });
        } else {
          notify_error("Failed to load user data. Status:", response.status);
        }
      } catch (error) {
        notify_error(`Error loading user info: ${error.message}`);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const fetchProfilePicture = async () => {
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
            "Failed to upload profile picture. Status:",
            response.status
          );
        }
      } catch (error) {
        notify_error(`Error uploading profile picture: ${error.message}`);
      }
    };

    fetchProfilePicture();
  }, [navigate]);

  const handleTabSwitch = (tab) => {
    setShowStatistics(tab === "statistics");
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchAuthenticated(
        `${backendUrl}/users/${username}/profile-picture`,
        {
          method: "POST",
          body: formData,
        },
        navigate
      );

      if (response.ok) {
        const svgContent = await response.text();
        setProfileImage(svgContent);
        console.log("Profile picture uploaded successfully!");
      } else {
        console.error(
          "Failed to upload profile picture. Status:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
    }
  };

  const handleImageDelete = async () => {
    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await fetchAuthenticated(
        `${backendUrl}/users/${username}/profile-picture`,
        {
          method: "DELETE",
        },
        navigate
      );

      if (response.ok) {
        setProfileImage(null);
        console.log("Profile picture deleted successfully!");
      } else {
        console.error(
          "Failed to delete profile picture. Status:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
    } finally {
      setIsConfirmModalVisible(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('jwt', { secure: false, sameSite: 'Strict' });
    window.location.replace('/login');
  };

  return (
    <div className="profile-section scroll5">
      <ToastContainer></ToastContainer>
      <ConfirmModal
        isVisible={isConfirmModalVisible}
        onConfirm={handleImageDelete}
        onCancel={() => setIsConfirmModalVisible(false)}
      />
      <div className="header">
        <div className="profile-container" style={{ position: "relative" }}>
          <label htmlFor="image-upload" className="circle">
            {profileImage && profileImage.startsWith("<svg") ? (
              <div
                dangerouslySetInnerHTML={{ __html: profileImage }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <span>+</span>
            )}
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
          {profileImage && (
            <button
              onClick={() => setIsConfirmModalVisible(true)}
              style={{
                position: "absolute",
                top: "50%",
                right: "-30px",
                transform: "translateY(-50%)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Trash2
                size={24}
                className="text-red-500 hover:text-red-700"
                title="Delete Profile Picture"
              />
            </button>
          )}
        </div>
      </div>

      <div className="user-info">
        <h2>{userInfo.username || "Loading..."}</h2>
        <p>{userInfo.email || "Loading..."}</p>
      </div>

      <div className="tabs">
        <button
          className={!showStatistics ? "active" : ""}
          onClick={() => handleTabSwitch("profile")}
        >
          Edit profile
        </button>
        <div className="vertical-line"></div>
        <button
          className={showStatistics ? "active" : ""}
          onClick={() => handleTabSwitch("statistics")}
        >
          Statistics
        </button>
      </div>

      <hr className="line" />

      <div className="section">
        {!showStatistics ? <Profile /> : <Statistics />}
      </div>

      <button className="logout-button" onClick={handleLogout}>Log out</button>
    </div>
  );
};

export default Settings;
