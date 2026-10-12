
import React, { useState } from "react";
import { Text, Search } from "lucide-react";
import { fetchAuthenticated } from "../Auth.jsx";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index_header.css';
import { getUserRoles, getPreferredUsername } from "../../utils/AuthUtils";


function SearchBar({ mode, identifier, onSearchResults }) {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const jwt = Cookies.get("jwt");
  const roles = getUserRoles(jwt);
  const isAdmin = roles.includes("filehub_admin");

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

const handleSearch = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!searchTerm.trim()) return;

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      const username = getPreferredUsername(jwt);

      const queryParams = new URLSearchParams();
      queryParams.append("prefix", searchTerm);

      let url = "";
      if (mode === "myfiles") {
        if(isAdmin)
            url = `${backend_url}/files/search/all-buckets?${queryParams.toString()}`;
        else
            url = `${backend_url}/files/${username}/search?${queryParams.toString()}`;

      } else if (mode === "groupdetails") {
        url = `${backend_url}/files/group-${identifier}/search?${queryParams.toString()}`;
      } else {
        url = `${backend_url}/files/${username}/search?${queryParams.toString()}`;
      }
        console.log(url);
      const response = await fetchAuthenticated(
        url,
        { method: "GET" },
        navigate
      );
        console.log(response);

      if (response.ok) {
        const results = await response.json();
        if (!location.pathname.includes("/group_details") && !location.pathname.includes("/myfiles")) {
          navigate("/myfiles"); // Redirect to MyFiles
        }
        onSearchResults(results, mode); // Pass results to parent component
      } else {
        notify_error("Failed to search files. Status:", response.status);
      }
    } catch (error) {
      notify_error(`Error searching files: ${error.message}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSearch(e);
    }
  };

  return (
    <div className="w-full max-w-[600px] flex items-center bg-[#484748] rounded-full h-[50px] px-4">
      <ToastContainer></ToastContainer>
      <Text color="white" />

      <input
        type="text"
        className="flex-1 bg-transparent text-white text-lg font-mono focus:outline-none ml-2.5"
        placeholder="Search for Files"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button type="button" onClick={(e) => handleSearch(e)}>
        <Search color="white" />
      </button>
    </div>
  );
}

export default SearchBar;
