import React, { useState, useEffect } from 'react';
import './Statistics.css'
import Cookies from 'js-cookie';
import { getPreferredUsername } from '../../utils/AuthUtils.js';

import {Chart} from "chart.js/auto"
import {Doughnut, Pie} from "react-chartjs-2"
import { fetchAuthenticated } from '../Auth.jsx';
import { useNavigate } from 'react-router-dom';
import { Bounce, ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Statistics = () => {
    const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      hoverOffset: 100
    }]
    });

    const jwt = Cookies.get('jwt');
    const [storageInfo, setStorageInfo] = useState({ used: 0, free: 0 });
    const [bucketName, setBucketName] = useState(getPreferredUsername(jwt));
    const navigate = useNavigate();
    
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

    useEffect(() => {

    const fetchStatistics = async () => {
    const username = getPreferredUsername(jwt);
    setBucketName(username);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await fetchAuthenticated(`${backendUrl}/buckets/${bucketName}/statistics`, {
          method: "GET",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          }
        }, navigate);

        if (response.ok) {
          const statistics = await response.json();

          const labels = statistics.fileTypeUsage.map(item => item.type);
          const data = statistics.fileTypeUsage.map(item => item.used);
          const usedStorage = statistics.usedStorage;
          const maxSize = statistics.maxSize;
          const freeStorage = maxSize - usedStorage;

          setChartData({
            labels,
            datasets: [{
              data,
              backgroundColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 205, 86)',
                'rgb(19, 103, 90)',
                'rgb(75, 192, 192)',
              ],
              hoverOffset: 100
            }]
          });

          setStorageInfo({
            used: (usedStorage / (1024 * 1024 * 1024)).toFixed(1), // Convert to GB
            free: (freeStorage / (1024 * 1024 * 1024)).toFixed(1) // Convert to GB
          });
        } else {
          notify_error("Failed to fetch statistics. Status:", response.status);
        }
      } catch (error) {
        notify_error(`Error fetching statistics: ${error.message}`);
      }
    };

    fetchStatistics();
    }, [bucketName]);

return (
  <div className="statistics-section scroll3">
    <ToastContainer></ToastContainer>
    <div className="statistics-content flex-container">
      <div className="storage-info">
        <div className="storage-item">
          <div className="color-box used"></div>
          <span>USED: {storageInfo.used} GB</span>
        </div>
        <div className="storage-item">
          <div className="color-box free"></div>
          <span>FREE: {storageInfo.free} GB</span>
        </div>
        <div className="storage-bar">
          <div
            className="used-bar"
            style={{
              width: `${(storageInfo.used / (parseFloat(storageInfo.used) + parseFloat(storageInfo.free))) * 100}%`,
            }}
          >
            {Math.round((storageInfo.used / (parseFloat(storageInfo.used) + parseFloat(storageInfo.free)) * 100))}%
          </div>
          <div
            className="free-bar"
            style={{
              width: `${(storageInfo.free / (parseFloat(storageInfo.used) + parseFloat(storageInfo.free))) * 100}%`,
            }}
          >
            {Math.round((storageInfo.free / (parseFloat(storageInfo.used) + parseFloat(storageInfo.free)) * 100))}%
          </div>
        </div>
      </div>
      <div className="pie-chart-container">
        <Doughnut
          className="pie-chart"
          width={20}
          height={30}
          data={chartData}
        ></Doughnut>
      </div>
    </div>
  </div>
);


}

export default Statistics
