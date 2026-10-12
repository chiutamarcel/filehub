import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreferredUsername } from '../../utils/AuthUtils';
import { fetchAuthenticated } from '../Auth.jsx';
import Cookies from 'js-cookie';
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import './index_header.css'

function Email() {

    const [userInfo, setUserInfo] = useState({
    email: '',
  });

  const navigate = useNavigate();

  const notify_error = (mess) => {
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
    };

  useEffect(() => {
    const fetchUserData = async () => {
      const jwt = Cookies.get('jwt');
      const username = getPreferredUsername(jwt);
      const backendUrl = import.meta.env.VITE_BACKEND_URL

      try {
        const response = await fetchAuthenticated(`${backendUrl}/users/${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }, navigate);

        if (response.ok) {
          const userData = await response.json();

          setUserInfo({
            email: userData.email,
          });
        } else {
          notify_error('Failed to load user data. Status:', response.status);
        }
      } catch (error) {
        notify_error(`Error loading user info: ${error.message}`);
      }
    };

    fetchUserData();
  }, [navigate]);

    return (
        <div className="w-full max-w-[420px] overflow-hidden">
          <ToastContainer></ToastContainer>
            <div 
                className="w-full h-[50px] pl-[10px] pr-[10px]
                border-2 border-transparent text-white text-lg font-mono text-center
                flex items-center justify-center
                transition-all ease-in duration-200
                hover:border-white hover:shadow-md rounded-full"
            >
                {userInfo.email}
            </div>
        </div>
    );
}

export default Email;
