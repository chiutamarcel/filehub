import './index_header.css';
import { LogOut } from 'lucide-react';
import Cookies from 'js-cookie';

function LogOutButton({ Option }) {

  const handleLogout = () => {
    Cookies.remove('jwt', { secure: false, sameSite: 'Strict' });
    window.location.replace('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className={`w-[125px] h-[50px] bg-[#2D2C2F] text-white
      text-center text-xl font-mono border-2 border-transparent hover:border-white
      transition-colors ease-in duration-200 flex items-center justify-center gap-2 ${Option}`}
    >
      <LogOut className="w-5 h-5" />
      <span>Log Out</span>
    </button>
  );
}

export default LogOutButton;
