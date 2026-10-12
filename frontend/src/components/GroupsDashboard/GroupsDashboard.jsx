import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPreferredUsername } from "../../utils/AuthUtils.js";
import { Trash2 } from "lucide-react";
import { fetchAuthenticated } from "../Auth.jsx";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUserRoles } from "../../utils/AuthUtils.js";

import { Crown, User } from "lucide-react";

const GroupCard = ({ groupName, members }) => {
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleView = () => {
    navigate("/group_details", { state: { groupName } });
  };

  return (
    <div className="mt-3 h-auto bg-black border border-myOrange rounded-2xl p-4 w-[90%] sm:w-[80%] lg:w-[60%] xl:w-[70%] relative">
      <div className="flex justify-between items-center">
        {/* Group Name */}
        <h3
          className="ml-8 w-3/4 text-black font-bold text-center bg-myOrange py-2 rounded-2xl cursor-pointer"
          onClick={handleView}
        >
          {groupName}
        </h3>
      </div>

      {/* Members List */}
      <ul className="mt-4 space-y-2">
        {members.length > 0 ? (
          members.map((member, index) => (
            <li key={index} className="flex items-center space-x-2">
              <div className="w-8 h-6 ml-16 rounded-full bg-gray-600 flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <span className="text-white w-full">{member}</span>
            </li>
          ))
        ) : (
          <li className="text-gray-400 text-center">No members</li>
        )}
      </ul>
    </div>
  );
};

const GroupsGrid = ({ groups, onView }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8 max-h-[70vh] overflow-y-auto scrollbar-custom">
      {groups.map((group) => (
        <GroupCard
          key={group.name}
          groupName={group.name}
          members={group.members}
          onView={onView}
        />
      ))}
    </div>
  );
};

const GroupsDashboard = () => {
  const [groups, setGroups] = useState([]);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const navigate = useNavigate();

  const notify_success = (mess) => {
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
  };

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
  const fetchGroups = async () => {
    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);
    const roles = getUserRoles(jwt);

    const isAdmin = roles.includes("admin") || roles.includes("filehub_admin");

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const url = isAdmin
        ? `${backend_url}/group`
        : `${backend_url}/group?username=${username}`;

      const response = await fetchAuthenticated(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        const groupsData = await response.json();
        setGroups(groupsData);
        console.log("Groups loaded:", groupsData);
      } else {
        notify_error(`Failed to fetch groups. Status: ${response.status}`);
      }
    } catch (error) {
      notify_error(`Error fetching groups: ${error.message}`);
    }
  };

  fetchGroups();
}, []);

const handleCreateGroup = async (e) => {
  e.preventDefault();

  const jwt = Cookies.get("jwt");
  const username = getPreferredUsername(jwt);
  const roles = getUserRoles(jwt);
  const isAdmin = roles.includes("admin") || roles.includes("filehub_admin");

  try {
    const backend_url = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      "Content-Type": "application/json",
    };

    if (!isAdmin) {
      headers.username = username;
    }

    const response = await fetchAuthenticated(
      `${backend_url}/group`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newGroupName }),
      },
      navigate
    );

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const createdGroup = await response.json();
        createdGroup.members = createdGroup.members || [];
        setGroups((prevGroups) => [...prevGroups, createdGroup]);
        setNewGroupName("");
        setIsCreateGroupOpen(false);
        notify_success("Group created successfully!");
      } else {
        notify_error("Unexpected response format");
      }
    } else {
      const errorText = await response.text();
      notify_error("Error creating group:", errorText);
    }
  } catch (error) {
    const errorMessage = error.message
    notify_error(`Error creating group: ${errorMessage}`);
  }
}; 


  const handleViewGroup = (groupName) => {
    console.log("View group details:", groupName);
  };

  return (
    <div className="bg-black mt-10 sm:mt-0 h-[95%] rounded-3xl w-[400px] md:w-full h-[95%] p-8">
      <ToastContainer></ToastContainer>
      <div className="text-white text-2xl mb-6 flex justify-between items-center">
        <span>All Groups</span>
        <button
          type="button"
          className="px-4 py-2 bg-orange-500 text-white rounded-2xl hover:bg-orange-700 active:bg-orange-900"
          onClick={() => setIsCreateGroupOpen(true)}
        >
          Create Group
        </button>
      </div>

      <GroupsGrid groups={groups} onView={handleViewGroup} />

      {/* Create Group Modal */}
      {isCreateGroupOpen && (
        <Dialog
          open={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
            <DialogPanel className="max-w-lg rounded-lg bg-gray-800 p-6 text-white shadow-lg">
              <DialogTitle className="text-lg font-bold text-white mb-4">
                Create Group
              </DialogTitle>
              <form onSubmit={handleCreateGroup}>
                <div className="flex flex-col gap-4">
                  <label htmlFor="groupName" className="text-white font-medium">
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => { 
                      const pattern = new RegExp("^[a-z0-9]+$");
                      const value = e.target.value;

                      if (!pattern.test(value) && value) {
                        notify_error("Group name should contain only digits and lowercase letter.");
                        return;
                      }

                      setNewGroupName(e.target.value) 

                    }}
                    className="bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring focus:ring-orange-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                    onClick={() => setIsCreateGroupOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default GroupsDashboard;
