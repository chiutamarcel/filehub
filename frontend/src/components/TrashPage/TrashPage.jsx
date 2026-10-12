import React, { useState, useEffect } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./TrashPage.css";
import Cookies from "js-cookie";
import { getPreferredUsername, getUserRoles } from "../../utils/AuthUtils.js";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchAuthenticated } from "../Auth.jsx";
import {
  FileText,
  Folder,
  User,
  MoreVertical,
  Download,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";

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

const notify_error = (mess) => {
  toast.error(mess, {
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

const TrashPage = ({ bucketName }) => {
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [fileToActOn, setFileToActOn] = useState(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [currentPath, setCurrentPath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const jwt = Cookies.get("jwt");
  const username = getPreferredUsername(jwt);

  const effectiveBucketName = bucketName || username;

  const roles = getUserRoles(jwt);
  const isAdmin = roles.includes("admin") || roles.includes("filehub_admin");

  const mapFileResponseToFileData = (fileResponse) => {
    const isFolder = fileResponse.isFolder === "true";
    return {
      name: isFolder ? `${fileResponse.objectName}/` : fileResponse.objectName,
      type: fileResponse.fileType,
      size: fileResponse.fileSize,
      createdBy: fileResponse.createdBy,
      modifiedAt: parseModifiedAt(fileResponse.modifiedAt),
      bucketName: fileResponse.bucketName,
      isFolder: fileResponse.isFolder,
      versionIds: fileResponse.versionIds || [],
    };
  };

  const parseModifiedAt = (modifiedAt) => {
    const date = new Date(modifiedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const fetchFiles = async () => {
    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const url =
        isAdmin && location.pathname === "/trash"
          ? `${backend_url}/files/to-be-deleted`
          : `${backend_url}/files/to-be-deleted?bucketName=${effectiveBucketName}`;

      const response = await fetchAuthenticated(
        url,
        {
          method: "GET",
        },
        navigate
      );

      if (response.ok) {
        const filesData = await response.json();
        const mappedFiles = filesData.map(mapFileResponseToFileData);
        setFiles(mappedFiles);
        setFileTree(buildFileTree(mappedFiles));
      } else {
        notify_error(`Failed to load files. Status: ${response.status}`);
      }
    } catch (error) {
      notify_error(`Error loading files: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildFileTree = (files) => {
    const tree = {};

    files.forEach((file) => {
      const parts = file.name.split("/").filter(Boolean);
      let currentLevel = tree;

      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          if (index === parts.length - 1) {
            if (file.isFolder === "true") {
              currentLevel[part] = {};
            } else {
              currentLevel[part] = { ...file };
            }
          } else {
            currentLevel[part] = currentLevel[part] || {};
          }
        }
        currentLevel = currentLevel[part];
      });
    });

    return tree;
  };

  const renderFileTree = (tree, path = "") => {
    const entries = Object.entries(tree);

    if (!isLoading && files.length === 0) {
      return (
        <div className="text-gray-500 text-center mt-10">
          Trash bin is empty!
        </div>
      );
    }

    if (Object.keys(currentFolderContent).length === 0 && currentPath) {
      return (
        <div className="text-gray-500 text-center mt-4">
          This folder is empty.
        </div>
      );
    }

    return entries.map(([key, value]) => {
      const currentFullPath = path ? `${path}/${key}` : key;

      if (
        (typeof value === "object" && !value.type) ||
        (value.isFolder && value.isFolder === "true")
      ) {
        return (
          <div
            key={currentFullPath}
            className="folder grid grid-cols-12 gap-4 text-white text-sm py-4 px-3 rounded-xl border border-orange-500 bg-black/20 hover:bg-orange-900/20 transition-all my-2 relative"
          >
            <div
              className="col-span-10 flex items-center gap-2 cursor-pointer"
              onClick={() => handleFolderClick(key)}
            >
              <Folder size={20} className="text-orange-500" />
              <span>{key}</span>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  handleAction(
                    { name: currentFullPath, isFolder: "true" },
                    "recover"
                  )
                }
                className="p-2 bg-gray-600 hover:bg-gray-500 text-blue-500 rounded-full flex items-center justify-center"
                title="Recover"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() =>
                  handleAction(
                    { name: currentFullPath, isFolder: "true" },
                    "delete"
                  )
                }
                className="p-2 bg-gray-600 hover:bg-gray-500 text-red-500 rounded-full flex items-center justify-center"
                title="Permanently Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      } else {
        const relativeName = key.split("/").pop();
        return (
          <div
            key={currentFullPath}
            className="file grid grid-cols-12 gap-4 text-white text-sm py-4 px-3 rounded-xl border border-orange-500 bg-black/20 hover:bg-orange-900/20 transition-all my-2 relative"
          >
            <div className="col-span-8 flex items-center gap-2">
              <FileText size={20} className="text-orange-500" />
              <span className="truncate">{relativeName}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-500">
                <User size={14} className="text-white" />
              </div>
              <span className="truncate">{value.createdBy}</span>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                onClick={() => handleAction(value, "recover")}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-blue-500 rounded-full flex items-center justify-center"
                title="Recover"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => handleAction(value, "delete")}
                className="p-2 bg-gray-600 hover:bg-gray-500 text-red-500 rounded-full flex items-center justify-center"
                title="Permanently Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      }
    });
  };

  const getCurrentFolderContent = () => {
    const pathParts = currentPath.split("/").filter(Boolean);
    let currentFolder = fileTree;

    try {
      pathParts.forEach((part) => {
        currentFolder = currentFolder[part] || {};
      });
    } catch (error) {
      currentFolder = {};
    }

    return currentFolder;
  };

  const currentFolderContent = currentPath
    ? getCurrentFolderContent()
    : fileTree;

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) =>
      prevPath ? `${prevPath}/${folderName}` : folderName
    );
  };

  const handleAction = (file, action) => {
    setFileToActOn(file);
    setActionType(action);
    setIsConfirmModalVisible(true);
  };

  const getCreatedByForFirstFile = (tree, folderPath) => {
        const parts = folderPath.split("/").filter(Boolean);
        let currentLevel = tree;

        for (const part of parts) {
          if (!currentLevel[part]) {
            return null;
          }
          currentLevel = currentLevel[part];
        }

        const findFirstFile = (node) => {
          for (const key in node) {
            const value = node[key];

            if (value && value.type) {
              return value.createdBy;
            }

            if (typeof value === "object" && !value.type) {
              const createdBy = findFirstFile(value);
              if (createdBy) {
                return createdBy;
              }
            }
          }

          return null;
        };

        return findFirstFile(currentLevel);
      };

  const confirmAction = async () => {
    if (!fileToActOn) return;

    const fileName = fileToActOn.name;
    const isFolder = fileToActOn.isFolder === "true";

    let bucketNameForRequest = effectiveBucketName;

    if (isFolder && isAdmin && location.pathname === "/trash") {
        const createdBy = getCreatedByForFirstFile(fileTree, fileName);
        if (createdBy) {
          bucketNameForRequest = createdBy;
        } else {
          notify_error("No files found in the folder to determine the creator.");
          return;
        }
      }
      console.log(fileToActOn);

    if (!isFolder && location.pathname === "/trash") {
          bucketNameForRequest = fileToActOn.createdBy;
      }

    if (actionType === "delete") {
      const requestBody = {
        bucketName: bucketNameForRequest,
        objectName: fileName + (isFolder ? "/" : ""),
      };

      try {
        const backend_url = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(
          `${backend_url}/files`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
          navigate
        );

        if (response.ok) {
          setFiles((prevFiles) => {
            const updatedFiles = prevFiles.filter(
              (file) => !file.name.startsWith(fileName + (isFolder ? "/" : ""))
            );
            setFileTree(buildFileTree(updatedFiles));
            return updatedFiles;
          });
          notify_success(`Permanently deleted "${fileName}"`);
        } else {
          notify_error(`Failed to delete. Status: ${response.status}`);
        }
      } catch (error) {
        notify_error(`Error deleting file: ${error.message}`);
      }
    } else if (actionType === "recover") {
      try {
        const new_filename = fileName + (isFolder ? "/" : "");
        const backend_url = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(
          `${backend_url}/files/mark-not-to-be-deleted?bucketName=${bucketNameForRequest}&objectName=${new_filename}`,
          {
            method: "PUT",
          },
          navigate
        );

        if (response.ok) {
          setFiles((prevFiles) => {
            const updatedFiles = prevFiles.filter(
              (file) => !file.name.startsWith(fileName + (isFolder ? "/" : ""))
            );
            setFileTree(buildFileTree(updatedFiles));
            return updatedFiles;
          });
          notify_success(`Recovered "${fileName}"`);
        } else {
          notify_error(`Failed to recover. Status: ${response.status}`);
        }
      } catch (error) {
        notify_error(`Error recovering file: ${error.message}`);
      }
    }

    setIsConfirmModalVisible(false);
    setFileToActOn(null);
    setActionType(null);
  };

  const cancelAction = () => {
    setIsConfirmModalVisible(false);
    setFileToActOn(null);
    setActionType(null);
  };

  const handleBackClick = () => {
    setCurrentPath((prevPath) => prevPath.split("/").slice(0, -1).join("/"));
  };

  const handleRefresh = () => {
    fetchFiles();
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="bg-black mt-10 sm:mt-0 h-[95%] rounded-3xl w-[400px] md:w-full h-[95%] p-8 overflow-hidden">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Trash</h1>
        <div className="flex items-center space-x-4">
          {currentPath && (
            <button
              type="button"
              className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
              onClick={(e) => {
                handleBackClick();
                e.currentTarget.blur();
              }}
            >
              <ArrowLeft size={24} className="text-orange-500" />
            </button>
          )}
          <button
            type="button"
            className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
            onClick={(e) => {
              handleRefresh();
              e.currentTarget.blur();
            }}
          >
            <RefreshCcw size={24} className="text-orange-500" />
          </button>
        </div>
      </div>
      <div className="mt-4 h-[80%] overflow-y-auto scroll7">
        <div className="grid grid-cols-12 gap-4 text-orange-500 text-sm border-b border-orange-500 pb-2">
          <div className="col-span-6">File Name</div>
        </div>
        <div className="mt-4 h-[80%] overflow-y-auto scroll7">
          {renderFileTree(currentFolderContent, currentPath)}
        </div>
      </div>

      <ConfirmModal
        isVisible={isConfirmModalVisible}
        onConfirm={confirmAction}
        onCancel={cancelAction}
        message={`Are you sure you want to ${
          actionType === "delete" ? "permanently delete" : "recover"
        } "${fileToActOn?.name}"?`}
      />
    </div>
  );
};

export default TrashPage;
