import React, { useState } from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Register.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState(null);
  const [password, setPassword] = useState("");

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

  const notify_error = (mess) => {
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
  };

  const getFormattedBirthdate = (birthdate) => {
    if (!birthdate) {
      return null;
    }

    const year = birthdate.getFullYear();
    const month = String(birthdate.getMonth() + 1).padStart(2, "0");
    const day = String(birthdate.getDate()).padStart(2, "0");

    const formattedBirthdate = `${year}-${month}-${day}`;

    return formattedBirthdate;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formattedBirthdate = getFormattedBirthdate(birthdate);
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      notify_error("Invalid email format. Please enter a valid email.");
      return;
    }

    if (username.includes(" ")) {
      notify_error("Username cannot contain spaces.");
      return;
    }
    if (password.includes(" ")) {
      notify_error("Password cannot contain spaces.");
      return;
    }
    if (email.includes(" ")) {
      notify_error("Email cannot contain spaces.");
      return;
    }

    const userData = {
      username: username,
      email: email,
      birthdate: formattedBirthdate,
      password: password,
    };

    try {
      const backend_url = import.meta.env.VITE_BACKEND_URL;

      const response = await fetch(`${backend_url}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const jwt = await response.text();
        Cookies.set("jwt", jwt, {
          secure: false,
          sameSite: "Strict",
          expires: 1,
        });

        notify_success("You have been registered!\n Please log in");
        window.location.replace("/myfiles");
      } else {
        const errorBody = await response.text();
        notify_error(errorBody);
      }
    } catch (err) {
      notify_error(`Error during registration: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-customBg px-4">
      <ToastContainer></ToastContainer>
      <div className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0 md:space-x-8 max-w-4xl mx-auto">
        <div className="text-center md:text-left">
          <div className="flex justify-center md:justify-start items-center">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-logo bg-cover bg-center"></div>
            <div className="ml-6 md:ml-10 text-myOrange text-xl md:text-3xl font-semibold font-rockSalt">
              File HUB
            </div>
          </div>
          <p className="mt-6 md:mt-10 text-white text-lg text-center md:text-2xl font-semibold font-rockSalt">
            The only hub your files will ever love!
          </p>
        </div>

        <div className="bg-black p-6 md:p-8 rounded-2xl shadow-lg w-[350px] max-w-md min-h-[400px] h-auto mx-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-white text-center mb-10 md:mb-20">
            Welcome!
          </h1>
          <form onSubmit={handleSubmit}>
            <div className="mb-6 ">
              <input
                type="text"
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(" ")) {
                    notify_error("Username cannot contain spaces.");
                  } else {
                    setUsername(value);
                  }
                }}
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
              />
            </div>

            <div className="mb-6 ">
              <input
                type="email"
                id="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(" ")) {
                    notify_error("Email cannot contain spaces.");
                    return;
                  }
                  setEmail(value);
                }}
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
              />
            </div>

            <div className="mb-6 ">
              <DatePicker
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
                selected={birthdate}
                onChange={(date) => setBirthdate(date)}
                dateFormat="dd/MM/yyyy"
                isClearable
                placeholderText="Birthdate"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                maxDate={new Date()}
              ></DatePicker>
            </div>

            <div className="mb-6 ">
              <input
                type="password"
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes(" ")) {
                    notify_error("Password cannot contain spaces.");
                  } else {
                    setPassword(value);
                  }
                }}
                className="w-full text-center px-4 py-2 rounded-2xl bg-black border border-myOrange text-white focus:outline-none focus:ring-2 focus:ring-myOrange"
              />
            </div>

            <div className="flex justify-center mb-6 ">
              <button
                type="submit"
                className="w-2/3 md:w-1/2 bg-customLoginBtn text-white py-2 rounded-2xl hover:bg-gray-600 focus:outline-none"
              >
                Register
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-gray-400">
            Already have an account?{" "}
            <Link to="/" className="text-myOrange hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
