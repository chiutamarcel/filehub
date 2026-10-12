import React, { useState, useEffect } from "react";
import { Edit, Eye, Trash, UserPlus } from "lucide-react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthenticated } from "../Auth.jsx";
import { useNavigate } from "react-router-dom";
import "./UserManagement.css";

const notify_success = (message) => {
  toast.success(message, {
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

const notify_error = (message) => {
  toast.error(message, {
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

const AddUserModal = ({ isVisible, onClose, onSave, navigate }) => {
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "",
    role: "filehub_user",
    birthdate: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    const backend_url = import.meta.env.VITE_BACKEND_URL;

    const payload = {
      ...userData,
      profilePic: "http://example.com/path/to/profile-pic.jpg",
      storageId: 456,
    };

    try {
      const response = await fetchAuthenticated(
        `${backend_url}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        navigate
      );

      if (response.ok) {
        notify_success("User added successfully!");
        onSave(userData);
        onClose();
      } else {
        const errorText = await response.text();
        notify_error(`Failed to add user: ${errorText}`);
      }
    } catch (error) {
      notify_error(`Error adding user: ${error.message}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">Add New User</h2>
        <div className="text-white space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={userData.password}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            >
              <option value="filehub_admin">filehub_admin</option>
              <option value="filehub_user">filehub_user</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Birthdate</label>
            <input
              type="date"
              name="birthdate"
              value={userData.birthdate}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-400"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

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

const UserDetailsModal = ({ isVisible, userDetails, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">User Details</h2>
        <div className="text-white space-y-2">
          <p>
            <strong>Username:</strong> {userDetails.username}
          </p>
          <p>
            <strong>Email:</strong> {userDetails.email}
          </p>
          <p>
            <strong>Role:</strong> {userDetails.role}
          </p>
          <p>
            <strong>Birthdate:</strong> {userDetails.birthdate}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(parseInt(userDetails.createdAt)).toLocaleDateString()}
          </p>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({
  isVisible,
  userDetails,
  onClose,
  onSave,
  navigate,
}) => {
  const [userData, setUserData] = useState({ ...userDetails });

  useEffect(() => {
    setUserData({ ...userDetails });
  }, [userDetails]);

  if (!isVisible) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    const { username, password, role, birthdate } = userData;
    const backend_url = import.meta.env.VITE_BACKEND_URL;

    const payload = {
      role,
      birthdate,
    };

    if (password && password.trim() !== "" && password !== "you wish") {
      payload.password = password;
    }

    console.log(payload);

    try {
      const response = await fetchAuthenticated(
        `${backend_url}/users/${username}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        navigate
      );

      if (response.ok) {
        notify_success("User updated successfully!");
        onSave(userData);
        onClose();
      } else {
        const errorText = await response.text();
        notify_error(`Failed to update user: ${errorText}`);
      }
    } catch (error) {
      notify_error(`Error updating user: ${error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold text-white mb-4">Edit User</h2>
        <div className="text-white space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={userData.username}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
              disabled
            />
          </div>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={userData.email}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
              disabled
            />
          </div>
          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={userData.role}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            >
              <option value="filehub_admin">filehub_admin</option>
              <option value="filehub_user">filehub_user</option>
            </select>
          </div>
          {/* Birthdate */}
          <div>
            <label className="block text-sm font-medium mb-1">Birthdate</label>
            <input
              type="date"
              name="birthdate"
              value={userData.birthdate}
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter new password"
              onChange={handleInputChange}
              className="bg-gray-700 text-white w-full rounded px-4 py-2"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const navigate = useNavigate();
  const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);

  const handleAddUser = () => {
    setIsAddUserModalVisible(true);
  };

  const saveNewUser = (newUser) => {
    setUsers((prevUsers) => [...prevUsers, newUser]);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const backend_url = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(
          `${backend_url}/users`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
          navigate
        );

        if (response.ok) {
          const usersData = await response.json();
          setUsers(usersData);
        } else {
          notify_error(`Failed to load users. Status: ${response.status}`);
        }
      } catch (error) {
        notify_error(`Error fetching users: ${error.message}`);
      }
    };

    fetchUsers();
  }, []);

  const handleView = (user) => {
    setSelectedUser(user);
    setIsDetailsModalVisible(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditModalVisible(true);
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteUser = async () => {
    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backend_url}/users/${userToDelete.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        setUsers((prevUsers) =>
          prevUsers.filter((u) => u.username !== userToDelete.username)
        );
        notify_success(`User ${userToDelete.username} deleted successfully.`);
      } else {
        notify_error(`Failed to delete user. Status: ${response.status}`);
      }
    } catch (error) {
      notify_error(`Error deleting user: ${error.message}`);
    }

    setIsDeleteModalVisible(false);
    setUserToDelete(null);
  };

  const cancelDeleteUser = () => {
    setIsDeleteModalVisible(false);
    setUserToDelete(null);
  };

  const saveUser = async (updatedUser) => {
    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backend_url}/users/${updatedUser.username}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedUser),
        },
        navigate
      );

      if (response.ok) {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.username === updatedUser.username ? updatedUser : u
          )
        );
      } else {
        notify_error(`Failed to update user. Status: ${response.status}`);
      }
    } catch (error) {
      notify_error(`Error updating user: ${error.message}`);
    }

    setIsEditModalVisible(false);
  };

  return (
    <div className="bg-black mt-10 sm:mt-0 h-[95%] rounded-3xl w-[400px] md:w-full h-[95%] p-8 overflow-hidden">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>
        <button
          type="button"
          className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
          onClick={(e) => {
            handleAddUser();
          }}
        >
          <UserPlus size={24} className="text-orange-500" />
        </button>
      </div>
      <div className="grid grid-cols-12 gap-4 text-orange-500 text-sm border-b border-orange-500 pb-2">
        <div className="col-span-4">Username</div>
        <div className="col-span-4">Email</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Actions</div>
      </div>

      <div className="mt-4 h-[80%] overflow-y-auto scroll7">
        {users.map((user) => (
          <div
            key={user.userId}
            className="grid grid-cols-12 gap-4 text-white text-sm py-4 px-3 rounded-xl border border-orange-500 bg-black/20 hover:bg-orange-900/20 transition-all my-2 relative"
          >
            <div className="col-span-4 flex items-center gap-2">
              {user.username}
            </div>
            <div className="col-span-4 flex items-center gap-2">
              {user.email}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              {user.role}
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                onClick={() => handleView(user)}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-blue-500 rounded-full"
                title="View"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => handleEdit(user)}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-yellow-500 rounded-full"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(user)}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-red-500 rounded-full"
                title="Delete"
              >
                <Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddUserModal
        isVisible={isAddUserModalVisible}
        onClose={() => setIsAddUserModalVisible(false)}
        onSave={saveNewUser}
        navigate={navigate}
      />

      <UserDetailsModal
        isVisible={isDetailsModalVisible}
        userDetails={selectedUser}
        onClose={() => setIsDetailsModalVisible(false)}
      />

      <EditUserModal
        isVisible={isEditModalVisible}
        userDetails={selectedUser}
        onClose={() => setIsEditModalVisible(false)}
        onSave={saveUser}
        navigate={navigate}
      />

      <ConfirmModal
        isVisible={isDeleteModalVisible}
        onConfirm={confirmDeleteUser}
        onCancel={cancelDeleteUser}
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default UserManagement;
