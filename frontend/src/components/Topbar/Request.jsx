import React from 'react';
import "./index_header.css";
import { fetchAuthenticated } from '../Auth';
import { useNavigate } from "react-router-dom";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Request = ({ groupName, username, onRequestHandled }) => {

  const navigate = useNavigate();

  const notify_success = (mess) =>
    {
      toast.success(mess, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
        });
    }

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
  
  const handleAccept = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      // Add user to group
      const response = await fetchAuthenticated(
        `${backendUrl}/group/${groupName}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        }, navigate
      );

      if (response.ok) {
        notify_success(`User added to the group ${groupName} successfully`);

        // Delete request from the database
        const deleteResponse = await fetchAuthenticated(
          `${backendUrl}/requests?userId=${username}&groupId=${groupName}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }, navigate
        );

        if (deleteResponse.ok) {
          console.log("Request deleted from the database successfully.");
          // Notify parent component to remove request from UI
          if (onRequestHandled) {
            onRequestHandled(username, groupName);
          }
        } else {
          console.error("Failed to delete request. Status:", deleteResponse.status);
        }
      } else {
        notify_error("Failed to add user to the group. Status:", response.status);
      }
    } catch (error) {
      notify_error(`Error processing request: ${error.message}`);
    }
  };

  const handleDecline = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      // Delete request from the database
      const deleteResponse = await fetchAuthenticated(
        `${backendUrl}/requests?userId=${username}&groupId=${groupName}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }, navigate
      );

      if (deleteResponse.ok) {
        console.log("Request deleted from the database successfully.");
        // Notify parent component to remove request from UI
        if (onRequestHandled) {
          onRequestHandled(username, groupName);
        }
      } else {
        notify_error("Failed to delete request. Status:", deleteResponse.status);
      }
    } catch (error) {
      notify_error(`Error declining request: ${error.message}`);
    }
  };

  return (
    <div className="overflow-hidden bg-black p-4 rounded-lg border border-gray-700 flex flex-col items-center text-center mb-2">
      <ToastContainer></ToastContainer>
      <p className="text-white mb-4">Want to join {groupName}?</p>
      <div className="flex gap-4">
        <button
          onClick={handleAccept}
          className="bg-green-500 hover:bg-green-300 text-white px-4 py-2 rounded"
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          className="bg-red-500 hover:bg-red-300 text-white px-4 py-2 rounded"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default Request;
