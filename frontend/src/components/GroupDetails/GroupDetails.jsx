import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Crown, UserMinus } from "lucide-react";
import Cookies from "js-cookie";
import { fetchAuthenticated } from "../Auth";
import MyFiles from "../MyFiles/MyFiles";
import { useTab } from "../../TabContext";
import { getPreferredUsername, getUserRoles } from "../../utils/AuthUtils.js";
import "./GroupDetails.css";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TrashPage from "../TrashPage/TrashPage.jsx"

const ConfirmModal = ({ isVisible, onConfirm, onCancel, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">Confirmation</h2>
        <p className="text-white mb-6">{message}</p>
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

const GroupDetails = ({ searchResults, onResetSearchForGroup }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupName } = location.state || { groupName: "Test Group" };

  const creationDate = new Date("2024-12-15").toLocaleDateString();
  const { activeTab, setActiveTab } = useTab();
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState("");
  const [isKickConfirmModalVisible, setIsKickConfirmModalVisible] =
    useState(false);
  const [isDeleteGroupModalVisible, setIsDeleteGroupModalVisible] =
    useState(false);
  const [isLeaveGroupModalVisible, setIsLeaveGroupModalVisible] =
    useState(false);
  const [memberToKick, setMemberToKick] = useState(null);
  const [currentUser, setCurrentUser] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);
    setCurrentUser(username);

    const roles = getUserRoles(jwt);
    setIsAdmin(roles.includes("admin") || roles.includes("filehub_admin"));

    const fetchGroupMembers = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(
          `${backendUrl}/group/${groupName}`,
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
          const leader = data.leader;

          setIsLeader(username === leader);

          const sortedMembers = data.members
            .map((member) => ({
              name: member,
              isLeader: member === leader,
            }))
            .sort((a, b) => (a.isLeader ? -1 : b.isLeader ? 1 : 0));

          setMembers(sortedMembers);
        } else {
          notify_error("Failed to load group members:", response.status);
        }
      } catch (error) {
        const errorMessage = error.message
        notify_error(`Error loading group members: ${errorMessage}`);
      }
    };

    fetchGroupMembers();
  }, []);

  const handleKickMember = (member, event) => {
    event.stopPropagation();
    setMemberToKick(member);
    setIsKickConfirmModalVisible(true);
  };

  const confirmKickMember = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backendUrl}/group/${groupName}/users/${memberToKick.name}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        setMembers((prevMembers) =>
          prevMembers.filter((m) => m.name !== memberToKick.name)
        );
        console.log(`Member ${memberToKick.name} removed successfully.`);
      } else {
        console.error("Failed to kick member:", response.status);
      }
    } catch (error) {
      console.error("Error kicking member:", error);
    }

    setIsKickConfirmModalVisible(false);
    setMemberToKick(null);
  };

  const cancelKickMember = () => {
    setIsKickConfirmModalVisible(false);
    setMemberToKick(null);
  };

  const handleDeleteGroup = () => {
    setIsDeleteGroupModalVisible(true);
  };

  const confirmDeleteGroup = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backendUrl}/group/${groupName}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        navigate("/groups");
        notify_success(`Group ${groupName} deleted successfully.`);
      } else {
        console.error("Failed to delete group:", response.status);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }

    setIsDeleteGroupModalVisible(false);
  };

  const cancelDeleteGroup = () => {
    setIsDeleteGroupModalVisible(false);
  };

  const handleLeaveGroup = () => {
    setIsLeaveGroupModalVisible(true);
  };

  const confirmLeaveGroup = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backendUrl}/group/${groupName}/users/${currentUser}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        console.log(`${currentUser} left the group successfully.`);
        navigate("/groups");
      } else {
        console.error("Failed to leave group:", response.status);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    }

    setIsLeaveGroupModalVisible(false);
  };

  const cancelLeaveGroup = () => {
    setIsLeaveGroupModalVisible(false);
  };

  const handleAddMember = async (event) => {
    event.stopPropagation();

    if (newMember.trim()) {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(
          `${backendUrl}/requests`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              groupId: groupName,
              userId: newMember.trim(),
            }),
          },
          navigate
        );

        if (response.ok) {
          notify_success("Group invitation sent successfully.");
        } else {
          const errorMessage = await response.text();
          notify_error(errorMessage);
        }
      } catch (error) {
        notify_error("Error sending the invitation:", error);
      }
    }
  };

  const handleChangeLeader = async (newLeaderUsername) => {
    if (!newLeaderUsername) {
      notify_error("Please select a valid user to make the new leader.");
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backendUrl}/group/${groupName}/leader`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            username: newLeaderUsername,
          },
        },
        navigate
      );

      if (response.ok) {
        notify_success(`${newLeaderUsername} is now the leader of the group.`);
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            member.name === newLeaderUsername
              ? { ...member, isLeader: true }
              : { ...member, isLeader: false }
          )
        );
        setIsLeader(currentUser === newLeaderUsername);
      } else {
        const errorMessage = await response.text();
        notify_error(errorMessage);
      }
    } catch (error) {
      notify_error("Error changing group leader:", error.message);
    }
  };


  return (
    <div className="bg-black mt-10 sm:mt-0 h-[95%] rounded-3xl w-[400px] md:w-full h-[95%] p-8 overflow-hidden">
      <ToastContainer></ToastContainer>
      <h1 className="text-3xl font-bold mb-2 text-white">{groupName}</h1>

      <div className="tabs flex items-center justify-between border-b border-orange-500 mb-6">
        <div className="flex space-x-4">
          <button
            className="text-white px-4 py-2 rounded-lg hover:text-orange-400"
            onClick={() => setActiveTab("members")}
          >
            Members List
          </button>
          <button
            className="text-white px-4 py-2 rounded-lg hover:text-orange-400"
            onClick={() => setActiveTab("files")}
          >
            Files List
          </button>
          <button
              className="text-white px-4 py-2 rounded-lg hover:text-red-600"
              onClick={() => setActiveTab("trash")}
            >
              Trash
            </button>
        </div>
        {isLeader || isAdmin ? (
          <button
            onClick={handleDeleteGroup}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Delete Group
          </button>
        ) : (
          <button
            onClick={handleLeaveGroup}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Leave Group
          </button>
        )}
      </div>

      <div className="tab-content flex-grow w-full  overflow-y-auto scroll2">
        {activeTab === "members" && (
          <>
            <div className="flex mb-6">
              <input
                type="text"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Enter user name"
                className="bg-black/20 text-white px-4 py-2 rounded-l-lg flex-grow border border-orange-500 focus:border-orange-400 hover:bg-orange-900/20 transition-all"
              />
              <button
                onClick={handleAddMember}
                className="bg-orange-500 text-white px-4 py-2 rounded-r-lg hover:bg-orange-600 flex items-center gap-2 ml-2"
              >
                <Plus size={16} /> Invite
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4 text-orange-500 text-sm border-b border-orange-500 pb-2">
              <div className="col-span-6">Member Name</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3">Actions</div>
            </div>

            <div className="mt-4">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-4 text-white text-sm py-4 px-3 rounded-xl border border-orange-500 bg-black/20 hover:bg-orange-900/20 transition-all my-2 relative"
                >
                  <div className="col-span-6 flex items-center gap-2">
                    <span>{member.name}</span>
                    {member.isLeader && (
                      <Crown size={16} className="text-yellow-400 ml-2" />
                    )}
                  </div>
                  <div className="col-span-3 flex items-center">
                    {member.isLeader ? "Leader" : "Member"}
                  </div>
                  {((isLeader && !member.isLeader) || isAdmin) && (
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      {(isAdmin && !member.isLeader) && (
                        <button
                          onClick={() => handleChangeLeader(member.name)}
                          className="p-2 bg-gray-600 hover:bg-gray-500 text-yellow-400 rounded-full"
                        >
                          <Crown size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleKickMember(member, e)}
                        className="p-2 bg-gray-600 hover:bg-gray-500 text-red-500 rounded-full"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {activeTab === "files" &&(
          <div className="w-full h-full">
            <MyFiles
              bucketName={`group-${groupName}`}
              searchResults={searchResults}
              onResetSearch={onResetSearchForGroup}
            />
          </div>
        )}
        {activeTab === "trash" && (
          <div className="w-full h-full">
            <TrashPage bucketName={`group-${groupName}`} />
          </div>
        )}
      </div>

      <ConfirmModal
        isVisible={isKickConfirmModalVisible}
        onConfirm={confirmKickMember}
        onCancel={cancelKickMember}
        message={`Are you sure you want to kick "${memberToKick?.name}" from the group?`}
      />

      <ConfirmModal
        isVisible={isDeleteGroupModalVisible}
        onConfirm={confirmDeleteGroup}
        onCancel={cancelDeleteGroup}
        message={`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`}
      />

      <ConfirmModal
        isVisible={isLeaveGroupModalVisible}
        onConfirm={confirmLeaveGroup}
        onCancel={cancelLeaveGroup}
        message={`Are you sure you want to leave the group "${groupName}"?`}
      />
    </div>
  );
};

export default GroupDetails;
