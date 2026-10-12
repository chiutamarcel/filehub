import React from 'react';
import { Link } from 'react-router-dom';
import './index_sidebar.css';

function SidebarButton({ Icon, text, size = 24, to = '#' }) {
    return (
        <div>
            <Link
                to={to}
                className="group w-full h-[35px] flex items-center justify-start gap-2 pl-5
                            rounded-xl bg-black text-white text-center text-xl font-mono border-2 border-transparent 
                            hover:bg-orange-500"
            >
                <Icon size={size} className="text-orange-500 group-hover:text-black transition-colors ease-in duration-200" />
                <span className="pl-2 text-white group-hover:text-black transition-colors ease-in duration-200">{text}</span>
            </Link>
        </div>
    );
}

export default SidebarButton;
