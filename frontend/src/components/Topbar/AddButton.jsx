import './index_header.css'

function AddButton({ text, rounding }) {

    return (
        <button
            className={`w-[100px] h-[50px] bg-[#484748] text-white 
            text-center text-xl font-mono border-2 border-transparent hover:border-white 
            transition-colors ease-in duration-200 ${rounding}`}
        >
            {text}
        </button>
    );
}

export default AddButton;
