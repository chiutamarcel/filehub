import React, { useState, useEffect, useRef } from 'react';
import { VscBellDot, VscBell } from "react-icons/vsc";
import { useNavigate } from "react-router-dom";
import "./index_header.css";
import Request from './Request';
import Cookies from "js-cookie";
import { getPreferredUsername } from "../../utils/AuthUtils.js";
import { fetchAuthenticated } from "../Auth";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  const dropdownRef = useRef(null); 

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
    const fetchRequests = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const jwt = Cookies.get("jwt");
        const username = getPreferredUsername(jwt);

        if (!username) {
          console.error("Failed to retrieve username from JWT");
          return;
        }

        const response = await fetchAuthenticated(
          `${backendUrl}/requests?userId=${username}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
          navigate
        );

        if (response.ok) {
          const data = await response.json();
          setList(data);
        } else {
          notify_error("Failed to load notifications. Status:", response.status);
        }
      } catch (error) {
        notify_error(`Error loading notifications: ${error.message}`);
      }
    };

    fetchRequests();
  }, []);

  const handleRequestHandled = (handledUserId, handledGroupId) => {
    setList((prevList) =>
      prevList.filter(
        (item) => !(item.userId === handledUserId && item.groupId === handledGroupId)
      )
    );
  };

  const handleClickOutside = (event) => {
    // Close the dropdown if clicking outside
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <ToastContainer></ToastContainer>
      <button
        className="text-orange-500 active:text-white hover:text-white"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {list.length > 0 ? <VscBellDot size={26} /> : <VscBell size={26} />}
      </button>

      {isOpen && (
        <div
          className="absolute top-10 left-0 rounded-lg p-4 w-80 z-10 overflow-y-auto max-h-96"
          style={{
            backgroundColor: "#2E2E2E",
            transform: "translateX(-50%)",
          }}
        >
          {list.length > 0 ? (
            list.map((item, i) => (
              <Request
                key={`${item.userId}-${item.groupId}`}
                username={item.userId}
                groupName={item.groupId}
                onRequestHandled={handleRequestHandled}
              />
            ))
          ) : (
            <p className="text-center text-gray-400">No notifications</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
