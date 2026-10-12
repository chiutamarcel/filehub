import React, { useState } from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.includes(' ')) {
      notify_error('Username cannot contain spaces.');
      return;
    }
    if (password.includes(' ')) {
      notify_error('Password cannot contain spaces.');
      return;
    }

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backend_url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        notify_success("Welcome!");
        const jwt = await response.text();
        Cookies.set("jwt", jwt, {
          secure: false,
          sameSite: "Strict",
          expires: 1,
        });
        console.log("JWT:", jwt);
        window.location.replace("/myfiles");
      } else {
        const errorBody = await response.text();
        const errorMessage = errorBody || "An unexpected error occurred.";

        notify_error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message;
      notify_error(`Error during login: ${errorMessage}`);
      notify_error("Unable to connect to the server. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-customBg">
      <ToastContainer></ToastContainer>
      <div className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-16">
        <div className="text-center md:text-left">
          <div className="flex justify-center md:justify-start items-center">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-logo bg-cover bg-center"></div>
            <div className="ml-6 md:ml-10 text-myOrange text-xl md:text-3xl font-semibold font-rockSalt">
              File HUB
            </div>
          </div>
          <p className="mt-6 md:mt-10 text-white text-center text-lg md:text-2xl font-semibold font-rockSalt">
            The only hub your files will ever love!
          </p>
        </div>

        <div className="bg-black p-6 md:p-8 rounded-2xl shadow-lg w-[350px] max-w-md min-h-[400px] h-auto mx-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-white text-center mb-10 md:mb-20">
            Welcome!
          </h1>
          <form onSubmit={handleSubmit}>
            <div className="mb-6 md:mb-10">
              <input
                type="text"
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(' ')) {
                    
                    notify_error('Username cannot contain spaces.');
                  } else {
                    setUsername(value); 
                  }
                }}
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
              />
            </div>
            <div className="mb-6 md:mb-10">
              <input
                type="password"
                id="password"
                placeholder="Password"
                value={password}
                onChange={
                  (e) => {
                    const value = e.target.value;
                    if (value.includes(' ')) {
                  
                      notify_error('Password cannot contain spaces.');
                    } else {
                      setPassword(value); 
                    }
                  }
                }
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
              />
            </div>
            <div className="flex justify-center mt-10 mb-6 ">
              <button
                type="submit"
                className="w-2/3 md:w-1/2 bg-customLoginBtn text-white py-2 rounded-2xl hover:bg-gray-600 focus:outline-none"
              >
                Login
              </button>
            </div>
            []
          </form>

          <p className="mt-6 text-center text-gray-400">
            Don't you have an account?{" "}
            <Link to="/register" className="text-myOrange hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
