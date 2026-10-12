import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getPreferredUsername, getUserRoles } from "../../utils/AuthUtils.js";
import {
  RefreshCcw,
  Filter,
  ArrowLeft,
  FolderPlus,
  Upload,
  Link2,
} from "lucide-react";
import "./MyFiles.css";
import {
  FileText,
  Folder,
  User,
  MoreVertical,
  Download,
  Trash2,
} from "lucide-react";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchAuthenticated } from "../Auth.jsx";

const MAX_NAME_LENGTH = 60; 
const MAX_TYPE_LENGTH = 10;

const MyFiles = ({
  bucketName: propBucketName,
  searchResults,
  onResetSearch,
}) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [currentPath, setCurrentPath] = useState("");
  const [bucketName, setBucketName] = useState(propBucketName || "");
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const confirmModalRef = useRef(null);
  const [itemToDelete, setItemToDelete] = useState({
    fileName: null,
    fileData: null,
    isFolder: false,
  });
  const [isFolderToDelete, setIsFolderToDelete] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    maxSize: "",
    fileTypes: [],
    modifiedInLastDays: "",
  });
  const navigate = useNavigate();
  const location = useLocation();

  const jwt = Cookies.get("jwt");
  const roles = getUserRoles(jwt);
  const isAdmin = roles.includes("admin") || roles.includes("filehub_admin");

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

  const handleFilterChange = (field, value) => {
    setFilterOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyFilter = (filters) => {
    const { minFileSize, maxFileSize, fileType, modifiedInLastDays } = filters;

    const filteredFiles = files.filter((file) => {
      const fileSizeInMB = file.size;
      const fileModifiedAt = new Date(file.modifiedAt);
      const lastModifiedDate = new Date();
      lastModifiedDate.setDate(lastModifiedDate.getDate() - modifiedInLastDays);

      return (
        (!minFileSize || fileSizeInMB >= minFileSize) &&
        (!maxFileSize || fileSizeInMB <= maxFileSize) &&
        (!fileType || file.type.includes(fileType)) &&
        (!modifiedInLastDays || fileModifiedAt >= lastModifiedDate)
      );
    });

    setFiles(filteredFiles);
    setIsFilterModalOpen(false);
  };

  useEffect(() => {
    setFileTree(buildFileTree(files));
  }, [files]);


  const truncateString = (str, maxLength) => {
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + '...';
    }
    return str;
  };

  const formatFileSize = (sizeInBytes) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']; 
    let size = sizeInBytes;
    let unitIndex = 0;
  
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
  
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };
  
  const mapFileResponseToFileData = (fileResponse) => {
    const isFolder = fileResponse.isFolder === "true";

    console.log("aici");
    return {
      name: isFolder ? `${fileResponse.objectName}/` : fileResponse.objectName,
      type: fileResponse.fileType,
      size: formatFileSize(fileResponse.fileSize),
      createdBy: fileResponse.createdBy,
      modifiedAt: parseModifiedAt(fileResponse.modifiedAt),
      bucketName: fileResponse.bucketName,
      isFolder: fileResponse.isFolder,
      versionIds: fileResponse.versionIds || [],
      fullName: fileResponse.objectName, 
      fullType: fileResponse.fileType,  
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

  const fetchFiles = async () => {
    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      let effectiveBucketName = propBucketName;

      if (isAdmin && location.pathname === "/myfiles") {
        const response = await fetchAuthenticated(
          `${backend_url}/files/all-buckets`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
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
        return;
      }

      if (!propBucketName) {
        effectiveBucketName = getPreferredUsername(jwt);
        setBucketName(effectiveBucketName);
      }

      const queryParams = new URLSearchParams();
      queryParams.append("bucketName", effectiveBucketName);

      const response = await fetchAuthenticated(
        `${backend_url}/files?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
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

  useEffect(
    () => {
      if (searchResults) {
        const mappedFiles = searchResults.map(mapFileResponseToFileData);
        setFiles(mappedFiles);
        setFileTree(buildFileTree(mappedFiles));
        setIsLoading(false);
      } else {
        fetchFiles();
      }
    },
    [bucketName],
    [searchResults]
  );

  const handleFolderClick = (folderName) => {
    setCurrentPath((prevPath) =>
      prevPath ? `${prevPath}/${folderName}` : folderName
    );
  };

  const handleBackClick = () => {
    setCurrentPath((prevPath) => prevPath.split("/").slice(0, -1).join("/"));
  };

  const handleOptionsClick = (fileName) => {
    setActiveMenu(activeMenu === fileName ? null : fileName);
  };

  const handleDownload = async (fileName, fileData, event) => {
    event.stopPropagation();

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const bucketNameForRequest = isAdmin ? fileData.createdBy : bucketName;

      const queryParams = new URLSearchParams();
      queryParams.append("bucketName", bucketNameForRequest);
      queryParams.append("objectName", fileName);

      if (selectedVersion) {
        queryParams.append("versionId", selectedVersion);
      }

      const response = await fetchAuthenticated(
        `${backend_url}/files/download?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
        navigate
      );

      const baseFileName = fileName.split("/").pop();

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", baseFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        notify_success("File downloaded successfully");
      } else {
        notify_error("Failed to download file. Status:", response.status);
      }
    } catch (error) {
      notify_error(`Error downloading file: ${error.message}`);
    }

    setActiveMenu(null);
  };

  const handleGenerateLink = async (fileName, fileData, event) => {
    event.stopPropagation();

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const bucketNameForRequest = isAdmin ? fileData.createdBy : bucketName;

      const model = {
        bucketName: bucketNameForRequest,
        objectName: fileName,
      };

      const formData = new FormData();
      formData.append(
        "model",
        new Blob([JSON.stringify(model)], { type: "application/json" })
      );
      formData.append("expiryHours", "1");
      if (selectedVersion) {
        formData.append("versionId", selectedVersion);
      }

      const response = await fetchAuthenticated(
        `${backend_url}/files/generateLink`,
        {
          method: "POST",
          body: formData,
        },
        navigate
      );

      if (response.ok) {
        const data = await response.text();
        const downloadLink = data;

        navigator.clipboard.writeText(downloadLink);

        notify_success("Download link copied to clipboard!");
      } else {
        const errorText = await response.text();
        notify_error(`Failed to generate link: ${errorText}`);
      }
    } catch (error) {
      notify_error(`Error generating link: ${error.message}`);
    }

    setActiveMenu(null);
  };

  const handleDelete = (fileName, event, fileData, isFolder) => {
    event.stopPropagation();
    setItemToDelete({ fileName, fileData, isFolder });
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


  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const { fileName, fileData, isFolder } = itemToDelete;
    let bucketNameForRequest = bucketName;

    console.log(itemToDelete);

    if (isFolder && isAdmin && location.pathname === "/myfiles") {
        const createdBy = getCreatedByForFirstFile(fileTree, fileName);
        if (createdBy) {
          bucketNameForRequest = createdBy;
        } else {
          notify_error("No files found in the folder to determine the creator.");
          return;
        }
      }

    if(!isFolder && isAdmin && location.pathname === "/myfiles")
      bucketNameForRequest = fileData.createdBy;

    const objectName = fileName + (isFolder ? "/" : "");

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      const response = await fetchAuthenticated(
        `${backend_url}/files/mark-to-be-deleted?bucketName=${bucketNameForRequest}&objectName=${objectName}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        },
        navigate
      );

      if (response.ok) {
        const updatedFiles = files.filter(
          (file) => !file.name.startsWith(fileName + (isFolder ? "/" : ""))
        );
        setFiles(updatedFiles);
        setFileTree(buildFileTree(updatedFiles));
        notify_success("Deleted successfully!");
      } else {
        notify_error(`Failed to delete. Status: ${response.status}`);
      }
    } catch (error) {
      notify_error(`Error deleting: ${error.message}`);
    }

    setIsConfirmModalVisible(false);
    setItemToDelete(null);
  };

  const cancelDelete = () => {
    setIsConfirmModalVisible(false);
    setItemToDelete(null);
    setIsFolderToDelete(false);
  };

  const sortFiles = (field) => {
    console.log(`Sorting by: ${field}`);
    const newSortOrder =
      sortField === field && sortOrder === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortOrder(newSortOrder);

    const sortedFiles = [...files].sort((a, b) => {
      if (field === "size") {
        return newSortOrder === "asc" ? a.size - b.size : b.size - a.size;
      }

      if (field === "modifiedAt" || field === "createdBy") {
        return newSortOrder === "asc"
          ? a[field].localeCompare(b[field])
          : b[field].localeCompare(a[field]);
      }

      return newSortOrder === "asc"
        ? a[field].localeCompare(b[field])
        : b[field].localeCompare(a[field]);
    });
    console.log(sortedFiles);
    setFiles(sortedFiles);
    setFileTree(buildFileTree(sortedFiles));
    console.log("Updated fileTree:", fileTree);
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();

    const folderName = e.target.folderName.value.trim();
    if (!folderName) {
      notify_error("Folder name is required");
      return;
    }

    const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);

    const folderModel = {
      bucketName: bucketName,
      objectName: fullPath,
      createdBy: username,
      isFolder: "true",
    };

    const formData = new FormData();
    formData.append(
      "model",
      new Blob([JSON.stringify(folderModel)], { type: "application/json" })
    );

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const response = await fetchAuthenticated(
        `${backend_url}/files`,
        {
          method: "POST",
          body: formData,
        },
        navigate
      );

        console.log(response);

      if (response.ok) {
        const uploadedFileData = await response.json();
        const mappedFile = mapFileResponseToFileData(uploadedFileData);
        const newFiles = files.concat(mappedFile);
        setFiles(newFiles);
        setFileTree(buildFileTree(newFiles));
        notify_success("Folder created successfully!");
      } else {
        const errorData = await response.text();
        console.log("aici");
        notify_error("Error creating folder:", errorData);
      }
    } catch (error) {
      notify_error(`Error creating folder: ${error.message}`);
    }

    setIsCreateFolderModalOpen(false);
  };

  const handleRefresh = () => {
    if (onResetSearch) {
      onResetSearch();
    }
    fetchFiles();
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    var file = e.target.file.files[0];
    var filename = file.name;

    const fullPath = currentPath ? `${currentPath}/${filename}` : filename;

    const jwt = Cookies.get("jwt");
    const username = getPreferredUsername(jwt);

    const fileModel = {
      bucketName: bucketName,
      objectName: fullPath,
      createdBy: username,
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "model",
      new Blob([JSON.stringify(fileModel)], {
        type: "application/json",
      })
    );

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const response = await fetchAuthenticated(
        `${backend_url}/files`,
        {
          method: "POST",
          body: formData,
        },
        navigate
      );

      if (response.ok) {
        try {
          const uploadedFileData = await response.json();
          const mappedFile = mapFileResponseToFileData(uploadedFileData);
          const newFiles = files.concat(mappedFile);

          setFiles(newFiles);
          setFileTree(buildFileTree(newFiles));
          notify_success("File uploaded successfully!");
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
        }
      } else {
        const errorText = await response.text();
        notify_error("Error uploading file:", errorText);
      }
    } catch (error) {
      notify_error(`Error uploading file: ${error.message}`);
    }

    setIsUploadModalOpen(false);
  };

  const FilterModal = ({ isVisible, onApply, onCancel }) => {
    if (!isVisible) return null;

    const [localFilters, setLocalFilters] = useState({
      minFileSize: "",
      maxFileSize: "",
      fileType: "",
      modifiedInLastDays: "",
    });

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setLocalFilters((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onApply(localFilters);
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-96">
          <h2 className="text-lg font-bold text-white mb-4">Filter Files</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Filter by minimum file size */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Min File Size (MB)
              </label>
              <input
                type="number"
                name="minFileSize"
                className="bg-gray-700 text-white rounded px-4 py-2 w-full"
                value={localFilters.minFileSize}
                onChange={handleInputChange}
              />
            </div>
            {/* Filter by maximum file size */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Max File Size (MB)
              </label>
              <input
                type="number"
                name="maxFileSize"
                className="bg-gray-700 text-white rounded px-4 py-2 w-full"
                value={localFilters.maxFileSize}
                onChange={handleInputChange}
              />
            </div>
            {/* Filter by file type */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                File Type
              </label>
              <input
                type="text"
                name="fileType"
                placeholder="e.g. text/plain"
                className="bg-gray-700 text-white rounded px-4 py-2 w-full"
                value={localFilters.fileType}
                onChange={handleInputChange}
              />
            </div>
            {/* Filter by modification date */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Modified in Last (Days)
              </label>
              <input
                type="number"
                name="modifiedInLastDays"
                className="bg-gray-700 text-white rounded px-4 py-2 w-full"
                value={localFilters.modifiedInLastDays}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ConfirmModal = React.forwardRef(
    ({ isVisible, onConfirm, onCancel, itemName, isFolder }, ref) => {
      if (!isVisible) return null;

      return (
        <div
          ref={ref}
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
        >
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-lg font-bold text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-white mb-6">
              Are you sure you want to delete this{" "}
              {isFolder ? "folder" : "file"}:{" "}
              <span className="font-semibold">{itemName}</span>?
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
    }
  );

  const OptionsMenu = ({ fileName, fileData, isFolder }) => {
    const menuRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target) &&
          (!confirmModalRef.current ||
            !confirmModalRef.current.contains(event.target))
        ) {
          setActiveMenu(null);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    if (activeMenu !== fileName) return null;

    return (
      <div
        ref={menuRef}
        className="absolute right-0 top-8 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-md overflow-hidden z-10"
      >
        {isFolder ? (
          <button
            onClick={(e) => handleDelete(fileName, e, fileData, true)}
            className="w-full flex items-center gap-2 px-4 py-2 text-white hover:bg-gray-700 focus:outline-none"
          >
            <Trash2 size={16} className="text-red-500" />
            Delete Folder
          </button>
        ) : (
          <>
            {/* Dropdown pentru selecția versiunii */}
            {fileData.versionIds && fileData.versionIds.length > 0 && (
              <div className="p-4 bg-gray-800 text-white">
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Select Version:
                </label>
                <select
                  className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={selectedVersion || ""}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                >
                  <option value="">Latest</option>
                  {fileData.versionIds.map((version, index) => (
                    <option key={version} value={version}>
                      Version {fileData.versionIds.length - index} -{" "}
                      {version.slice(0, 8)}...{version.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={(e) => handleGenerateLink(fileName, fileData, e)}
              className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-gray-700 focus:outline-none"
            >
              <Link2 size={16} />
              Generate link
            </button>
            <button
              onClick={(e) => handleDownload(fileName, fileData, e)}
              className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-gray-700 focus:outline-none"
            >
              <Download size={16} />
              Download
            </button>
            <button
              onClick={(e) => handleDelete(fileName, e, fileData, false)}
              className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-gray-700 focus:outline-none"
            >
              <Trash2 size={16} className="text-red-500" />
              Delete File
            </button>
          </>
        )}
      </div>
    );
  };

  const renderFileTree = (tree, path = "") => {
    const entries = Object.entries(tree);

    if (!isLoading && files.length === 0) {
      return (
        <div className="text-gray-500 text-center mt-10">
          No files uploaded yet. Start by creating a folder or uploading a file!
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
            <div className="col-span-2 flex items-center justify-end">
              <button
                onClick={() => handleOptionsClick(currentFullPath)}
                className="p-1 hover:bg-gray-800 rounded-full"
              >
                <MoreVertical size={16} className="text-gray-400" />
              </button>
              <OptionsMenu
                fileName={currentFullPath}
                fileData={value}
                isFolder={true}
              />
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
            <div className="col-span-4 flex items-center gap-2">
              <FileText size={20} className="text-orange-500" />
              <span className="truncate">{relativeName}</span>
            </div>
            <div className="col-span-2  bg-flex items-center relative group">
              <div className="col-span-2 flex items-center">{value.type}</div>
              <div className="absolute left-1/4 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg">
              {value.fullType}
              </div>
            </div>
            <div className="col-span-2 flex items-center">{value.size}</div>
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-500">
                <User size={14} className="text-white" />
              </div>
              <span className="truncate">{value.createdBy}</span>
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <span>{value.modifiedAt}</span>
              <div className="relative">
                <button
                  onClick={() => handleOptionsClick(value.name)}
                  className="p-1 hover:bg-gray-800 rounded-full"
                >
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
                <OptionsMenu
                  fileName={value.name}
                  fileData={value}
                  isFolder={false}
                />
              </div>
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

  return (
    <div className="myfiles-container bg-black p-8 rounded-3xl w-full scroll1">
      <ToastContainer></ToastContainer>
      <ConfirmModal
        ref={confirmModalRef}
        isVisible={isConfirmModalVisible}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        itemName={itemToDelete?.fileName}
        isFolder={itemToDelete?.isFolder}
      />

      <FilterModal
        isVisible={isFilterModalOpen}
        onApply={applyFilter}
        onCancel={() => setIsFilterModalOpen(false)}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
      />

      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-4">
            {/* Afișăm doar dacă nu este admin sau nu este pe myfiles */}
            {(!isAdmin || location.pathname !== "/myfiles") && (
              <>
                <button
                  type="button"
                  className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
                  onClick={(e) => {
                    setIsCreateFolderModalOpen(true);
                    e.currentTarget.blur();
                  }}
                >
                  <FolderPlus size={24} className="text-orange-500" />
                </button>
                <button
                  type="button"
                  className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
                  onClick={(e) => {
                    setIsUploadModalOpen(true);
                    e.currentTarget.blur();
                  }}
                >
                  <Upload size={24} className="text-orange-500" />
                </button>
              </>
            )}
          </div>
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
            <button
              type="button"
              className="p-2 bg-transparent hover:bg-gray-800 rounded-full focus:outline-none"
              onClick={(e) => {
                setIsFilterModalOpen(true);
                e.currentTarget.blur();
              }}
            >
              <Filter size={24} className="text-orange-500" />
            </button>
          </div>
        </div>

        <div>
          <Dialog
            open={isCreateFolderModalOpen}
            onClose={() => setIsCreateFolderModalOpen(false)}
          >
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
              <DialogPanel className="max-w-lg rounded-lg bg-gray-800 p-6 text-white shadow-lg">
                <DialogTitle className="text-lg font-bold text-white mb-4">
                  Create Folder
                </DialogTitle>
                <form onSubmit={handleCreateFolder}>
                  <div className="flex flex-col gap-4">
                    <label
                      htmlFor="folderName"
                      className="text-white font-medium"
                    >
                      Folder Name
                    </label>
                    <input
                      type="text"
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="bg-gray-700 text-white rounded px-4 py-2 focus:outline-none focus:ring focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                      onClick={() => setIsCreateFolderModalOpen(false)}
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
        </div>

        <div>
          <Dialog
            open={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
          >
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
              <DialogPanel className="max-w-lg rounded-lg bg-gray-800 p-6 text-white shadow-lg">
                <DialogTitle className="text-lg font-bold text-white mb-4">
                  Upload file
                </DialogTitle>
                <form onSubmit={handleFileUpload}>
                  <div className="flex flex-col gap-4">
                    <label htmlFor="file" className="text-white font-medium">
                      Choose File
                    </label>
                    <input
                      type="file"
                      id="file"
                      name="file"
                      className="file:bg-gray-700 file:text-white file:border-none file:rounded file:px-4 file:py-2 hover:file:bg-gray-600 focus:outline-none focus:ring focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                      onClick={() => setIsUploadModalOpen(false)}
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
        </div>
        <div className="grid grid-cols-12 gap-4 text-orange-500 text-sm border-b border-orange-500 pb-2">
          <div
            className="col-span-4 cursor-pointer hover:text-orange-700"
            onClick={() => sortFiles("name")}
          >
            File Name{" "}
            {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
          </div>
          <div
            className="col-span-2 cursor-pointer hover:text-orange-700"
            onClick={() => sortFiles("type")}
          >
            Type {sortField === "type" && (sortOrder === "asc" ? "↑" : "↓")}
          </div>
          <div
            className="col-span-2 cursor-pointer hover:text-orange-700"
            onClick={() => sortFiles("size")}
          >
            Size {sortField === "size" && (sortOrder === "asc" ? "↑" : "↓")}
          </div>
          <div
            className="col-span-2 cursor-pointer hover:text-orange-700"
            onClick={() => sortFiles("createdBy")}
          >
            Created By{" "}
            {sortField === "createdBy" && (sortOrder === "asc" ? "↑" : "↓")}
          </div>
          <div
            className="col-span-2 cursor-pointer hover:text-orange-700"
            onClick={() => sortFiles("modifiedAt")}
          >
            Modified At{" "}
            {sortField === "modifiedAt" && (sortOrder === "asc" ? "↑" : "↓")}
          </div>
        </div>

        <div className="myfiles-content scroll4">
          {renderFileTree(currentFolderContent, currentPath)}
        </div>
      </div>
    </div>
  );
};

export default MyFiles;
