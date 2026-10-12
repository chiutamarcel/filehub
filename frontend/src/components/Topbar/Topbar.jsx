
import "./index_header.css";
import Logo from "./Logo.jsx";
import AddButton from "./AddButton.jsx";
import SearchBar from "./SearchBar.jsx";
import UserPic from "./UserPic.jsx";
import Notifications from "./Notifications.jsx";
import { useLocation } from "react-router-dom";

const Topbar = ({ profileImage, onSearchResults }) => {
  const location = useLocation();

  let mode = "myfiles";
  let identifier = "";

  if (location.pathname.includes("/group_details")) {
    mode = "groupdetails";
    identifier = location.state?.groupName || "default-group";
  }

  return (
    <nav className="p-6 bg-customBg max-w-screen h-[220px] lg:h-[150px] flex flex-wrap items-center relative">
      <div className="flex flex-col lg:flex-row w-full lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
      <div className="flex items-center h-full space-x-4">
        <Logo />
      </div>
      <div className="flex-grow flex justify-center">
        <SearchBar
          mode={mode}
          identifier={identifier}
          onSearchResults={(results) => onSearchResults(results, mode)}
        />
      </div>
      </div>
      <div className="absolute top-6 right-5 flex items-center space-x-8">

        <Notifications></Notifications>

      <div className="flex items-center h-full space-x-4 ml-auto">
        <UserPic profileImage={profileImage} />
      </div>
      </div>
    </nav>
  );
};

export default Topbar;