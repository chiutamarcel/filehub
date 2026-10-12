import './index_header.css';
import { User } from 'lucide-react';

function AccountButton({ Option }) {
    return (
        <button
            className={`w-[125px] h-[50px] bg-[#2D2C2F] text-white 
            text-center text-xl font-mono border-2 border-transparent hover:border-white 
            transition-colors ease-in duration-200 flex items-center justify-center gap-2 ${Option}`}
        >
            <User className="w-5 h-5" />
            <span>Account</span>
        </button>
    );
}

export default AccountButton;
