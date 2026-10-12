import React, { useState, useEffect } from 'react';
import './Profile.css';
import Cookies from 'js-cookie';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getPreferredUsername } from '../../utils/AuthUtils';
import { fetchAuthenticated } from '../Auth.jsx';
import { useNavigate } from 'react-router-dom';
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Profile = () => {
  const [editableField, setEditableField] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    birthdate: null,
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const jwt = Cookies.get('jwt');
      const username = getPreferredUsername(jwt);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      try {
        const response = await fetchAuthenticated(`${backendUrl}/users/${username}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }, navigate);

        if (response.ok) {
          const userData = await response.json();

          setFormData((prevData) => ({
            ...prevData,
            name: username,
            email: userData.email,
            birthdate: userData.birthdate ? new Date(userData.birthdate) : null,
          }));
        } else {
          notify_error('Failed to load user data. Status:', response.status);
        }
      } catch (error) {
        notify_error('Error loading user data:', error);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleEdit = (field) => {
    setEditableField(field);
  };

  const handleSave = async () => {
    setEditableField(null);

    if (editableField === 'birthdate') {
      try {
        const jwt = Cookies.get('jwt');
        const username = getPreferredUsername(jwt);
        const backendUrl = import.meta.env.VITE_BACKEND_URL;

        const response = await fetchAuthenticated(`${backendUrl}/users/${username}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            birthdate: formData.birthdate ? formData.birthdate.toISOString().split('T')[0] : null,
          }),
        }, navigate);

        if (response.ok) {
          notify_success('Birthdate updated successfully');
        } else {
          notify_error('Failed to update birthdate. Status:', response.status);
        }
      } catch (error) {
        notify_error('Error updating birthdate:', error);
      }
    }
  };

  const handleDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      birthdate: date,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword.trim()) {
      notify_error('New password cannot be empty!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify_error('Passwords do not match!');
      return;
    }

    try {
      const jwt = Cookies.get('jwt');
      const username = getPreferredUsername(jwt);
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const response = await fetchAuthenticated(`${backendUrl}/users/${username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: passwordData.newPassword }),
      }, navigate);

      if (response.ok) {
        notify_success('Password updated successfully');
        setShowPasswordFields(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        notify_error('Failed to update password. Status:', response.status);
      }
    } catch (error) {
      const errorMessage = error.message
      notify_error(`Error updating password: ${errorMessage}`);
    }
  };

  const formatDate = (date) => {
    return date ? date.toISOString().split('T')[0] : '';
  };

  return (
    <div className="edit-section">
      <ToastContainer />
      <div className="field">
        <label>Birthdate</label>
        {editableField === 'birthdate' ? (
          <DatePicker
            selected={formData.birthdate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            isClearable
            placeholderText="Birthdate"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            maxDate={new Date()}
          />
        ) : (
          <input className='birthdate_input'
            type="text"
            name="birthdate"
            value={formatDate(formData.birthdate)}
            readOnly
          />
        )}
        {editableField === 'birthdate' ? (
          <button className="save-icon" onClick={handleSave}>
            ✅
          </button>
        ) : (
          <button className="edit-icon" onClick={() => handleEdit('birthdate')}>
            ✎
          </button>
        )}
      </div>

      <div className="field">
        <label>New Password</label>
        <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
        />
      </div>
      <div className="field">
          <label>Confirm Password</label>
          <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
          />
      </div>
      <div className="field">
          <button className="save-password-btn" onClick={handleChangePassword}>
              Save Password
          </button>
      </div>
    </div>
  );
};

export default Profile;
